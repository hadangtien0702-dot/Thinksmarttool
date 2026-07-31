// ============================================================================
// PORTAL AUTH + SHELL — dùng chung cho index.html / login.html / videos.html
// Cần: supabase-js v2 (CDN) nạp TRƯỚC file này, và config.js.
// API:
//   TSTAuth.configured  — đã dán key Supabase chưa
//   TSTAuth.getClient() — supabase client (null nếu chưa cấu hình)
//   TSTAuth.getSession(), TSTAuth.getProfile()
//   TSTAuth.requireLogin(opts) — guard trang: chưa login → chuyển /login
//   TSTAuth.initShell() — gắn theme toggle + user chip + logout cho header
// ============================================================================
(function () {
  'use strict';

  const cfg = window.TST_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  let client = null;
  let cachedProfile = null;

  function getClient() {
    if (!configured) return null;
    if (!client) {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
    return client;
  }

  async function getSession() {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }

  // Hồ sơ của người đang đăng nhập (role, approved, full_name)
  async function getProfile(force) {
    if (cachedProfile && !force) return cachedProfile;
    const sb = getClient();
    if (!sb) return null;
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, role, approved, status, department')
      .eq('id', session.user.id)
      .single();
    if (error) return null;
    cachedProfile = data;
    cachedProfile.email = session.user.email;
    return cachedProfile;
  }

  // Màn chặn toàn trang khi không xác minh được hồ sơ. KHÔNG đăng xuất —
  // lỗi mạng/RLS tạm thời mà đá người ta ra ngoài là quá tay.
  function blockPage(title, detail) {
    const box = document.createElement('div');
    box.className = 'auth-block';
    box.innerHTML =
      '<div class="auth-block-card">' +
        '<div class="notice error"><span>⚠️</span><div><b>' + title + '</b><br>' + detail + '</div></div>' +
        '<button class="btn btn-primary btn-block" id="auth-block-retry">Thử lại</button>' +
      '</div>';
    document.body.appendChild(box);
    const btn = document.getElementById('auth-block-retry');
    if (btn) btn.addEventListener('click', function () { location.reload(); });
  }

  // Guard trang cần đăng nhập. Trả về { session, profile } hoặc tự chặn/chuyển hướng.
  // Chưa cấu hình Supabase → cho qua (chế độ mở) để không khoá Tool khi chưa setup.
  //
  // TRẠNG THÁI TÀI KHOẢN ĐƯỢC KIỂM Ở ĐÂY, MỖI LẦN VÀO TRANG — không chỉ ở form
  // đăng nhập. Lý do: admin bấm "Tạm khoá" lúc người ta đang mở web thì phiên cũ
  // VẪN CÒN HẠN; nếu chỉ kiểm lúc đăng nhập, người bị khoá còn đi lại trong portal
  // tới khi phiên hết hạn. (Lỗ hổng thật, phát hiện 21/07/2026.)
  async function requireLogin() {
    if (!configured) return { session: null, profile: null, openMode: true };

    const session = await getSession();
    if (!session) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace('/login?next=' + next);
      return new Promise(() => {}); // dừng script trang trong lúc chuyển
    }

    const profile = await getProfile();

    // FAIL-CLOSED: không đọc được hồ sơ thì KHÔNG cho vào. Trước đây các trang
    // dùng `if (p && p.status !== 'active')` — p null là bỏ qua cả điều kiện,
    // tức là guard hỏng thì mở toang. Guard hỏng phải ĐÓNG.
    if (!profile) {
      blockPage('Không đọc được hồ sơ tài khoản.',
                'Có thể do mạng chập chờn. Bấm Thử lại; nếu vẫn lỗi, báo admin.');
      return new Promise(() => {});
    }

    if (profile.status !== 'active') {
      const state = profile.status === 'pending' ? 'pending' : 'blocked';
      await signOut('/login?state=' + state);
      return new Promise(() => {});
    }

    return { session, profile, openMode: false };
  }

  // to: đích sau khi đăng xuất (mặc định /login). requireLogin dùng để kèm ?state=
  async function signOut(to) {
    const sb = getClient();
    if (sb) await sb.auth.signOut();
    cachedProfile = null;
    location.href = (typeof to === 'string' && /^\/(?!\/)/.test(to)) ? to : '/login';
  }

  // ---- Đo lường sử dụng (N1, 23/07/2026) ---------------------------------
  // Ghi 1 sự kiện vào usage_events (append-only) bằng anon key + RLS.
  //   kind: 'login' (đăng nhập thành công) | 'open_tool' (mở /tool) |
  //         'download' (xuất/tải, kèm label+detail) | 'view' (mở XEM mẫu/brochure, kèm label)
  // THROTTLE theo máy để refresh/click lại không phình bảng:
  //   open_tool = 1 lần/giờ (chung); view = 1 lần/15' cho MỖI mẫu (key kèm label).
  // Best-effort: lỗi/chưa cấu hình/chưa đăng nhập đều NUỐT im — đo lường hỏng
  // TUYỆT ĐỐI không được làm hỏng đăng nhập / mở tool / mở mẫu.
  const USAGE_THROTTLE_MS = { open_tool: 60 * 60 * 1000, view: 15 * 60 * 1000 };
  // `anh` (27/07) = đường dẫn ảnh xem nhanh của bản đã xuất, trong Storage `proposal-snapshots`.
  // Chủ tool: "xem ở đây là muốn xem BẢN ĐƯỢC TẢI VỀ chứ không phải thông tin điền".
  async function logUsage(kind, label, detail, anh) {
    try {
      const sb = getClient();
      if (!sb) return;
      const throttleMs = USAGE_THROTTLE_MS[kind];
      if (throttleMs) {
        // Key kèm label để 'view' throttle RIÊNG từng mẫu; 'open_tool' label rỗng → 1 key chung
        // (giữ nguyên key cũ 'tst-usage-open_tool' để không reset throttle đang chạy).
        const k = 'tst-usage-' + kind + (label ? ':' + label : '');
        let last = 0;
        try { last = Number(localStorage.getItem(k) || 0); } catch (e) {}
        if (Date.now() - last < throttleMs) return; // đã ghi trong khoảng throttle
        try { localStorage.setItem(k, String(Date.now())); } catch (e) {}
      }
      const session = await getSession();
      if (!session) return;
      const row = { user_id: session.user.id, kind: kind };
      if (label) row.label = String(label).slice(0, 200);          // "tải gì" (chỉ 'download')
      if (detail) row.detail = detail;                             // giá trị đã điền (Cách A)
      if (anh) row.anh = String(anh).slice(0, 300);                // ảnh xem nhanh bản đã xuất
      let { error } = await sb.from('usage_events').insert(row);
      // Cột chưa tạo (chưa chạy SQL ALTER) → bỏ cột thiếu, ghi lại để không mất sự kiện.
      if (error && /(label|detail|anh)/i.test(error.message || '')) {
        if (/detail/i.test(error.message || '')) delete row.detail;
        if (/label/i.test(error.message || '')) delete row.label;
        if (/\banh\b/i.test(error.message || '')) delete row.anh;
        ({ error } = await sb.from('usage_events').insert(row));
        // Trường hợp thiếu cả 2 nhưng lỗi chỉ báo 1 → thử lần cuối tối giản.
        if (error) { await sb.from('usage_events').insert({ user_id: session.user.id, kind: kind }); }
      }
    } catch (e) { /* nuốt lỗi — không chặn luồng chính */ }
  }

  // ---- Ảnh xem nhanh bản đã xuất (27/07/2026) ----------------------------
  // Sale bấm xuất → ngoài file tải về máy, đẩy thêm 1 ảnh THU NHỎ lên Storage để
  // Super Admin mở lại xem đúng bản đã gửi khách. Chốt của chủ tool: bản xem nhanh
  // (~1200px) chứ không lưu bản gốc — nhẹ hơn ~3 lần, 1GB miễn phí dùng được nhiều năm.
  // Bucket PRIVATE `proposal-snapshots`, đường dẫn `<user_id>/<thời gian>-<ngẫu nhiên>.jpg`
  // (RLS: sale chỉ ghi được vào thư mục của mình; chỉ super_admin đọc — xem schema.sql).
  const ANH_BUCKET = 'proposal-snapshots';
  // ⚠️ ĐO THẬT 27/07 trên 3 mẫu proposal (AIG IUL / AIG Termlife / Max-Funded Allianz):
  // app xuất ở scaleFactor 2 → canvas 1191×2682, file sale tải về ~480KB.
  //   giữ nguyên 1191 · q0.80 → ~314KB/lượt  (~420MB/năm)
  //   thu về  900 · q0.80 → ~224KB/lượt  (~302MB/năm)
  //   thu về  900 · q0.75 → ~201KB/lượt  (~271MB/năm)   ← đang dùng
  //   thu về  800 · q0.75 → ~174KB/lượt  (~234MB/năm)
  // Ngưỡng 1200 là SAI (lớn hơn 1191 nên không bao giờ thu nhỏ). 900px = 1.5× cỡ thiết
  // kế gốc (595px) nên vẫn đọc rõ số liệu — đó là mục đích của bản xem nhanh.
  const ANH_RONG_TOI_DA = 900;
  const ANH_CHAT_LUONG = 0.75;
  // Best-effort TUYỆT ĐỐI: hỏng gì cũng nuốt và trả null. Lưu ảnh KHÔNG được phép
  // làm hỏng việc xuất file — đó mới là việc chính của sale.
  async function luuAnhBanXuat(canvas) {
    try {
      const sb = getClient();
      if (!sb || !canvas || !canvas.width) return null;
      const session = await getSession();
      if (!session) return null;

      // Thu nhỏ (giữ tỉ lệ). Ảnh gốc rộng hơn ANH_RONG_TOI_DA mới phải vẽ lại.
      let nguon = canvas;
      if (canvas.width > ANH_RONG_TOI_DA) {
        const ti = ANH_RONG_TOI_DA / canvas.width;
        const nho = document.createElement('canvas');
        nho.width = ANH_RONG_TOI_DA;
        nho.height = Math.round(canvas.height * ti);
        const ctx = nho.getContext('2d');
        ctx.fillStyle = '#ffffff';                       // JPEG không có trong suốt
        ctx.fillRect(0, 0, nho.width, nho.height);
        ctx.drawImage(canvas, 0, 0, nho.width, nho.height);
        nguon = nho;
      }
      const blob = await new Promise(function (xong) {
        nguon.toBlob(xong, 'image/jpeg', ANH_CHAT_LUONG);
      });
      if (!blob) return null;

      const ten = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      const duongDan = session.user.id + '/' + ten;      // thư mục = user_id → khớp RLS
      const { error } = await sb.storage.from(ANH_BUCKET)
        .upload(duongDan, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) return null;                            // chưa tạo bucket / hết quota → bỏ qua
      return duongDan;
    } catch (e) { return null; }
  }

  // Super Admin mở ảnh: bucket private nên phải xin link có hạn (60 giây).
  async function linkAnhBanXuat(duongDan) {
    try {
      const sb = getClient();
      if (!sb || !duongDan) return null;
      const { data, error } = await sb.storage.from(ANH_BUCKET).createSignedUrl(duongDan, 60);
      if (error || !data) return null;
      return data.signedUrl;
    } catch (e) { return null; }
  }

  // ---- Đang online / heartbeat (N3, 23/07/2026) --------------------------
  // MỖI NGƯỜI 1 dòng trong `presence`; heartbeat upsert last_seen mỗi ~45s khi web đang MỞ
  // và HIỆN (visible). Super_admin đọc dòng last_seen < 2' = đang online.
  // Best-effort tuyệt đối: bảng chưa tạo / lỗi mạng đều NUỐT im, không chặn gì.
  const PRESENCE_MS = 45 * 1000;
  let presenceTimer = null;
  let presencePage = 'portal';

  async function pingPresence() {
    try {
      const sb = getClient();
      if (!sb) return;
      const session = await getSession();
      if (!session) return;
      // ☠️ ĐANG HỎNG VỚI MỌI NGƯỜI TRỪ SUPER ADMIN — chờ 1 câu SQL (31/07/2026).
      // Đo bằng token user thường:
      //   insert  → ghi được
      //   update  → trả 204 KHÔNG LỖI nhưng KHÔNG ghi gì (0 hàng khớp)
      //   upsert  → 42501 "new row violates row-level security policy"
      // Nguyên nhân: `presence` chỉ có policy SELECT cho super_admin. `upsert` bị
      // PostgREST dịch thành `INSERT ... ON CONFLICT DO UPDATE`, mà ON CONFLICT phải
      // ĐỌC hàng để dò trùng khoá → không có quyền đọc thì Postgres chặn.
      // Cách sửa nằm ở DB, không phải ở đây: thêm policy cho mỗi người đọc ĐÚNG DÒNG
      // CỦA MÌNH (không lộ ai đang online cho nhau) — xem supabase/schema.sql.
      // ⚠️ Bài học: `update` không báo lỗi KHÔNG có nghĩa là đã ghi. Phải đọc lại giá trị.
      await sb.from('presence').upsert(
        { user_id: session.user.id, last_seen: new Date().toISOString(), page: presencePage },
        { onConflict: 'user_id' }
      );
    } catch (e) { /* nuốt lỗi */ }
  }

  // Bật heartbeat cho trang hiện tại. Idempotent (gọi nhiều lần chỉ chạy 1 timer).
  //   page: 'tool' | 'portal' | 'members' | 'videos' — để super_admin biết ai đang ở đâu.
  function startPresence(page) {
    if (!configured) return;
    if (page) presencePage = String(page);
    if (presenceTimer) { pingPresence(); return; }  // đã chạy → chỉ ping tươi lại
    pingPresence();                                  // ping ngay khi vào
    presenceTimer = setInterval(function () {
      if (document.visibilityState === 'visible') pingPresence();
    }, PRESENCE_MS);
    // Quay lại tab (từ ẩn → hiện) → ping ngay cho "đang online" tươi, khỏi chờ 45s.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') pingPresence();
    });
  }

  // ---- Đổi mật khẩu (22/07/2026) -----------------------------------------
  // Vì sao cần: 48 tài khoản sale được tạo hàng loạt bằng SQL với mật khẩu do admin
  // sinh sẵn. Không có màn này thì mật khẩu đầu tiên tồn tại vĩnh viễn — admin vẫn
  // giữ bản CSV, và ai từng thấy tin nhắn đó là vào được mãi.
  const MK_TOI_THIEU = 8;

  async function doiMatKhau() {
    const sb = getClient();
    if (!sb) { await showAppAlert('Chưa cấu hình đăng nhập.'); return; }

    const { data: { session } } = await sb.auth.getSession();
    if (!session) { await showAppAlert('Phiên đăng nhập đã hết hạn. Mời đăng nhập lại.'); return; }
    const email = session.user && session.user.email;

    const gt = await showAppForm({
      title: 'Đổi mật khẩu',
      message: 'Mật khẩu mới cần ít nhất ' + MK_TOI_THIEU + ' ký tự.',
      confirmText: 'Đổi mật khẩu',
      fields: [
        { name: 'cu',  label: 'Mật khẩu hiện tại', type: 'password', autocomplete: 'current-password' },
        { name: 'moi', label: 'Mật khẩu mới',      type: 'password', autocomplete: 'new-password' },
        { name: 'lai', label: 'Nhập lại mật khẩu mới', type: 'password', autocomplete: 'new-password' }
      ],
      validate: function (v) {
        if (!v.cu)  return 'Chưa nhập mật khẩu hiện tại.';
        if (!v.moi) return 'Chưa nhập mật khẩu mới.';
        if (v.moi.length < MK_TOI_THIEU) return 'Mật khẩu mới phải từ ' + MK_TOI_THIEU + ' ký tự trở lên.';
        if (v.moi !== v.lai) return 'Hai ô mật khẩu mới không giống nhau.';
        if (v.moi === v.cu)  return 'Mật khẩu mới trùng mật khẩu hiện tại.';
        return null;
      }
    });
    if (!gt) return;

    // Bước 1: XÁC MINH mật khẩu hiện tại. Supabase KHÔNG tự kiểm tra việc này trong
    // updateUser — chỉ cần còn phiên đăng nhập là đổi được. Bỏ qua bước này thì ai
    // mượn được máy lúc đang mở màn hình là đổi mật khẩu chiếm luôn tài khoản.
    const { error: loiDangNhap } = await sb.auth.signInWithPassword({ email: email, password: gt.cu });
    if (loiDangNhap) { await showAppAlert('Mật khẩu hiện tại không đúng.', { tone: 'danger' }); return; }

    const { error: loiDoi } = await sb.auth.updateUser({ password: gt.moi });
    if (loiDoi) {
      await showAppAlert('Không đổi được mật khẩu: ' + (loiDoi.message || 'lỗi không rõ'), { tone: 'danger' });
      return;
    }

    await showAppAlert('Đã đổi mật khẩu. Lần sau đăng nhập bằng mật khẩu mới.', { tone: 'success' });
  }

  // Gắn nút "Đổi mật khẩu" ở chân sidebar. Gọi được nhiều lần (mỗi trang một lần).
  function initDoiMatKhau() {
    const nut = document.getElementById('btn-change-pw');
    if (!nut || nut.dataset.daGan) return;
    nut.dataset.daGan = '1';
    nut.addEventListener('click', doiMatKhau);
  }

  // ---- Shell: theme + user chip (header portal) --------------------------
  function applyThemeEarly() {
    try {
      if (localStorage.getItem('tst-theme') === 'dark') document.body.classList.add('dark-theme');
    } catch (e) {}
  }

  function initShell() {
    applyThemeEarly();

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        const dark = document.body.classList.toggle('dark-theme');
        try { localStorage.setItem('tst-theme', dark ? 'dark' : 'light'); } catch (e) {}
      });
    }

    const chip = document.getElementById('user-chip');
    const menu = document.getElementById('user-menu');
    if (chip && menu) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      document.addEventListener('click', function () { menu.classList.remove('open'); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') menu.classList.remove('open');
      });
      const btnLogout = document.getElementById('btn-logout');
      if (btnLogout) btnLogout.addEventListener('click', signOut);
    }

    // Điền thông tin user vào chip + menu (nếu đã đăng nhập)
    getProfile().then(function (p) {
      if (!p) {
        if (chip) chip.style.display = 'none';
        return;
      }
      // Đã đăng nhập trên trang portal → bật heartbeat "đang online" (tool.html gọi riêng).
      const path = location.pathname;
      startPresence(/members/.test(path) ? 'members' : /videos/.test(path) ? 'videos' : 'portal');
      const name = p.full_name || p.email || 'Thành viên';
      const initial = name.trim().charAt(0) || '?';
      const elAvatar = document.getElementById('chip-avatar');
      const elName = document.getElementById('chip-name');
      const elMenuName = document.getElementById('menu-name');
      const elMenuMail = document.getElementById('menu-email');
      const elMenuRole = document.getElementById('menu-role');
      if (elAvatar) elAvatar.textContent = initial;
      if (elName) elName.textContent = name;
      if (elMenuName) elMenuName.textContent = name;
      if (elMenuMail) elMenuMail.textContent = p.email || '';
      // Menu tài khoản: chỉ người CÓ QUYỀN mới thấy vai của mình (chủ tool 31/07) —
      // nhân viên thì bỏ hẳn dòng này đi. Tiện thể sửa lỗi cũ: dòng này từng viết
      // `role === 'admin' ? 'Admin' : 'Nhân viên'` nên SUPER ADMIN bị gắn nhãn
      // "Nhân viên" — sai hẳn vai. Nay tra bảng cho đúng cả 3 mức.
      if (elMenuRole) {
        const NHAN_VAI = { super_admin: 'Super Admin', admin: 'Admin' };
        if (NHAN_VAI[p.role]) elMenuRole.textContent = NHAN_VAI[p.role];
        else elMenuRole.remove();
      }
    });
  }

  window.TSTAuth = {
    configured: configured,
    getClient: getClient,
    getSession: getSession,
    getProfile: getProfile,
    requireLogin: requireLogin,
    signOut: signOut,
    initShell: initShell,
    doiMatKhau: doiMatKhau,
    initDoiMatKhau: initDoiMatKhau,
    logUsage: logUsage,
    luuAnhBanXuat: luuAnhBanXuat,     // sale xuất → lưu ảnh xem nhanh (core.js gọi)
    linkAnhBanXuat: linkAnhBanXuat,   // super_admin mở lại (members.js gọi)
    startPresence: startPresence,
  };
})();

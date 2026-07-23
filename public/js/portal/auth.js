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
  //   kind: 'login' (gọi lúc đăng nhập thành công) | 'open_tool' (gọi lúc mở /tool)
  // 'open_tool' THROTTLE 1 lần/giờ/máy để refresh trang không phình bảng.
  // Best-effort: lỗi/chưa cấu hình/chưa đăng nhập đều NUỐT im — đo lường hỏng
  // TUYỆT ĐỐI không được làm hỏng đăng nhập hay mở tool.
  const USAGE_THROTTLE_MS = 60 * 60 * 1000; // 1 giờ
  async function logUsage(kind, label, detail) {
    try {
      const sb = getClient();
      if (!sb) return;
      if (kind === 'open_tool') {
        const k = 'tst-usage-open_tool';
        let last = 0;
        try { last = Number(localStorage.getItem(k) || 0); } catch (e) {}
        if (Date.now() - last < USAGE_THROTTLE_MS) return; // đã ghi trong 1 giờ qua
        try { localStorage.setItem(k, String(Date.now())); } catch (e) {}
      }
      const session = await getSession();
      if (!session) return;
      const row = { user_id: session.user.id, kind: kind };
      if (label) row.label = String(label).slice(0, 200);          // "tải gì" (chỉ 'download')
      if (detail) row.detail = detail;                             // giá trị đã điền (Cách A)
      let { error } = await sb.from('usage_events').insert(row);
      // Cột label/detail chưa tạo (chưa chạy SQL ALTER) → bỏ cột thiếu, ghi lại để không mất sự kiện.
      if (error && /(label|detail)/i.test(error.message || '')) {
        if (/detail/i.test(error.message || '')) delete row.detail;
        if (/label/i.test(error.message || '')) delete row.label;
        ({ error } = await sb.from('usage_events').insert(row));
        // Trường hợp thiếu cả 2 nhưng lỗi chỉ báo 1 → thử lần cuối tối giản.
        if (error) { await sb.from('usage_events').insert({ user_id: session.user.id, kind: kind }); }
      }
    } catch (e) { /* nuốt lỗi — không chặn luồng chính */ }
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
      if (elMenuRole) elMenuRole.textContent = p.role === 'admin' ? 'Admin' : 'Nhân viên';
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
  };
})();

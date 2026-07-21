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
  };
})();

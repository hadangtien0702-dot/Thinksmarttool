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

  // Guard trang cần đăng nhập. Trả về { session, profile } hoặc tự redirect.
  // Chưa cấu hình Supabase → cho qua (chế độ mở) để không khoá Tool khi chưa setup.
  async function requireLogin() {
    if (!configured) return { session: null, profile: null, openMode: true };
    const session = await getSession();
    if (!session) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace('/login?next=' + next);
      return new Promise(() => {}); // dừng script trang trong lúc chuyển
    }
    const profile = await getProfile();
    return { session, profile, openMode: false };
  }

  async function signOut() {
    const sb = getClient();
    if (sb) await sb.auth.signOut();
    cachedProfile = null;
    location.href = '/login';
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

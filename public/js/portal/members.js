// ============================================================================
// PORTAL — QUẢN LÝ THÀNH VIÊN (Super Admin / Admin)
// 3 role: super_admin > admin > user. 4 trạng thái: pending/active/suspended/deleted.
// Bảo mật THẬT ở DB (RLS + trigger enforce_member_update); UI dưới đây chỉ ẩn/hiện
// nút cho khớp — không thay thế cho tầng chặn database.
//   • Super Admin: duyệt, đổi phòng ban, cấp/gỡ quyền, tạm khoá, xoá — trên mọi người.
//   • Admin: duyệt + tạm khoá + đổi phòng ban — CHỈ trên Nhân viên (user).
// ============================================================================
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  let sb = null;
  let me = null; // hồ sơ người đang đăng nhập

  const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', user: 'Nhân viên' };

  // ---- Tiện ích ---------------------------------------------------------------
  function initial(name) {
    const s = (name || '').trim();
    return s ? s.charAt(0).toUpperCase() : '?';
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Người đang đăng nhập có được thao tác lên hàng `p` không?
  //   super_admin: mọi người (trừ chính mình). admin: chỉ 'user' (trừ chính mình).
  function canManage(p) {
    if (p.id === me.id) return false;
    if (me.role === 'super_admin') return true;
    if (me.role === 'admin') return p.role === 'user';
    return false;
  }

  // ---- Dựng nút thao tác theo trạng thái + quyền -----------------------------
  function actionsFor(p) {
    if (p.id === me.id) return '<span class="m-self">Bạn</span>';
    if (!canManage(p)) return '<span class="m-self">—</span>';

    const isSuper = me.role === 'super_admin';
    const id = p.id;
    const A = []; // mảng HTML nút

    if (p.status === 'pending') {
      A.push('<button class="btn btn-primary btn-sm" data-act="approve" data-id="' + id + '">Duyệt</button>');
      A.push('<button class="btn btn-secondary btn-sm" data-act="dept" data-id="' + id + '">Phòng ban</button>');
      if (isSuper) A.push('<button class="btn btn-danger btn-sm" data-act="delete" data-id="' + id + '">Xoá</button>');
    } else if (p.status === 'active') {
      A.push('<button class="btn btn-secondary btn-sm" data-act="dept" data-id="' + id + '">Phòng ban</button>');
      if (isSuper) {
        if (p.role === 'user') A.push('<button class="btn btn-secondary btn-sm" data-act="to-admin" data-id="' + id + '">Đặt làm Admin</button>');
        else if (p.role === 'admin') A.push('<button class="btn btn-secondary btn-sm" data-act="to-user" data-id="' + id + '">Bỏ quyền Admin</button>');
        else if (p.role === 'super_admin') A.push('<button class="btn btn-secondary btn-sm" data-act="to-admin" data-id="' + id + '">Hạ xuống Admin</button>');
      }
      A.push('<button class="btn btn-danger btn-sm" data-act="suspend" data-id="' + id + '">Tạm khoá</button>');
      if (isSuper) A.push('<button class="btn btn-danger btn-sm" data-act="delete" data-id="' + id + '">Xoá</button>');
    } else if (p.status === 'suspended') {
      A.push('<button class="btn btn-primary btn-sm" data-act="reactivate" data-id="' + id + '">Mở khoá</button>');
      if (isSuper) A.push('<button class="btn btn-danger btn-sm" data-act="delete" data-id="' + id + '">Xoá</button>');
    }
    return A.join('');
  }

  // ---- Dựng 1 hàng thành viên ------------------------------------------------
  function rowHtml(p) {
    const isMe = p.id === me.id;
    const name = p.full_name && p.full_name.trim() ? p.full_name.trim() : '(chưa đặt tên)';
    const roleCls = p.role === 'super_admin' ? 'role-super' : (p.role === 'admin' ? 'role-admin' : 'role-user');
    const roleBadge = '<span class="badge ' + roleCls + '">' + esc(ROLE_LABEL[p.role] || p.role) + '</span>';
    const statusBadge = p.status === 'active'
      ? '<span class="badge st-active">Đang hoạt động</span>'
      : (p.status === 'suspended'
          ? '<span class="badge st-suspended">Tạm khoá</span>'
          : '<span class="badge st-pending">Chờ duyệt</span>');
    const dept = p.department && p.department.trim()
      ? '<span class="m-dept">' + esc(p.department.trim()) + '</span>'
      : '<span class="m-empty">—</span>';

    // 6 ô, THỨ TỰ PHẢI TRÙNG với .member-head trong members.html và với
    // grid-template-columns của .member-table (portal.css). Đổi cột thì đổi cả 3 nơi.
    return '' +
      '<div class="member-row' + (isMe ? ' is-me' : '') + '">' +
        '<div class="m-user">' +
          '<span class="m-avatar">' + esc(initial(p.full_name)) + '</span>' +
          '<div class="m-id">' +
            '<b>' + esc(name) + '</b>' +
            '<span title="' + esc(p.email || '') + '">' + esc(p.email || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="m-cell" data-label="Phòng ban">' + dept + '</div>' +
        '<div class="m-cell" data-label="Quyền">' + roleBadge + '</div>' +
        '<div class="m-cell" data-label="Trạng thái">' + statusBadge + '</div>' +
        '<div class="m-cell m-date" data-label="Tham gia">' + fmtDate(p.created_at) + '</div>' +
        '<div class="member-actions">' + actionsFor(p) + '</div>' +
      '</div>';
  }

  // ---- Trạng thái đang tải ---------------------------------------------------
  // CỐ Ý không dùng banner "Đang tải…" nữa: nó chen vào giữa trang, đẩy nội dung
  // tụt xuống rồi biến mất → giật bố cục mỗi lần bấm Tải lại (chủ tool đã chê).
  // Thay bằng phản hồi tại chỗ: nút đổi nhãn + bảng mờ nhẹ, không xê dịch gì.
  let firstLoad = true;
  function setLoading(on) {
    const btn = $('btn-refresh');
    if (btn) {
      btn.disabled = on;
      btn.textContent = on ? 'Đang tải…' : '↻ Tải lại';
    }
    $('page-content').classList.toggle('is-loading', on);
  }

  // Khung xương cho lần tải ĐẦU (lúc đó bảng trống, không có gì để làm mờ)
  function skeletonRows(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += '<div class="member-row is-skeleton">' +
             '<div class="m-user"><span class="sk sk-avatar"></span>' +
               '<div class="m-id"><span class="sk sk-line"></span><span class="sk sk-line short"></span></div></div>' +
             '<div class="m-cell"><span class="sk sk-pill"></span></div>' +
             '<div class="m-cell"><span class="sk sk-pill"></span></div>' +
             '<div class="m-cell"><span class="sk sk-pill"></span></div>' +
             '<div class="m-cell"><span class="sk sk-line short"></span></div>' +
             '<div class="member-actions"><span class="sk sk-btn"></span></div>' +
           '</div>';
    }
    return s;
  }

  // ---- Tải & render ----------------------------------------------------------
  async function load() {
    setLoading(true);
    if (firstLoad) $('list-active').innerHTML = skeletonRows(3);

    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, email, role, status, department, created_at')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    setLoading(false);
    firstLoad = false;

    if (error) {
      $('list-active').innerHTML = '';
      $('load-msg').className = 'notice error';
      $('load-msg').innerHTML = '<span>⚠️</span><div>Không tải được danh sách: ' + esc(error.message) + '</div>';
      $('load-msg').style.display = 'flex';
      return;
    }
    $('load-msg').style.display = 'none';

    const rows = data || [];
    // Sắp quyền cao lên trước trong mỗi nhóm cho dễ nhìn
    const rank = { super_admin: 0, admin: 1, user: 2 };
    rows.sort(function (a, b) { return (rank[a.role] || 9) - (rank[b.role] || 9); });

    const pending = rows.filter(function (r) { return r.status === 'pending'; });
    const active = rows.filter(function (r) { return r.status === 'active'; });
    const suspended = rows.filter(function (r) { return r.status === 'suspended'; });

    $('seg-pending').style.display = pending.length ? 'block' : 'none';
    $('count-pending').textContent = pending.length;
    $('list-pending').innerHTML = pending.map(rowHtml).join('');

    $('count-active').textContent = active.length;
    $('list-active').innerHTML = active.map(rowHtml).join('');
    $('empty-active').style.display = active.length ? 'none' : 'block';

    $('seg-suspended').style.display = suspended.length ? 'block' : 'none';
    $('count-suspended').textContent = suspended.length;
    $('list-suspended').innerHTML = suspended.map(rowHtml).join('');

    // Gợi ý phòng ban đã dùng (cho lần đổi sau)
    const depts = Array.from(new Set(rows.map(function (r) { return (r.department || '').trim(); }).filter(Boolean)));
    $('dept-list').innerHTML = depts.map(function (d) { return '<option value="' + esc(d) + '">'; }).join('');
  }

  // ---- Thao tác --------------------------------------------------------------
  async function apply(patch, id, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    const { error } = await sb.from('profiles').update(patch).eq('id', id);
    if (error) { window.alert('Không cập nhật được: ' + error.message); return; }
    await load();
  }

  function onListClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (id === me.id) return; // chốt chặn: không thao tác lên chính mình

    if (act === 'approve') {
      apply({ status: 'active' }, id);
    } else if (act === 'reactivate') {
      apply({ status: 'active' }, id, 'Mở khoá cho thành viên này để họ đăng nhập lại?');
    } else if (act === 'suspend') {
      apply({ status: 'suspended' }, id, 'Tạm khoá tài khoản này? Họ sẽ không đăng nhập được cho tới khi mở khoá lại.');
    } else if (act === 'delete') {
      apply({ status: 'deleted' }, id, 'Xoá thành viên này khỏi danh sách? Tài khoản vẫn còn trong hệ thống để khôi phục nếu cần, nhưng sẽ không đăng nhập được.');
    } else if (act === 'to-admin') {
      apply({ role: 'admin' }, id, 'Cấp quyền Admin cho người này? Admin có thể duyệt và quản lý Nhân viên.');
    } else if (act === 'to-user') {
      apply({ role: 'user' }, id, 'Hạ người này về Nhân viên (bỏ quyền Admin)?');
    } else if (act === 'dept') {
      const row = btn.closest('.member-row');
      const current = row ? (row.querySelector('.m-dept') ? row.querySelector('.m-dept').textContent : '') : '';
      const val = window.prompt('Nhập phòng ban cho thành viên này (để trống = xoá phòng ban):', current || '');
      if (val === null) return; // huỷ
      apply({ department: val.trim() }, id);
    }
  }

  // ---- Shell dashboard (drawer mobile + đăng xuất) ---------------------------
  function wireShell() {
    const sidebar = $('sidebar');
    const backdrop = $('sidebar-backdrop');
    const toggle = $('menu-toggle');
    function closeMenu() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
    if (toggle) toggle.addEventListener('click', function () { sidebar.classList.toggle('open'); backdrop.classList.toggle('open'); });
    if (backdrop) backdrop.addEventListener('click', closeMenu);
    const logout = $('btn-logout-side');
    if (logout) logout.addEventListener('click', TSTAuth.signOut);
    // Super Admin dùng được MỌI công cụ (chủ tool quyết 20/07/2026) — giữ mục Công cụ.
  }

  // ---- Khởi động -------------------------------------------------------------
  async function boot() {
    if (!TSTAuth.configured) { $('config-notice').style.display = 'flex'; return; }

    const { profile } = await TSTAuth.requireLogin();

    $('app-shell').style.display = 'flex';
    TSTAuth.initShell();
    me = profile || {};
    wireShell();
    if (profile) $('chip-role').textContent = ROLE_LABEL[profile.role] || 'Nhân viên';

    // Chỉ Super Admin / Admin đang hoạt động mới vào được
    const canView = profile && profile.status === 'active' && (profile.role === 'admin' || profile.role === 'super_admin');
    if (!canView) { $('noaccess-notice').style.display = 'flex'; return; }

    sb = TSTAuth.getClient();
    $('page-content').style.display = 'block';
    $('list-pending').addEventListener('click', onListClick);
    $('list-active').addEventListener('click', onListClick);
    $('list-suspended').addEventListener('click', onListClick);
    $('btn-refresh').addEventListener('click', load);
    load();
  }

  boot();
})();

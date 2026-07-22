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

  // Phòng ban CỐ ĐỊNH (chủ tool chốt 21/07/2026) — thay ô nhập tự do window.prompt.
  // Thêm/bớt phòng ban thì sửa đúng mảng này, không rải chuỗi ra chỗ khác.
  const PHONG_BAN = ['Sale', 'MKT', 'CS', 'Admin'];

  // Danh sách người đang được tick chọn (id). Giữ nguyên qua mỗi lần load lại
  // để bấm một thao tác hàng loạt xong không mất hết lựa chọn còn dở.
  const dangChon = new Set();
  let danhSach = [];   // hồ sơ SAU khi lọc — mọi thao tác hàng loạt chạy trên đây
  let toanBo  = [];    // hồ sơ gốc, chưa lọc — dùng để đếm theo phòng ban
  let locPhongBan = null;  // null = không lọc
  let timKiem = '';        // chuỗi tìm kiếm ĐÃ BỎ DẤU, rỗng = không tìm

  // Bỏ dấu tiếng Việt để gõ "duong" vẫn ra "Dương". Sale gõ nhanh, ít khi bỏ dấu
  // đúng, và tên trong danh sách thì luôn có dấu → không bỏ dấu là tìm gần như
  // không ra ai. `đ/Đ` phải xử riêng vì NFD không tách được nó.
  function khongDau(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().trim();
  }

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

  // ---- Dựng nút thao tác: MỘT hành động chính + menu "⋯" ---------------------
  // Trước đây bày tối đa 4 nút cạnh nhau, trộn 3 kiểu (nút viền, chữ đỏ, nút đặc)
  // → rối mắt và cột bị kéo rộng (chủ tool 21/07). Giờ hiện việc hay dùng nhất
  // theo trạng thái, phần còn lại gom vào menu.
  function actionsFor(p) {
    if (p.id === me.id) return '<span class="m-self">Bạn</span>';
    if (!canManage(p)) return '<span class="m-self">—</span>';

    const isSuper = me.role === 'super_admin';
    const id = p.id;
    let chinh = '';          // hành động chính, luôn hiện
    const menu = [];         // các mục trong menu "⋯"

    if (p.status === 'pending') {
      chinh = '<button class="btn btn-primary btn-sm" data-act="approve" data-id="' + id + '">Duyệt</button>';
    } else if (p.status === 'suspended') {
      chinh = '<button class="btn btn-primary btn-sm" data-act="reactivate" data-id="' + id + '">Mở khoá</button>';
    } else if (p.status === 'active') {
      chinh = '<button class="btn btn-secondary btn-sm" data-act="dept" data-id="' + id + '">Phòng ban</button>';
    }

    if (p.status !== 'active') {
      menu.push('<button data-act="dept" data-id="' + id + '">Đổi phòng ban</button>');
    }
    if (p.status === 'active' && isSuper) {
      if (p.role === 'user') menu.push('<button data-act="to-admin" data-id="' + id + '">Đặt làm Admin</button>');
      else if (p.role === 'admin') menu.push('<button data-act="to-user" data-id="' + id + '">Bỏ quyền Admin</button>');
      else if (p.role === 'super_admin') menu.push('<button data-act="to-admin" data-id="' + id + '">Hạ xuống Admin</button>');
    }
    if (p.status === 'active') {
      menu.push('<div class="m-menu-sep"></div>');
      menu.push('<button class="is-danger" data-act="suspend" data-id="' + id + '">Tạm khoá</button>');
    }
    if (isSuper) {
      if (p.status !== 'active') menu.push('<div class="m-menu-sep"></div>');
      menu.push('<button class="is-danger" data-act="delete" data-id="' + id + '">Xoá khỏi danh sách</button>');
    }

    const nutMenu = menu.length
      ? '<span class="m-more-wrap">' +
          '<button class="m-more" data-more="' + id + '" aria-label="Thao tác khác" aria-haspopup="true">⋯</button>' +
          '<div class="m-menu" data-menu="' + id + '">' + menu.join('') + '</div>' +
        '</span>'
      : '';
    return chinh + nutMenu;
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

    // Chỉ cho tick người mình THỰC SỰ quản lý được — tick rồi mà thao tác bị DB
    // chặn thì vô nghĩa. Chính mình và người ngoài quyền: để ô trống.
    const chonDuoc = canManage(p);
    const oChon = chonDuoc
      ? '<div class="m-check"><input type="checkbox" class="m-pick" data-id="' + p.id + '"' +
        (dangChon.has(p.id) ? ' checked' : '') + ' aria-label="Chọn ' + esc(name) + '"></div>'
      : '<div class="m-check"></div>';

    // 7 ô, THỨ TỰ PHẢI TRÙNG với .member-head trong members.html và với
    // grid-template-columns của .member-table (portal.css). Đổi cột thì đổi cả 3 nơi.
    return '' +
      '<div class="member-row' + (isMe ? ' is-me' : '') +
        (chonDuoc && dangChon.has(p.id) ? ' is-picked' : '') + '">' +
        oChon +
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

  // ---- Đếm người theo phòng ban (cột phải) + lọc nhanh -----------------------
  function veDemPhongBan(rows) {
    const hop = $('ms-depts');
    if (!hop) return;
    const dem = {};
    PHONG_BAN.forEach(function (d) { dem[d] = 0; });
    let chuaXep = 0;
    rows.forEach(function (r) {
      const d = (r.department || '').trim();
      if (Object.prototype.hasOwnProperty.call(dem, d)) dem[d]++;
      else chuaXep++;
    });
    let html = PHONG_BAN.map(function (d) {
      return '<button class="ms-dept' + (locPhongBan === d ? ' is-on' : '') + '" data-dept="' + esc(d) + '">' +
               '<span class="msd-name">' + esc(d) + '</span>' +
               '<span class="msd-count">' + dem[d] + '</span>' +
             '</button>';
    }).join('');
    // Chỉ hiện "Chưa xếp" khi thật sự có người chưa xếp — không bày ô rỗng
    if (chuaXep) {
      html += '<button class="ms-dept' + (locPhongBan === '' ? ' is-on' : '') + '" data-dept="">' +
                '<span class="msd-name">Chưa xếp</span>' +
                '<span class="msd-count">' + chuaXep + '</span>' +
              '</button>';
    }
    hop.innerHTML = html;
  }

  function onDeptClick(e) {
    const btn = e.target.closest('.ms-dept');
    if (!btn) return;
    const d = btn.getAttribute('data-dept');
    locPhongBan = (locPhongBan === d) ? null : d;   // bấm lại chính nó = bỏ lọc
    dangChon.clear();                                // đổi bộ lọc thì bỏ chọn cũ
    load();
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

    const tatCa = data || [];
    // Sắp quyền cao lên trước trong mỗi nhóm cho dễ nhìn
    const rank = { super_admin: 0, admin: 1, user: 2 };
    tatCa.sort(function (a, b) { return (rank[a.role] || 9) - (rank[b.role] || 9); });
    toanBo = tatCa;
    veDanhSach();
  }

  // Vẽ lại danh sách từ `toanBo` — KHÔNG gọi lại Supabase. Gõ tìm kiếm mà mỗi phím
  // một lượt truy vấn thì vừa chậm vừa tốn quota; dữ liệu đã có sẵn trong bộ nhớ rồi.
  function veDanhSach() {
    const tatCa = toanBo;

    // Đếm theo phòng ban dựa trên TOÀN BỘ (không phụ thuộc bộ lọc đang bật),
    // nếu không thì bấm lọc xong mọi con số khác tụt về 0.
    veDemPhongBan(tatCa);

    // Danh sách hiển thị = đã lọc phòng ban + đã lọc theo ô tìm.
    // Mọi thao tác hàng loạt chạy trên danh sách này.
    let rows = locPhongBan
      ? tatCa.filter(function (r) { return (r.department || '').trim() === locPhongBan; })
      : tatCa;
    if (timKiem) {
      rows = rows.filter(function (r) {
        return khongDau(r.full_name).indexOf(timKiem) !== -1
            || khongDau(r.email).indexOf(timKiem) !== -1;
      });
    }
    const oHit = $('mem-hit');
    if (oHit) oHit.textContent = timKiem ? (rows.length + ' kết quả') : '';
    danhSach = rows;
    $('filter-bar').classList.toggle('open', !!locPhongBan);
    if (locPhongBan) $('filter-name').textContent = locPhongBan;
    // Bỏ khỏi danh sách chọn những người đã biến mất sau lần tải này (vd vừa bị xoá)
    const conTon = new Set(rows.map(function (r) { return r.id; }));
    Array.from(dangChon).forEach(function (id) { if (!conTon.has(id)) dangChon.delete(id); });

    const pending = rows.filter(function (r) { return r.status === 'pending'; });
    const active = rows.filter(function (r) { return r.status === 'active'; });
    const suspended = rows.filter(function (r) { return r.status === 'suspended'; });

    // Module tổng quan (cột phải). Null-safe: thẻ nào bị gỡ khỏi HTML thì bỏ qua,
    // đừng để cả hàm tải danh sách chết vì một thẻ thống kê không còn (đã dính:
    // gỡ thẻ "Tạm khoá" ngày 21/07 mà quên dòng ghi ở đây).
    const setSo = function (id, v) { const e = $(id); if (e) e.textContent = v; };
    setSo('ms-total', rows.length);
    setSo('ms-pending', pending.length);
    setSo('ms-active', active.length);
    setSo('ms-suspended', suspended.length);

    $('seg-pending').style.display = pending.length ? 'block' : 'none';
    $('count-pending').textContent = pending.length;
    $('list-pending').innerHTML = pending.map(rowHtml).join('');

    $('count-active').textContent = active.length;
    $('list-active').innerHTML = active.map(rowHtml).join('');
    $('empty-active').style.display = active.length ? 'none' : 'block';

    $('seg-suspended').style.display = suspended.length ? 'block' : 'none';
    $('count-suspended').textContent = suspended.length;
    $('list-suspended').innerHTML = suspended.map(rowHtml).join('');

    capNhatThanhHangLoat();
  }

  // ---- Thao tác --------------------------------------------------------------
  async function apply(patch, id, confirmText, tone) {
    if (confirmText && !(await showAppConfirm(confirmText, { tone: tone || 'warning' }))) return;
    const { error } = await sb.from('profiles').update(patch).eq('id', id);
    if (error) { await showAppAlert(error.message, { title: 'Không cập nhật được', tone: 'danger' }); return; }
    await load();
  }

  // ---- Hộp thoại chọn phòng ban (thay window.prompt) -------------------------
  // Dùng chung cho cả sửa 1 người lẫn đổi hàng loạt. Trả về qua callback vì cần
  // chờ người dùng bấm Lưu.
  let deptCallback = null;
  function moHopPhongBan(tieuDe, giaTriHienTai, xong) {
    const sel = $('dept-select');
    sel.innerHTML = '<option value="">— Không thuộc phòng ban —</option>' +
      PHONG_BAN.map(function (d) {
        return '<option value="' + esc(d) + '"' + (d === giaTriHienTai ? ' selected' : '') + '>' + esc(d) + '</option>';
      }).join('');
    $('dept-who').textContent = tieuDe;
    deptCallback = xong;
    $('dept-backdrop').classList.add('open');
    $('dept-backdrop').setAttribute('aria-hidden', 'false');
    sel.focus();
  }
  function dongHopPhongBan() {
    deptCallback = null;
    $('dept-backdrop').classList.remove('open');
    $('dept-backdrop').setAttribute('aria-hidden', 'true');
  }

  // ---- Chọn nhiều + thao tác hàng loạt --------------------------------------
  function capNhatThanhHangLoat() {
    const n = dangChon.size;
    const bar = $('bulk-bar');
    bar.classList.toggle('open', n > 0);
    $('bulk-count').textContent = 'Đã chọn ' + n;
    // Xoá là quyền riêng của Super Admin
    const btnXoa = $('bulk-delete');
    if (btnXoa) btnXoa.style.display = me.role === 'super_admin' ? '' : 'none';
    // Đồng bộ ô "chọn tất cả" của từng nhóm
    document.querySelectorAll('.member-table').forEach(function (tbl) {
      const all = tbl.querySelector('.pick-all');
      const oCon = Array.from(tbl.querySelectorAll('.m-pick'));
      if (!all) return;
      const daTick = oCon.filter(function (c) { return c.checked; }).length;
      all.checked = oCon.length > 0 && daTick === oCon.length;
      all.indeterminate = daTick > 0 && daTick < oCon.length;
      all.disabled = oCon.length === 0;
    });
  }

  function onPickChange(e) {
    const box = e.target;
    if (box.classList.contains('pick-all')) {
      const tbl = box.closest('.member-table');
      tbl.querySelectorAll('.m-pick').forEach(function (c) {
        c.checked = box.checked;
        if (box.checked) dangChon.add(c.getAttribute('data-id'));
        else dangChon.delete(c.getAttribute('data-id'));
        c.closest('.member-row').classList.toggle('is-picked', box.checked);
      });
      capNhatThanhHangLoat();
      return;
    }
    if (!box.classList.contains('m-pick')) return;
    const id = box.getAttribute('data-id');
    if (box.checked) dangChon.add(id); else dangChon.delete(id);
    box.closest('.member-row').classList.toggle('is-picked', box.checked);
    capNhatThanhHangLoat();
  }

  // Lọc ra những người mà thao tác này THỰC SỰ áp dụng được — tránh gọi DB
  // những lệnh chắc chắn bị trigger từ chối.
  function nguoiHopLe(act) {
    return danhSach.filter(function (p) {
      if (!dangChon.has(p.id) || !canManage(p)) return false;
      if (act === 'approve') return p.status === 'pending';
      if (act === 'suspend') return p.status === 'active';
      if (act === 'reactivate') return p.status === 'suspended';
      if (act === 'delete') return me.role === 'super_admin';
      if (act === 'dept') return true;
      return false;
    });
  }

  async function chayHangLoat(act, patch, hoiTruoc) {
    const ds = nguoiHopLe(act);
    if (!ds.length) {
      await showAppAlert('Không có ai trong danh sách đang chọn phù hợp với thao tác này.',
        { title: 'Chưa làm được', tone: 'warning' });
      return;
    }
    if (hoiTruoc && !(await showAppConfirm(hoiTruoc.replace('{n}', ds.length),
      { tone: act === 'delete' ? 'danger' : 'warning' }))) return;
    setLoading(true);
    const loi = [];
    for (const p of ds) {
      const { error } = await sb.from('profiles').update(patch).eq('id', p.id);
      if (error) loi.push((p.full_name || p.email || p.id) + ': ' + error.message);
    }
    dangChon.clear();
    setLoading(false);
    if (loi.length) await showAppAlert(loi.join('\n'),
      { title: 'Có ' + loi.length + ' người không cập nhật được', tone: 'danger' });
    await load();
  }

  function onBulkClick(e) {
    const btn = e.target.closest('button[data-bulk]');
    if (!btn) return;
    const act = btn.getAttribute('data-bulk');
    if (act === 'approve') chayHangLoat('approve', { status: 'active' }, 'Duyệt {n} tài khoản đang chọn?');
    else if (act === 'suspend') chayHangLoat('suspend', { status: 'suspended' }, 'Tạm khoá {n} tài khoản? Họ sẽ không đăng nhập được cho tới khi mở khoá.');
    else if (act === 'reactivate') chayHangLoat('reactivate', { status: 'active' }, 'Mở khoá {n} tài khoản?');
    else if (act === 'delete') chayHangLoat('delete', { status: 'deleted' }, 'Xoá {n} thành viên khỏi danh sách? Tài khoản vẫn còn trong hệ thống nhưng không đăng nhập được.');
    else if (act === 'dept') {
      const ds = nguoiHopLe('dept');
      if (!ds.length) { showAppAlert('Chưa chọn ai trong danh sách.', { tone: 'warning' }); return; }
      moHopPhongBan('Đổi phòng ban cho ' + ds.length + ' thành viên đang chọn.', '', function (val) {
        chayHangLoat('dept', { department: val });
      });
    }
  }

  // Đóng mọi menu "⋯" đang mở
  function dongMenu() {
    document.querySelectorAll('.m-menu.open').forEach(function (m) { m.classList.remove('open'); });
  }

  function onListClick(e) {
    // Nút "⋯" — mở/đóng menu của đúng hàng đó
    const more = e.target.closest('.m-more');
    if (more) {
      const menu = more.parentElement.querySelector('.m-menu');
      const dangMo = menu.classList.contains('open');
      dongMenu();
      if (!dangMo) menu.classList.add('open');
      e.stopPropagation();
      return;
    }

    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    dongMenu();
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
      const p = danhSach.find(function (x) { return x.id === id; });
      const hienTai = p && p.department ? p.department.trim() : '';
      const ten = p && p.full_name ? p.full_name.trim() : (p ? p.email : '');
      moHopPhongBan('Chọn phòng ban cho: ' + (ten || 'thành viên này'), hienTai, function (val) {
        apply({ department: val }, id);
      });
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
    TSTAuth.initDoiMatKhau();

    // Ô tìm thành viên. Lọc ngay trong bộ nhớ nên gõ tới đâu thấy tới đó, không debounce.
    const oTim = $('mem-search');
    const nutXoa = $('mem-search-clear');
    if (oTim) {
      oTim.addEventListener('input', function () {
        timKiem = khongDau(oTim.value);
        // Bỏ chọn những người vừa bị lọc ra khỏi màn hình — nếu giữ, người dùng bấm
        // "Duyệt" sẽ tác động lên cả người họ KHÔNG còn nhìn thấy. Nguy hiểm thầm lặng.
        dangChon.clear();
        if (nutXoa) nutXoa.style.display = oTim.value ? 'flex' : 'none';
        veDanhSach();
      });
      // type="search" trên Chrome có nút X riêng, bấm nó chỉ bắn 'search' chứ không 'input'
      oTim.addEventListener('search', function () { oTim.dispatchEvent(new Event('input')); });
      oTim.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && oTim.value) { e.stopPropagation(); oTim.value = ''; oTim.dispatchEvent(new Event('input')); }
      });
    }
    // Đo chiều cao THẬT của thanh công cụ rồi ghi vào biến CSS --bulk-h, để hàng
    // tiêu đề cột dính đúng ngay dưới nó. Hardcode con số sẽ sai khi thanh xuống
    // dòng ở màn hẹp, hoặc khi nhóm nút hàng loạt hiện ra làm nó cao thêm.
    const thanh = $('bulk-bar');
    if (thanh && window.ResizeObserver) {
      new ResizeObserver(function () {
        document.documentElement.style.setProperty('--bulk-h', thanh.offsetHeight + 'px');
      }).observe(thanh);
    }

    if (nutXoa) {
      nutXoa.style.display = 'none';
      nutXoa.addEventListener('click', function () {
        oTim.value = ''; oTim.dispatchEvent(new Event('input')); oTim.focus();
      });
    }
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

    // Ô chọn: bắt ở cấp #page-content vì hàng được vẽ lại sau mỗi lần load,
    // gắn trực tiếp vào từng ô sẽ mất listener.
    $('page-content').addEventListener('change', onPickChange);
    $('bulk-bar').addEventListener('click', onBulkClick);
    $('bulk-clear').addEventListener('click', function () {
      dangChon.clear();
      document.querySelectorAll('.m-pick').forEach(function (c) {
        c.checked = false;
        c.closest('.member-row').classList.remove('is-picked');
      });
      capNhatThanhHangLoat();
    });

    // Lọc theo phòng ban (cột phải) + bỏ lọc
    $('ms-depts').addEventListener('click', onDeptClick);
    $('filter-clear').addEventListener('click', function () {
      locPhongBan = null; dangChon.clear(); load();
    });

    // Bấm ra ngoài / Esc → đóng menu "⋯"
    document.addEventListener('click', dongMenu);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongMenu(); });

    // Thêm thành viên — KHÔNG tạo tài khoản trực tiếp được từ trình duyệt:
    // muốn tạo hộ người khác phải dùng khoá service_role của Supabase, mà khoá đó
    // tuyệt đối không được nhúng vào web (ai xem mã nguồn cũng thấy → toàn quyền
    // database). Nên luồng đúng là: gửi link đăng ký → họ tự tạo → admin duyệt.
    $('btn-add-member').addEventListener('click', function () {
      $('add-link').value = location.origin + '/login';
      $('add-backdrop').classList.add('open');
      $('add-backdrop').setAttribute('aria-hidden', 'false');
      $('add-link').select();
    });
    function dongThemThanhVien() {
      $('add-backdrop').classList.remove('open');
      $('add-backdrop').setAttribute('aria-hidden', 'true');
    }
    $('add-close').addEventListener('click', dongThemThanhVien);
    $('add-cancel').addEventListener('click', dongThemThanhVien);
    $('add-backdrop').addEventListener('click', function (e) {
      if (e.target === $('add-backdrop')) dongThemThanhVien();
    });
    $('add-copy').addEventListener('click', function () {
      const o = $('add-link'); o.select();
      navigator.clipboard.writeText(o.value).then(function () {
        const b = $('add-copy'); const cu = b.textContent;
        b.textContent = 'Đã sao chép ✓';
        setTimeout(function () { b.textContent = cu; }, 1800);
      }).catch(function () { document.execCommand('copy'); });
    });

    // Hộp thoại phòng ban
    $('dept-save').addEventListener('click', function () {
      const val = $('dept-select').value;
      const cb = deptCallback;
      dongHopPhongBan();
      if (cb) cb(val);
    });
    $('dept-cancel').addEventListener('click', dongHopPhongBan);
    $('dept-close').addEventListener('click', dongHopPhongBan);
    $('dept-backdrop').addEventListener('click', function (e) {
      if (e.target === $('dept-backdrop')) dongHopPhongBan();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('dept-backdrop').classList.contains('open')) dongHopPhongBan();
    });

    load();
  }

  boot();
})();

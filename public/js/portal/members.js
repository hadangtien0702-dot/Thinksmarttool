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

  // Quyền được phép TẠO qua form Thêm tài khoản (KHÔNG tạo super_admin qua UI).
  // Server cũng kiểm lại theo ROLE_TAO_HOP_LE — đây chỉ là danh sách cho dropdown.
  const QUYEN_TAO_MOI = ['user', 'admin'];

  // Danh sách người đang được tick chọn (id). Giữ nguyên qua mỗi lần load lại
  // để bấm một thao tác hàng loạt xong không mất hết lựa chọn còn dở.
  const dangChon = new Set();
  let danhSach = [];   // hồ sơ SAU khi lọc — mọi thao tác hàng loạt chạy trên đây
  let toanBo  = [];    // hồ sơ gốc, chưa lọc — dùng để đếm theo phòng ban
  let locPhongBan = null;  // null = không lọc
  // Lọc theo quyền — chủ tool 22/07 chỉ cần DUY NHẤT "Admin". null = không lọc.
  // GỘP CẢ `super_admin`: người đó có quyền cao hơn admin, hỏi "ai đang có quyền
  // quản trị" mà bỏ sót họ là sai. Con số trên nút vì vậy đếm cả hai.
  let locQuyen = null;
  const QUYEN_QUAN_TRI = ['admin', 'super_admin'];
  let timKiem = '';        // chuỗi tìm kiếm ĐÃ BỎ DẤU, rỗng = không tìm
  let usageLoaded = false;  // tab Đo lường đã nạp lần đầu chưa (nạp lười khi mở tab)
  let usageEvents = [];     // sự kiện 90 ngày gần nhất (nạp 1 lần, lọc khoảng ở client)
  let khoangFrom = null;    // khoảng ngày đang xem (biểu đồ + bảng) — mặc định 14 ngày
  let khoangTo = null;

  // --- PHÂN TRANG (22/07: chủ tool "phải scroll", xin chuyển sang dạng lật trang) ---
  // 12 hàng/trang: hàng cao 54px → 12×54 ≈ 650px, vừa một màn hình cùng tiêu đề và
  // thanh công cụ mà không phải cuộn. Đổi số này là đổi luôn cảm giác dùng, đừng
  // tăng bừa lên 20-30 rồi lại phải cuộn — mất đúng thứ vừa sửa.
  const MOI_TRANG = 12;
  const trang = { pending: 1, active: 1, suspended: 1 };
  // Dữ liệu TỪNG NHÓM sau khi lọc — giữ NGUYÊN VẸN, không cắt theo trang.
  // Ô "chọn tất cả" và mọi thao tác hàng loạt đọc từ đây, nên chúng vẫn tác động lên
  // CẢ NHÓM chứ không chỉ trang đang xem (xem ghi chú ở onPickChange).
  const nhom = { pending: [], active: [], suspended: [] };

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

    const isSuper = me.role === 'super_admin';
    const id = p.id;
    let chinh = '';          // hành động chính, luôn hiện
    const menu = [];         // các mục trong menu "⋯"

    // Duyệt / khoá / đổi role / xoá — theo canManage (super_admin: mọi người; admin: chỉ 'user')
    if (canManage(p)) {
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
    }

    // "Đổi mật khẩu": admin & super_admin đổi được cho MỌI thành viên đang active (chủ tool 23/07:
    // "admin làm luôn"). Tách khỏi canManage (đó là quyền khoá/xoá/đổi role, không phải reset pass).
    if (p.status === 'active') {
      if (menu.length) menu.push('<div class="m-menu-sep"></div>');
      menu.push('<button data-act="reset-pw" data-id="' + id + '">Đổi mật khẩu</button>');
    }

    if (!chinh && !menu.length) return '<span class="m-self">—</span>';

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

  // Nút lọc theo quyền — chỉ MỘT nút "Admin" (chủ tool 22/07).
  // Đếm trên TOÀN BỘ, không phụ thuộc bộ lọc đang bật — giống veDemPhongBan,
  // nếu không thì bấm lọc xong con số tự tụt về chính nó.
  function veDemQuyen(rows) {
    const hop = $('ms-roles');
    if (!hop) return;
    const n = rows.filter(function (r) { return QUYEN_QUAN_TRI.indexOf(r.role) !== -1; }).length;
    hop.innerHTML =
      '<button class="ms-dept' + (locQuyen ? ' is-on' : '') + '" data-role="admin">' +
        '<span class="msd-name">Admin</span>' +
        '<span class="msd-count">' + n + '</span>' +
      '</button>';
  }

  function onRoleClick(e) {
    const btn = e.target.closest('[data-role]');
    if (!btn) return;
    locQuyen = locQuyen ? null : 'admin';   // bấm lại chính nó = bỏ lọc
    trang.pending = trang.active = trang.suspended = 1;
    dangChon.clear();                        // xem ghi chú ở ô tìm: đổi bộ lọc là bỏ chọn
    veDanhSach();
  }

  function onDeptClick(e) {
    const btn = e.target.closest('.ms-dept');
    if (!btn) return;
    const d = btn.getAttribute('data-dept');
    locPhongBan = (locPhongBan === d) ? null : d;   // bấm lại chính nó = bỏ lọc
    trang.pending = trang.active = trang.suspended = 1;  // lọc lại thì về trang đầu
    dangChon.clear();                                // đổi bộ lọc thì bỏ chọn cũ
    // Trước 22/07 chỗ này gọi load() — nạp LẠI từ Supabase chỉ để lọc, trong khi dữ
    // liệu đã nằm sẵn trong `toanBo`. Vừa chậm vừa tốn quota, lại khác hẳn cách bộ
    // lọc quyền và ô tìm làm việc. Cho cả ba dùng chung veDanhSach() để hành vi
    // giống nhau (nhất là việc reset trang — thiếu nó thì lọc xong còn kẹt ở trang 3).
    veDanhSach();
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
    veDemQuyen(tatCa);

    // Danh sách hiển thị = đã lọc phòng ban + đã lọc theo ô tìm.
    // Mọi thao tác hàng loạt chạy trên danh sách này.
    let rows = locPhongBan
      ? tatCa.filter(function (r) { return (r.department || '').trim() === locPhongBan; })
      : tatCa;
    if (locQuyen) {
      rows = rows.filter(function (r) { return QUYEN_QUAN_TRI.indexOf(r.role) !== -1; });
    }
    if (timKiem) {
      rows = rows.filter(function (r) {
        return khongDau(r.full_name).indexOf(timKiem) !== -1
            || khongDau(r.email).indexOf(timKiem) !== -1;
      });
    }
    const oHit = $('mem-hit');
    if (oHit) oHit.textContent = timKiem ? (rows.length + ' kết quả') : '';
    danhSach = rows;
    const dangLoc = [];
    if (locPhongBan !== null) dangLoc.push('phòng ban ' + (locPhongBan || 'Chưa xếp'));
    if (locQuyen) dangLoc.push('quyền Admin');
    $('filter-bar').classList.toggle('open', dangLoc.length > 0);
    if (dangLoc.length) $('filter-name').textContent = dangLoc.join(' + ');
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
    // Chỉ hiện hàng "Tạm khoá" khi CÓ người bị khoá. Không có mà vẫn bày số 0 thì
    // thành nhiễu; nhưng CÓ mà không bày thì tổng không khớp — 22/07 chủ tool bắt
    // đúng lỗi này: Tổng 72, Đang hoạt động 71, mất tiêu 1 người.
    const hangKhoa = $('ms-row-suspended');
    if (hangKhoa) hangKhoa.style.display = suspended.length ? '' : 'none';

    nhom.pending = pending; nhom.active = active; nhom.suspended = suspended;

    $('seg-pending').style.display = pending.length ? 'block' : 'none';
    $('count-pending').textContent = pending.length;
    veNhom('pending');

    $('count-active').textContent = active.length;
    veNhom('active');
    $('empty-active').style.display = active.length ? 'none' : 'block';

    $('seg-suspended').style.display = suspended.length ? 'block' : 'none';
    $('count-suspended').textContent = suspended.length;
    veNhom('suspended');

    capNhatThanhHangLoat();
  }

  // Vẽ MỘT nhóm: cắt đúng trang đang xem + dựng thanh lật trang.
  function veNhom(khoa) {
    const ds = nhom[khoa];
    const soTrang = Math.max(1, Math.ceil(ds.length / MOI_TRANG));
    // Kẹp lại số trang: xoá/lọc bớt người có thể làm trang hiện tại không còn tồn tại
    // → không kẹp thì màn hình trắng trơn mà không hiểu vì sao.
    if (trang[khoa] > soTrang) trang[khoa] = soTrang;
    if (trang[khoa] < 1) trang[khoa] = 1;

    const dau = (trang[khoa] - 1) * MOI_TRANG;
    $('list-' + khoa).innerHTML = ds.slice(dau, dau + MOI_TRANG).map(rowHtml).join('');

    const oLat = $('pager-' + khoa);
    if (!oLat) return;
    if (soTrang <= 1) { oLat.innerHTML = ''; oLat.style.display = 'none'; return; }
    oLat.style.display = 'flex';
    oLat.innerHTML =
      '<span class="pager-info">' + (dau + 1) + '–' + Math.min(dau + MOI_TRANG, ds.length) +
        ' trên ' + ds.length + '</span>' +
      '<span class="pager-sep"></span>' +
      '<button type="button" class="pager-nut" data-trang="truoc" data-nhom="' + khoa + '"' +
        (trang[khoa] === 1 ? ' disabled' : '') + ' aria-label="Trang trước">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      soNut(khoa, soTrang) +
      '<button type="button" class="pager-nut" data-trang="sau" data-nhom="' + khoa + '"' +
        (trang[khoa] === soTrang ? ' disabled' : '') + ' aria-label="Trang sau">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>';
  }

  // Dãy số trang. Nhiều trang thì rút gọn bằng "…" để thanh không dài ra vô tận.
  function soNut(khoa, soTrang) {
    const hienTai = trang[khoa];
    const ds = [];
    for (let i = 1; i <= soTrang; i++) {
      if (i === 1 || i === soTrang || Math.abs(i - hienTai) <= 1) ds.push(i);
      else if (ds[ds.length - 1] !== '…') ds.push('…');
    }
    return ds.map(function (i) {
      if (i === '…') return '<span class="pager-cham">…</span>';
      return '<button type="button" class="pager-nut pager-so' + (i === hienTai ? ' dang-xem' : '') +
             '" data-trang="' + i + '" data-nhom="' + khoa + '"' +
             (i === hienTai ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }).join('');
  }

  function onPagerClick(e) {
    const nut = e.target.closest('.pager-nut');
    if (!nut || nut.disabled) return;
    const khoa = nut.dataset.nhom;
    const v = nut.dataset.trang;
    const soTrang = Math.max(1, Math.ceil(nhom[khoa].length / MOI_TRANG));
    if (v === 'truoc') trang[khoa] = Math.max(1, trang[khoa] - 1);
    else if (v === 'sau') trang[khoa] = Math.min(soTrang, trang[khoa] + 1);
    else trang[khoa] = Number(v);
    veNhom(khoa);
    capNhatThanhHangLoat();
    // Kéo về đầu nhóm — lật trang mà mắt còn ở giữa danh sách thì mất phương hướng.
    // ⚠️ KHÔNG dùng `scrollIntoView` trần: nó đưa phần tử lên sát mép trên cửa sổ, mà
    // mép trên đang bị các thanh DÍNH (`.topbar`, `.bulk-bar`) che → hàng đầu chui
    // xuống dưới chúng. Phải trừ đi chiều cao các thanh đó. Đo tại thời điểm bấm chứ
    // không hardcode: thanh công cụ cao thấp khác nhau tuỳ có đang chọn người hay không.
    const seg = $('list-' + khoa).closest('.seg');
    if (!seg) return;
    let che = 0;
    ['.topbar', '#bulk-bar'].forEach(function (sel) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).position === 'sticky') che += el.offsetHeight;
    });
    const y = seg.getBoundingClientRect().top + window.scrollY - che - 24;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  // ---- Gọi API admin (server dùng service_role) — LUÔN kèm token đăng nhập -----
  async function goiAdminApi(path, body) {
    const session = await TSTAuth.getSession();
    if (!session) { await showAppAlert('Phiên đăng nhập đã hết hạn. Mời đăng nhập lại.', { tone: 'warning' }); return null; }
    let res, data;
    try {
      res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify(body || {})
      });
      data = await res.json().catch(function () { return {}; });
    } catch (e) {
      await showAppAlert('Không gọi được máy chủ: ' + e.message, { title: 'Lỗi kết nối', tone: 'danger' });
      return null;
    }
    if (!res.ok) {
      await showAppAlert((data && data.error) || ('Lỗi ' + res.status), { title: 'Không thực hiện được', tone: 'danger' });
      return null;
    }
    return data;
  }

  // Đổi mật khẩu 1 thành viên (admin & super_admin — chủ tool 23/07). Admin GÕ ĐƯỢC mật khẩu
  // tuỳ ý; điền sẵn Drt$2022 để giữ mặc định cho nhanh nếu muốn.
  async function doiMatKhauThanhVien(id) {
    const p = danhSach.find(function (x) { return x.id === id; });
    const ten = p ? (p.full_name || p.email || 'thành viên này') : 'thành viên này';
    const nhap = await showAppPrompt('Mật khẩu mới cho “' + ten + '” (giữ mặc định hoặc gõ mật khẩu khác):',
      { title: 'Đổi mật khẩu', initialValue: 'Drt$2022', confirmText: 'Đổi mật khẩu' });
    if (nhap === null) return;   // bấm Huỷ
    const pass = String(nhap).trim();
    if (pass.length < 6) { await showAppAlert('Mật khẩu cần tối thiểu 6 ký tự.', { tone: 'warning' }); return; }
    setLoading(true);
    const data = await goiAdminApi('/api/admin/reset-password', { userId: id, password: pass });
    setLoading(false);
    if (!data) return;
    await showAppAlert('Đã đổi mật khẩu cho “' + ten + '”.\n\nMật khẩu mới:  ' + data.password +
      '\n\nGửi cho họ.', { title: 'Xong', tone: 'success' });
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

    // --- Nút nào áp dụng được thì mới hiện, kèm SỐ NGƯỜI thực sự bị tác động ---
    // `nguoiHopLe()` vốn đã tính sẵn (dùng để chặn gọi DB thừa); giờ dùng luôn nó để
    // quyết định hiển thị. Trước đây luôn bày đủ 5 nút, bấm vào mới báo "không có ai
    // phù hợp" — đó là bắt người dùng thử-và-sai, và là lý do thanh này nhìn rối.
    let uuTien = null;   // nút sẽ được tô primary
    document.querySelectorAll('.bulk-act').forEach(function (nut) {
      const act = nut.dataset.bulk;
      const soNguoi = nguoiHopLe(act).length;
      nut.style.display = soNguoi ? '' : 'none';
      // Chỉ hiện số khi nó KHÁC tổng đang chọn — bằng nhau thì con số là thừa,
      // "Đã chọn 5" ngay bên trái đã nói rồi.
      const oSo = nut.querySelector('.bulk-n');
      if (oSo) oSo.textContent = (soNguoi && soNguoi !== n) ? String(soNguoi) : '';
      // Thứ tự ưu tiên việc chính: duyệt người mới > mở khoá > đổi phòng ban.
      // KHÔNG bao giờ để việc phá huỷ (tạm khoá/xoá) làm nút primary.
      if (soNguoi && !uuTien && ['approve', 'reactivate', 'dept'].indexOf(act) !== -1) uuTien = nut;
      nut.classList.remove('btn-primary');
    });
    if (uuTien) { uuTien.classList.remove('btn-secondary'); uuTien.classList.add('btn-primary'); }
    document.querySelectorAll('.bulk-act:not(.btn-primary)').forEach(function (nut) {
      if (!nut.classList.contains('btn-warn-outline') && !nut.classList.contains('btn-danger-outline')) {
        nut.classList.add('btn-secondary');
      }
    });

    // Xoá là quyền riêng của Super Admin (đè lên phần tính ở trên)
    const btnXoa = $('bulk-delete');
    if (btnXoa && me.role !== 'super_admin') btnXoa.style.display = 'none';
    // Đồng bộ ô "chọn tất cả" — tính theo DỮ LIỆU CẢ NHÓM, không theo hàng đang hiển thị.
    // Tính theo hàng hiển thị thì lật sang trang chưa chọn ai là ô này tự bỏ tick, dù
    // 40 người ở trang khác vẫn đang được chọn — sai và gây hiểu nhầm nguy hiểm.
    document.querySelectorAll('.member-table').forEach(function (tbl) {
      const all = tbl.querySelector('.pick-all');
      if (!all) return;
      const khoa = ((tbl.querySelector('.member-list') || {}).id || '').replace('list-', '');
      const ds = (nhom[khoa] || []).filter(canManage);
      const daChon = ds.filter(function (p) { return dangChon.has(p.id); }).length;
      all.checked = ds.length > 0 && daChon === ds.length;
      all.indeterminate = daChon > 0 && daChon < ds.length;
      all.disabled = ds.length === 0;
    });
  }

  function onPickChange(e) {
    const box = e.target;
    if (box.classList.contains('pick-all')) {
      // ⚠️ Từ khi có phân trang, KHÔNG được duyệt theo `.m-pick` trên màn hình nữa —
      // làm vậy thì "chọn tất cả" chỉ chọn 12 người của trang đang xem, trong khi
      // tiêu đề vẫn ghi "Thành viên 51". Người dùng tưởng đã chọn hết cả 51.
      // Chọn theo DỮ LIỆU của cả nhóm, rồi mới đồng bộ ô tick đang hiển thị.
      const tbl = box.closest('.member-table');
      const khoa = (tbl.querySelector('.member-list') || {}).id || '';
      const ds = nhom[khoa.replace('list-', '')] || [];
      ds.forEach(function (p) {
        if (!canManage(p)) return;              // không tự chọn người mình không quản được
        if (box.checked) dangChon.add(p.id); else dangChon.delete(p.id);
      });
      tbl.querySelectorAll('.m-pick').forEach(function (c) {
        const co = dangChon.has(c.getAttribute('data-id'));
        c.checked = co;
        c.closest('.member-row').classList.toggle('is-picked', co);
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
    } else if (act === 'reset-pw') {
      doiMatKhauThanhVien(id);
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
        trang.pending = trang.active = trang.suspended = 1;   // lọc lại thì về trang đầu
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

  // ---- ĐO LƯỜNG SỬ DỤNG (N1, 23/07/2026) — CHỈ Super Admin --------------------
  // Đọc usage_events (RLS chỉ cho super_admin đọc). Nạp LƯỜI: chỉ query khi mở tab.
  const NGAY_MS = 24 * 60 * 60 * 1000;
  function ngayKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function batDauNgay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function fmtNgay(d) { return d.getDate() + '/' + (d.getMonth() + 1); }
  function fmtInput(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parseInput(v) { const p = (v || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }

  function thoiGianTuong(ts) {
    if (!ts) return '<span class="ur-never">chưa</span>';
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    const d = Math.floor(s / 86400);
    if (d === 1) return 'hôm qua';
    if (d < 30) return d + ' ngày trước';
    const dt = new Date(ts);
    return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
  }

  function initTracking() {
    if (!me || me.role !== 'super_admin') return;   // tab chỉ dành cho super_admin
    $('ms-tabs').style.display = '';   // bỏ inline none → về CSS inline-flex (hug nội dung)
    $('tab-members').addEventListener('click', function () { doiTab('members'); });
    $('tab-usage').addEventListener('click', function () { doiTab('usage'); });
    // Hộp "Xem theo ngày": input từ/đến + nút nhanh → lọc biểu đồ + bảng (không đụng 3 thẻ trên)
    $('usage-from').addEventListener('change', doiKhoangTuInput);
    $('usage-to').addEventListener('change', doiKhoangTuInput);
    $('usage-presets').addEventListener('click', function (e) {
      const b = e.target.closest('[data-preset]');
      if (b) datPreset(parseInt(b.getAttribute('data-preset'), 10));
    });
    // Bấm dòng "Tải về" → popup chi tiết tải gì
    $('uk-download-row').addEventListener('click', moChiTietTaiVe);
    // Bấm 👁 → bung/gập khối "sale đã điền gì"
    $('dl-rows').addEventListener('click', function (e) {
      const b = e.target.closest('.dl-eye');
      if (!b) return;
      const d = $('dl-detail-' + b.getAttribute('data-idx'));
      if (d) { d.hidden = !d.hidden; b.classList.toggle('is-open', !d.hidden); }
    });
    $('dl-close').addEventListener('click', dongChiTietTaiVe);
    $('dl-backdrop').addEventListener('click', function (e) { if (e.target === $('dl-backdrop')) dongChiTietTaiVe(); });
    // Thanh "đang online" → mở modal chi tiết
    $('online-bar').addEventListener('click', moOnlineModal);
    $('online-close').addEventListener('click', dongOnlineModal);
    $('online-backdrop').addEventListener('click', function (e) { if (e.target === $('online-backdrop')) dongOnlineModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('dl-backdrop').classList.contains('open')) dongChiTietTaiVe();
      if ($('online-backdrop').classList.contains('open')) dongOnlineModal();
    });
  }

  function doiTab(which) {
    const usage = which === 'usage';
    $('tab-members').classList.toggle('is-on', !usage);
    $('tab-members').setAttribute('aria-selected', String(!usage));
    $('tab-usage').classList.toggle('is-on', usage);
    $('tab-usage').setAttribute('aria-selected', String(usage));
    $('page-content').style.display = usage ? 'none' : 'block';
    $('tracking-content').style.display = usage ? 'block' : 'none';
    if (usage) batDauOnline(); else dungOnline();   // "đang online" chỉ chạy khi xem tab
    if (usage && !usageLoaded) { usageLoaded = true; taiDoLuong(); }
  }

  // ---- Đang online (presence, N3, 23/07/2026) ---------------------------
  // Đọc `presence` (RLS super_admin) mỗi 30s KHI đang mở tab Đo lường; ai last_seen < 2' = online.
  const ONLINE_WINDOW_MS = 2 * 60 * 1000;   // ngưỡng "còn online"
  const ONLINE_POLL_MS = 30 * 1000;         // nhịp tự làm mới
  let onlineTimer = null;
  let onlineRows = [];   // [{r: dòng presence, p: profile}] của lần poll gần nhất

  function batDauOnline() {
    if (onlineTimer) return;
    taiOnline();                                  // vẽ ngay, khỏi chờ nhịp đầu
    onlineTimer = setInterval(taiOnline, ONLINE_POLL_MS);
  }
  function dungOnline() {
    if (onlineTimer) { clearInterval(onlineTimer); onlineTimer = null; }
  }

  function viTriTrang(page) {
    const p = String(page || '');
    if (/tool/.test(p)) return 'Đang mở Tool';
    if (/members/.test(p)) return 'Trang thành viên';
    if (/videos/.test(p)) return 'Xem video';
    if (/portal|index/.test(p)) return 'Trang chính';
    return p ? esc(p) : '—';
  }

  // Nhóm vị trí để đếm chip trên thanh: tool / videos / còn lại = portal.
  function nhomViTri(page) {
    const p = String(page || '');
    if (/tool/.test(p)) return 'tool';
    if (/videos/.test(p)) return 'videos';
    return 'portal';
  }

  async function taiOnline() {
    const hint = $('online-hint');
    if (!$('online-bar')) return;
    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    let resp;
    try {
      resp = await sb.from('presence')
        .select('user_id, last_seen, page')
        .gte('last_seen', since)
        .order('last_seen', { ascending: false });
    } catch (e) { return; }   // lỗi mạng tạm — giữ nguyên màn, nhịp sau thử lại
    const { data, error } = resp;
    if (error) {
      const chuaCo = /presence/.test(error.message || '') &&
        /(does not exist|could not find|schema cache)/i.test(error.message || '');
      if (chuaCo) { dungOnline(); if (hint) hint.textContent = "Bảng 'presence' chưa được tạo — chạy SQL trong schema.sql."; }
      onlineRows = []; veOnlineBar(); if (onlineModalMo()) veOnlineChiTiet();
      return;
    }
    if (hint) hint.textContent = '';
    const pmap = {}; (toanBo || []).forEach(function (p) { pmap[p.id] = p; });
    onlineRows = (data || []).map(function (r) { return { r: r, p: pmap[r.user_id] || {} }; });
    veOnlineBar();
    if (onlineModalMo()) veOnlineChiTiet();   // modal đang mở → cập nhật luôn cho tươi
  }

  // Thanh tóm tắt (luôn hiện): số tổng + chip theo vị trí. Bấm → modal chi tiết.
  function veOnlineBar() {
    $('online-count').textContent = String(onlineRows.length);
    const b = { tool: 0, portal: 0, videos: 0 };
    onlineRows.forEach(function (o) { b[nhomViTri(o.r.page)]++; });
    const chips = [];
    if (b.tool)   chips.push('<span class="online-chip on-chip-tool">🛠 Tool ' + b.tool + '</span>');
    if (b.portal) chips.push('<span class="online-chip">🏠 Trang chính ' + b.portal + '</span>');
    if (b.videos) chips.push('<span class="online-chip">🎬 Video ' + b.videos + '</span>');
    $('online-breakdown').innerHTML = chips.join('');
  }

  // Danh sách chi tiết trong modal: "đang mở Tool" LÊN ĐẦU, rồi tới mới nhất.
  function veOnlineChiTiet() {
    const box = $('online-detail-rows'), empty = $('online-detail-empty');
    if (!box) return;
    $('online-modal-sub').textContent = onlineRows.length
      ? onlineRows.length + ' người đang online · tự làm mới mỗi 30 giây'
      : 'Tính trong 2 phút gần nhất · tự làm mới mỗi 30 giây';
    if (!onlineRows.length) { box.innerHTML = ''; empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    const rows = onlineRows.slice().sort(function (a, b) {
      const ta = /tool/.test(String(a.r.page || '')) ? 1 : 0;
      const tb = /tool/.test(String(b.r.page || '')) ? 1 : 0;
      if (ta !== tb) return tb - ta;   // Tool lên đầu
      return new Date(b.r.last_seen).getTime() - new Date(a.r.last_seen).getTime();
    });
    box.innerHTML = rows.map(function (o) {
      const p = o.p;
      const ten = esc(p.full_name || p.email || '(không rõ)');
      const pb = p.department ? ' <span class="online-dept">· ' + esc(p.department) + '</span>' : '';
      const laTool = /tool/.test(String(o.r.page || ''));
      return '<div class="online-item' + (laTool ? ' is-tool' : '') + '">' +
        '<span class="online-dot online-dot-sm"></span>' +
        '<span class="online-name">' + ten + pb + '</span>' +
        '<span class="online-where">' + viTriTrang(o.r.page) + '</span>' +
        '<span class="online-ago">' + thoiGianTuong(new Date(o.r.last_seen).getTime()) + '</span>' +
      '</div>';
    }).join('');
  }

  function onlineModalMo() { return $('online-backdrop').classList.contains('open'); }
  function moOnlineModal() {
    veOnlineChiTiet();
    $('online-backdrop').classList.add('open');
    $('online-backdrop').setAttribute('aria-hidden', 'false');
  }
  function dongOnlineModal() {
    $('online-backdrop').classList.remove('open');
    $('online-backdrop').setAttribute('aria-hidden', 'true');
  }

  async function taiDoLuong() {
    const msg = $('usage-msg');
    msg.style.display = 'none';
    const from90 = new Date(Date.now() - 90 * NGAY_MS).toISOString();  // nạp 90 ngày, lọc khoảng ở client
    // Kèm 'label' (tải gì) + 'detail' (đã điền gì) — cột mới; chưa chạy SQL thì tự lùi dần.
    let resp = await sb.from('usage_events').select('user_id, kind, at, label, detail').gte('at', from90).order('at', { ascending: false });
    if (resp.error && /(label|detail|column)/i.test(resp.error.message || '')) {
      resp = await sb.from('usage_events').select('user_id, kind, at, label').gte('at', from90).order('at', { ascending: false });
      if (resp.error) {
        resp = await sb.from('usage_events').select('user_id, kind, at').gte('at', from90).order('at', { ascending: false });
      }
    }
    const { data, error } = resp;

    if (error) {
      const chuaCoBang = /usage_events/.test(error.message || '') &&
        /(does not exist|could not find|schema cache)/i.test(error.message || '');
      msg.className = 'notice error';
      msg.innerHTML = '<span>⚠️</span><div>' + (chuaCoBang
        ? 'Bảng <code>usage_events</code> chưa được tạo. Chạy phần SQL mới trong <code>supabase/schema.sql</code> (Supabase → SQL Editor → Run).'
        : 'Không đọc được dữ liệu sử dụng: ' + esc(error.message)) + '</div>';
      msg.style.display = 'flex';
      usageEvents = [];
    } else {
      usageEvents = data || [];
    }

    veThe(usageEvents);   // 3 thẻ Hôm nay/7 ngày (cố định, không đổi theo khoảng)
    khoiTaoKhoang();      // đặt khoảng mặc định 14 ngày + min/max cho ô ngày
    apDungKhoang();       // lọc theo khoảng → số tổng + biểu đồ + bảng
  }

  // 3 thẻ liếc-nhanh (cố định Hôm nay / 7 ngày) — KHÔNG đổi theo khoảng đã chọn.
  function veThe(events) {
    const now = new Date();
    const dauHomNay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dau7 = dauHomNay - 6 * NGAY_MS;
    const loginHomNay = new Set(), toolHomNay = new Set(), active7 = new Set();
    let dlHomNay = 0;   // TẢI VỀ đếm theo LƯỢT (mỗi lần xuất/tải = 1), không theo người
    events.forEach(function (e) {
      const t = new Date(e.at).getTime();
      if (e.kind === 'login' && t >= dauHomNay) loginHomNay.add(e.user_id);
      if (e.kind === 'open_tool' && t >= dauHomNay) toolHomNay.add(e.user_id);
      if (e.kind === 'download' && t >= dauHomNay) dlHomNay++;
      if (t >= dau7) active7.add(e.user_id);
    });
    $('uc-login-today').textContent = loginHomNay.size;
    $('uc-tool-today').textContent = toolHomNay.size;
    $('uc-download-today').textContent = dlHomNay;
    $('uc-active-7d').textContent = active7.size;
  }

  // Đặt khoảng mặc định 14 ngày (lần đầu) + giới hạn ô ngày trong 90 ngày đã nạp.
  function khoiTaoKhoang() {
    const homNay = batDauNgay(new Date());
    if (!khoangTo) { khoangTo = homNay; khoangFrom = new Date(homNay.getTime() - 13 * NGAY_MS); }
    $('usage-from').value = fmtInput(khoangFrom);
    $('usage-to').value = fmtInput(khoangTo);
    const min90 = fmtInput(new Date(homNay.getTime() - 90 * NGAY_MS));
    const maxNay = fmtInput(homNay);
    $('usage-from').min = min90; $('usage-from').max = maxNay;
    $('usage-to').min = min90; $('usage-to').max = maxNay;
  }

  function doiKhoangTuInput() {
    let f = parseInput($('usage-from').value);
    let t = parseInput($('usage-to').value);
    if (!f || !t) return;
    if (f > t) { const tmp = f; f = t; t = tmp; }   // chọn ngược thì tự đảo
    khoangFrom = f; khoangTo = t;
    $('usage-from').value = fmtInput(f); $('usage-to').value = fmtInput(t);
    apDungKhoang();
  }

  function datPreset(soNgay) {
    const homNay = batDauNgay(new Date());
    khoangTo = homNay;
    khoangFrom = new Date(homNay.getTime() - (soNgay - 1) * NGAY_MS);
    $('usage-from').value = fmtInput(khoangFrom);
    $('usage-to').value = fmtInput(khoangTo);
    apDungKhoang();
  }

  // Lọc usageEvents theo [khoangFrom, khoangTo] → số tổng trong hộp + biểu đồ + bảng.
  function apDungKhoang() {
    if (!khoangFrom || !khoangTo) return;
    const f = batDauNgay(khoangFrom).getTime();
    const t = batDauNgay(khoangTo).getTime() + NGAY_MS - 1;   // tới hết ngày "đến"
    const trong = usageEvents.filter(function (e) { const ts = new Date(e.at).getTime(); return ts >= f && ts <= t; });

    const login = new Set(), tool = new Set(), act = new Set();
    let dl = 0;   // tải về đếm theo LƯỢT trong khoảng
    let vw = 0;   // xem mẫu/brochure đếm theo LƯỢT trong khoảng
    const pmap = {}; (toanBo || []).forEach(function (p) { pmap[p.id] = p; });
    const theoNguoi = {}, theoNgay = {}, theoMau = {};
    trong.forEach(function (e) {
      const ts = new Date(e.at).getTime();
      if (e.kind === 'login') login.add(e.user_id);
      if (e.kind === 'open_tool') tool.add(e.user_id);
      if (e.kind === 'download') dl++;
      if (e.kind === 'view') { vw++; const nh = e.label || '(không rõ)'; theoMau[nh] = (theoMau[nh] || 0) + 1; }
      act.add(e.user_id);
      const u = theoNguoi[e.user_id] || (theoNguoi[e.user_id] = { lastLogin: 0, lastTool: 0, tool: 0, download: 0 });
      if (e.kind === 'login') u.lastLogin = Math.max(u.lastLogin, ts);
      if (e.kind === 'open_tool') { u.lastTool = Math.max(u.lastTool, ts); u.tool++; }
      if (e.kind === 'download') u.download++;
      const k = ngayKey(ts); (theoNgay[k] || (theoNgay[k] = new Set())).add(e.user_id);
    });

    $('uk-login').textContent = login.size;
    $('uk-tool').textContent = tool.size;
    $('uk-download').textContent = dl;
    $('uk-view').textContent = vw;
    $('uk-active').textContent = act.size;

    const soNgay = Math.round((batDauNgay(khoangTo).getTime() - batDauNgay(khoangFrom).getTime()) / NGAY_MS) + 1;
    $('usage-chart-range').textContent = fmtNgay(khoangFrom) + ' – ' + fmtNgay(khoangTo) + ' · ' + soNgay + ' ngày';

    veBieuDoKhoang(theoNgay, khoangFrom, soNgay);
    veTopMau(theoMau);
    veBangNguoi(theoNguoi, pmap);
  }

  // Xếp hạng "mẫu / brochure chạy nhiều nhất" trong khoảng (N2). Đếm theo label sự kiện 'view'.
  function veTopMau(theoMau) {
    const arr = Object.keys(theoMau)
      .map(function (k) { return { ten: k, n: theoMau[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
    const box = $('usage-top-rows');
    if (!arr.length) {
      box.innerHTML = '';
      $('usage-top-empty').style.display = 'flex';
      return;
    }
    $('usage-top-empty').style.display = 'none';
    const max = arr[0].n || 1;
    box.innerHTML = arr.slice(0, 12).map(function (m, i) {
      const pct = Math.max(Math.round((m.n / max) * 100), 4);
      const laTaiLieu = /^Tài liệu:/.test(m.ten);
      const ten = esc(laTaiLieu ? m.ten.replace(/^Tài liệu:\s*/, '') : m.ten);
      const tag = laTaiLieu ? '<span class="top-tag top-tag-doc">Tài liệu</span>' : '<span class="top-tag top-tag-mau">Mẫu</span>';
      return '<div class="top-row">' +
        '<span class="top-rank' + (i < 3 ? ' is-top' : '') + '">' + (i + 1) + '</span>' +
        '<span class="top-name" title="' + ten + '">' + tag + ten + '</span>' +
        '<span class="top-barwrap"><span class="top-bar" style="width:' + pct + '%"></span></span>' +
        '<span class="top-n">' + m.n + '</span>' +
      '</div>';
    }).join('');
  }

  function veBieuDoKhoang(theoNgay, from, soNgay) {
    const start = batDauNgay(from).getTime();
    const cols = [];
    let max = 1;
    for (let i = 0; i < soNgay; i++) {
      const d = new Date(start + i * NGAY_MS);
      const set = theoNgay[ngayKey(d.getTime())];
      const n = set ? set.size : 0;
      if (n > max) max = n;
      cols.push({ d: d, n: n });
    }
    // Nhiều cột (khoảng dài) thì thưa nhãn ngày cho đỡ rối; luôn hiện nhãn cột cuối.
    const step = soNgay <= 16 ? 1 : Math.ceil(soNgay / 12);
    $('usage-chart').innerHTML = cols.map(function (c, idx) {
      const h = c.n ? Math.max(Math.round((c.n / max) * 100), 6) : 0;
      const nhan = c.d.getDate() + '/' + (c.d.getMonth() + 1);
      const hienX = (idx % step === 0) || idx === cols.length - 1;
      return '<div class="uc-col" title="' + nhan + ': ' + c.n + ' người">' +
               '<div class="uc-barwrap">' +
                 '<span class="uc-n">' + (c.n || '') + '</span>' +
                 '<span class="uc-bar' + (c.n ? '' : ' is-zero') + '" style="height:' + h + '%"></span>' +
               '</div>' +
               '<span class="uc-x">' + (hienX ? c.d.getDate() : '') + '</span>' +
             '</div>';
    }).join('');
  }

  function veBangNguoi(theoNguoi, pmap) {
    const ids = Object.keys(theoNguoi);
    if (!ids.length) {
      $('usage-rows').innerHTML = '';
      $('usage-empty').style.display = 'flex';
      return;
    }
    $('usage-empty').style.display = 'none';
    ids.sort(function (a, b) {
      return Math.max(theoNguoi[b].lastLogin, theoNguoi[b].lastTool) -
             Math.max(theoNguoi[a].lastLogin, theoNguoi[a].lastTool);
    });
    $('usage-rows').innerHTML = ids.map(function (id) {
      const u = theoNguoi[id];
      const p = pmap[id] || {};
      const ten = esc(p.full_name || p.email || '(không rõ)');
      const pb = esc(p.department || '—');
      return '<div class="usage-row">' +
        '<span class="ur-name" data-label="Thành viên">' + ten + '</span>' +
        '<span data-label="Phòng ban">' + pb + '</span>' +
        '<span data-label="Đăng nhập gần nhất">' + thoiGianTuong(u.lastLogin) + '</span>' +
        '<span data-label="Mở tool gần nhất">' + thoiGianTuong(u.lastTool) + '</span>' +
        '<span class="ta-right" data-label="Mở tool">' + (u.tool || 0) + '</span>' +
        '<span class="ta-right ur-dl" data-label="Tải về">' + (u.download || 0) + '</span>' +
      '</div>';
    }).join('');
  }

  // Popup "tải CÁI GÌ" — liệt kê sự kiện download trong khoảng đang chọn (chủ tool 23/07).
  function moChiTietTaiVe() {
    if (!khoangFrom || !khoangTo) return;
    const f = batDauNgay(khoangFrom).getTime();
    const t = batDauNgay(khoangTo).getTime() + NGAY_MS - 1;
    const pmap = {}; (toanBo || []).forEach(function (p) { pmap[p.id] = p; });
    const rows = usageEvents
      .filter(function (e) { const ts = new Date(e.at).getTime(); return e.kind === 'download' && ts >= f && ts <= t; })
      .sort(function (a, b) { return new Date(b.at).getTime() - new Date(a.at).getTime(); });

    $('dl-range').textContent = fmtNgay(khoangFrom) + ' – ' + fmtNgay(khoangTo) + ' · ' + rows.length + ' lượt tải';
    if (!rows.length) {
      $('dl-rows').innerHTML = '';
      $('dl-empty').style.display = 'flex';
    } else {
      $('dl-empty').style.display = 'none';
      $('dl-rows').innerHTML = rows.map(function (e, idx) {
        const p = pmap[e.user_id] || {};
        const ten = esc(p.full_name || p.email || '(không rõ)');
        const nhan = e.label ? esc(e.label) : '<span class="ur-never">không rõ (bản cũ)</span>';
        const coDetail = Array.isArray(e.detail) && e.detail.length;
        const eye = coDetail
          ? '<button type="button" class="dl-eye" data-idx="' + idx + '" title="Xem sale đã điền gì">👁</button>'
          : '<span class="dl-eye-empty" title="Lượt cũ chưa lưu chi tiết">—</span>';
        let chiTiet = '';
        if (coDetail) {
          chiTiet = '<div class="dl-detail" id="dl-detail-' + idx + '" hidden>' +
            e.detail.map(function (f) {
              return '<div class="dl-f"><span class="dl-f-k">' + esc(f.k) + '</span><span class="dl-f-v">' + esc(f.v) + '</span></div>';
            }).join('') + '</div>';
        }
        return '<div class="dl-item">' +
          '<div class="dl-row">' +
            '<span class="dl-who" data-label="Thành viên">' + ten + '</span>' +
            '<span class="dl-what" data-label="Tải gì">' + nhan + '</span>' +
            '<span class="ta-right dl-when" data-label="Lúc">' + thoiGianTuong(new Date(e.at).getTime()) + '</span>' +
            '<span class="ta-right dl-eye-cell">' + eye + '</span>' +
          '</div>' + chiTiet +
        '</div>';
      }).join('');
    }
    $('dl-backdrop').classList.add('open');
    $('dl-backdrop').setAttribute('aria-hidden', 'false');
  }
  function dongChiTietTaiVe() {
    $('dl-backdrop').classList.remove('open');
    $('dl-backdrop').setAttribute('aria-hidden', 'true');
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
    initTracking();   // bật tab "Đo lường" nếu là super_admin
    $('list-pending').addEventListener('click', onListClick);
    $('list-active').addEventListener('click', onListClick);
    $('list-suspended').addEventListener('click', onListClick);
    $('btn-refresh').addEventListener('click', load);
    // Đang ở tab Đo lường mà bấm "↻ Tải lại" thì làm mới luôn số liệu sử dụng
    // (load() ở trên làm mới profiles → tên trong bảng cũng cập nhật theo).
    $('btn-refresh').addEventListener('click', function () {
      if (me.role === 'super_admin' && $('tracking-content').style.display === 'block') taiDoLuong();
    });

    // Ô chọn: bắt ở cấp #page-content vì hàng được vẽ lại sau mỗi lần load,
    // gắn trực tiếp vào từng ô sẽ mất listener.
    $('page-content').addEventListener('change', onPickChange);
    // Một handler cho cả 3 thanh lật trang (uỷ quyền sự kiện — nút được dựng lại
    // sau mỗi lần vẽ nên gắn trực tiếp vào nút là mất handler).
    $('page-content').addEventListener('click', onPagerClick);
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
    $('ms-roles').addEventListener('click', onRoleClick);
    // "Bỏ lọc" phải xoá MỌI bộ lọc đang bật, không chỉ phòng ban — nếu không thì
    // bấm Bỏ lọc xong mà danh sách vẫn bị lọc theo quyền, người dùng tưởng hỏng.
    $('filter-clear').addEventListener('click', function () {
      locPhongBan = null; locQuyen = null;
      trang.pending = trang.active = trang.suspended = 1;
      dangChon.clear(); veDanhSach();
    });

    // Bấm ra ngoài / Esc → đóng menu "⋯"
    document.addEventListener('click', dongMenu);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongMenu(); });

    // Thêm tài khoản TRỰC TIẾP — server /api/admin/create-user (service_role, có kiểm quyền
    // admin). role='user', phòng ban chọn (mặc định Sale), status active, mật khẩu tạm Drt$2022.
    $('btn-add-member').addEventListener('click', function () {
      $('add-name').value = '';
      $('add-email').value = '';
      $('add-dept').innerHTML = PHONG_BAN.map(function (d) {
        return '<option value="' + esc(d) + '"' + (d === 'Sale' ? ' selected' : '') + '>' + esc(d) + '</option>';
      }).join('');
      $('add-role').innerHTML = QUYEN_TAO_MOI.map(function (r) {
        return '<option value="' + esc(r) + '"' + (r === 'user' ? ' selected' : '') + '>' + esc(ROLE_LABEL[r] || r) + '</option>';
      }).join('');
      $('add-pass').value = 'Drt$2022';   // điền sẵn — admin giữ hoặc gõ mật khẩu khác
      const kq = $('add-result'); kq.style.display = 'none'; kq.textContent = '';
      $('add-backdrop').classList.add('open');
      $('add-backdrop').setAttribute('aria-hidden', 'false');
      $('add-name').focus();
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
    $('add-create').addEventListener('click', async function () {
      const ten = $('add-name').value.trim();
      const mail = $('add-email').value.trim().toLowerCase();
      const phong = $('add-dept').value;
      const quyen = $('add-role').value;
      const pass = $('add-pass').value.trim() || 'Drt$2022';
      const kq = $('add-result');
      if (!ten) { $('add-name').focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        kq.className = 'notice error'; kq.style.display = ''; kq.textContent = 'Email không hợp lệ.';
        $('add-email').focus(); return;
      }
      if (pass.length < 6) {
        kq.className = 'notice error'; kq.style.display = ''; kq.textContent = 'Mật khẩu cần tối thiểu 6 ký tự.';
        $('add-pass').focus(); return;
      }
      const btn = $('add-create'); const cu = btn.textContent; btn.disabled = true; btn.textContent = 'Đang tạo…';
      const data = await goiAdminApi('/api/admin/create-user', { full_name: ten, email: mail, department: phong, role: quyen, password: pass });
      btn.disabled = false; btn.textContent = cu;
      if (!data) return;
      kq.className = 'notice info'; kq.style.display = '';
      kq.innerHTML = 'Đã tạo tài khoản <b>' + esc(mail) + '</b> (' + esc(ROLE_LABEL[data.role] || 'Nhân viên') +
        ').<br>Mật khẩu: <b>' + esc(data.password) + '</b> — gửi cho họ.';
      $('add-name').value = ''; $('add-email').value = '';
      await load();
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

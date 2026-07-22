/**
 * THINKSMART TOOL — SO SÁNH QUYỀN LỢI CÁC HÃNG (Living Benefits)
 * Mục nav "So sánh quyền lợi / Compare" + bảng 5 cột trong vùng canvas:
 *   1 cột hãng | 4 cột quyền lợi (Terminal / Chronic / Critical Illness / Critical Injury)
 * Bấm một hàng → mở 4 thẻ chi tiết. Đây là công cụ KHÔNG mở file SVG (xem cảnh báo
 * PENDING -3 trong changelog) — nó vẽ thẳng HTML vào #library-view như brochure group.
 *
 * DỮ LIỆU lấy từ "Bang so sanh quyen loi cac hang/Compare.html" (chủ tool đưa 21/07/2026,
 * chỉ lấy THÔNG TIN, không lấy style). ⚠️ Chữ ở đây đội sale đọc cho khách nghe —
 * sửa nội dung phải có nguồn từ chủ tool, ĐỪNG tự "chuẩn hoá" con số/điều khoản.
 * Logo hãng: 16 PNG cùng folder, tải qua /api/download (folder đã commit → chạy cả Vercel).
 */

const SS_BENEFITS = [
  { key: 'term', en: 'Terminal Illness', vi: 'Bệnh Giai Đoạn Cuối' },
  { key: 'chr',  en: 'Chronic Illness',  vi: 'Bệnh Mạn Tính' },
  { key: 'cri',  en: 'Critical Illness', vi: 'Bệnh Nghiêm Trọng' },
  { key: 'inj',  en: 'Critical Injury',  vi: 'Tai Nạn Trọng Thương' }
];

// s: 'ok' (có) | 'no' (không) | 'wr' (chưa xác nhận) — d: chi tiết hiện khi mở hàng
const SS_DATA = [
  { name: 'National Life Group', logo: '01_National_Life_Group.png',
    term: { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $1M. Cần bác sĩ xác nhận tuổi thọ còn lại từ 24 tháng → 12 tháng hoặc ít hơn.' },
    chr:  { s: 'ok', d: 'Đền tối đa 24%/năm, rút dần cho đến hết — không quá $1.5M tổng cộng.' },
    cri:  { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $1M. Tùy mức độ bệnh và tuổi thọ còn lại.' },
    inj:  { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $1M. Tùy mức độ bệnh và tuổi thọ còn lại.' } },

  { name: 'Corebridge Financial', logo: '02_Corebridge_Financial.png',
    term: { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $2M. Cần xác nhận tuổi thọ còn lại dưới 24 tháng.' },
    chr:  { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $2M.' },
    cri:  { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $2M. Tùy mức độ bệnh và tuổi thọ còn lại.' },
    inj:  { s: 'no', d: '' } },

  { name: 'Transamerica', logo: '03_Transamerica.png',
    term: { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $1.5M. Cần xác nhận tuổi thọ còn lại 12 tháng hoặc ít hơn.' },
    chr:  { s: 'ok', d: 'Được ứng trước tối đa 90% số tiền bảo hiểm — không quá $1.5M. Mỗi năm tối đa 24%, trong vòng 12 tháng.' },
    cri:  { s: 'ok', d: 'Được ứng trước tối đa 90% số tiền bảo hiểm — không quá $1.5M. Tùy mức độ bệnh và tuổi thọ còn lại.' },
    inj:  { s: 'no', d: '' } },

  { name: 'Ameritas', logo: '04_Ameritas.png',
    term: { s: 'ok', d: 'Được ứng trước tối đa 75% số tiền bảo hiểm — không quá $1M. Cần xác nhận tuổi thọ còn lại 12 tháng hoặc ít hơn.' },
    chr:  { s: 'ok', d: 'Đền tối đa 50% — không quá $1M. Thanh toán một lần (lump sum).' },
    cri:  { s: 'ok', d: 'Đền tối đa 25% — không quá $250K. Áp dụng cho 15 loại bệnh đủ điều kiện.' },
    inj:  { s: 'no', d: '' } },

  { name: 'Lincoln Financial', logo: '05_Lincoln_Financial.png',
    term: { s: 'ok', d: 'Đền một lần — không mất phí thêm. Cần giấy chứng nhận bệnh giai đoạn cuối.' },
    chr:  { s: 'ok', d: 'Đền một phần hoặc toàn bộ — không phí thêm. Có thể bổ sung sau khi cấp hợp đồng (tùy underwriting).' },
    cri:  { s: 'ok', d: 'Đền một lần khi xảy ra sự kiện đủ điều kiện. Có phí hành chính khi nhận tiền.' },
    inj:  { s: 'no', d: '' } },

  { name: 'F&G', logo: '06_F_and_G_Annuities_and_Life.png',
    term: { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $1M. Cần xác nhận tuổi thọ còn lại dưới 24 tháng.' },
    chr:  { s: 'ok', d: 'Đền tối đa 25%/năm, rút dần đến hết — không quá $1M tổng. Không chấm dứt sau lần đầu.' },
    cri:  { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $1M. Gồm: nhồi máu cơ tim, đột quỵ, ghép tạng lớn, liệt, ALS, u não, bỏng nặng, suy thận, ung thư xâm lấn.' },
    inj:  { s: 'no', d: '' } },

  { name: 'Nationwide', logo: '07_Nationwide.png',
    term: { s: 'ok', d: 'Đền tối thiểu $10K — tối đa $250K. Tùy tuổi, giới tính và lãi suất tại thời điểm yêu cầu.' },
    chr:  { s: 'ok', d: 'Đền tối đa 20% quyền lợi tử vong.' },
    cri:  { s: 'ok', d: 'Đền tối đa 10% mệnh giá hoặc $25K — lấy số nhỏ hơn.' },
    inj:  { s: 'no', d: '' } },

  { name: 'Columbus Life', logo: '08_Columbus_Life_Insurance.png',
    term: { s: 'ok', d: 'Đền mức thấp hơn giữa: $250K hoặc 60% Face Amount.' },
    chr:  { s: 'ok', d: 'Đền mức thấp hơn giữa: $250K hoặc 40% Face Amount.' },
    cri:  { s: 'ok', d: 'Đền mức thấp hơn giữa: $25K hoặc 10% Face Amount.' },
    inj:  { s: 'no', d: '' } },

  { name: 'Allianz', logo: '09_Allianz.png',
    term: { s: 'ok', d: 'Được ứng trước tối đa 100% số tiền bảo hiểm — không quá $1M. Tối thiểu $10K. Cần xác nhận tuổi thọ còn lại từ 12 tháng hoặc ít hơn.' },
    chr:  { s: 'ok', d: 'Đền mỗi lần: tối thiểu 5% hoặc $75K, tối đa 25% hoặc $250K. Không quá $1M tổng cộng. Mỗi 12 tháng một lần.' },
    cri:  { s: 'no', d: '' },
    inj:  { s: 'no', d: '' } },

  { name: 'New York Life', logo: '10_New_York_Life.png',
    term: { s: 'ok', d: 'Đền một lần — rider chấm dứt sau khi nhận tiền. Cần xác nhận tuổi thọ còn lại 12 tháng hoặc ít hơn.' },
    chr:  { s: 'ok', d: 'Chỉ có dưới dạng rider mua kèm tính phí thêm. Phải đăng ký chọn thêm khi nộp hồ sơ.' },
    cri:  { s: 'no', d: '' },
    inj:  { s: 'no', d: '' } },

  { name: 'Pacific Life', logo: '11_Pacific_Life.png',
    term: { s: 'ok', d: 'Được ứng trước tối đa 75% số tiền bảo hiểm — không quá $500K.' },
    chr:  { s: 'ok', d: 'Đền tối đa $3M — hàng năm hoặc hàng tháng. Phải đăng ký chọn thêm khi nộp hồ sơ.' },
    cri:  { s: 'no', d: '' },
    inj:  { s: 'no', d: '' } },

  { name: 'Farmers Insurance', logo: '12_Farmers_Insurance.png',
    term: { s: 'wr', d: 'Chưa xác nhận — trên website có đề cập nhưng không nói cụ thể.' },
    chr:  { s: 'no', d: '' }, cri: { s: 'no', d: '' }, inj: { s: 'no', d: '' } },

  { name: 'MetLife', logo: '13_MetLife.png',
    term: { s: 'wr', d: 'Không có thông tin công khai.' },
    chr:  { s: 'no', d: '' }, cri: { s: 'no', d: '' }, inj: { s: 'no', d: '' } },

  { name: 'MassMutual', logo: '14_MassMutual.png',
    term: { s: 'wr', d: 'Có thể có theo quy định tiểu bang, nhưng không được quảng cáo rõ.' },
    chr:  { s: 'no', d: '' }, cri: { s: 'no', d: '' }, inj: { s: 'no', d: '' } },

  { name: 'Allstate', logo: '15_Allstate.png',
    term: { s: 'no', d: 'Chỉ bán dưới dạng hợp đồng riêng như thẻ BHSK, không phải rider đi kèm hợp đồng nhân thọ.' },
    chr:  { s: 'no', d: '' }, cri: { s: 'no', d: '' }, inj: { s: 'no', d: '' } },

  { name: 'State Farm', logo: '16_State_Farm.png',
    term: { s: 'no', d: 'Không có rider living benefits.' },
    chr:  { s: 'no', d: '' }, cri: { s: 'no', d: '' }, inj: { s: 'no', d: '' } }
];

/**
 * NGÔN NGỮ TRONG BẢNG — CHỈ TIẾNG VIỆT (chủ tool chốt 22/07/2026, later 3).
 *
 * ⚠️ ĐỌC KỸ KẺO SỬA NGƯỢC: quy ước song ngữ "English / Tiếng Việt" VẪN ĐÚNG cho
 * MỤC NAV và menu (`Compare / So sánh quyền lợi`, `Proposal / Báo giá`…) — đừng gỡ.
 * Nhưng RIÊNG BẢNG NÀY chủ tool xem bản song ngữ thật rồi chốt bỏ: 5 cột × 16 hàng
 * mà nhãn nào cũng gánh 2 ngôn ngữ thì rối, đọc chậm. "Bảng này chỉ sử dụng 1 ngôn
 * ngữ tiếng Việt cho gọn gàng."
 *
 * Nội dung điều khoản vốn đã chỉ có tiếng Việt (bản dịch tiếng Anh phải do chủ tool
 * cấp — không tự dịch số liệu bảo hiểm).
 */

/**
 * DẤU TRẠNG THÁI — ICON, KHÔNG CÒN CHỮ (chủ tool 22/07 later 3: "tinh gọn").
 * Trước đây mỗi ô là một viên thuốc "✓ Có" / "✕ Không" → 64 ô đầy chữ lặp lại.
 * Nay chỉ còn icon tròn: XANH LÁ = có, ĐỎ = không, CAM = chưa rõ.
 *
 * ⚠️ "Không" TRƯỚC ĐÂY CỐ Ý ĐỂ XÁM TRUNG TÍNH (không phải lỗi của hãng) — chủ tool
 * đã chốt đổi sang ĐỎ để quét mắt nhanh hơn. Đừng "sửa lại cho trung tính".
 *
 * Bỏ chữ thì phải bù bằng cách khác cho người dùng hiểu + máy đọc màn hình đọc được:
 * mỗi icon có `title` (hiện tooltip khi rê chuột) + `aria-label`, và khối Chú thích
 * cuối bảng giải nghĩa cả 3 icon.
 */
const SS_BADGE = {
  ok: { cls: 'ss-ok', vi: 'Có',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' },
  no: { cls: 'ss-no', vi: 'Không',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' },
  wr: { cls: 'ss-wr', vi: 'Chưa rõ',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg>' }
};

// Một dấu trạng thái (dùng cho ô trong bảng và cho khối Chú thích)
function ssDau(s) {
  const b = SS_BADGE[s];
  return `<span class="ss-mark ${b.cls}" role="img" aria-label="${b.vi}" title="${b.vi}">${b.icon}</span>`;
}

function ssLogoUrl(file) {
  return '/api/download?path=' + encodeURIComponent('Bang so sanh quyen loi cac hang/' + file) + '&inline=1';
}

// --- CỜ BẬT/TẮT MỤC NAV — THEO MÔI TRƯỜNG, KHÔNG THEO NHÁNH GIT ---
//
// Từ 22/07/2026 dự án chỉ còn MỘT nhánh `main` duy nhất (chủ tool chốt: "một bản đầy đủ,
// offline chạy ở local, online chạy ở domain chính"). Nên cờ này KHÔNG thể dựa vào nhánh nữa.
//
// Vì sao bảng So sánh phải khác nhau giữa 2 nơi: nó CHƯA ĐƯỢC CHỦ TOOL DUYỆT XONG. Để hiện trên
// domain chính thì 69 người đội sale tưởng là bản chính thức rồi đem số liệu quyền lợi đi tư vấn
// cho khách — đó là rủi ro thật, không phải chuyện thẩm mỹ.
//
// Cách cũ (cờ true/false khác nhau giữa 2 nhánh) ĐÃ HỎNG và phải bỏ: xung đột git chỉ nổ theo
// chiều nhánh→main; merge ngược main→nhánh thì git ghi đè LẶNG LẼ, bảng biến mất khỏi localhost
// mà không báo gì (dính đúng 22/07). Dựa vào tên miền thì không có cửa nào sai.
//
// 👉 KHI CHỦ TOOL DUYỆT XONG BẢNG SO SÁNH: xoá cả khối này, thay bằng `const SS_SHOW_IN_NAV = true;`
const SS_SHOW_IN_NAV = (function () {
  var h = (location.hostname || '').toLowerCase();
  // '' là khi mở file trực tiếp bằng file:// — vẫn tính là máy cá nhân
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === ''
      || h.endsWith('.local') || h.startsWith('192.168.') || h.startsWith('10.');
})();

// --- NAV SECTION (gọi từ renderFileTree trong js/main.js) ---
// MỘT MỤC PHẲNG, KHÔNG dropdown (chủ tool 22/07/2026): các mục khác (Proposal,
// Brochure, Name Card) có mũi tên xổ vì bên trong CÓ nhiều mẫu con để chọn. Công cụ
// So sánh chỉ là MỘT bảng duy nhất — dựng dropdown chứa đúng một dòng là bắt người
// dùng bấm hai lần cho một việc. Nếu sau này thêm bảng so sánh thứ hai thì mới đổi
// lại thành nhóm xổ được.
function renderCompareNavSection(container, q) {
  if (!SS_SHOW_IN_NAV) return 0;
  if (q && !'compare so sánh quyền lợi living benefits'.includes(q)) return 0;

  const folder = document.createElement('div');
  folder.className = 'tree-folder nav-section nav-section-flat';

  const el = document.createElement('div');
  el.className = 'tree-folder-header'
    + (appState.activeLibraryPath === 'sosanh:living' ? ' is-open' : '');
  el.setAttribute('title', 'Bảng so sánh Living Benefits — 16 hãng bảo hiểm');
  el.innerHTML = `
    <span class="tree-folder-icon">${NAV_ICONS.compare}</span>
    <span class="tree-folder-label">Compare / So sánh quyền lợi</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav-section-flat > .tree-folder-header').forEach(x => x.classList.remove('is-open'));
    el.classList.add('is-open');
    openCompareTable();
  });
  makeKeyboardActivatable(el);

  folder.appendChild(el);
  container.appendChild(folder);
  return 1;
}

// --- BẢNG SO SÁNH — vẽ vào #doc-viewport, KHÔNG PHẢI CANVAS ---
// Vì sao (chủ tool 22/07/2026, tôi làm sai lần đầu): canvas dành riêng cho công cụ MỞ
// FILE SVG và SỬA NỘI DUNG TRỰC TIẾP. Bảng này chỉ để ĐỌC. Nhét vào canvas thì dính
// đủ lỗi: `.canvas-container{overflow:hidden}` + main.js nuốt `wheel` để đổi thành zoom
// → LĂN CHUỘT KHÔNG CUỘN ĐƯỢC; `user-select:none` → sale không bôi đen copy điều khoản
// được; `cursor:grab` → con trỏ là bàn tay kéo giữa một trang chữ. Cảnh báo này đã có
// sẵn ở PENDING -3 trong changelog từ 21/07 mà tôi vẫn làm ngược.
function openCompareTable() {
  // Dọn canvas + preview brochure TRƯỚC (hideLibraryPreview xoá activeLibraryPath
  // nên phải gọi trước khi đặt giá trị mới, không thì mục nav mất trạng thái chọn).
  hideLibraryPreview();
  dom.canvasWrapper.innerHTML = '';
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  appState.activeLibraryPath = 'sosanh:living';
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = 'Living Benefits — 16 hãng';
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  // Bật khung tài liệu: CSS sẽ ẩn canvas + dải zoom, hiện #doc-viewport cuộn bình thường
  document.body.classList.add('doc-mode');
  const view = document.getElementById('doc-viewport');

  // TÊN 4 NHÓM BỆNH là NGOẠI LỆ DUY NHẤT còn song ngữ trong bảng (chủ tool 22/07 later 4:
  // "phần bệnh thì thêm cho anh tiếng Anh — CHỈ THÊM Ở PHẦN NÀY THÔI, không thêm ở phần khác").
  // Format theo đúng mẫu chủ tool đưa: tiếng Anh dòng trên, tiếng Việt trong NGOẶC dòng dưới.
  // ⚠️ ĐỪNG nhân rộng sang chỗ khác: "Công ty bảo hiểm", nút, chú thích, thanh mức độ, thẻ chi
  // tiết… đều CHỈ tiếng Việt. Class đặt tên .ss-th-en/.ss-th-vi (có tiền tố -th-) để buộc phạm
  // vi vào đúng hàng tiêu đề, không ai vô tình dùng lại được ở nơi khác.
  const dauCot = SS_BENEFITS.map(b =>
    `<div class="ss-th ss-th-${b.key}"><span class="ss-th-en">${b.en}</span><span class="ss-th-vi">(${b.vi})</span></div>`).join('');

  const hang = SS_DATA.map((c, i) => {
    const soCo = SS_BENEFITS.reduce((n, b) => n + (c[b.key].s === 'ok' ? 1 : 0), 0);
    const vach = [0, 1, 2, 3].map(k => `<span class="ss-seg${k < soCo ? ' on' : ''}"></span>`).join('');
    // data-label: trên mobile bảng bỏ hàng tiêu đề, mỗi ô tự hiện tên quyền lợi
    const o = SS_BENEFITS.map(b =>
      `<div class="ss-cell" data-label="${b.vi}">${ssDau(c[b.key].s)}</div>`).join('');
    const the = SS_BENEFITS.map(b => {
      const cell = c[b.key]; const bd = SS_BADGE[cell.s];
      const noiDung = cell.d || (cell.s === 'no' ? 'Không cung cấp quyền lợi này.' : '—');
      // Trong thẻ chi tiết VẪN giữ chữ ("Có"/"Không") — mỗi hãng chỉ có 4 thẻ, không lặp
      // 64 lần như ô trong bảng, nên chữ ở đây làm rõ nghĩa chứ không gây rối.
      return `<div class="ss-dcard${cell.d ? '' : ' ss-empty'}">
          <div class="ss-dh ss-dh-${b.key}">${b.vi} <span class="ss-mini ${bd.cls}">${bd.vi}</span></div>
          <div class="ss-db">${escapeHtml(noiDung)}</div>
        </div>`;
    }).join('');
    return `
      <div class="ss-row" data-i="${i}" data-score="${soCo}">
        <button type="button" class="ss-row-main" aria-expanded="false" aria-label="Xem chi tiết ${escapeHtml(c.name)}">
          <div class="ss-co">
            <span class="ss-logo"><img src="${ssLogoUrl(c.logo)}" alt="" onerror="this.parentElement.textContent='${escapeHtml(c.name.slice(0, 2).toUpperCase())}'"></span>
            <span class="ss-co-txt">
              <span class="ss-co-name">${escapeHtml(c.name)}</span>
              <span class="ss-meter">${vach}<i>${soCo}/4 quyền lợi</i></span>
            </span>
            <span class="ss-chev" aria-hidden="true">▸</span>
          </div>
          ${o}
        </button>
        <div class="ss-detail"><div class="ss-detail-grid">${the}</div></div>
      </div>`;
  }).join('');

  view.innerHTML = `
    <div class="ss-wrap">
      <div class="ss-head-block">
        <!-- Tiêu đề "So Sánh Living Benefits" + đoạn mô tả ĐÃ BỎ (chủ tool 22/07 later 3):
             thanh tiêu đề trên đầu app đã hiện "Living Benefits — 16 hãng" rồi, lặp lại
             ngay dưới là thừa và đẩy bảng xuống thấp. Giữ lại nhãn "CHỈ DÙNG NỘI BỘ" —
             đây là cảnh báo phạm vi sử dụng, không phải chữ trang trí. -->
        <span class="ss-eyebrow">Chỉ dùng nội bộ</span>
        <div class="ss-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="ss-mo-het">Mở rộng tất cả</button>
          <button type="button" class="btn btn-secondary btn-sm" id="ss-thu-het">Thu gọn tất cả</button>
        </div>
      </div>
      <div class="ss-board">
        <div class="ss-thead"><div class="ss-th ss-th-co">Công ty bảo hiểm</div>${dauCot}</div>
        ${hang}
      </div>
      <div class="ss-foot">
        <div class="ss-legend">
          <h3>Chú thích</h3>
          <div>${ssDau('ok')} <span>Hãng có cung cấp quyền lợi này</span></div>
          <div>${ssDau('no')} <span>Không cung cấp / không có rider</span></div>
          <div>${ssDau('wr')} <span>Thiếu thông tin chi tiết công khai</span></div>
          <div><span class="ss-meter"><span class="ss-seg on"></span><span class="ss-seg on"></span><span class="ss-seg"></span><span class="ss-seg"></span></span> <span>Thanh mức độ = số quyền lợi hãng có (trên 4)</span></div>
        </div>
        <div class="ss-note">
          <h3>Lưu ý quan trọng</h3>
          <p>— Ngoại trừ các công ty mà <b>ThinkSmart Insurance</b> đang trực tiếp đại diện, thông tin của những hãng còn lại chỉ mang tính <b>tham khảo</b> để hỗ trợ so sánh tổng quan, và không được mặc định là chính xác tuyệt đối.</p>
          <p>— Quyền lợi, điều khoản và giới hạn chi trả thực tế sẽ được áp dụng theo <b>loại hợp đồng bảo hiểm, rider và quy định chính thức</b> của từng công ty tại thời điểm phát hành hợp đồng.</p>
        </div>
      </div>
    </div>`;

  // Mở/đóng chi tiết từng hàng
  view.querySelectorAll('.ss-row-main').forEach(nut => {
    nut.addEventListener('click', () => {
      const row = nut.closest('.ss-row');
      const mo = row.classList.toggle('open');
      nut.setAttribute('aria-expanded', mo ? 'true' : 'false');
    });
  });
  view.querySelector('#ss-mo-het').addEventListener('click', () => {
    view.querySelectorAll('.ss-row').forEach(r => { r.classList.add('open'); r.querySelector('.ss-row-main').setAttribute('aria-expanded', 'true'); });
  });
  view.querySelector('#ss-thu-het').addEventListener('click', () => {
    view.querySelectorAll('.ss-row').forEach(r => { r.classList.remove('open'); r.querySelector('.ss-row-main').setAttribute('aria-expanded', 'false'); });
  });

  view.scrollTop = 0;   // mở lại lần sau phải về đầu bảng, không giữ chỗ cuộn cũ
}

// Tắt khung tài liệu, trả quyền hiển thị lại cho canvas. Gọi từ hideLibraryPreview
// (brochure.js) — đó là chỗ duy nhất mọi luồng "mở thứ khác" đều đi qua.
function exitDocMode() {
  document.body.classList.remove('doc-mode');
  const view = document.getElementById('doc-viewport');
  if (view) view.innerHTML = '';
}

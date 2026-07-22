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

const SS_BADGE = {
  ok: { cls: 'ss-ok', ic: '✓', en: 'Yes',     vi: 'Có' },
  no: { cls: 'ss-no', ic: '✕', en: 'No',      vi: 'Không' },
  wr: { cls: 'ss-wr', ic: '!', en: 'Unclear', vi: 'Chưa rõ' }
};

/**
 * NHÃN SONG NGỮ — quy ước CHUNG của cả app, chủ tool chốt 22/07/2026:
 * **"English / Tiếng Việt"** — tiếng Anh TRƯỚC, một dòng, ngăn bằng gạch chéo.
 * Giống hệt các mục nav sẵn có: "Proposal / Báo giá", "Brochure / Tài liệu",
 * "Name Card / Danh thiếp". Bản trước làm ngược ("So sánh quyền lợi / Compare")
 * và xếp chồng EN trên VI dưới → chủ tool bắt lỗi. ĐỪNG làm ngược lại lần nữa.
 *
 * Chỉ áp cho NHÃN (tiêu đề, nút, badge, tên cột). ĐOẠN NỘI DUNG điều khoản giữ
 * NGUYÊN tiếng Việt — chủ tool chốt: sale đọc cho khách nghe bằng tiếng Việt, và
 * bản dịch tiếng Anh phải do chủ tool cấp chứ tôi không tự dịch số liệu bảo hiểm.
 *
 * ⚠️ CHỈ DÙNG TRONG BẢNG, KHÔNG DÙNG CHO MỤC NAV. Trên cây công cụ phải viết nhãn
 * bằng CHỮ THƯỜNG y hệt các mục khác ("Proposal / Báo giá" là một chuỗi text trơn).
 * Bản 22/07 dùng helper này cho nav → phần tiếng Việt bị tô xám nhạt trong khi
 * "Proposal / Báo giá" đậm đều → chủ tool bắt lỗi "sao nó lại khác các phần khác".
 * Sắc độ nhạt chỉ hợp trong bảng, nơi cần phân tầng thị giác giữa hai ngôn ngữ.
 */
function ssNhan(en, vi) {
  return `<span class="ss-en">${en}</span><span class="ss-sep">/</span><span class="ss-vi">${vi}</span>`;
}

function ssLogoUrl(file) {
  return '/api/download?path=' + encodeURIComponent('Bang so sanh quyen loi cac hang/' + file) + '&inline=1';
}

// --- CỜ BẬT/TẮT MỤC NAV ---
// TRUE trên nhánh `feat/mainV1.1` (bản offline ĐANG LÀM) — bảng hiện bình thường để làm tiếp.
// FALSE trên `main` (bản LIVE) từ 22/07/2026: bảng CHƯA XONG, chủ tool yêu cầu ẩn khỏi live để
// đội sale không tưởng là bản chính thức rồi đem số liệu quyền lợi đi tư vấn cho khách.
// ⚠️ DÒNG NÀY SẼ XUNG ĐỘT KHI MERGE V1.1 → main. Xung đột CÓ CHỦ Ý: lúc đó dừng lại tự hỏi
// "bảng So sánh đã duyệt xong chưa?" rồi mới chọn giá trị. Đừng nhắm mắt lấy bên nào.
const SS_SHOW_IN_NAV = true;

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

  const dauCot = SS_BENEFITS.map(b =>
    `<div class="ss-th ss-th-${b.key}">${ssNhan(b.en, b.vi)}</div>`).join('');

  const hang = SS_DATA.map((c, i) => {
    const soCo = SS_BENEFITS.reduce((n, b) => n + (c[b.key].s === 'ok' ? 1 : 0), 0);
    const vach = [0, 1, 2, 3].map(k => `<span class="ss-seg${k < soCo ? ' on' : ''}"></span>`).join('');
    // data-label: trên mobile bảng bỏ hàng tiêu đề, mỗi ô tự hiện tên quyền lợi
    const o = SS_BENEFITS.map(b => {
      const bd = SS_BADGE[c[b.key].s];
      return `<div class="ss-cell" data-label="${b.en} / ${b.vi}"><span class="ss-badge ${bd.cls}"><span aria-hidden="true">${bd.ic}</span>${ssNhan(bd.en, bd.vi)}</span></div>`;
    }).join('');
    const the = SS_BENEFITS.map(b => {
      const cell = c[b.key]; const bd = SS_BADGE[cell.s];
      const noiDung = cell.d || (cell.s === 'no' ? 'Không cung cấp quyền lợi này.' : '—');
      return `<div class="ss-dcard${cell.d ? '' : ' ss-empty'}">
          <div class="ss-dh ss-dh-${b.key}">${ssNhan(b.en, b.vi)} <span class="ss-mini">${bd.ic} ${bd.vi}</span></div>
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
              <span class="ss-meter">${vach}<i>${soCo}/4 ${ssNhan('benefits', 'quyền lợi')}</i></span>
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
        <span class="ss-eyebrow">${ssNhan('Internal Use Only', 'Chỉ dùng nội bộ')}</span>
        <h2>${ssNhan('Living Benefits Comparison', 'So Sánh Quyền Lợi Living Benefits')}</h2>
        <p>16 hãng bảo hiểm lớn tại Mỹ · 4 nhóm quyền lợi · Dải màu bên trái mỗi thẻ cho biết mức độ bao phủ · Bấm vào một hãng để xem điều khoản chi tiết.</p>
        <div class="ss-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="ss-mo-het">${ssNhan('Expand all', 'Mở rộng tất cả')}</button>
          <button type="button" class="btn btn-secondary btn-sm" id="ss-thu-het">${ssNhan('Collapse all', 'Thu gọn tất cả')}</button>
        </div>
      </div>
      <div class="ss-board">
        <div class="ss-thead"><div class="ss-th ss-th-co">${ssNhan('Insurance Company', 'Công ty bảo hiểm')}</div>${dauCot}</div>
        ${hang}
      </div>
      <div class="ss-foot">
        <div class="ss-legend">
          <h3>${ssNhan('Legend', 'Chú thích')}</h3>
          <div><span class="ss-badge ss-ok">✓ ${ssNhan('Yes', 'Có')}</span> hãng cung cấp quyền lợi này</div>
          <div><span class="ss-badge ss-no">✕ ${ssNhan('No', 'Không')}</span> không cung cấp / không có rider</div>
          <div><span class="ss-badge ss-wr">! ${ssNhan('Unclear', 'Chưa rõ')}</span> thiếu thông tin chi tiết công khai</div>
          <div><span class="ss-meter"><span class="ss-seg on"></span><span class="ss-seg on"></span><span class="ss-seg"></span><span class="ss-seg"></span></span> thanh mức độ = số quyền lợi hãng có (trên 4)</div>
        </div>
        <div class="ss-note">
          <h3>${ssNhan('Important Notes', 'Lưu ý quan trọng')}</h3>
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

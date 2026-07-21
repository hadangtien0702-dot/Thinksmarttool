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
  ok: { cls: 'ss-ok', ic: '✓', txt: 'Có' },
  no: { cls: 'ss-no', ic: '✕', txt: 'Không' },
  wr: { cls: 'ss-wr', ic: '!', txt: 'Chưa rõ' }
};

function ssLogoUrl(file) {
  return '/api/download?path=' + encodeURIComponent('Bang so sanh quyen loi cac hang/' + file) + '&inline=1';
}

// --- NAV SECTION (gọi từ renderFileTree trong js/main.js) ---
function renderCompareNavSection(container, q) {
  const section = makeCollapsibleFolder('So sánh quyền lợi / Compare', { extraClass: 'nav-section', iconHTML: NAV_ICONS.compare });
  if (q && !'living benefits so sánh quyền lợi'.includes(q)) {
    // đang tìm kiếm mẫu khác → vẫn hiện mục nhưng không tính vào tổng
    container.appendChild(section.folder);
    return 0;
  }
  const el = document.createElement('div');
  el.className = 'tree-file-item lib-item' + (appState.activeLibraryPath === 'sosanh:living' ? ' active' : '');
  el.innerHTML = `
    <span class="tree-file-icon">${NAV_ICONS.compare}</span>
    <span class="tree-file-name" title="Bảng so sánh Living Benefits — 16 hãng">Living Benefits — 16 hãng</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    openCompareTable();
  });
  makeKeyboardActivatable(el);
  section.content.appendChild(el);
  container.appendChild(section.folder);
  return 1;
}

// --- BẢNG SO SÁNH (vẽ vào #library-view — dùng chung vòng đời với brochure preview:
//     loadSvgContent → hideLibraryPreview sẽ tự dọn khi mở file khác) ---
function openCompareTable() {
  appState.activeLibraryPath = 'sosanh:living';
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = 'So sánh Living Benefits — 16 hãng';
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;
  if (dom.noSelection) dom.noSelection.style.display = 'none';
  dom.canvasWrapper.innerHTML = '';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }
  view.classList.add('has-group');
  view.style.display = '';

  const dauCot = SS_BENEFITS.map(b =>
    `<div class="ss-th ss-th-${b.key}">${b.en}<small>${b.vi}</small></div>`).join('');

  const hang = SS_DATA.map((c, i) => {
    const soCo = SS_BENEFITS.reduce((n, b) => n + (c[b.key].s === 'ok' ? 1 : 0), 0);
    const vach = [0, 1, 2, 3].map(k => `<span class="ss-seg${k < soCo ? ' on' : ''}"></span>`).join('');
    const o = SS_BENEFITS.map(b => {
      const bd = SS_BADGE[c[b.key].s];
      return `<div class="ss-cell"><span class="ss-badge ${bd.cls}"><span aria-hidden="true">${bd.ic}</span>${bd.txt}</span></div>`;
    }).join('');
    const the = SS_BENEFITS.map(b => {
      const cell = c[b.key]; const bd = SS_BADGE[cell.s];
      const noiDung = cell.d || (cell.s === 'no' ? 'Không cung cấp quyền lợi này.' : '—');
      return `<div class="ss-dcard${cell.d ? '' : ' ss-empty'}">
          <div class="ss-dh ss-dh-${b.key}">${b.en} <span class="ss-mini">${bd.ic} ${bd.txt}</span></div>
          <div class="ss-db">${escapeHtml(noiDung)}</div>
        </div>`;
    }).join('');
    return `
      <div class="ss-row" data-i="${i}">
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
        <h2>So Sánh Living Benefits</h2>
        <p>16 hãng bảo hiểm lớn tại Mỹ · 4 nhóm quyền lợi · Bấm vào từng hãng để xem chi tiết · <b>Internal Use Only</b></p>
        <div class="ss-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="ss-mo-het">Mở rộng tất cả</button>
          <button type="button" class="btn btn-secondary btn-sm" id="ss-thu-het">Thu gọn tất cả</button>
        </div>
      </div>
      <div class="ss-table" role="table" aria-label="Bảng so sánh Living Benefits">
        <div class="ss-thead"><div class="ss-th ss-th-co">Công Ty Bảo Hiểm<small>Mức độ bao phủ</small></div>${dauCot}</div>
        <div class="ss-tbody">${hang}</div>
      </div>
      <div class="ss-foot">
        <div class="ss-legend">
          <h3>Chú thích</h3>
          <div><span class="ss-badge ss-ok">✓ Có</span> hãng cung cấp quyền lợi này</div>
          <div><span class="ss-badge ss-no">✕ Không</span> không cung cấp / không có rider</div>
          <div><span class="ss-badge ss-wr">! Chưa rõ</span> thiếu thông tin chi tiết công khai</div>
          <div><span class="ss-meter"><span class="ss-seg on"></span><span class="ss-seg on"></span><span class="ss-seg"></span><span class="ss-seg"></span></span> thanh mức độ = số quyền lợi hãng có (trên 4)</div>
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

  updateStatus('Đang xem: Bảng so sánh Living Benefits (16 hãng)');
}

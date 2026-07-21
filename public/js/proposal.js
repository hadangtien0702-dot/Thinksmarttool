/**
 * THINKSMART TOOL — PROPOSAL / BÁO GIÁ
 * Mọi logic riêng của công cụ Báo giá nằm ở file này:
 *  - Section "Proposal / Báo giá" trên cây điều hướng trái
 *  - Panel "Sửa chữ bản vẽ" với 3 nhóm: Khách hàng / Kế hoạch & Quyền lợi / Đại lý
 *  - Preset thông tin đại lý (lưu localStorage)
 * Phần dùng chung (load/save/clone, canvas, export...) nằm ở js/core.js.
 */

// Dropdown data for client info fields
const GENDERS = ['Male', 'Female'];

// XẾP HẠNG SỨC KHOẺ (underwriting class) — MỖI HÃNG MỘT DANH SÁCH RIÊNG.
// Dùng chung cho cả IUL lẫn Term Life của cùng hãng.
// ⚠️ Chữ ở đây in THẲNG lên báo giá gửi khách → phải đúng chính tả của hãng.
//    Muốn thêm/sửa hạng cho hãng nào thì sửa đúng mảng của hãng đó ở dưới.
const RATE_CLASSES_BY_CARRIER = {
  AIG: [
    'Preferred Plus',
    'Preferred Non-Tobacco',
    'Standard Plus',
    'Standard Non-Tobacco',
    'Preferred Tobacco',
    'Standard Tobacco'
  ],
  NLG: [
    'Elite Non-Tobacco',
    'Preferred Non-Tobacco',
    'Select Non-Tobacco',
    'Standard Non-Tobacco',
    'Express Standard Non-Tobacco 1',
    'Express Standard Non-Tobacco 2',
    'Preferred Tobacco',
    'Standard Tobacco',
    'Express Standard Tobacco'
  ],
  // LƯU Ý CHÍNH TẢ: Allianz viết "Nontobacco" LIỀN (không gạch nối), khác với
  // "Non-Tobacco" của AIG/NLG. Giữ đúng như hãng dùng — đừng "sửa cho đồng bộ".
  Allianz: [
    'Preferred Plus Nontobacco',
    'Preferred Nontobacco',
    'Standard Nontobacco',
    'Preferred Tobacco',
    'Standard Tobacco'
  ]
};

// Dùng khi không nhận ra hãng của file đang mở
const RATE_CLASSES_DEFAULT = RATE_CLASSES_BY_CARRIER.AIG;

// Gộp hạng của TẤT CẢ hãng (đã loại trùng) — dùng để TỰ NHẬN DIỆN ô xếp hạng
// trong bản vẽ chưa gắn id. Việc nhận diện xảy ra trước khi biết hãng nên phải
// khớp mọi hạng, không được dùng riêng danh sách một hãng.
const ALL_RATE_CLASSES = Object.keys(RATE_CLASSES_BY_CARRIER)
  .reduce((acc, k) => acc.concat(RATE_CLASSES_BY_CARRIER[k]), [])
  .filter((v, i, a) => a.indexOf(v) === i);

// carrierOf() trả 'Bản nháp' cho file đã tạo cho khách → mất dấu hãng gốc.
// Hàm này soi tên + đường dẫn file nên bản nháp (vd "Vu Nguyen - AIG IUL.svg")
// vẫn ra đúng danh sách của AIG.
function rateCarrierOf(file) {
  if (!file) return null;
  const s = ((file.folder || '') + ' ' + (file.path || '') + ' ' + (file.name || '')).toLowerCase();
  if (s.includes('aig')) return 'AIG';
  if (s.includes('nlg')) return 'NLG';
  if (s.includes('allianz')) return 'Allianz';
  return null;
}

// Danh sách xếp hạng áp dụng cho file đang mở
function rateClassesFor(file) {
  const carrier = rateCarrierOf(file);
  return (carrier && RATE_CLASSES_BY_CARRIER[carrier]) || RATE_CLASSES_DEFAULT;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

// --- NAV SECTION: "Proposal / Báo giá" (gọi từ renderFileTree trong js/main.js) ---
function renderProposalNavSection(container, proposals, q) {
  const propGroups = {};
  proposals.forEach(f => {
    const c = carrierOf(f);
    (propGroups[c] = propGroups[c] || []).push(f);
  });
  // Khi không tìm kiếm: luôn hiện đủ các hãng chính (kể cả hãng chưa có mẫu, vd Allianz)
  if (!q) MASTER_CARRIERS.forEach(c => { propGroups[c] = propGroups[c] || []; });
  const propSection = makeCollapsibleFolder('Proposal / Báo giá', { extraClass: 'nav-section', iconHTML: NAV_ICONS.proposal });
  let propCount = 0;
  Object.keys(propGroups).sort(carrierSort).forEach(carrier => {
    const items = propGroups[carrier];
    if ((!items || !items.length) && !MASTER_CARRIERS.includes(carrier)) return;
    const grp = makeCollapsibleFolder(`${escapeHtml(carrier)} <span class="nav-count">${items.length}</span>`, { extraClass: 'nav-carrier', iconHTML: NAV_ICONS.carrier });
    if (items.length) {
      items.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => grp.content.appendChild(makeProposalItem(f)));
    } else {
      grp.content.appendChild(makeEmptyHint('Chưa có mẫu.'));
    }
    propSection.content.appendChild(grp.folder);
    propCount += items.length;
  });
  if (propCount === 0 && q) propSection.content.appendChild(makeEmptyHint('Không có kết quả.'));
  container.appendChild(propSection.folder);
  return propCount;
}

// --- ĐỊNH VỊ LẠI CÁC Ô CHỮ ĐỨNG CẠNH NHAU ------------------------------------
// Trong bản vẽ, "$50,968" và "/năm" là HAI thẻ <text> riêng, mỗi thẻ một transform
// translate() CỨNG. Con số dài ra (hàng trăm nghìn / hàng triệu) thì tràn sang và đè
// lên chữ "/năm" — lỗi chủ tool báo 21/07. Không có cách nào để SVG tự giãn: phải đo
// bề rộng thật rồi đặt lại toạ độ cho cả hai.
const KHE_TIEN_HAUTO = 6;   // khoảng hở tối thiểu giữa con số và hậu tố, đơn vị toạ độ SVG

function docTranslate(textEl) {
  const t = textEl && textEl.getAttribute('transform');
  const m = t && t.match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
}

function datTranslateX(textEl, x) {
  const p = docTranslate(textEl);
  if (!p) return;
  textEl.setAttribute('transform',
    textEl.getAttribute('transform').replace(/translate\([^)]*\)/, `translate(${x.toFixed(2)} ${p.y})`));
}

function oChuTrongDoc(editorId) {
  const el = appState.activeSvgDoc && appState.activeSvgDoc.querySelector(`[data-editor-id="${editorId}"]`);
  return el && el.closest('text');
}

// neo = { idTien, idHauTo, tam } — tam là TÂM của cụm [số + hậu tố], đo MỘT LẦN theo
// đúng bản vẽ gốc rồi giữ nguyên. Luôn xếp cụm quanh tâm đó nên số dài/ngắn thế nào
// khối chữ vẫn cân giữa thẻ nền, và tâm không bị trôi qua các lần sửa.
function xepLaiHauTo(neo) {
  if (!neo) return;
  const svg = dom.canvasWrapper.querySelector('svg');
  if (!svg) return;
  const tienC = svg.querySelector(`[data-editor-id="${neo.idTien}"]`);
  const hauToC = svg.querySelector(`[data-editor-id="${neo.idHauTo}"]`);
  const oTienC = tienC && tienC.closest('text');
  const oHauToC = hauToC && hauToC.closest('text');
  const oTienD = oChuTrongDoc(neo.idTien);
  const oHauToD = oChuTrongDoc(neo.idHauTo);
  if (!oTienC || !oHauToC || !oTienD || !oHauToD) return;

  let wTien, wHauTo;
  try { wTien = oTienC.getBBox().width; wHauTo = oHauToC.getBBox().width; }
  catch (err) { return; }              // canvas chưa dựng xong thì bỏ qua, lần gõ sau đo lại
  if (!wTien || !wHauTo) return;

  if (neo.tam === null) {
    const a = docTranslate(oTienD), b = docTranslate(oHauToD);
    if (!a || !b) return;
    neo.tam = (a.x + b.x + wHauTo) / 2;
  }
  const xTien = neo.tam - (wTien + KHE_TIEN_HAUTO + wHauTo) / 2;
  const xHauTo = xTien + wTien + KHE_TIEN_HAUTO;
  [oTienD, oTienC].forEach(o => datTranslateX(o, xTien));
  [oHauToD, oHauToC].forEach(o => datTranslateX(o, xHauTo));
}

// --- CĂN GIỮA GIÁ TRỊ TRONG Ô CỦA BẢN VẼ ------------------------------------
// Bản vẽ gốc được designer căn giữa BẰNG TAY: họ đặt sẵn translate(x) sao cho đúng
// chuỗi chữ đó nằm giữa ô. Ta thay chữ khác độ dài là lệch ngay — gõ "-" thì dính
// mép trái, gõ "$1,000,000" thì tràn ra phải (chủ tool báo 21/07).
// Chữa tận gốc: đổi sang text-anchor="middle" neo đúng CÁI TÂM designer đã căn.
// Từ đó trình duyệt tự căn giữa cho MỌI giá trị về sau, không cần đo lại.
// Tính chất quan trọng: lúc mở file KHÔNG có gì xê dịch — tâm mới tính ra đúng
// bằng tâm cũ, nên bản vẽ chưa sửa trông y hệt trước.
const LE_TRONG_O = 12;      // chừa hai bên trong ô, đơn vị toạ độ SVG
const CO_CHU_TOI_THIEU = 0.55;  // không thu nhỏ quá 55% cỡ gốc, dưới nữa là không đọc nổi

function elCanvas(editorId) {
  const svg = dom.canvasWrapper.querySelector('svg');
  const el = svg && svg.querySelector(`[data-editor-id="${editorId}"]`);
  return el && el.closest('text');
}

// Bề rộng ô chứa (px màn hình) = thẻ <rect> HẸP NHẤT bao quanh tâm chữ.
function rongOChua(editorId) {
  const svg = dom.canvasWrapper.querySelector('svg');
  const o = elCanvas(editorId);
  if (!svg || !o) return null;
  const r = o.getBoundingClientRect();
  const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
  let hep = null;
  svg.querySelectorAll('rect').forEach(function (n) {
    const b = n.getBoundingClientRect();
    if (b.width < 20 || b.height < 12) return;
    if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) return;
    if (hep === null || b.width < hep) hep = b.width;
  });
  return hep;
}

// --- Ô THÔNG TIN KHÁCH HÀNG: chữ dài thì thu nhỏ cho vừa khung -----------------
// Khác phần Kế hoạch: mấy ô này neo TRÁI theo đúng bản vẽ (tên khách bắt đầu sát mép
// thẻ), KHÔNG được đổi sang căn giữa. Chỉ cần chặn tràn.
// Chủ tool báo 21/07: "Express Standard Non-Tobacco 2" (30 ký tự) và
// "Preferred Plus Nontobacco" (25 ký tự) chạy lố ra khỏi thẻ nền / bị cắt cụt.
// Tên khách dài và bang tên dài ("North Carolina", "Massachusetts") cũng dính.
const LE_PHAI_O_KHACH = 8;   // chừa ra so với mép phải khung, đơn vị SVG

// Mép phải mà chữ KHÔNG được vượt qua. Lấy chặt nhất trong hai nguồn:
//   (1) chữ khác nằm CÙNG HÀNG bên phải (vd ô "Tiểu bang" đứng cạnh ô "Sức khoẻ")
//   (2) thẻ <rect> nền hẹp nhất bao quanh chữ
// Dùng toạ độ màn hình rồi quy đổi về đơn vị SVG — chắc ăn hơn dò transform lồng nhau.
function mepPhaiChoPhep(editorId, dsCungPhan) {
  const svg = dom.canvasWrapper.querySelector('svg');
  const o = elCanvas(editorId);
  if (!svg || !o) return null;
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const khungSvg = svg.getBoundingClientRect();
  const tyLe = (vb && vb.width) ? khungSvg.width / vb.width : 0;
  if (!tyLe) return null;

  const r = o.getBoundingClientRect();
  const giuaY = (r.top + r.bottom) / 2;
  const doi = px => (px - khungSvg.left) / tyLe;
  let phai = Infinity;

  (dsCungPhan || []).forEach(function (idKhac) {
    if (idKhac === editorId) return;
    const k = elCanvas(idKhac);
    if (!k) return;
    const b = k.getBoundingClientRect();
    if (b.left <= r.left) return;                       // phải đứng BÊN PHẢI
    if (giuaY < b.top - 2 || giuaY > b.bottom + 2) return; // và CÙNG HÀNG
    phai = Math.min(phai, doi(b.left));
  });

  svg.querySelectorAll('rect').forEach(function (n) {
    const b = n.getBoundingClientRect();
    if (b.width < 40 * tyLe || b.height < 10 * tyLe) return;   // bỏ qua icon/gạch nhỏ
    // Khung phải THỰC SỰ BAO chỗ chữ bắt đầu: vừa mở ra bên trái, vừa kéo dài qua nó.
    // Thiếu vế thứ hai là dính lỗi đã gặp 21/07: ô "Tiểu bang" lấy nhầm khung của ô
    // "Sức khoẻ" nằm bên trái nó (khung đó kết thúc TRƯỚC cả chỗ chữ bắt đầu) → mép
    // phải tính ra nhỏ hơn cả mép trái, thu nhỏ chữ vô tội vạ.
    if (b.left > r.left || b.right <= r.left) return;
    if (giuaY < b.top || giuaY > b.bottom) return;
    phai = Math.min(phai, doi(b.right));
  });

  return phai === Infinity ? null : phai;
}

// Chuẩn bị + thu nhỏ cho một ô neo trái. Gọi lúc mở file và sau mỗi lần sửa.
function vuaKhungOKhach(neo, dsCungPhan) {
  if (!neo) return;
  const oC = elCanvas(neo.id);
  if (!oC) return;
  if (!neo.coChuGoc) neo.coChuGoc = parseFloat(getComputedStyle(oC).fontSize) || null;
  if (!neo.coChuGoc) return;

  oC.style.fontSize = '';                    // trả cỡ gốc rồi mới đo mép và bề rộng
  const phai = mepPhaiChoPhep(neo.id, dsCungPhan);
  if (phai === null) return;

  const vb = dom.canvasWrapper.querySelector('svg').viewBox.baseVal;
  const khungSvg = dom.canvasWrapper.querySelector('svg').getBoundingClientRect();
  const tyLe = khungSvg.width / vb.width;
  const r = oC.getBoundingClientRect();
  const trai = (r.left - khungSvg.left) / tyLe;
  const rongThat = r.width / tyLe;
  const rongChoPhep = phai - trai - LE_PHAI_O_KHACH;
  if (rongChoPhep <= 0 || !rongThat) return;

  const ty = Math.max(Math.min(1, rongChoPhep / rongThat), CO_CHU_TOI_THIEU);
  const co = ty >= 0.999 ? '' : (neo.coChuGoc * ty).toFixed(2) + 'px';
  oC.style.fontSize = co;
  const oD = oChuTrongDoc(neo.id);
  if (oD) oD.style.fontSize = co;
}

// ⚠️ text-anchor CHỈ gom được cả dòng thành một khối nếu các mảnh phía sau KHÔNG
// mang toạ độ tuyệt đối. Theo chuẩn SVG, tspan có x HOẶC y là mở một "text chunk"
// MỚI, và mỗi chunk tự neo giữa riêng nó → chữ vỡ ra từng mảnh lệch nhau.
// (Đo được ở ô "30 năm" mẫu NLG Term Life: mảnh "3" và mảnh "0 năm" mỗi mảnh một
// chunk vì cả hai đều có y="0".)
// Trả false nếu thẻ <text> có NHIỀU DÒNG — khi đó không đụng vào, vì gỡ y sẽ làm
// các dòng chồng lên nhau.
function gomMotKhoiChu(oText) {
  const manh = Array.from(oText.querySelectorAll('tspan'));
  if (!manh.length) return true;                       // chữ nằm thẳng trong <text>
  const y0 = manh[0].getAttribute('y');
  if (manh.some(sp => sp.getAttribute('y') !== y0)) return false;
  manh.forEach(function (sp, i) {
    if (i === 0) { sp.setAttribute('x', '0'); return; }
    sp.removeAttribute('x');
    sp.removeAttribute('y');
  });
  return true;
}

// Đổi một ô giá trị sang neo-giữa. Gọi MỘT LẦN lúc mở file, sau khi font đã tải.
function canhGiuaTheoBanVe(neo) {
  const oC = elCanvas(neo.id);
  const oD = oChuTrongDoc(neo.id);
  if (!oC || !oD) return;
  if (oC.getAttribute('text-anchor') === 'middle') { neo.xong = true; return; }

  // ĐO TRƯỚC KHI GỘP. Gộp khối làm các mảnh kern liền nhau nên chữ rộng thêm vài px;
  // đo sau khi gộp là lấy nhầm tâm của bản đã rộng ra → cả cụm lệch sang phải
  // (đo được 5px ở câu "Tổng dòng tiền dự kiến…" mẫu Allianz).
  let hop;
  try { hop = oC.getBBox(); } catch (e) { return; }
  if (!hop || !hop.width) return;

  const goc = docTranslate(oD);
  if (!goc) return;
  const tam = goc.x + hop.x + hop.width / 2;     // đúng tâm designer đã căn

  if (!gomMotKhoiChu(oC) || !gomMotKhoiChu(oD)) return;   // nhiều dòng → không đụng vào

  // Bề rộng tối đa cho phép: ưu tiên khoảng cách tới ô cùng hàng bên cạnh (chính xác
  // cho bảng nhiều cột), không có thì lấy theo thẻ nền bao quanh.
  let rong = null;
  if (neo.buocCot) rong = neo.buocCot - LE_TRONG_O;
  else {
    const px = rongOChua(neo.id);
    const svg = dom.canvasWrapper.querySelector('svg');
    const vb = svg && svg.viewBox && svg.viewBox.baseVal;
    const tyLe = (vb && vb.width) ? svg.getBoundingClientRect().width / vb.width : 0;
    if (px && tyLe) rong = px / tyLe - LE_TRONG_O;
  }
  neo.rong = rong;
  neo.coChuGoc = parseFloat(getComputedStyle(oC).fontSize) || null;

  [oD, oC].forEach(function (o) {
    o.setAttribute('text-anchor', 'middle');
    datTranslateX(o, tam);
  });
  neo.xong = true;
  thuNhoChoVua(neo);
}

// Giá trị quá dài so với ô thì thu nhỏ cỡ chữ cho vừa, thay vì để tràn ra ngoài.
function thuNhoChoVua(neo) {
  if (!neo || !neo.xong || !neo.rong || !neo.coChuGoc) return;
  const oC = elCanvas(neo.id);
  const oD = oChuTrongDoc(neo.id);
  if (!oC || !oD) return;

  oC.style.fontSize = '';                      // trả cỡ gốc rồi mới đo, nếu không
  let rongThat;                                 // sẽ đo trúng cỡ đã thu nhỏ lần trước
  try { rongThat = oC.getBBox().width; } catch (e) { return; }
  if (!rongThat) return;

  const tyLe = Math.max(Math.min(1, neo.rong / rongThat), CO_CHU_TOI_THIEU);
  const co = tyLe >= 0.999 ? '' : (neo.coChuGoc * tyLe).toFixed(2) + 'px';
  oC.style.fontSize = co;
  oD.style.fontSize = co;
}

// Chuẩn hoá thứ chủ tool gõ thành cụm chữ đứng sau "nhận".
// Gõ SỐ hay gõ CHỮ đều phải ra câu đọc được — đây là yêu cầu chốt 21/07:
//   "21"          → "trong 21 năm"      (câu: …dự kiến nhận trong 21 năm)
//   "21 năm"      → "trong 21 năm"
//   "trong 25 năm"→ "trong 25 năm"      (đã có "trong" thì để nguyên)
//   "trọn đời"    → "trọn đời"          (câu: …dự kiến nhận trọn đời)
function cumThoiGianNhan(giaTri) {
  const s = String(giaTri == null ? '' : giaTri).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  if (/^\d+$/.test(s)) return `trong ${s} năm`;                 // chỉ gõ con số
  if (/^\d+ năm$/i.test(s)) return `trong ${s}`;                // "21 năm"
  return s;                                                      // chữ tự do
}

// Ghi cụm chữ sau chữ "nhận" của câu "Tổng dòng tiền dự kiến nhận …".
// ⚠️ CÓ HAI CÂY DOM: bản dữ liệu (appState.activeSvgDoc — thứ đem đi lưu/xuất file) và
// bản CLONE đang hiển thị trên canvas. applyTextValue vẫn ghi cả hai; hàm này không dùng
// applyTextValue được nên phải TỰ ghi cả hai. Quên bản clone = gõ mà canvas đứng im,
// đúng lỗi chủ tool báo 21/07.
function ghiCumDongTien(x, cumMoi) {
  const ghi = (cacManh, iChinh) => {
    cacManh[iChinh].textContent = 'nhận ' + cumMoi;
    cacManh.slice(iChinh + 1).forEach(sp => { sp.textContent = ''; });
    boQuenKerning(cacManh[iChinh]);   // mảnh này mang kerning riêng của chữ gốc, xem core.js
  };

  const oDoc = oChuTrongDoc(x.editorId);
  if (oDoc) {
    const manhDoc = Array.from(oDoc.querySelectorAll('tspan'));
    if (manhDoc.length === x.tongSoManh) ghi(manhDoc, x.viTriManhChinh);
  }

  const svg = dom.canvasWrapper.querySelector('svg');
  const neo = svg && svg.querySelector(`[data-editor-id="${x.editorId}"]`);
  const oCanvas = neo && neo.closest('text');
  if (!oCanvas) return;
  const manhCanvas = Array.from(oCanvas.querySelectorAll('tspan'));
  if (manhCanvas.length === x.tongSoManh) ghi(manhCanvas, x.viTriManhChinh);
}

// --- TEXTS EDITOR: 3 nhóm ô của proposal (gọi từ populateTextsEditor trong js/core.js) ---
function populateProposalTextsEditor(svgEl, textElements) {
  // Create group containers
  const clientGroup = document.createElement('div');
  clientGroup.className = 'text-group';
  clientGroup.innerHTML = `
    <div class="text-group-title">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>1. Thông tin khách hàng</span>
      <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
    <div class="text-group-items" id="group-client"></div>
  `;

  const planGroup = document.createElement('div');
  planGroup.className = 'text-group';
  planGroup.innerHTML = `
    <div class="text-group-title">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span>2. Kế hoạch & Quyền lợi</span>
      <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
    <div class="text-group-items" id="group-plan"></div>
  `;

  const agentGroup = document.createElement('div');
  agentGroup.className = 'text-group';
  agentGroup.innerHTML = `
    <div class="text-group-title">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>3. Thông tin đại lý & Khác</span>
      <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
    <div class="text-group-items" id="group-agent"></div>
  `;

  dom.textsList.appendChild(clientGroup);
  dom.textsList.appendChild(planGroup);
  dom.textsList.appendChild(agentGroup);

  const clientContainer = clientGroup.querySelector('#group-client');
  const planContainer = planGroup.querySelector('#group-plan');
  const agentContainer = agentGroup.querySelector('#group-agent');

  // Add collapse listeners
  [clientGroup, planGroup, agentGroup].forEach(group => {
    const title = group.querySelector('.text-group-title');
    const items = group.querySelector('.text-group-items');
    const arrow = group.querySelector('.group-arrow');
    title.style.cursor = 'pointer';
    title.addEventListener('click', () => {
      const isCollapsed = items.style.display === 'none';
      if (isCollapsed) {
        items.style.display = 'flex';
        arrow.style.transform = '';
      } else {
        items.style.display = 'none';
        arrow.style.transform = 'rotate(-90deg)';
      }
    });
  });

  // Helper to tag dynamic client info elements so they persist after edits
  function tagClientInfoElements(svgEl, textElementsList) {
    // Files saved by older versions carry client-* ids on the <text> wrapper, but the editor
    // loop only iterates [data-editor-id] elements (line-first tspans). Move such an id down
    // to the tspan that holds the fresh data-editor-id so the field still renders.
    const reclaimTag = (idName) => {
      const el = svgEl.querySelector('#' + idName);
      if (!el) return null;
      if (el.getAttribute('data-editor-id')) return el;
      el.removeAttribute('id');
      const inner = el.querySelector('[data-editor-id]');
      if (inner) { inner.setAttribute('id', idName); return inner; }
      return null; // unmappable stale tag — fall through to re-detection below
    };
    let nameEl = reclaimTag('client-name');
    let ageEl = reclaimTag('client-age');
    let genderEl = reclaimTag('client-gender');
    let rateEl = reclaimTag('client-rate');
    let stateEl = reclaimTag('client-state');

    // data-editor-id sits on the FIRST tspan of each line, so a value split across several tspans
    // (e.g. "Standard Non-Tobacco", "Vu Nguyen") won't equal that tspan's own textContent.
    // Compare against the whole line instead so multi-tspan values are matched reliably.
    const line = el => getLineTextContent(el).trim();
    const isValue = t => t === '43' || /^\d+$/.test(t) || t === 'Male' || t === 'Female'
      || ALL_RATE_CLASSES.includes(t) || US_STATES.includes(t);

    if (!ageEl) {
      ageEl = textElementsList.find(el => line(el) === '43');
      if (ageEl) ageEl.setAttribute('id', 'client-age');
    }
    if (!genderEl) {
      genderEl = textElementsList.find(el => { const t = line(el); return t === 'Male' || t === 'Female'; });
      if (genderEl) genderEl.setAttribute('id', 'client-gender');
    }
    if (!rateEl) {
      rateEl = textElementsList.find(el => ALL_RATE_CLASSES.includes(line(el)));
      if (rateEl) rateEl.setAttribute('id', 'client-rate');
    }
    if (!stateEl) {
      stateEl = textElementsList.find(el => US_STATES.includes(line(el)));
      if (stateEl) stateEl.setAttribute('id', 'client-state');
    }
    if (!nameEl) {
      // The client name isn't a fixed string (differs per template). Detect it as a capitalized
      // multi-word line in the client card (Y < 450) that isn't a recognized value or a label word.
      const looksLikeName = t => /^[A-Z][A-Za-z'.]+( [A-Z][A-Za-z'.]+){1,3}$/.test(t)
        && !/(Client|Kh[aá]ch|Agent|Licensed|Assistant|CEO|Making|Promises|Keeping|Program|Universal|Index|Term|Life|Plan|Benefits|Summary|Value|Growth|Rate|Class|State|Gender|Male|Female|Tobacco|Preferred|Standard)/i.test(t);
      nameEl = textElementsList.find(el => getAbsoluteY(el) < 450 && !isValue(line(el)) && looksLikeName(line(el)));
      if (nameEl) nameEl.setAttribute('id', 'client-name');
    }
  }

  tagClientInfoElements(svgEl, textElements);

  // Helper to calculate absolute Y position
  function getAbsoluteY(el) {
    let y = 0;
    if (el.tagName.toLowerCase() === 'tspan') {
      const tspanY = el.getAttribute('y');
      if (tspanY) y += parseFloat(tspanY);
    }
    let current = el;
    while (current && current.tagName.toLowerCase() !== 'svg') {
      const transform = current.getAttribute('transform');
      if (transform && transform.includes('translate')) {
        const match = transform.match(/translate\(([^,)\s]+)[,\s]+([^,)\s]+)\)/);
        if (match && match[2]) {
          y += parseFloat(match[2]);
          break;
        }
      }
      if (current.tagName.toLowerCase() === 'text') {
        const textY = current.getAttribute('y');
        if (textY) {
          y += parseFloat(textY);
          break;
        }
      }
      current = current.parentElement;
    }
    return y;
  }

  // Helper to calculate absolute X position
  function getAbsoluteX(el) {
    let x = 0;
    if (el.tagName.toLowerCase() === 'tspan') {
      const tspanX = el.getAttribute('x');
      if (tspanX) x += parseFloat(tspanX);
    }
    let current = el;
    while (current && current.tagName.toLowerCase() !== 'svg') {
      const transform = current.getAttribute('transform');
      if (transform && transform.includes('translate')) {
        const match = transform.match(/translate\(([^,)\s]+)[,\s]+([^,)\s]+)\)/);
        if (match && match[1]) {
          x += parseFloat(match[1]);
          break;
        }
      }
      if (current.tagName.toLowerCase() === 'text') {
        const textX = current.getAttribute('x');
        if (textX) {
          x += parseFloat(textX);
          break;
        }
      }
      current = current.parentElement;
    }
    return x;
  }

  const clientBlocks = {};
  const idOKhach = [];      // editorId của các ô Thông tin khách hàng, theo thứ tự gặp
  const neoVuaKhach = {};   // editorId -> mốc để thu nhỏ chữ cho vừa khung (xem vuaKhungOKhach)
  const allLines = [];   // MỌI dòng chữ + toạ độ — dùng làm NEO để dò nhãn (mẫu Allianz)
  const planItems = [];
  const planExtras = []; // non-$ editable labels: "20 năm", "120 tuổi", "Tuổi 63", "Cash Value at 63"

  textElements.forEach((el) => {
    // data-editor-id sits on the first tspan of a line → read the FULL line, not just that tspan
    const textContent = getLineTextContent(el).trim();
    if (!textContent) return; // Skip empty elements

    const editorId = el.getAttribute('data-editor-id');
    const id = el.getAttribute('id') || editorId;

    const absoluteY = getAbsoluteY(el);
    const absoluteX = getAbsoluteX(el);
    const fontSize = el.getAttribute('font-size') || el.style.fontSize || 'mặc định';

    // Ghi lại MỌI dòng (kể cả nhãn không sửa được) để nhánh Allianz dò nhãn theo neo
    allLines.push({ el, editorId, textContent, absoluteX, absoluteY });

    // --- SECTION 1: Client Info (Y < 450) ---
    if (absoluteY < 450) {
      const isClientField = ['client-name', 'client-age', 'client-rate', 'client-gender', 'client-state'].includes(id);
      if (!isClientField) return; // Skip all other text nodes in the top section

      let displayName = id;
      if (id === 'client-name') displayName = 'Khách hàng';
      else if (id === 'client-age') displayName = 'Tuổi';
      else if (id === 'client-rate') displayName = 'Xếp hạng sức khoẻ';
      else if (id === 'client-gender') displayName = 'Giới tính';
      else if (id === 'client-state') displayName = 'Tiểu bang';

      // Gender / Rate Class / State use dropdowns to prevent typos on client-facing proposals
      const dropdownOptions = id === 'client-gender' ? GENDERS
        : id === 'client-rate' ? rateClassesFor(appState.activeFile)   // theo hãng của file đang mở
        : id === 'client-state' ? US_STATES
        : null;

      const itemBlock = document.createElement('div');
      itemBlock.className = 'text-edit-block';
      idOKhach.push(editorId);   // để biết ô nào đứng cạnh ô nào khi chặn tràn

      if (dropdownOptions) {
        const opts = dropdownOptions.includes(textContent)
          ? dropdownOptions
          : [textContent, ...dropdownOptions];
        itemBlock.innerHTML = `
          <div class="text-meta">
            <span class="text-id">${displayName}</span>
          </div>
          <select class="text-input-field select-field" data-editor-id="${editorId}" aria-label="${escapeHtml(displayName)}">
            ${opts.map(o => `<option value="${o}"${o === textContent ? ' selected' : ''}>${o}</option>`).join('')}
          </select>
        `;
        const select = itemBlock.querySelector('select');
        select.addEventListener('change', (e) => {
          applyTextValue(el, editorId, e.target.value);
          vuaKhungOKhach(neoVuaKhach[editorId], idOKhach);
        });
      } else {
        itemBlock.innerHTML = `
          <div class="text-meta">
            <span class="text-id">${displayName}</span>
          </div>
          <input type="text" class="text-input-field" data-editor-id="${editorId}" value="${escapeHtml(textContent)}" aria-label="${escapeHtml(displayName)}">
        `;
        const inputEl = itemBlock.querySelector('.text-input-field');
        inputEl.addEventListener('input', (e) => {
          applyTextValue(el, editorId, e.target.value);
          vuaKhungOKhach(neoVuaKhach[editorId], idOKhach);
        });
      }

      neoVuaKhach[editorId] = { id: editorId, coChuGoc: null };
      clientBlocks[id] = itemBlock;
    }

    // --- SECTION 2: Plan & Benefits (Y >= 450 && Y < 1100) ---
    else if (absoluteY >= 450 && absoluteY < 1100) {
      // Dollar values (except single "$")
      if (textContent.startsWith('$') && textContent !== '$') {
        planItems.push({ el, editorId, textContent, fontSize, absoluteX, absoluteY });
        return;
      }

      // Nhãn trong bảng quyền lợi: thời gian đóng phí / tuổi bảo vệ / tuổi cột biểu đồ.
      // Gom ở đây cho MỌI mẫu; nhánh sắp xếp bên dưới quyết định đưa cái nào ra editor.
      // 'period' dùng ở CẢ HAI: IUL có 1 ô ("20 năm" = thời gian đóng phí),
      // Term Life có 3 ô (10/20/30 năm = tiêu đề cột, ghép với phí mỗi tháng).
      const base = { el, editorId, textContent, absoluteX, absoluteY, noCurrency: true };
      if (/^\d+\s*năm$/i.test(textContent)) planExtras.push({ ...base, kind: 'period' });        // "20 năm"
      else if (/^\d+\s*tuổi$/i.test(textContent)) planExtras.push({ ...base, kind: 'coverage' }); // "120 tuổi"
      else if (/^Tuổi\s*\d+$/i.test(textContent)) planExtras.push({ ...base, kind: 'age' });      // "Tuổi 63"
      else if (/^Cash\s*Value at\s*\d+$/i.test(textContent)) planExtras.push({ ...base, kind: 'cashAt' });

      // Câu "Tổng dòng tiền dự kiến nhận trong N năm" (mẫu Allianz).
      // Cho sửa CẢ CỤM sau chữ "nhận" — chủ tool cần gõ được "trọn đời" chứ
      // không chỉ đổi con số (21/07).
      // KHÔNG dùng applyTextValue: applyTextValue ghi vào mảnh MANG data-editor-id
      // (mảnh ĐẦU dòng = chữ "Tổng"), như vậy là ghi đè luôn phần "Tổng dòng tiền dự
      // kiến". Ở đây chỉ được thay phần SAU chữ "nhận", nên phải tự ghi vào đúng mảnh.
      // Đổi lại thì mất phần đồng bộ canvas mà applyTextValue vẫn làm hộ → xem ghiCumDongTien.
      const mNhan = textContent.match(/nhận\s+(.+)$/i);
      if (mNhan && /dòng tiền/i.test(textContent)) {
        const cacManh = el.parentElement ? Array.from(el.parentElement.querySelectorAll('tspan')) : [];
        const iBatDau = cacManh.findIndex(sp => /nhận/i.test(sp.textContent));
        if (iBatDau !== -1) {
          planExtras.push({
            ...base, kind: 'cumDongTien',
            cum: mNhan[1].trim(),                       // vd "trong 21 năm"
            viTriManhChinh: iBatDau,                    // vị trí mảnh sẽ ghi chữ mới
            tongSoManh: cacManh.length                  // dùng để đối chiếu với bản canvas
          });
        }
      }
    }

    // --- SECTION 3: Agent Info (Y >= 1100) ---
    // Only show: Agent Assistant name/phone + Licensed Agent name/phone
    // Agent Asst: X ≈ 36 | Licensed Agent: X ≈ 237 | CEO (excluded): X ≈ 420
    // IUL names Y ≈ 1272, phones Y ≈ 1286 | TERMLIFE names Y ≈ 1173, phones Y ≈ 1187
    // Bottom bars: TERMLIFE Y ≈ 1224, IUL Y ≈ 1322 → both excluded by content pattern
    else {
      const isAgentZone = absoluteY >= 1100; // Wide range, use content patterns to exclude bottom bar
      const isAgentColumn = absoluteX < 400; // Excludes CEO column (X≈420)

      // Exclude bottom bar items by content (address, website, CEO phone in footer)
      const isBottomBar = textContent.includes('thinksmartinsurance') ||
                          textContent.includes('Brown Rd') ||
                          textContent.includes('Lawrenceville') ||
                          textContent === '(678) 825-3737';

      // Skip label rows
      const isLabel = /^(Agent Assistant|Licensed Agent|CEO|PRESENTED BY)$/.test(textContent);

      // Only allow name/phone rows (short text, not static label)
      // US format "(346) 858-4277" or an all-digits number like "0938169130"
      const isPhone = /^\(\d{3}\)/.test(textContent) || /^[+\d][\d\s().-]{6,}$/.test(textContent);
      const isName = !isPhone && textContent.length > 1 && textContent.length < 40;

      // Skip wrapped-paragraph lines (e.g. the surrender-charge disclaimer whose short last line
      // "khi không còn áp dụng." lands in the Agent Assistant column). Real agent fields are
      // single-line <text> elements; a <text> holding 2+ editable lines is body text, not a field.
      const parentText = el.tagName.toLowerCase() === 'text' ? el : el.closest('text');
      const isParagraphLine = !!parentText && parentText.querySelectorAll('[data-editor-id]').length > 1;

      if (!isAgentZone || !isAgentColumn || isBottomBar || isLabel || isParagraphLine || (!isPhone && !isName)) return;

      // Determine display label based on X column
      const isLeft = absoluteX < 200; // Agent Asst column (X≈36)

      let displayName;
      if (isLeft && !isPhone) displayName = 'Tên Agent Assistant';
      else if (isLeft && isPhone) displayName = 'SĐT Agent Assistant';
      else if (!isLeft && !isPhone) displayName = 'Tên Licensed Agent';
      else displayName = 'SĐT Licensed Agent';

      const itemBlock = document.createElement('div');
      itemBlock.className = 'text-edit-block';
      itemBlock.innerHTML = `
        <div class="text-meta">
          <span class="text-id">${displayName}</span>
        </div>
        <input type="text" class="text-input-field" data-editor-id="${editorId}" value="${escapeHtml(textContent)}" aria-label="${escapeHtml(displayName)}">
      `;

      const inputEl = itemBlock.querySelector('.text-input-field');
      inputEl.addEventListener('input', (e) => {
        let newValue = e.target.value;
        // Phone fields: auto-format 10 US digits as "(123) 456-7890" the moment they're complete
        if (isPhone) {
          const formatted = formatPhoneValue(newValue);
          if (formatted && formatted !== newValue) {
            newValue = formatted;
            e.target.value = formatted;
          }
        }
        // applyTextValue clears sibling tspans on the same line — agent names/phones are split
        // into pieces ("T" + "ONY PHU"); writing textContent alone leaves the old tail visible
        applyTextValue(el, editorId, newValue);
      });

      agentContainer.appendChild(itemBlock);
    }
  });

  // Sort and append Section 1:
  const clientOrder = ['client-name', 'client-age', 'client-rate', 'client-gender', 'client-state'];
  clientOrder.forEach(idKey => {
    if (clientBlocks[idKey]) {
      clientContainer.appendChild(clientBlocks[idKey]);
    }
  });

  // Sort, label and append Section 2:
  const tenFile = (appState.activeFile && appState.activeFile.name || '').toLowerCase();
  const isTerm = tenFile.includes('term');
  const isAllianz = tenFile.includes('allianz');
  const orderedPlanItems = [];

  if (isTerm) {
    const mainBenefit = planItems.find(item => item.absoluteY < 600);
    const premiums = planItems.filter(item => item.absoluteY >= 600)
                              .sort((a, b) => a.absoluteX - b.absoluteX);

    // Term Life có BA ô "N năm" (hàng tiêu đề cột 10/20/30) — khác IUL chỉ có một ô
    // "20 năm" là thời gian đóng phí. Trước đây 3 ô này KHÔNG sửa được và nhãn phí
    // bị hardcode "Phí đóng 10/20/30 năm"; đổi số năm trên bản vẽ là nhãn sai ngay.
    const periods = planExtras.filter(x => x.kind === 'period')
                              .sort((a, b) => a.absoluteX - b.absoluteX);

    if (mainBenefit) mainBenefit.displayName = 'Mức bảo vệ (Mệnh giá)';
    if (mainBenefit) orderedPlanItems.push(mainBenefit);

    // Mỗi cột = MỘT hàng gộp [số năm | số tiền] (yêu cầu chủ tool 2026-07-21).
    // Ghép theo TOẠ ĐỘ X gần nhau nhất — cùng cột thì cùng X — chứ không ghép theo
    // thứ tự mảng: thiếu một ô là toàn bộ cặp sau lệch đi một (bài học lỗi
    // "Tổng số tiền đóng" bị dán nhầm nhãn hôm 15/07).
    const dungRoi = new Set();
    const ghepGanNhat = (moc) => {
      let best = null, bestD = Infinity;
      premiums.forEach((m, j) => {
        if (dungRoi.has(j)) return;
        const d = Math.abs(m.absoluteX - moc.absoluteX);
        if (d < bestD) { bestD = d; best = j; }
      });
      if (best === null) return null;
      dungRoi.add(best);
      return premiums[best];
    };

    if (periods.length) {
      periods.forEach((p, i) => {
        orderedPlanItems.push({ isTermCombo: true, index: i, period: p, money: ghepGanNhat(p) });
      });
      // Ô tiền nào không có cột năm tương ứng thì vẫn cho sửa riêng, đừng bỏ rơi
      premiums.forEach((m, j) => {
        if (dungRoi.has(j)) return;
        m.displayName = 'Phí đóng (cột ' + (j + 1) + ')';
        orderedPlanItems.push(m);
      });
    } else {
      // Không đọc được hàng tiêu đề → giữ nguyên cách cũ để không mất field
      if (premiums[0]) premiums[0].displayName = 'Phí đóng 10 năm';
      if (premiums[1]) premiums[1].displayName = 'Phí đóng 20 năm';
      if (premiums[2]) premiums[2].displayName = 'Phí đóng 30 năm';
      premiums.forEach(p => orderedPlanItems.push(p));
    }
  } else if (isAllianz) {
    // ------------------------------------------------------------------------
    // ALLIANZ (Max-Funded IUL) — bố cục KHÁC HẲN IUL/Term: có "Mức đóng mỗi năm",
    // "Thu nhập hưu trí", "Tổng dòng tiền dự kiến" và một hàng 4 ô ở dưới.
    // Lọc theo ngưỡng toạ độ như nhánh IUL sẽ dán nhãn lung tung (chủ tool báo
    // 21/07: "Giá trị tích luỹ — Cột 2" thực ra là Tổng dòng tiền dự kiến).
    // Nên ghép theo NEO CHỮ: mỗi nhãn tiếng Việt đứng NGAY TRÊN giá trị của nó.
    // Thêm/bớt ô trong bản vẽ chỉ cần thêm dòng vào bảng NHAN dưới đây.
    // ------------------------------------------------------------------------
    const NHAN = [
      { khop: /^MỨC ĐÓNG MỖI NĂM$/i,          ten: 'Mức đóng mỗi năm' },
      { khop: /^THU NHẬP HƯU TRÍ$/i,          ten: 'Thu nhập hưu trí mỗi năm' },
      { khop: /^Tổng dòng tiền dự kiến/i,     ten: 'Tổng dòng tiền dự kiến' },
      { khop: /^Thời gian đóng phí$/i,        ten: 'Thời gian đóng phí' },
      { khop: /^Bảo vệ đến khi nào$/i,        ten: 'Bảo vệ đến khi nào' },
      { khop: /^Tổng số tiền đóng$/i,         ten: 'Tổng số tiền đóng' },
      { khop: /^Mức bảo vệ ban đầu$/i,        ten: 'Mức bảo vệ ban đầu' },
    ];

    // Giá trị có thể là tiền (planItems) hoặc chữ-số như "5 Năm" / "120 tuổi" (planExtras)
    const ungVien = planItems.concat(planExtras.filter(x => x.kind !== 'cumDongTien'));
    const daDung = new Set();

    NHAN.forEach(function (n) {
      const nhan = allLines.find(l => n.khop.test(l.textContent));
      if (!nhan) return;
      // Giá trị nằm DƯỚI nhãn, cùng cột (lệch ngang nhỏ), cách không quá 70px
      let tot = null, diem = Infinity;
      ungVien.forEach(function (v) {
        if (daDung.has(v.editorId)) return;
        const dy = v.absoluteY - nhan.absoluteY;
        const dx = Math.abs(v.absoluteX - nhan.absoluteX);
        if (dy <= 0 || dy > 70 || dx > 80) return;
        const d = dy + dx * 0.5;          // ưu tiên ô ngay bên dưới, rồi mới tới lệch ngang
        if (d < diem) { diem = d; tot = v; }
      });
      if (!tot) return;
      daDung.add(tot.editorId);
      tot.displayName = n.ten;

      // "Thu nhập hưu trí mỗi năm" có chữ "/năm" nằm NGAY BÊN PHẢI, là một thẻ <text>
      // riêng với toạ độ cứng → số dài ra là đè lên nó. Ghi nhớ để xếp lại chỗ sau mỗi
      // lần gõ (xem xepLaiHauTo ở đầu file).
      if (n.ten === 'Thu nhập hưu trí mỗi năm') {
        const viTriTien = docTranslate(tot.el.closest('text'));
        let hauTo = null, gan = Infinity;
        if (viTriTien) {
          allLines.forEach(function (l) {
            if (l.editorId === tot.editorId) return;
            const p = docTranslate(l.el.closest('text'));
            if (!p || Math.abs(p.y - viTriTien.y) > 1 || p.x <= viTriTien.x) return;
            if (p.x - viTriTien.x < gan) { gan = p.x - viTriTien.x; hauTo = l; }
          });
        }
        if (hauTo) tot.neoHauTo = { idTien: tot.editorId, idHauTo: hauTo.editorId, tam: null };
      }

      orderedPlanItems.push(tot);
    });

    // Ô nào không khớp nhãn nào thì vẫn cho sửa, đặt tên trung tính để không mất field
    ungVien.forEach(function (v) {
      if (daDung.has(v.editorId)) return;
      v.displayName = v.displayName || 'Giá trị khác';
      orderedPlanItems.push(v);
    });

    planExtras.filter(x => x.kind === 'cumDongTien')
              .forEach(x => orderedPlanItems.push({ isSoNam: true, ref: x }));
  } else {
    // IUL: 6 money fields + benefit-plan labels (period / coverage age / chart ages)
    const mainBenefit = planItems.find(item => item.absoluteX < 100 && item.absoluteY < 550);
    const monthlyPremium = planItems.find(item => item.absoluteX < 100 && item.absoluteY >= 550 && item.absoluteY < 650);

    const period = planExtras.find(x => x.kind === 'period');
    const coverage = planExtras.find(x => x.kind === 'coverage');

    // "Tổng số tiền đóng" là Ô THỨ 3 cùng hàng với "20 năm"/"120 tuổi" — X của nó ≥ 100 (≈212),
    // nên phải tách ra TRƯỚC khi gom nhóm giá trị biểu đồ. Nếu không, nó bị nhận nhầm là cột
    // biểu đồ đầu tiên và toàn bộ nhãn "Giá trị tích luỹ Tuổi N" lệch đi 1 ô (bug người dùng báo).
    let totalPremium = planItems.find(item => item.absoluteX < 100 && item.absoluteY >= 650);
    const chartCandidates = planItems.filter(item => item.absoluteX >= 100);
    const boxRowY = period ? period.absoluteY : (coverage ? coverage.absoluteY : null);
    if (!totalPremium && boxRowY !== null) {
      const idx = chartCandidates.findIndex(item => Math.abs(item.absoluteY - boxRowY) < 25);
      if (idx !== -1) totalPremium = chartCandidates.splice(idx, 1)[0];
    }
    const chartProjections = chartCandidates.sort((a, b) => b.absoluteY - a.absoluteY); // Descending Y -> chronological order

    // Chart age labels left→right = column 1..3; pair each with its "Cash Value at N" line
    // (same number) so editing "Tuổi 63" → "Tuổi 65" also rewrites the English subtitle.
    const ageLabels = planExtras.filter(x => x.kind === 'age').sort((a, b) => a.absoluteX - b.absoluteX);
    const cashAts = planExtras.filter(x => x.kind === 'cashAt');
    const numOf = t => (String(t).match(/\d+/) || [null])[0];
    ageLabels.forEach((it, i) => {
      it.displayName = `Tuổi cột ${i + 1} (biểu đồ)`;
      it.paired = cashAts.find(c => numOf(c.textContent) === numOf(it.textContent)) || null;
    });

    if (mainBenefit) mainBenefit.displayName = 'Mức bảo vệ (Mệnh giá)';
    if (monthlyPremium) monthlyPremium.displayName = 'Phí đóng mỗi tháng';
    if (totalPremium) totalPremium.displayName = 'Tổng số tiền đóng (' + (period ? period.textContent : '20 năm') + ')';

    if (mainBenefit) orderedPlanItems.push(mainBenefit);
    if (monthlyPremium) orderedPlanItems.push(monthlyPremium);
    if (totalPremium) orderedPlanItems.push(totalPremium);

    // Mỗi cột biểu đồ = MỘT hàng chỉnh sửa gộp [tiền | tuổi] cho gọn (yêu cầu chủ tool 2026-07-15)
    const columnCount = Math.max(chartProjections.length, ageLabels.length);
    for (let i = 0; i < columnCount; i++) {
      orderedPlanItems.push({ isChartCombo: true, index: i, money: chartProjections[i] || null, age: ageLabels[i] || null });
    }

    if (period) { period.displayName = 'Thời gian đóng phí'; orderedPlanItems.push(period); }
    // Chỉ có ở mẫu Allianz; mẫu khác không khớp mẫu câu nên mảng rỗng, vô hại.
    planExtras.filter(x => x.kind === 'cumDongTien')
              .forEach(x => orderedPlanItems.push({ isSoNam: true, ref: x }));
    // "Bảo vệ đến khi nào / 120 tuổi" bị KHOÁ theo yêu cầu chủ tool (2026-07-15): giá trị cố định
    // của sản phẩm, không đưa vào bảng chỉnh sửa (coverage vẫn được thu thập làm mốc hàng ô ở trên).
  }

  // --- Chuẩn bị neo-giữa cho MỌI ô giá trị của phần Kế hoạch (xem canhGiuaTheoBanVe) ---
  const oCanGiua = [];
  orderedPlanItems.forEach(function (it) {
    if (it.isChartCombo) { [it.money, it.age].forEach(v => { if (v) oCanGiua.push(v); }); return; }
    if (it.isTermCombo)  { [it.period, it.money].forEach(v => { if (v) oCanGiua.push(v); }); return; }
    if (it.isSoNam)      { oCanGiua.push(it.ref); return; }
    if (it.neoHauTo)     return;   // cụm [số | /năm] có cách canh riêng, xem xepLaiHauTo
    oCanGiua.push(it);
  });
  oCanGiua.forEach(function (v) {
    // Ô cùng hàng gần nhất cho biết BƯỚC CỘT → suy ra bề rộng tối đa của một ô.
    // Chính xác hơn dò thẻ nền, vì thẻ nền của bảng thường trải hết cả 3 cột.
    let buoc = null;
    oCanGiua.forEach(function (k) {
      if (k === v || Math.abs(k.absoluteY - v.absoluteY) > 6) return;
      const d = Math.abs(k.absoluteX - v.absoluteX);
      if (d > 1 && (buoc === null || d < buoc)) buoc = d;
    });
    v.neoGiua = { id: v.editorId, buocCot: buoc, rong: null, coChuGoc: null, xong: false };
  });
  // Phải đợi font tải xong mới đo được bề rộng chữ cho đúng
  const canhTatCa = () => {
    oCanGiua.forEach(v => canhGiuaTheoBanVe(v.neoGiua));
    // Ô khách hàng: chỉ thu nhỏ nếu tràn, KHÔNG đổi sang căn giữa (bản vẽ neo trái)
    idOKhach.forEach(idx => vuaKhungOKhach(neoVuaKhach[idx], idOKhach));
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(canhTatCa);
  else canhTatCa();

  // Hàng gộp cho 1 cột biểu đồ: ô TIỀN bên trái + ô TUỔI bên phải
  function buildChartComboBlock(combo) {
    const idx = combo.index + 1;
    const block = document.createElement('div');
    block.className = 'text-edit-block';
    block.innerHTML = `
      <div class="text-meta">
        <span class="text-id">Giá trị tích luỹ — Cột ${idx} biểu đồ</span>
      </div>
      <div class="dual-input-row">
        ${combo.money ? `<input type="text" class="text-input-field" data-editor-id="${combo.money.editorId}" value="${escapeHtml(combo.money.textContent)}" aria-label="Số tiền cột ${idx}" title="Số tiền">` : ''}
        ${combo.age ? `<input type="text" class="text-input-field dual-age" data-editor-id="${combo.age.editorId}" value="${escapeHtml(combo.age.textContent)}" aria-label="Tuổi cột ${idx}" title="Tuổi">` : ''}
      </div>
    `;

    if (combo.money) {
      const moneyInput = block.querySelector(`input[data-editor-id="${combo.money.editorId}"]`);
      moneyInput.addEventListener('input', (e) => {
        applyTextValue(combo.money.el, combo.money.editorId, e.target.value);
        thuNhoChoVua(combo.money.neoGiua);
      });
      moneyInput.addEventListener('blur', (e) => {
        const formatted = formatCurrencyValue(e.target.value);
        if (formatted !== null && formatted !== e.target.value) {
          e.target.value = formatted;
          applyTextValue(combo.money.el, combo.money.editorId, formatted);
          thuNhoChoVua(combo.money.neoGiua);
        }
      });
    }
    if (combo.age) {
      const ageInput = block.querySelector(`input[data-editor-id="${combo.age.editorId}"]`);
      ageInput.addEventListener('input', (e) => {
        applyTextValue(combo.age.el, combo.age.editorId, e.target.value);
        thuNhoChoVua(combo.age.neoGiua);
        // Giữ dòng phụ tiếng Anh "Cash Value at N" khớp với tuổi mới
        if (combo.age.paired) {
          const num = (e.target.value.match(/\d+/) || [null])[0];
          if (num) applyTextValue(combo.age.paired.el, combo.age.paired.editorId, 'Cash Value at ' + num);
        }
      });
    }
    return block;
  }

  // Term Life — hàng gộp [số năm | số tiền] cho một cột.
  // Số năm để TRƯỚC và hẹp hơn: nó là nhãn cột, tiền mới là giá trị chính.
  function buildTermComboBlock(combo) {
    const idx = combo.index + 1;
    const block = document.createElement('div');
    block.className = 'text-edit-block';
    block.innerHTML = `
      <div class="text-meta">
        <span class="text-id">Gói ${idx} — thời gian &amp; phí mỗi tháng</span>
      </div>
      <div class="dual-input-row">
        ${combo.period ? `<input type="text" class="text-input-field dual-age" data-editor-id="${combo.period.editorId}" value="${escapeHtml(combo.period.textContent)}" aria-label="Thời gian tham gia gói ${idx}" title="Thời gian tham gia">` : ''}
        ${combo.money ? `<input type="text" class="text-input-field" data-editor-id="${combo.money.editorId}" value="${escapeHtml(combo.money.textContent)}" aria-label="Phí mỗi tháng gói ${idx}" title="Phí mỗi tháng">` : ''}
      </div>
    `;

    if (combo.period) {
      const periodInput = block.querySelector(`input[data-editor-id="${combo.period.editorId}"]`);
      periodInput.addEventListener('input', (e) => {
        applyTextValue(combo.period.el, combo.period.editorId, e.target.value);
        thuNhoChoVua(combo.period.neoGiua);
      });
      // KHÔNG format tiền tệ cho ô này — "10 năm" mà đưa qua formatCurrencyValue
      // sẽ thành "$10". Đây đúng là lỗi noCurrency đã gặp hôm 15/07.
    }
    if (combo.money) {
      const moneyInput = block.querySelector(`input[data-editor-id="${combo.money.editorId}"]`);
      moneyInput.addEventListener('input', (e) => {
        applyTextValue(combo.money.el, combo.money.editorId, e.target.value);
      });
      moneyInput.addEventListener('blur', (e) => {
        const formatted = formatCurrencyValue(e.target.value);
        if (formatted !== null && formatted !== e.target.value) {
          e.target.value = formatted;
          applyTextValue(combo.money.el, combo.money.editorId, formatted);
          thuNhoChoVua(combo.money.neoGiua);
        }
      });
    }
    return block;
  }

  // Create and append Section 2 elements
  orderedPlanItems.forEach(item => {
    // Hàng gộp [tiền | tuổi] của cột biểu đồ có builder riêng
    if (item.isChartCombo) {
      planContainer.appendChild(buildChartComboBlock(item));
      return;
    }
    if (item.isTermCombo) {
      planContainer.appendChild(buildTermComboBlock(item));
      return;
    }
    // Chỉ sửa CON SỐ trong câu, ghi thẳng vào đúng mảnh tspan chứa nó nên các
    // mảnh in đậm khác của câu không bị đụng tới.
    if (item.isSoNam) {
      const x = item.ref;
      const b = document.createElement('div');
      b.className = 'text-edit-block';
      // Ô này nhận CẢ SỐ LẪN CHỮ (chủ tool chốt 21/07): gõ "21" ra "nhận trong 21 năm",
      // gõ "trọn đời" ra "nhận trọn đời". Có dòng xem trước ngay dưới ô để thấy câu
      // hoàn chỉnh trước khi nhìn lên bản vẽ.
      b.innerHTML = `
        <div class="text-meta"><span class="text-id">Thời gian nhận dòng tiền</span></div>
        <input type="text" class="text-input-field" value="${escapeHtml(x.cum)}"
               placeholder="gõ 21  hoặc  trọn đời"
               aria-label="Thời gian nhận dòng tiền">
        <div class="text-preview" aria-live="polite"></div>
      `;
      const oNhap = b.querySelector('input');
      const xemTruoc = b.querySelector('.text-preview');
      const veLai = () => {
        const cum = cumThoiGianNhan(oNhap.value);
        xemTruoc.textContent = cum ? `Trên bản vẽ: “…dự kiến nhận ${cum}”` : '';
        if (!cum) return;
        ghiCumDongTien(x, cum);
        thuNhoChoVua(x.neoGiua);
        markDirty();
      };
      oNhap.addEventListener('input', veLai);
      xemTruoc.textContent = `Trên bản vẽ: “…dự kiến nhận ${cumThoiGianNhan(oNhap.value)}”`;
      planContainer.appendChild(b);
      return;
    }

    const itemBlock = document.createElement('div');
    itemBlock.className = 'text-edit-block';
    itemBlock.innerHTML = `
      <div class="text-meta">
        <span class="text-id">${item.displayName || 'Giá trị'}</span>
      </div>
      <input type="text" class="text-input-field" data-editor-id="${item.editorId}" value="${escapeHtml(item.textContent)}" aria-label="${escapeHtml(item.displayName || 'Giá trị')}">
    `;

    const inputEl = itemBlock.querySelector('.text-input-field');
    inputEl.addEventListener('input', (e) => {
      applyTextValue(item.el, item.editorId, e.target.value);
      // Chart age label: keep the English "Cash Value at N" subtitle in sync
      if (item.paired) {
        const num = (e.target.value.match(/\d+/) || [null])[0];
        if (num) applyTextValue(item.paired.el, item.paired.editorId, 'Cash Value at ' + num);
      }
      thuNhoChoVua(item.neoGiua);
      xepLaiHauTo(item.neoHauTo);   // đẩy chữ "/năm" ra sau con số vừa gõ
    });
    // Auto-format money on blur: "1000000" → "$1,000,000" (skip label fields like "20 năm")
    if (!item.noCurrency) {
      inputEl.addEventListener('blur', (e) => {
        const formatted = formatCurrencyValue(e.target.value);
        if (formatted !== null && formatted !== e.target.value) {
          e.target.value = formatted;
          applyTextValue(item.el, item.editorId, formatted);
          thuNhoChoVua(item.neoGiua);
          xepLaiHauTo(item.neoHauTo);
        }
      });
    }

    // Lần đầu: canh lại cụm [số | /năm] cho khớp bản vẽ, và ghi nhớ tâm cụm.
    // Phải đợi font tải xong mới đo được bề rộng chữ cho đúng.
    if (item.neoHauTo) {
      const canh = () => xepLaiHauTo(item.neoHauTo);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(canh);
      else canh();
    }

    planContainer.appendChild(itemBlock);
  });

  // Show no-data inside containers if empty
  if (clientContainer.children.length === 0) {
    clientContainer.innerHTML = '<div class="no-data">Không có chữ ở phần này.</div>';
  }
  if (planContainer.children.length === 0) {
    planContainer.innerHTML = '<div class="no-data">Không có chữ ở phần này.</div>';
  }
  if (agentContainer.children.length === 0) {
    agentContainer.innerHTML = '<div class="no-data">Không có chữ ở phần này.</div>';
  }
}

// --- AGENT INFO AUTO-PRESET (localStorage, no buttons — fully automatic) ---
// storeAgentPreset() runs on every successful Lưu Nháp / Xuất (core.js);
// applyAgentPresetQuiet() runs right after "Tạo bản cho khách" (core.js createNewProposal).
function collectAgentFields() {
  const result = {};
  document.querySelectorAll('#group-agent .text-edit-block').forEach(block => {
    const labelEl = block.querySelector('.text-id');
    const input = block.querySelector('.text-input-field');
    if (labelEl && input) result[labelEl.textContent] = input;
  });
  return result;
}

// Silently remember the agent info currently on screen
function storeAgentPreset() {
  const fields = collectAgentFields();
  const preset = {};
  Object.keys(fields).forEach(key => {
    if (fields[key].value && fields[key].value.trim()) preset[key] = fields[key].value;
  });
  if (Object.keys(preset).length === 0) return;
  localStorage.setItem('agentPreset', JSON.stringify(preset));
}

// Silently fill the remembered agent info into the freshly created client copy
function applyAgentPresetQuiet() {
  const saved = localStorage.getItem('agentPreset');
  if (!saved) return;
  try {
    const preset = JSON.parse(saved);
    const fields = collectAgentFields();
    let applied = 0;
    Object.keys(preset).forEach(key => {
      if (fields[key] && preset[key]) {
        fields[key].value = preset[key];
        fields[key].dispatchEvent(new Event('input', { bubbles: false }));
        applied++;
      }
    });
    if (applied > 0) updateStatus('Đã tự điền thông tin đại lý của bạn (lưu từ lần trước).');
  } catch (e) { /* preset hỏng → bỏ qua */ }
}

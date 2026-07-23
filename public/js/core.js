/**
 * THINKSMART TOOL — CORE (dùng chung cho mọi công cụ)
 * State, DOM cache, tải/lưu/clone file SVG, canvas zoom/pan, inspector,
 * bảng màu, nhúng font và xuất JPEG/PDF.
 *
 * Kiến trúc module (nạp theo thứ tự trong index.html):
 *   js/core.js      — file này: nền tảng dùng chung
 *   js/proposal.js  — công cụ Proposal / Báo giá
 *   js/brochure.js  — công cụ Brochure (thư viện tải về)
 *   js/namecard.js  — công cụ Name Card
 *   js/main.js      — khởi động app + cây điều hướng + sự kiện chung
 * Công cụ mới sau này = thêm một file js/<tool>.js riêng, không sửa chồng lên tool khác.
 */

// --- STATE MANAGEMENT ---
let appState = {
  mode: 'server', // 'server' = local Express backend | 'static' = deployed (Vercel), browser-only
  svgsList: [],
  library: { brochure: {}, namecard: {} }, // downloadable assets grouped by carrier
  activeLibraryPath: null,
  activeFile: null,
  activeSvgDoc: null, // Parsed DOM of active SVG
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isPanning: false,
  startX: 0,
  startY: 0,
  canvasBgColor: 'transparent',
  selectedCategory: 'all',
  searchQuery: '',
  isSpacePressed: false,
  isDirty: false // true khi bản đang mở có thay đổi CHƯA Lưu Nháp
};

// --- DIRTY STATE (nhắc Lưu Nháp — sale hay bị khách gọi cắt ngang rồi quên) ---
// Chấm cam phải hiện ở CẢ nút header LẪN nút "Lưu nháp" của thanh đáy mobile:
// trên điện thoại nút header bị ẩn, chỉ còn thanh đáy — không mirror thì sale
// mất hẳn lời nhắc "còn thay đổi chưa lưu", đúng cái dirty-tracking sinh ra để làm.
function markDirty() {
  appState.isDirty = true;
  if (dom.btnSaveTop) dom.btnSaveTop.classList.add('has-unsaved');
  const d = document.getElementById('dock-save');
  if (d) d.classList.add('has-unsaved');
}

function clearDirty() {
  appState.isDirty = false;
  if (dom.btnSaveTop) dom.btnSaveTop.classList.remove('has-unsaved');
  const d = document.getElementById('dock-save');
  if (d) d.classList.remove('has-unsaved');
}

// Cảnh báo khi sắp rời khỏi bản khách còn thay đổi chưa lưu (đổi file khác trên cây).
// Trả về true nếu được phép đi tiếp.
// ⚠️ TRẢ VỀ PROMISE — mọi nơi gọi phải `await` (hàm gọi phải là async).
async function confirmLeaveUnsaved() {
  if (!appState.isDirty || !appState.activeFile || isMasterFile(appState.activeFile)) return true;
  return showAppConfirm(
    'Bản của khách đang mở có thay đổi CHƯA LƯU NHÁP.\nChuyển đi bây giờ sẽ mất các thay đổi đó.',
    { title: 'Còn thay đổi chưa lưu', tone: 'warning', confirmText: 'Rời đi, bỏ thay đổi', cancelText: 'Ở lại' }
  );
}

// --- CONSTANTS ---
const ZOOM_SPEED = 0.08;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8.0;

// Master templates live in this folder and must never be overwritten
const MASTER_FOLDER = '2-templates';

function isMasterFile(file) {
  if (!file) return false;
  const f = (file.folder || '').toLowerCase();
  const p = (file.path || '').toLowerCase();
  // 2-Templates and Name Card masters are protected (edit + export only, never overwrite)
  return f.startsWith(MASTER_FOLDER) || p.startsWith(MASTER_FOLDER) || f.startsWith('name card') || p.startsWith('name card');
}

// A name card = master in "Name Card/" OR a personal copy (its name still contains "name card")
function isNameCardFile(file) {
  const f = (file.folder || '').toLowerCase();
  const n = (file.name || '').toLowerCase();
  return f.startsWith('name card') || n.includes('name card');
}

// Apply a new text value to both the working SVG doc element and the rendered canvas copy
function applyTextValue(el, editorId, newValue) {
  markDirty();
  el.textContent = newValue;
  clearSiblingTspans(el);
  boQuenKerning(el);
  const renderedBox = dom.canvasWrapper.querySelector('svg');
  if (renderedBox) {
    const canvasEl = renderedBox.querySelector(`[data-editor-id="${editorId}"]`);
    if (canvasEl) {
      canvasEl.textContent = newValue;
      clearSiblingTspans(canvasEl);
      boQuenKerning(canvasEl);
    }
  }
}

// Illustrator cắt một dòng chữ thành nhiều tspan, mỗi mảnh mang một class kerning
// riêng chỉ đúng cho ĐÚNG chữ cái gốc của nó (vd .cls-178 { letter-spacing: -.09em }
// vốn chỉ dành cho chữ "T"). Ta lại dồn CẢ dòng mới vào mảnh đầu → kerning đó áp cho
// toàn bộ chữ, các ký tự dính chặt vào nhau. Đây là lỗi "Texas" chủ tool báo 21/07.
// Dùng 'inherit' (KHÔNG dùng 'normal'): trả về đúng letter-spacing của <text> cha, nên
// nếu bản vẽ có tracking cố ý ở cấp dòng thì vẫn giữ nguyên.
function boQuenKerning(el) {
  if (el && el.style) el.style.letterSpacing = 'inherit';
}

// Dòng đã bị GỘP từ lần lưu trước (mảnh đầu ôm hết chữ, các mảnh em rỗng nhưng vẫn
// còn class kerning cũ) thì lúc MỞ FILE đã hiển thị sai rồi, chưa cần gõ gì.
// Dấu hiệu nhận biết: có mảnh em cùng dòng và TẤT CẢ đều rỗng.
function chuanHoaKerningDongDaGop(svgEl) {
  svgEl.querySelectorAll('tspan[data-editor-id]').forEach(el => {
    if (el.textContent.trim().length < 2) return;
    const em = manhCungDong(el).filter(sib => sib !== el);
    if (em.length === 0) return;                               // dòng 1 mảnh: đúng như bản vẽ, không đụng
    if (em.some(sib => sib.textContent !== '')) return;        // chưa gộp: kerning vẫn còn đúng chỗ
    boQuenKerning(el);
  });
}

// ⚠️ "CÙNG MỘT DÒNG" KHÔNG PHẢI LÀ "CÙNG THUỘC TÍNH y".
// Theo chuẩn SVG, tspan KHÔNG có y thì nằm tiếp trên dòng của mảnh ngay trước nó.
// Code cũ so thẳng getAttribute('y') vì Illustrator luôn ghi y cho mọi mảnh — sai kể
// từ khi gomMotKhoiChu() (proposal.js) phải gỡ y đi để text-anchor gom được cả dòng.
// Hậu quả đã đo được 21/07: gõ "-" vào ô "30 năm" ra "-0 năm", vì mảnh "0 năm" mất y
// nên không bị dọn. Mọi chỗ gom dòng PHẢI đi qua hàm này.
function manhCungDong(tspanEl) {
  const parent = tspanEl && tspanEl.parentElement;
  if (!parent) return tspanEl ? [tspanEl] : [];
  const tatCa = Array.from(parent.querySelectorAll('tspan'));
  let dangXet = null;
  const yCua = new Map();
  tatCa.forEach(sp => {
    const y = sp.getAttribute('y');
    if (y !== null) dangXet = y;
    yCua.set(sp, dangXet);
  });
  const cua = yCua.get(tspanEl);
  return tatCa.filter(sp => yCua.get(sp) === cua);
}

function clearSiblingTspans(tspanEl) {
  if (!tspanEl || tspanEl.tagName.toLowerCase() !== 'tspan') return;
  manhCungDong(tspanEl).forEach(sib => {
    if (sib !== tspanEl) sib.textContent = '';
  });
}

function getLineTextContent(tspanEl) {
  if (!tspanEl) return '';
  if (tspanEl.tagName.toLowerCase() !== 'tspan') return tspanEl.textContent.trim();
  if (!tspanEl.parentElement) return tspanEl.textContent.trim();
  let text = '';
  manhCungDong(tspanEl).forEach(sib => { text += sib.textContent; });
  return text.trim();
}

// Format a US phone number: "1234567890" / "+1 832 980 4749" → "(123) 456-7890".
// Returns null when not formattable (not 10 digits, or starts with 0 — VN numbers like
// 0938169130 are left untouched).
function formatPhoneValue(raw) {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1); // strip +1 country code
  if (digits.length !== 10 || digits[0] === '0') return null;
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
}

// Format "$1234.5" / "1,000,000" → "$1,234.50" / "$1,000,000". Returns null if not a number.
// Explicitly typed decimals are preserved: "120.00" stays "$120.00" (not collapsed to "$120").
function formatCurrencyValue(raw) {
  const cleaned = String(raw).trim().replace(/[$,\s]/g, '');
  if (cleaned === '' || isNaN(Number(cleaned))) return null;
  const num = Number(cleaned);
  const typedDecimals = /\.\d+$/.test(cleaned);
  const hasDecimals = typedDecimals || Math.abs(num % 1) > 0.000001;
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

// --- DOM ELEMENTS CACHE ---
const dom = {
  treeContainer: document.getElementById('tree-container'),
  fileCount: document.getElementById('file-count'),
  searchInput: document.getElementById('search-input'),
  categoryPills: document.querySelectorAll('.category-pills .pill'),

  canvasContainer: document.getElementById('canvas-container'),
  canvasWrapper: document.getElementById('canvas-wrapper'),
  noSelection: document.getElementById('no-selection'),

  zoomValue: document.getElementById('zoom-value'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  btnZoomFit: document.getElementById('btn-zoom-fit'),
  btnToggleGrid: document.getElementById('btn-toggle-grid'),
  presetBtns: document.querySelectorAll('.preset-btn'),

  activeFileTitle: document.getElementById('active-file-title'),
  btnSaveTop: document.getElementById('btn-save-top'),

  // Right Sidebar Tab Links & Panes
  tabLinks: document.querySelectorAll('.tab-link'),
  tabPanes: document.querySelectorAll('.tab-pane'),

  // Inspector Tab
  metaName: document.getElementById('meta-name'),
  metaPath: document.getElementById('meta-path'),
  metaCategory: document.getElementById('meta-category'),
  metaSize: document.getElementById('meta-size'),
  metaDimensions: document.getElementById('meta-dimensions'),
  metaTextCount: document.getElementById('meta-text-count'),
  metaColorCount: document.getElementById('meta-color-count'),

  btnExportJpeg: document.getElementById('btn-export-jpeg'),
  btnExportPdf: document.getElementById('btn-export-pdf'),
  btnNewProposal: document.getElementById('btn-new-proposal'),

  // Texts Tab
  textsList: document.getElementById('texts-list'),

  // Colors Tab
  colorsList: document.getElementById('colors-list'),

  statusLeft: document.getElementById('status-left'),
  statusRight: document.getElementById('status-right')
};

// --- API CLIENT CALLS ---
async function fetchSvgsList() {
  updateStatus('Đang tải danh sách mẫu...');
  try {
    // Lần gọi ĐẦU dùng lại kết quả đã bắn sớm từ <head> tool.html (tiết kiệm ~550ms
    // chờ mạng). Các lần sau (lưu/xoá nháp xong) phải lấy dữ liệu MỚI nên bỏ qua nó.
    let data = null;
    if (window.__svgsSom) {
      data = await window.__svgsSom;
      window.__svgsSom = null;
    }
    if (!data) {
      const response = await fetch('/api/svgs');
      if (!response.ok) throw new Error('API không khả dụng');
      data = await response.json();
    }
    if (data.success) {
      appState.mode = 'server';
      // 'browser' trên Vercel: nháp lưu localStorage máy sale (server chỉ-đọc); 'server' khi chạy local
      appState.draftsMode = data.draftsMode || 'server';
      appState.svgsList = data.svgs;
      if (appState.draftsMode === 'browser') appendLocalDraftsToList();
      await fetchLibrary();
      renderFileTree();
      updateStatus(`Đã tải ${data.svgs.length} thiết kế.`);
    } else {
      showErrorState(data.error);
    }
  } catch (error) {
    // No backend (e.g. deployed on Vercel) → static mode: bundled templates + proposals saved in this browser
    try {
      await fetchStaticList();
    } catch (e2) {
      showErrorState(e2.message);
    }
  }
}

// Nháp lưu trong trình duyệt có đi theo chế độ này không? (static hoàn toàn, hoặc server
// nhưng filesystem chỉ-đọc như Vercel → draftsMode 'browser')
function usesBrowserDrafts() {
  return appState.mode === 'static' || appState.draftsMode === 'browser';
}

// Giới hạn nháp trong trình duyệt (owner chốt 2026-07-17: "khoảng 10 nháp là được")
const MAX_LOCAL_DRAFTS = 10;

// Thêm các nháp localStorage vào appState.svgsList (dùng chung cho static list + server list trên Vercel)
function appendLocalDraftsToList() {
  getLocalProposals().forEach(rec => {
    appState.svgsList.push({
      name: `${rec.clientName} - ${String(rec.templateName || '').replace(/\.svg$/i, '')}.svg`,
      path: `local:${rec.id}`,
      category: rec.category,
      folder: 'Proposal của tôi (máy này)',
      size: 0,
      mtime: rec.mtime,
      localId: rec.id
    });
  });
}

// --- STATIC (DEPLOYED) MODE: bundled templates + browser-saved proposals ---
async function fetchStaticList() {
  appState.mode = 'static';
  const resp = await fetch('templates/manifest.json');
  if (!resp.ok) throw new Error('Không tải được danh sách mẫu (templates/manifest.json).');
  const manifest = await resp.json();

  appState.svgsList = manifest.map(t => ({
    name: t.name,
    path: `templates/${t.file}`,
    category: t.category,
    folder: '2-Templates',
    size: 0,
    mtime: null
  }));

  appendLocalDraftsToList();
  renderFileTree();
  updateStatus(`Chế độ online: ${manifest.length} mẫu + ${getLocalProposals().length} proposal lưu trên máy này.`);
}

// Browser storage for client proposals (static mode). Only edited text values are stored — very light.
function getLocalProposals() {
  try {
    return JSON.parse(localStorage.getItem('localProposals') || '[]');
  } catch (e) {
    return [];
  }
}

function setLocalProposals(arr) {
  localStorage.setItem('localProposals', JSON.stringify(arr));
}

function getLocalProposal(id) {
  return getLocalProposals().find(r => String(r.id) === String(id));
}

// Snapshot all editable text values of the active document, keyed by data-editor-id
// --- HỘP THOẠI: xem public/js/ui-dialog.js (dùng chung Tool + Portal) ---
// showAppAlert / showAppConfirm / showAppPrompt là hàm TOÀN CỤC do ui-dialog.js
// định nghĩa; tool.html nạp file đó TRƯỚC core.js. Cả ba đều trả Promise → phải await.

// Owner mandate 2026-07-17: tên khách nhập lúc "Tạo bản cho khách" phải điền luôn vào
// ô tên trên bản vẽ (proposal: dòng id="client-name" — tag khi mở file; name card: text[data-nc="name"]).
function applyClientNameToDoc(name) {
  const doc = appState.activeSvgDoc;
  if (!doc || !name) return;
  let target = doc.querySelector('#client-name');
  if (!target || !target.getAttribute('data-editor-id')) {
    const nc = doc.querySelector('text[data-nc="name"]');
    target = nc ? nc.querySelector('[data-editor-id]') : null;
  }
  if (!target) return;
  applyTextValue(target, target.getAttribute('data-editor-id'), name);
}

function collectEditedFields() {
  const fields = {};
  if (!appState.activeSvgDoc) return fields;
  appState.activeSvgDoc.documentElement.querySelectorAll('[data-editor-id]').forEach(el => {
    // Lưu CẢ DÒNG (mọi tspan cùng y), không phải mảnh tspan đầu — để lúc áp lại so sánh
    // được với dòng gốc và không phá các dòng nhiều tspan chưa sửa.
    fields[el.getAttribute('data-editor-id')] = getLineTextContent(el);
  });
  return fields;
}

// Cache nội dung MẪU GỐC đã tải (mẫu không đổi trong phiên) → đổi mẫu lần sau khỏi
// tải mạng lại. KHÔNG cache bản nháp/khách (local:) vì chúng thay đổi khi lưu.
const svgContentCache = new Map();
function batDauTaiCanvas() { if (dom.canvasContainer) dom.canvasContainer.classList.add('dang-tai'); }
function ketThucTaiCanvas() { if (dom.canvasContainer) dom.canvasContainer.classList.remove('dang-tai'); }

async function loadSvgContent(fileInfo) {
  updateStatus(`Đang tải thiết kế ${fileInfo.name}...`);
  batDauTaiCanvas();   // spinner + giữ bản cũ mờ, KHÔNG để trắng lúc tải/vẽ
  try {
    let content = null;
    let localRecord = null;

    if (String(fileInfo.path).startsWith('local:')) {
      // Proposal saved in this browser: load its template, edits are re-applied below.
      // Server mode (Vercel draftsMode 'browser'): templatePath là đường dẫn workspace
      // ('public/templates/...') → phải qua content API; static mode: fetch thẳng URL.
      localRecord = getLocalProposal(String(fileInfo.path).slice(6));
      if (!localRecord) throw new Error('Không tìm thấy proposal đã lưu trên máy này.');
      if (appState.mode === 'server') {
        const r = await fetch(`/api/svgs/content?path=${encodeURIComponent(localRecord.templatePath)}`);
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'Không tải được file mẫu gốc.');
        content = d.content;
      } else {
        const resp = await fetch(localRecord.templatePath);
        if (!resp.ok) throw new Error('Không tải được file mẫu gốc.');
        content = await resp.text();
      }
    } else if (appState.mode === 'static') {
      const resp = await fetch(fileInfo.path);
      if (!resp.ok) throw new Error('Không tải được file thiết kế.');
      content = await resp.text();
    } else {
      const laMau = isMasterFile(fileInfo);
      if (laMau && svgContentCache.has(fileInfo.path)) {
        content = svgContentCache.get(fileInfo.path);   // mẫu gốc đã tải → dùng lại, khỏi gọi API
      } else {
        const response = await fetch(`/api/svgs/content?path=${encodeURIComponent(fileInfo.path)}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        content = data.content;
        if (laMau) svgContentCache.set(fileInfo.path, content);
      }
    }

    {
      appState.activeFile = fileInfo;
      appState.activeSvgDoc = new DOMParser().parseFromString(content, 'image/svg+xml');

      // Check for parser errors
      const parserError = appState.activeSvgDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Mã nguồn SVG bị lỗi cú pháp XML.');
      }

      const svgEl = appState.activeSvgDoc.documentElement;

      // Optimize text layout by stripping absolute inline x offsets from same-line tspans
      optimizeSvgTexts(svgEl);

      // Assign data-editor-id to all text and tspan elements in the parsed SVG document to ensure robust mapping
      // Strip any data-editor-id saved into the file by older versions first — stale ids on <text>
      // elements would otherwise coexist with the fresh tspan-level ids and render duplicate fields.
      svgEl.querySelectorAll('[data-editor-id]').forEach(n => n.removeAttribute('data-editor-id'));
      const rawTextNodes = svgEl.querySelectorAll('text');
      let editorIdCounter = 1;
      rawTextNodes.forEach(textEl => {
        const tspans = Array.from(textEl.querySelectorAll('tspan'));
        const hasDirectText = Array.from(textEl.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');

        if (tspans.length > 0) {
          const lines = {};
          // Mảnh không có y thì thuộc dòng của mảnh trước (chuẩn SVG) — file đã lưu
          // sau khi gomMotKhoiChu() gỡ y sẽ rơi vào đúng trường hợp này.
          let yDangXet = null;
          tspans.forEach(tspan => {
            const yRieng = tspan.getAttribute('y');
            if (yRieng !== null) yDangXet = yRieng;
            const y = yDangXet || textEl.getAttribute('y') || '0';
            if (!lines[y]) lines[y] = [];
            lines[y].push(tspan);
          });
          Object.keys(lines).forEach(y => {
            const lineTspans = lines[y];
            const firstTspan = lineTspans[0];
            if (firstTspan && firstTspan.textContent.trim() !== '') {
              firstTspan.setAttribute('data-editor-id', `edit-text-${editorIdCounter++}`);
            }
          });
        } else if (hasDirectText) {
          textEl.setAttribute('data-editor-id', `edit-text-${editorIdCounter++}`);
        }
      });

      // Gỡ kerning thừa của những dòng đã bị gộp từ lần lưu trước (xem hàm này ở trên)
      chuanHoaKerningDongDaGop(svgEl);

      // Re-apply edits saved in this browser (nháp lưu localStorage)
      if (localRecord && localRecord.fields) {
        Object.keys(localRecord.fields).forEach(eid => {
          const target = svgEl.querySelector(`[data-editor-id="${eid}"]`);
          if (!target) return;
          const savedVal = localRecord.fields[eid];
          // Bỏ qua dòng không đổi (record mới lưu cả dòng) và giá trị dạng mảnh của record cũ —
          // chỉ áp dòng THỰC SỰ đã sửa, kèm xoá tspan em để không sót đuôi cũ (vd "$999.99" + ".70").
          if (getLineTextContent(target) === savedVal || target.textContent === savedVal) return;
          target.textContent = savedVal;
          clearSiblingTspans(target);
        });
      }

      // A proposal is now open → reveal the right-hand editor, clear any library preview
      setEditorVisible(true);
      hideLibraryPreview();

      // Update UI title (mark master templates, and lock their Save button)
      const isMaster = isMasterFile(fileInfo);
      // Thanh tiêu đề KHÔNG có ngữ cảnh nhóm → hiện đủ "Hãng — Chương trình"
      const cleanName = tachTenMau(fileInfo).day;
      if (dom.activeFileTitle) {
        dom.activeFileTitle.textContent = isMaster ? `${cleanName} — MẪU GỐC` : cleanName;
        dom.activeFileTitle.classList.add('is-active');
      }
      dom.btnSaveTop.disabled = isMaster;
      clearDirty();

      // Enable export buttons (JPEG + PDF)
      // ⚠️ PHẢI đứng TRƯỚC updateHeaderActions(): thanh thao tác đáy (mobile) đọc
      // `btnExportJpeg.disabled` để quyết định bật/tắt nút "Xuất", mà nó được gọi
      // từ trong updateHeaderActions. Để sau thì nó đọc trúng giá trị CŨ (true) →
      // mở bản vẽ ra mà nút Xuất vẫn xám. Đo được lúc ráp 22/07.
      if (dom.btnExportJpeg) dom.btnExportJpeg.disabled = false;
      if (dom.btnExportPdf) dom.btnExportPdf.disabled = false;

      updateHeaderActions();

      // HIỆN BẢN VẼ TRƯỚC — sale bấm để XEM là chính, thường chưa sửa liền (chủ tool 23/07).
      renderSvgOnCanvas();
      resetPan();
      zoomToFit();
      const renderBox = document.getElementById('svg-render-box');
      if (renderBox) renderBox.classList.add('svg-vao');   // fade-in bản mới
      ketThucTaiCanvas();                                  // canvas đã hiện → tắt spinner
      updateStatus(`Đang mở: ${fileInfo.name}`);

      // NHƯỜNG 2 KHUNG HÌNH cho trình duyệt VẼ XONG canvas, RỒI mới dựng "máy sửa"
      // (bảng chữ + bảng màu + click-to-edit). Mẫu nặng (~2.6MB) nhờ vậy HIỆN NGAY;
      // phần sửa nạp ngầm sau. Vẫn nằm TRONG loadSvgContent nên caller (clone → tự
      // điền preset đại lý) chờ được editor sẵn sàng — không vỡ auto-fill.
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });

      updateInspectorDetails();
      populateTextsEditor();
      populateColorsEditor();
      tagEditableCanvasElements();
    }
  } catch (error) {
    ketThucTaiCanvas();
    showAppAlert(`Lỗi khi mở file thiết kế: ${error.message}`, { title: 'Không mở được file', tone: 'danger' });
  }
}

async function saveSvgToServer() {
  if (!appState.activeFile || !appState.activeSvgDoc) return;

  if (isMasterFile(appState.activeFile)) {
    showAppAlert('Đây là file MẪU GỐC, không thể ghi đè.\n\nHãy bấm "Tạo bản cho khách" để tạo bản sao — mọi chỉnh sửa bạn vừa làm sẽ được mang sang bản sao đó.', { title: 'Mẫu gốc được bảo vệ', tone: 'warning' });
    return;
  }

  // Nháp trình duyệt (static mode HOẶC Vercel draftsMode 'browser'): lưu bộ giá trị đã điền vào localStorage
  if (usesBrowserDrafts()) {
    if (!String(appState.activeFile.path).startsWith('local:')) {
      showAppAlert('Hãy bấm "Tạo bản cho khách" để tạo bản riêng trước khi lưu.', { title: 'Chưa có bản riêng', tone: 'warning' });
      return;
    }
    const all = getLocalProposals();
    const rec = all.find(r => String(r.id) === String(appState.activeFile.path).slice(6));
    if (!rec) {
      showAppAlert('Không tìm thấy proposal này trên máy.', { title: 'Không tìm thấy', tone: 'danger' });
      return;
    }
    rec.fields = collectEditedFields();
    rec.mtime = new Date().toISOString();
    setLocalProposals(all);
    clearDirty();
    if (typeof storeAgentPreset === 'function') storeAgentPreset();
    flashButton(dom.btnSaveTop, '✓ Đã Lưu!');
    updateStatus(`Đã lưu proposal vào trình duyệt này: ${appState.activeFile.name}`);
    return;
  }

  updateStatus('Đang lưu thay đổi lên máy chủ...');
  const serializer = new XMLSerializer();
  const content = serializer.serializeToString(appState.activeSvgDoc);

  try {
    const response = await fetch('/api/svgs/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: appState.activeFile.path,
        content: content
      })
    });
    const data = await response.json();

    if (data.success) {
      // Re-update file size info in state
      appState.activeFile.size = new Blob([content]).size;
      clearDirty();
      if (typeof storeAgentPreset === 'function') storeAgentPreset();
      updateInspectorDetails();

      const prevBtnText = dom.btnSaveTop.innerHTML;
      dom.btnSaveTop.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Đã Lưu!
      `;
      dom.btnSaveTop.style.background = 'linear-gradient(135deg, var(--color-success), #15803d)';

      setTimeout(() => {
        dom.btnSaveTop.innerHTML = prevBtnText;
        dom.btnSaveTop.style.background = '';
      }, 2000);

      updateStatus(`Đã lưu file thành công: ${appState.activeFile.name}`);
    } else {
      showAppAlert(`Không thể lưu file: ${data.error}`, { title: 'Lưu không thành công', tone: 'danger' });
    }
  } catch (error) {
    showAppAlert(`Lỗi đường truyền mạng: ${error.message}`, { title: 'Mất kết nối', tone: 'danger' });
  }
}

// Create a new client proposal by cloning the currently open template (with any live edits).
// Shared flow: dùng cho cả Proposal (bản cho khách) lẫn Name Card ("Tạo bản riêng").
async function createNewProposal() {
  if (!appState.activeFile || !appState.activeSvgDoc) {
    showAppAlert('Hãy chọn một bản mẫu (IUL hoặc Term Life) ở cột bên trái trước.', { title: 'Chưa chọn mẫu' });
    return;
  }

  // Nháp trình duyệt có giới hạn — báo TRƯỚC khi bắt người dùng gõ tên
  if (usesBrowserDrafts() && getLocalProposals().length >= MAX_LOCAL_DRAFTS) {
    showAppAlert(`Máy này đã lưu đủ ${MAX_LOCAL_DRAFTS} bản nháp.\n\nHãy xoá bớt bản cũ trong nhóm "Bản nháp" (biểu tượng thùng rác), hoặc xuất JPEG/PDF để giữ bản hoàn chỉnh về máy trước khi xoá.`, { title: 'Kho nháp đã đầy', tone: 'warning' });
    return;
  }

  const isNC = isNameCardFile(appState.activeFile);
  const clientName = await showAppPrompt(
    isNC ? 'Nhập tên của bạn — bản name card riêng sẽ được tạo với tên này.'
         : 'Nhập tên khách hàng — bản proposal mới sẽ được tạo và điền sẵn tên này.',
    {
      title: isNC ? 'Tạo name card riêng' : 'Tạo bản cho khách',
      placeholder: isNC ? 'Ví dụ: Tran Thi B' : 'Ví dụ: Nguyen Van A',
      confirmText: 'Tạo bản'
    }
  );
  if (!clientName || !clientName.trim()) return;

  // Điền luôn tên vừa nhập vào ô tên trên bản vẽ (mang theo vào bản sao — owner mandate 2026-07-17)
  applyClientNameToDoc(clientName.trim());

  // Nháp trình duyệt (static mode HOẶC Vercel draftsMode 'browser'): tạo bản trong localStorage
  if (usesBrowserDrafts()) {
    let templatePath, templateName, category;
    if (String(appState.activeFile.path).startsWith('local:')) {
      const src = getLocalProposal(String(appState.activeFile.path).slice(6));
      if (!src) {
        showAppAlert('Không tìm thấy mẫu gốc của proposal này.', { title: 'Không tìm thấy', tone: 'danger' });
        return;
      }
      templatePath = src.templatePath;
      templateName = src.templateName;
      category = src.category;
    } else {
      templatePath = appState.activeFile.path;
      templateName = appState.activeFile.name;
      category = appState.activeFile.category;
    }

    const all = getLocalProposals();
    const rec = {
      id: Date.now(),
      clientName: clientName.trim(),
      templatePath: templatePath,
      templateName: templateName,
      category: category,
      fields: collectEditedFields(),
      mtime: new Date().toISOString()
    };
    all.push(rec);
    setLocalProposals(all);

    if (appState.mode === 'static') { await fetchStaticList(); } else { await fetchSvgsList(); }
    const newFile = appState.svgsList.find(f => f.path === `local:${rec.id}`);
    if (newFile) await loadSvgContent(newFile);
    // Bản mới cho khách → tự điền tên/SĐT đại lý đã dùng lần trước (không cần nút)
    if (newFile && !isNC && typeof applyAgentPresetQuiet === 'function') applyAgentPresetQuiet();
    renderFileTree();
    updateStatus(`Đã tạo proposal mới (lưu trên máy này): ${rec.clientName}`);
    return;
  }

  updateStatus('Đang tạo proposal mới...');
  const serializer = new XMLSerializer();
  const content = serializer.serializeToString(appState.activeSvgDoc);

  try {
    const response = await fetch('/api/svgs/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templatePath: appState.activeFile.path,
        clientName: clientName.trim(),
        content: content
      })
    });
    const data = await response.json();

    if (!data.success) {
      showAppAlert(`Không thể tạo proposal: ${data.error}`, { title: 'Tạo bản không thành công', tone: 'danger' });
      return;
    }

    // Refresh the tree and open the newly created client file
    await fetchSvgsList();
    const newFile = appState.svgsList.find(f => f.path === data.path);
    if (newFile) {
      await loadSvgContent(newFile);
      // Bản mới cho khách → tự điền tên/SĐT đại lý đã dùng lần trước (không cần nút)
      if (!isNC && typeof applyAgentPresetQuiet === 'function') applyAgentPresetQuiet();
      renderFileTree();
    }
    updateStatus(`Đã tạo proposal mới: ${data.name}`);
  } catch (error) {
    showAppAlert(`Lỗi khi tạo proposal: ${error.message}`, { title: 'Tạo bản không thành công', tone: 'danger' });
  }
}

// --- NAVIGATION: shared building blocks (dùng chung cho các section công cụ) ---

// SVG icons used across the navigation
const NAV_ICONS = {
  // cái cân — mục "So sánh quyền lợi các hãng"
  compare: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
  proposal:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
  brochure: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  namecard: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><line x1="13" y1="10" x2="18" y2="10"/><line x1="13" y1="14" x2="17" y2="14"/></svg>',
  carrier: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
  fileDl: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
  download: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  bigFile: '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
};

const CARRIER_ORDER = ['AIG', 'NLG', 'Allianz', 'Bản nháp', 'Chung', 'Khác'];
// Các hãng luôn hiển thị trong nav Proposal, kể cả khi chưa có mẫu nào
const MASTER_CARRIERS = ['AIG', 'NLG', 'Allianz'];

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatBytes(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

// Determine carrier group for a proposal file (from folder or filename)
function carrierOf(file) {
  const f = (file.folder || '').toLowerCase();
  const p = (file.path || '').toLowerCase();
  const n = (file.name || '').toLowerCase();
  // Bản đã tạo cho khách (4-Clients / lưu trên máy) = bản nháp đang làm dở → nhóm "Bản nháp"
  if (file.localId || f.includes('client') || p.includes('4-clients') || f.includes('máy này')) return 'Bản nháp';
  if (f.includes('aig') || n.includes('aig')) return 'AIG';
  if (f.includes('nlg') || n.includes('nlg')) return 'NLG';
  if (f.includes('allianz') || n.includes('allianz')) return 'Allianz';
  return 'Khác';
}

// ---------------------------------------------------------------------------
// TÊN HIỂN THỊ CỦA MẪU — chuẩn hoá một chỗ duy nhất.
// Tên file do người thiết kế đặt nên mỗi file một kiểu:
//   "AIG IUL" · "IUL - NLG" · "TERMLIFE - NLG" · "Max-Funded Allianz"
// Trong cây, mẫu đã nằm sẵn dưới tiêu đề hãng → lặp lại tên hãng là thừa.
// Nên: trong cây chỉ hiện TÊN CHƯƠNG TRÌNH; ở thanh tiêu đề (không có ngữ cảnh
// nhóm) mới hiện "Hãng — Chương trình".
// Bản nháp mang tên KHÁCH HÀNG → giữ nguyên, không cắt gì.
// ---------------------------------------------------------------------------
function tachTenMau(file) {
  const goc = String(file.name || '').replace(/\.[^.]+$/, '').trim();
  const laNhap = !!file.localId ||
    String(file.path || '').replace(/\\/g, '/').toLowerCase().startsWith('4-clients/');
  if (laNhap) return { hang: '', chuongTrinh: goc, day: goc };

  const hang = carrierOf(file);
  let ct = goc
    .replace(/^\s*(AIG|NLG|Allianz)\s*[-–—_]*\s*/i, '')   // hãng ở ĐẦU tên
    .replace(/\s*[-–—_]*\s*(AIG|NLG|Allianz)\s*$/i, '');  // hãng ở CUỐI tên
  // Gọi tên chương trình thống nhất, bất kể file viết hoa/thường/liền
  ct = ct.replace(/\bterm\s*-?\s*life\b/i, 'Term Life')
         .replace(/\btermlife\b/i, 'Term Life')
         .replace(/\biul\b/i, 'IUL')
         .replace(/\s{2,}/g, ' ')
         .trim();
  if (!ct) ct = goc;   // tên chỉ có mỗi tên hãng → thà giữ nguyên còn hơn để trống
  const coHang = ['AIG', 'NLG', 'Allianz'].includes(hang);
  return { hang: coHang ? hang : '', chuongTrinh: ct, day: coHang ? `${hang} — ${ct}` : ct };
}

function carrierSort(a, b) {
  const ia = CARRIER_ORDER.indexOf(a), ib = CARRIER_ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
}

// Build a collapsible folder shell → { folder, content }
function makeCollapsibleFolder(labelHTML, { extraClass = '', open = true, iconHTML = '' } = {}) {
  const folderEl = document.createElement('div');
  folderEl.className = `tree-folder ${extraClass} ${open ? 'open' : ''}`.replace(/\s+/g, ' ').trim();

  const headerEl = document.createElement('div');
  headerEl.className = 'tree-folder-header';
  headerEl.innerHTML = `
    ${iconHTML ? `<span class="tree-folder-icon">${iconHTML}</span>` : ''}
    <span class="tree-folder-label">${labelHTML}</span>
    <span class="tree-folder-arrow">${NAV_ICONS.arrow}</span>
  `;
  headerEl.addEventListener('click', () => folderEl.classList.toggle('open'));
  makeKeyboardActivatable(headerEl);

  const contentEl = document.createElement('div');
  contentEl.className = 'tree-folder-content';

  folderEl.appendChild(headerEl);
  folderEl.appendChild(contentEl);
  return { folder: folderEl, content: contentEl };
}

function makeEmptyHint(msg) {
  const d = document.createElement('div');
  d.className = 'no-data nav-empty';
  d.textContent = msg;
  return d;
}

// Cho phép điều khiển bằng bàn phím: Tab tới được, Enter/Space kích hoạt như click (WCAG keyboard-nav)
function makeKeyboardActivatable(el) {
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation(); // phần tử lồng nhau (vd nút xoá trong dòng file) không kích hoạt phần tử cha
      el.click();
    }
  });
}

// A clickable, editable proposal item (dùng cho cả Proposal lẫn Name Card)
function makeProposalItem(file) {
  const el = document.createElement('div');
  const isActive = appState.activeFile && appState.activeFile.path === file.path;
  el.className = `tree-file-item ${isActive ? 'active' : ''}`.trim();
  // Trong cây: chỉ tên chương trình (tiêu đề nhóm đã nói hãng rồi) — xem tachTenMau()
  const display = tachTenMau(file).chuongTrinh;
  // Bản nháp = bản lưu trên trình duyệt (localId) hoặc file trong 4-Clients → được phép xoá
  const isDraft = !!file.localId || String(file.path).replace(/\\/g, '/').toLowerCase().startsWith('4-clients/');
  el.innerHTML = `
    <span class="tree-file-icon">${NAV_ICONS.file}</span>
    <span class="tree-file-name" title="${escapeHtml(file.name)}">${escapeHtml(display)}</span>
    ${isDraft ? `<span class="tree-file-delete" title="Xoá bản nháp này">${NAV_ICONS.trash}</span>` : ''}
  `;
  el.addEventListener('click', async () => {
    if (appState.activeFile && appState.activeFile.path !== file.path && !(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    loadSvgContent(file);
  });
  makeKeyboardActivatable(el);
  const del = el.querySelector('.tree-file-delete');
  if (del) {
    makeKeyboardActivatable(del);
    del.setAttribute('aria-label', `Xoá bản nháp ${display}`);
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      const dongY = await showAppConfirm(`Bản nháp "${display}" sẽ bị xoá và không lấy lại được.`,
        { title: 'Xoá bản nháp?', tone: 'danger', confirmText: 'Xoá bản nháp', cancelText: 'Giữ lại' });
      if (!dongY) return;

      // Static mode: bản lưu trong trình duyệt này
      if (file.localId) {
        setLocalProposals(getLocalProposals().filter(r => String(r.id) !== String(file.localId)));
        if (appState.activeFile && appState.activeFile.path === file.path) resetCanvasToWelcome();
        if (appState.mode === 'static') { fetchStaticList(); } else { fetchSvgsList(); }
        return;
      }

      // Server mode: xoá file bản nháp trong 4-Clients
      try {
        const resp = await fetch('/api/svgs/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: file.path })
        });
        const data = await resp.json();
        if (!data.success) {
          showAppAlert(`Không thể xoá: ${data.error}`, { title: 'Xoá không thành công', tone: 'danger' });
          return;
        }
        if (appState.activeFile && appState.activeFile.path === file.path) resetCanvasToWelcome();
        await fetchSvgsList();
        updateStatus(`Đã xoá bản nháp: ${display}`);
      } catch (err) {
        showAppAlert(`Lỗi khi xoá bản nháp: ${err.message}`, { title: 'Xoá không thành công', tone: 'danger' });
      }
    });
  }
  return el;
}

// Đóng file đang mở và quay về màn hình chào (dùng sau khi xoá bản nháp đang mở)
function resetCanvasToWelcome() {
  appState.activeFile = null;
  appState.activeSvgDoc = null;
  clearDirty();
  dom.canvasWrapper.innerHTML = '';
  if (dom.noSelection) dom.noSelection.style.display = '';
  hideLibraryPreview();
  setEditorVisible(false);
  updateHeaderActions();
  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = 'Chưa chọn thiết kế';
    dom.activeFileTitle.classList.remove('is-active');
  }
  if (dom.btnExportJpeg) dom.btnExportJpeg.disabled = true;
  if (dom.btnExportPdf) dom.btnExportPdf.disabled = true;
}

// Show/hide the right-hand editor panel (only visible while editing a proposal)
function setEditorVisible(visible) {
  document.body.classList.toggle('no-editor', !visible);
}

// Header actions follow context so new users only ever see the button that makes sense:
// - master template open  → one primary CTA "Tạo bản cho khách" (save hidden — it can't save anyway)
// - client copy open      → "Lưu Nháp" (primary) + "Tạo bản mới" (secondary)
// - nothing / library     → save hidden
function updateHeaderActions() {
  const btnNew = dom.btnNewProposal;
  const btnSave = dom.btnSaveTop;
  if (!btnNew || !btnSave) return;

  const file = appState.activeFile;
  const isClientCopy = !!file && !isMasterFile(file);

  btnSave.style.display = isClientCopy ? '' : 'none';

  // Chưa mở file nào → màn chào đang hiện, mà màn chào đã có nút "Tạo bản cho
  // khách" to giữa màn hình. Để thêm nút y hệt trên header là thừa, hai nút
  // giống nhau cùng lúc gây phân vân (chủ tool hỏi 21/07: "sao lại có ở đây nữa").
  // Có file rồi thì header mới cần nút này.
  btnNew.style.display = file ? '' : 'none';

  const label = btnNew.querySelector('.btn-label');
  // "Tạo mới" ngắn gọn khi đang mở bản khách (chủ tool 21/07) — lúc đó nút đứng
  // cạnh "Lưu Nháp", để dài thành hai cụm chữ dài kề nhau, nặng thanh header.
  if (label) label.textContent = isClientCopy ? 'Tạo mới' : 'Tạo bản cho khách';
  // LUÔN là btn-primary — chủ tool 21/07: "copy button Lưu Nháp ra và sửa thành
  // Tạo mới", tức hai nút phải giống hệt nhau. Trước đây đổi qua btn-secondary
  // khi mở bản khách nên hai nút cạnh nhau lại khác kiểu.
  btnNew.classList.add('btn-primary');
  btnNew.classList.remove('btn-secondary');

  // Thanh thao tác đáy (mobile) bám CÙNG choke point này thay vì tự dựng
  // observer riêng — mọi luồng đổi ngữ cảnh (mở file, đóng file, brochure,
  // So sánh) đều đã đi qua updateHeaderActions rồi.
  if (typeof capNhatThanhDay === 'function') capNhatThanhDay();
}

// --- CANVAS RENDERING & INTERACTIVES ---
function renderSvgOnCanvas() {
  if (!appState.activeSvgDoc) return;

  dom.canvasWrapper.innerHTML = '';

  // Clone the node to avoid reference errors when updating
  const svgNode = appState.activeSvgDoc.documentElement.cloneNode(true);

  const container = document.createElement('div');
  container.className = 'rendered-svg-container';
  container.id = 'svg-render-box';
  container.appendChild(svgNode);

  // Extract width/height to set explicit pixel boundaries
  let svgWidth = parseFloat(svgNode.getAttribute('width'));
  let svgHeight = parseFloat(svgNode.getAttribute('height'));
  const viewBox = svgNode.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(parseFloat);
    if (parts.length === 4) {
      if (isNaN(svgWidth) || svgNode.getAttribute('width').includes('mm') || svgNode.getAttribute('width').includes('%')) {
        svgWidth = parts[2];
      }
      if (isNaN(svgHeight) || svgNode.getAttribute('height').includes('mm') || svgNode.getAttribute('height').includes('%')) {
        svgHeight = parts[3];
      }
    }
  }

  if (isNaN(svgWidth) || isNaN(svgHeight)) {
    svgWidth = 800;
    svgHeight = 600;
  }

  // Set explicit pixel dimensions on container to avoid browser rendering layout mismatches
  container.style.width = `${svgWidth}px`;
  container.style.height = `${svgHeight}px`;

  // Wrap in interactive container
  dom.canvasWrapper.appendChild(container);

  // Hide no-selection overlay
  if (dom.noSelection) {
    dom.noSelection.style.display = 'none';
  }

  applyTransform();

  // Tag editable elements after textareas are populated in the sidebar
  requestAnimationFrame(tagEditableCanvasElements);
}


function applyTransform() {
  dom.canvasWrapper.style.transform = `translate(${appState.panX}px, ${appState.panY}px) scale(${appState.zoom})`;
  dom.zoomValue.textContent = `${Math.round(appState.zoom * 100)}%`;
}

// Tag rendered SVG canvas text nodes that have a matching sidebar textarea.
// data-editor-id sits on the FIRST tspan of a line, but hover/click must cover the WHOLE
// value ("Male", "$100,000", "Standard Non-Tobacco") — so tag the parent <text> block when
// it holds a single editable line, and fall back to tagging every tspan of the line otherwise.
function tagEditableCanvasElements() {
  const renderedSvg = dom.canvasWrapper && dom.canvasWrapper.querySelector('svg');
  if (!renderedSvg) return;

  // Clear existing tags first
  renderedSvg.querySelectorAll('.svg-editable-text').forEach(el => {
    el.classList.remove('svg-editable-text');
    el.removeAttribute('data-editor-target');
  });

  const textareas = document.querySelectorAll('.text-input-field[data-editor-id]');
  textareas.forEach(textarea => {
    const editorId = textarea.getAttribute('data-editor-id');
    const svgTextEl = renderedSvg.querySelector(`[data-editor-id="${editorId}"]`);
    if (!svgTextEl) return;

    const parentText = svgTextEl.tagName.toLowerCase() === 'text' ? svgTextEl : svgTextEl.closest('text');
    if (parentText && parentText.querySelectorAll('[data-editor-id]').length <= 1) {
      // Whole <text> is one editable value → hover/click anywhere on it
      parentText.classList.add('svg-editable-text');
      parentText.setAttribute('data-editor-target', editorId);
    } else if (parentText) {
      // Multi-line <text>: tag every tspan on this line (same y as the id-carrying tspan)
      const y = svgTextEl.getAttribute('y');
      Array.from(parentText.querySelectorAll('tspan')).forEach(ts => {
        if (ts.getAttribute('y') === y) {
          ts.classList.add('svg-editable-text');
          ts.setAttribute('data-editor-target', editorId);
        }
      });
    } else {
      svgTextEl.classList.add('svg-editable-text');
      svgTextEl.setAttribute('data-editor-target', editorId);
    }
  });
}

function resetPan() {
  appState.zoom = 1.0;
  appState.panX = 0;
  appState.panY = 0;
  applyTransform();
}

function zoomToFit() {
  const containerRect = dom.canvasContainer.getBoundingClientRect();
  const svgEl = dom.canvasWrapper.querySelector('svg');
  if (!svgEl) return;

  // Extract natural dimension
  let svgWidth = parseFloat(svgEl.getAttribute('width'));
  let svgHeight = parseFloat(svgEl.getAttribute('height'));

  // Try viewBox if dimensions are mm/missing
  const viewBox = svgEl.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(parseFloat);
    if (parts.length === 4) {
      if (isNaN(svgWidth) || svgEl.getAttribute('width').includes('mm') || svgEl.getAttribute('width').includes('%')) {
        svgWidth = parts[2];
      }
      if (isNaN(svgHeight) || svgEl.getAttribute('height').includes('mm') || svgEl.getAttribute('height').includes('%')) {
        svgHeight = parts[3];
      }
    }
  }

  if (isNaN(svgWidth) || isNaN(svgHeight)) {
    // Default safe fallback if metadata is corrupted
    svgWidth = 800;
    svgHeight = 600;
  }

  // Account for sidebar spacing/paddings
  const padding = 60;
  const zoomX = (containerRect.width - padding) / svgWidth;
  const zoomY = (containerRect.height - padding) / svgHeight;

  // Choose limiting zoom — fit to viewport (small designs like name cards zoom up so text is readable)
  const fitZoom = Math.min(zoomX, zoomY, MAX_ZOOM);

  appState.zoom = fitZoom;

  // Center SVG in workspace viewport
  appState.panX = (containerRect.width - svgWidth * fitZoom) / 2;
  appState.panY = (containerRect.height - svgHeight * fitZoom) / 2;

  applyTransform();
}

function handleZoom(delta, clientX, clientY) {
  const containerRect = dom.canvasContainer.getBoundingClientRect();

  // Zoom coordinate anchor
  const x = clientX - containerRect.left;
  const y = clientY - containerRect.top;

  // Math calculations for centering zoom at cursor
  const worldX = (x - appState.panX) / appState.zoom;
  const worldY = (y - appState.panY) / appState.zoom;

  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, appState.zoom * (1 + delta)));

  appState.zoom = newZoom;
  appState.panX = x - worldX * newZoom;
  appState.panY = y - worldY * newZoom;

  applyTransform();
}

// --- INSPECTOR LOGIC & TAB UPDATES ---
function updateInspectorDetails() {
  if (!appState.activeFile || !appState.activeSvgDoc) return;

  const file = appState.activeFile;
  const svgEl = appState.activeSvgDoc.documentElement;

  if (dom.metaName) dom.metaName.textContent = file.name;
  if (dom.metaPath) dom.metaPath.textContent = file.path;
  if (dom.metaCategory) dom.metaCategory.textContent = file.category;

  // Size format
  const sizeKb = (file.size / 1024).toFixed(1);
  if (dom.metaSize) dom.metaSize.textContent = `${sizeKb} KB`;

  // Dimensions
  let width = svgEl.getAttribute('width') || '-';
  let height = svgEl.getAttribute('height') || '-';
  const viewBox = svgEl.getAttribute('viewBox');
  if (dom.metaDimensions) {
    if (viewBox) {
      dom.metaDimensions.textContent = `${width} × ${height} (viewBox: ${viewBox})`;
    } else {
      dom.metaDimensions.textContent = `${width} × ${height}`;
    }
  }

  // Stats
  if (dom.metaTextCount) {
    const texts = svgEl.querySelectorAll('text, tspan');
    dom.metaTextCount.textContent = texts.length;
  }

  if (dom.metaColorCount) {
    // Count colors in SVG
    const colors = extractColorsFromDoc();
    dom.metaColorCount.textContent = Object.keys(colors).length;
  }
}

// Strip absolute inline x offsets from same-line tspans to prevent diacritics overlaps & gaps on Windows
function optimizeSvgTexts(svgEl) {
  const texts = svgEl.querySelectorAll('text');
  texts.forEach(textEl => {
    const tspans = Array.from(textEl.querySelectorAll('tspan'));
    if (tspans.length === 0) return;

    let lastY = null;

    tspans.forEach((tspan, index) => {
      const yAttr = tspan.getAttribute('y');

      if (index === 0) {
        if (yAttr !== null) lastY = yAttr;
        return;
      }

      if (yAttr !== null) {
        if (yAttr === lastY) {
          tspan.removeAttribute('x');
        } else {
          lastY = yAttr;
        }
      } else {
        tspan.removeAttribute('x');
      }
    });
  });
}

// --- TEXT EDITOR PANEL (bộ điều phối) ---
// Phần khung dùng chung: dọn panel, cảnh báo mẫu gốc, gom các dòng chỉnh sửa được,
// rồi giao cho editor của từng công cụ (js/proposal.js hoặc js/namecard.js).
function populateTextsEditor() {
  if (!appState.activeSvgDoc) return;

  dom.textsList.innerHTML = '';
  const svgEl = appState.activeSvgDoc.documentElement;

  // Clear search field
  const textSearchInput = document.getElementById('text-search-input');
  if (textSearchInput) {
    textSearchInput.value = '';
  }

  // Fetch text elements with data-editor-id (pre-assigned on load)
  const textElements = Array.from(svgEl.querySelectorAll('[data-editor-id]'));

  if (textElements.length === 0) {
    dom.textsList.innerHTML = '<div class="no-data">Không tìm thấy đối tượng văn bản `<text>`.</div>';
    return;
  }

  // Route to the tool that owns this file type
  if (appState.activeFile && appState.activeFile.path.toLowerCase().includes('name card')) {
    populateNameCardTextsEditor(svgEl, textElements);
  } else {
    populateProposalTextsEditor(svgEl, textElements);
  }
}

// --- COLOR EXTRACTOR & REPLACER PANELS ---
function extractColorsFromDoc() {
  const colorsMap = {};
  if (!appState.activeSvgDoc) return colorsMap;

  const svgEl = appState.activeSvgDoc.documentElement;

  // Recursively search colors in elements
  const allElements = svgEl.querySelectorAll('*');

  allElements.forEach(el => {
    // Check attributes: fill, stroke, stop-color
    const attrs = ['fill', 'stroke', 'stop-color'];
    attrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && val.startsWith('#')) {
        const hex = val.toLowerCase().trim();
        if (!colorsMap[hex]) colorsMap[hex] = [];
        colorsMap[hex].push({ element: el, type: 'attribute', name: attr });
      }
    });

    // Check inline styles
    const style = el.getAttribute('style');
    if (style) {
      // Basic regex parsing for inline styles
      const hexMatches = style.match(/#[0-9a-fA-F]{3,8}/g);
      if (hexMatches) {
        hexMatches.forEach(match => {
          const hex = match.toLowerCase().trim();
          if (!colorsMap[hex]) colorsMap[hex] = [];
          colorsMap[hex].push({ element: el, type: 'style' });
        });
      }
    }
  });

  return colorsMap;
}

function populateColorsEditor() {
  if (!appState.activeSvgDoc || !dom.colorsList) return;

  dom.colorsList.innerHTML = '';
  const colorsMap = extractColorsFromDoc();
  const hexColors = Object.keys(colorsMap);

  if (hexColors.length === 0) {
    dom.colorsList.innerHTML = '<div class="no-data">Không tìm thấy màu dạng HEX (#...) nào.</div>';
    return;
  }

  // Sort colors by luminance for beautiful grid representation
  hexColors.sort((a, b) => {
    // Hex to RGB representation
    const rgbA = hexToRgb(a);
    const rgbB = hexToRgb(b);
    if (!rgbA || !rgbB) return 0;
    // Luminance math formula
    const lumA = 0.2126 * rgbA.r + 0.7152 * rgbA.g + 0.0722 * rgbA.b;
    const lumB = 0.2126 * rgbB.r + 0.7152 * rgbB.g + 0.0722 * rgbB.b;
    return lumB - lumA; // Dark to light
  });

  hexColors.forEach(hex => {
    const usages = colorsMap[hex];
    const count = usages.length;

    const colorBlock = document.createElement('div');
    colorBlock.className = 'color-edit-block';

    // Custom label name based on branding if matches
    let colorName = '';
    const uppercaseHex = hex.toUpperCase();
    if (uppercaseHex === '#241452') colorName = 'Deep Indigo';
    else if (uppercaseHex === '#3A1D83') colorName = 'Royal Purple';
    else if (uppercaseHex === '#6D28D9') colorName = 'Brand Purple';
    else if (uppercaseHex === '#8B5CF6') colorName = 'Light Purple';
    else if (uppercaseHex === '#A78BFA') colorName = 'Lavender';
    else if (uppercaseHex === '#C9A227') colorName = 'Gold Brand';
    else if (uppercaseHex === '#F4D77E') colorName = 'Gold Light';
    else if (uppercaseHex === '#FFFFFF') colorName = 'Trắng';
    else colorName = `${count} chi tiết`;

    colorBlock.innerHTML = `
      <div class="color-picker-wrapper">
        <input type="color" class="color-picker-input" value="${hex}">
      </div>
      <div class="color-hex">${hex}</div>
      <div class="color-tag" title="${colorName}">${colorName}</div>
    `;

    const picker = colorBlock.querySelector('.color-picker-input');

    // Bind change event to replace color globally in SVGs
    picker.addEventListener('input', (e) => {
      const newHex = e.target.value.toLowerCase();

      // Update color representation inside active DOM
      replaceColorInDoc(hex, newHex);

      // Update color code labels in editor UI itself
      colorBlock.querySelector('.color-hex').textContent = newHex;

      // Re-render SVG on Canvas to show instant updates
      renderSvgOnCanvas();
    });

    // When done changing color, regenerate colors tree to update bindings
    picker.addEventListener('change', () => {
      populateColorsEditor();
      updateInspectorDetails();
    });

    dom.colorsList.appendChild(colorBlock);
  });
}

function replaceColorInDoc(oldHex, newHex) {
  if (!appState.activeSvgDoc) return;
  markDirty();

  const svgEl = appState.activeSvgDoc.documentElement;
  const allElements = svgEl.querySelectorAll('*');

  allElements.forEach(el => {
    // 1. Check fill, stroke, stop-color attributes
    const attrs = ['fill', 'stroke', 'stop-color'];
    attrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && val.toLowerCase().trim() === oldHex) {
        el.setAttribute(attr, newHex);
      }
    });

    // 2. Check inline style strings
    const style = el.getAttribute('style');
    if (style && style.toLowerCase().includes(oldHex)) {
      // Regex replace hex strings
      const regex = new RegExp(oldHex, 'gi');
      const updatedStyle = style.replace(regex, newHex);
      el.setAttribute('style', updatedStyle);
    }
  });
}

function hexToRgb(hex) {
  // Supports shorthand #333 and standard #666666
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// --- EXPORTS (JPEG / PDF) ---

// Build export filename from the client name inside the SVG: "Proposal - Tran Van A"
function getProposalBaseName() {
  let clientName = '';
  if (appState.activeSvgDoc) {
    const nameEl = appState.activeSvgDoc.documentElement.querySelector('#client-name');
    if (nameEl) clientName = nameEl.textContent.trim();
  }
  if (clientName) return `Proposal - ${clientName}`;
  return appState.activeFile ? appState.activeFile.name.replace(/\.svg$/i, '') : 'Proposal';
}

// --- FONT EMBEDDING (so exports look identical on any machine) ---
// 2026-07-17: all files are now REAL weights/styles (subset from the installed SF Pro OTFs;
// the old bundle had Black=Bold=Heavy=Text-Bold as one identical file, so exports lost weights).
const EMBED_FONTS = [
  { family: 'SFProDisplay-Black',         file: 'fonts/SFProDisplay-Black.woff' },
  { family: 'SFProDisplay-Bold',          file: 'fonts/SFProDisplay-Bold.woff' },
  { family: 'SFProDisplay-Heavy',         file: 'fonts/SFProDisplay-Heavy.woff' },
  { family: 'SFProDisplay-Medium',        file: 'fonts/SFProDisplay-Medium.woff' },
  { family: 'SFProDisplay-Regular',       file: 'fonts/SFProDisplay-Regular.woff' },
  { family: 'SFProText-Bold',             file: 'fonts/SFProText-Bold.woff' },
  { family: 'SFProText-Regular',          file: 'fonts/SFProText-Regular.woff' },
  { family: 'SFProDisplay-RegularItalic', file: 'fonts/SFProDisplay-RegularItalic.woff' },
  { family: 'SFProDisplay-MediumItalic',  file: 'fonts/SFProDisplay-MediumItalic.woff' },
  { family: 'SFProDisplay-BoldItalic',    file: 'fonts/SFProDisplay-BoldItalic.woff' },
  { family: 'BodoniModa18pt-Italic',      file: 'fonts/BodoniModa18pt-Italic.woff2', format: 'woff2' }
];

let _embeddedFontCSS = null;

function arrayBufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Fetch the bundled woff files once and build @font-face rules with base64 data URLs
async function getEmbeddedFontCSS() {
  if (_embeddedFontCSS !== null) return _embeddedFontCSS;
  try {
    const dataUrls = {};
    await Promise.all(EMBED_FONTS.map(async f => {
      const resp = await fetch(f.file);
      if (!resp.ok) return;
      const buf = await resp.arrayBuffer();
      const fmt = f.format || 'woff';
      dataUrls[f.family] = `data:font/${fmt};base64,` + arrayBufferToBase64(buf);
    }));
    let css = '';
    EMBED_FONTS.forEach(f => {
      if (dataUrls[f.family]) css += `@font-face{font-family:'${f.family}';src:url('${dataUrls[f.family]}') format('${f.format || 'woff'}');font-display:swap;}`;
    });
    _embeddedFontCSS = css;
  } catch (e) {
    _embeddedFontCSS = '';
  }
  return _embeddedFontCSS;
}

// Shared renderer: draws the active SVG onto a 2x canvas, then calls onReady(canvas)
async function renderSvgToCanvas(onReady, bgOverride) {
  if (!appState.activeSvgDoc) return;

  const svgEl = appState.activeSvgDoc.documentElement;

  // Extract width/height
  let width = parseFloat(svgEl.getAttribute('width'));
  let height = parseFloat(svgEl.getAttribute('height'));
  const viewBox = svgEl.getAttribute('viewBox');

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(parseFloat);
    if (parts.length === 4) {
      if (isNaN(width) || svgEl.getAttribute('width').includes('mm') || svgEl.getAttribute('width').includes('%')) {
        width = parts[2];
      }
      if (isNaN(height) || svgEl.getAttribute('height').includes('mm') || svgEl.getAttribute('height').includes('%')) {
        height = parts[3];
      }
    }
  }

  if (isNaN(width) || isNaN(height)) {
    width = 1200; // Resolution standard fallback
    height = 900;
  }

  // Multiply for high-res rendering (retina export vibe: 2x)
  const scaleFactor = 2;
  const exportWidth = width * scaleFactor;
  const exportHeight = height * scaleFactor;

  // Clone the SVG and embed the fonts (base64) so the export renders with the real
  // fonts on ANY machine — not just computers that have SF Pro installed.
  const fontCSS = await getEmbeddedFontCSS();
  const svgClone = appState.activeSvgDoc.documentElement.cloneNode(true);
  if (fontCSS) {
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.setAttribute('type', 'text/css');
    styleEl.textContent = fontCSS;
    svgClone.insertBefore(styleEl, svgClone.firstChild);
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');

    // Background: explicit override (e.g. white for PDF) or the selected canvas preset
    const bg = bgOverride || appState.canvasBgColor;
    if (bg && bg !== 'transparent') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, exportWidth, exportHeight);
    }

    ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
    URL.revokeObjectURL(url);
    onReady(canvas);
  };

  img.onerror = (err) => {
    showAppAlert('Không thể chuyển đổi SVG sang ảnh. Có thể có fonts hoặc liên kết ngoài không hợp lệ.', { title: 'Xuất không thành công', tone: 'danger' });
    console.error(err);
  };

  img.src = url;
}

function flashButton(btn, text) {
  if (!btn) return;
  const prev = btn.innerHTML;
  btn.innerHTML = text;
  setTimeout(() => { btn.innerHTML = prev; }, 2000);
}

// Ghi sự kiện "tải về" để đo lường (xuất JPEG/PDF, tải brochure) — chủ tool 23/07:
// "download mới biết sale dùng THẬT". Best-effort, KHÔNG chặn luồng (auth.js nuốt lỗi).
function ghiTaiXuong() {
  if (window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('download');
}

async function exportToJpeg() {
  if (!appState.activeFile || !appState.activeSvgDoc) return;

  // Bản khách còn thay đổi chưa lưu → tự Lưu Nháp trước khi xuất (chống quên)
  if (appState.isDirty && !isMasterFile(appState.activeFile)) await saveSvgToServer();

  updateStatus('Đang xuất ảnh JPEG...');
  // JPEG has no transparency → render on a white background
  renderSvgToCanvas((canvas) => {
    const jpgUrl = canvas.toDataURL('image/jpeg', 0.92);
    const link = document.createElement('a');
    link.href = jpgUrl;

    const jpgName = `${getProposalBaseName()}.jpg`;
    link.download = jpgName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ghiTaiXuong();
    updateStatus(`Đã xuất và tải xuống ảnh JPEG: ${jpgName}`);
  }, '#ffffff');
}

// Nạp jsPDF ĐÚNG LÚC CẦN. Trước đây nó là thẻ <script> trong tool.html nên 356 KB này
// phải tải xong mới chạy được JS của mình, trên MỌI lượt vào trang — kể cả người chỉ
// vào xem rồi đi ra. Nạp một lần rồi thôi (window.jspdf còn thì bỏ qua).
let dangNapPdf = null;
function napThuVienPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
  if (dangNapPdf) return dangNapPdf;                 // bấm 2 lần liên tiếp → chỉ tải 1 lần
  dangNapPdf = new Promise((xong, loi) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => xong();
    s.onerror = () => { dangNapPdf = null; loi(new Error('Không tải được thư viện PDF')); };
    document.head.appendChild(s);
  });
  return dangNapPdf;
}

// Export proposal as a PDF (white background) via jsPDF
async function exportToPdf() {
  if (!appState.activeSvgDoc) return;

  updateStatus('Đang chuẩn bị xuất PDF...');
  try {
    await napThuVienPdf();
  } catch (e) {
    await showAppAlert('Không tải được thư viện tạo PDF. Kiểm tra kết nối mạng rồi thử lại.',
      { title: 'Chưa xuất PDF được', tone: 'danger' });
    updateStatus('Xuất PDF thất bại.');
    return;
  }

  // Bản khách còn thay đổi chưa lưu → tự Lưu Nháp trước khi xuất (chống quên)
  if (appState.activeFile && appState.isDirty && !isMasterFile(appState.activeFile)) await saveSvgToServer();

  updateStatus('Đang xuất PDF...');
  renderSvgToCanvas((canvas) => {
    const { jsPDF } = window.jspdf;
    // Canvas is rendered at 2x; PDF page uses the SVG's natural size
    const pageW = canvas.width / 2;
    const pageH = canvas.height / 2;

    const pdf = new jsPDF({
      orientation: pageW > pageH ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pageW, pageH],
      hotfixes: ['px_scaling']
    });

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH);

    const pdfName = `${getProposalBaseName()}.pdf`;
    pdf.save(pdfName);
    ghiTaiXuong();
    updateStatus(`Đã xuất PDF: ${pdfName}`);
  }, '#ffffff');
}

// --- STATUS BAR ---
// Thông báo TẠM THỜI, không phải chữ thường trực: hiện rồi tự mờ đi sau vài
// giây. Trước đây dòng cuối cùng nằm lì mãi ("Đã tải 5 thiết kế.") làm dải đáy
// lúc nào cũng có chữ thừa — chủ tool 21/07. Vẫn giữ nguyên hàm này vì nó là
// chỗ báo "Đang lưu…", "Đã xuất PDF…", "Đã xoá bản nháp…".
const STATUS_HIDE_MS = 4000;
let statusHideTimer = null;
function updateStatus(message) {
  const el = dom.statusLeft;
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(statusHideTimer);
  statusHideTimer = setTimeout(function () {
    el.classList.remove('is-visible');
  }, STATUS_HIDE_MS);
}

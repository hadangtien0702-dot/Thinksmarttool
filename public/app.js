/**
 * THINKSMART TOOL - CLIENT APPLICATION LOGIC
 * Features: Folder Tree, Figma Zoom/Pan, DOM Parser Editor (Texts, Colors, XML Code), Exports.
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
  isSpacePressed: false
};

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

// Dropdown data for client info fields
const GENDERS = ['Male', 'Female'];

const RATE_CLASSES = [
  'Preferred Plus',
  'Preferred Non-Tobacco',
  'Standard Plus',
  'Standard Non-Tobacco',
  'Preferred Tobacco',
  'Standard Tobacco'
];

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

// Apply a new text value to both the working SVG doc element and the rendered canvas copy
function applyTextValue(el, editorId, newValue) {
  el.textContent = newValue;
  clearSiblingTspans(el);
  const renderedBox = dom.canvasWrapper.querySelector('svg');
  if (renderedBox) {
    const canvasEl = renderedBox.querySelector(`[data-editor-id="${editorId}"]`);
    if (canvasEl) {
      canvasEl.textContent = newValue;
      clearSiblingTspans(canvasEl);
    }
  }
}

function clearSiblingTspans(tspanEl) {
  if (!tspanEl || tspanEl.tagName.toLowerCase() !== 'tspan') return;
  const parent = tspanEl.parentElement;
  if (!parent) return;
  const y = tspanEl.getAttribute('y');
  const siblings = Array.from(parent.querySelectorAll('tspan'));
  siblings.forEach(sib => {
    if (sib !== tspanEl && sib.getAttribute('y') === y) {
      sib.textContent = '';
    }
  });
}

function getLineTextContent(tspanEl) {
  if (!tspanEl) return '';
  if (tspanEl.tagName.toLowerCase() !== 'tspan') return tspanEl.textContent.trim();
  const parent = tspanEl.parentElement;
  if (!parent) return tspanEl.textContent.trim();
  const y = tspanEl.getAttribute('y');
  const siblings = Array.from(parent.querySelectorAll('tspan'));
  let text = '';
  siblings.forEach(sib => {
    if (sib.getAttribute('y') === y) {
      text += sib.textContent;
    }
  });
  return text.trim();
}

// Format "$1234.5" / "1,000,000" → "$1,234.50" / "$1,000,000". Returns null if not a number.
function formatCurrencyValue(raw) {
  const cleaned = String(raw).trim().replace(/[$,\s]/g, '');
  if (cleaned === '' || isNaN(Number(cleaned))) return null;
  const num = Number(cleaned);
  const hasDecimals = Math.abs(num % 1) > 0.000001;
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

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchSvgsList();
});

// --- API CLIENT CALLS ---
async function fetchSvgsList() {
  updateStatus('Đang quét thư mục chứa file thiết kế...');
  try {
    const response = await fetch('/api/svgs');
    if (!response.ok) throw new Error('API không khả dụng');
    const data = await response.json();
    if (data.success) {
      appState.mode = 'server';
      appState.svgsList = data.svgs;
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

// --- STATIC (DEPLOYED) MODE: bundled templates + browser-saved proposals ---
async function fetchStaticList() {
  appState.mode = 'static';
  const resp = await fetch('templates/manifest.json');
  if (!resp.ok) throw new Error('Không tải được danh sách mẫu (templates/manifest.json).');
  const manifest = await resp.json();

  const list = manifest.map(t => ({
    name: t.name,
    path: `templates/${t.file}`,
    category: t.category,
    folder: '2-Templates',
    size: 0,
    mtime: null
  }));

  getLocalProposals().forEach(rec => {
    list.push({
      name: `${rec.clientName} - ${String(rec.templateName || '').replace(/\.svg$/i, '')}.svg`,
      path: `local:${rec.id}`,
      category: rec.category,
      folder: 'Proposal của tôi (máy này)',
      size: 0,
      mtime: rec.mtime,
      localId: rec.id
    });
  });

  appState.svgsList = list;
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
function collectEditedFields() {
  const fields = {};
  if (!appState.activeSvgDoc) return fields;
  appState.activeSvgDoc.documentElement.querySelectorAll('[data-editor-id]').forEach(el => {
    fields[el.getAttribute('data-editor-id')] = el.textContent;
  });
  return fields;
}

async function loadSvgContent(fileInfo) {
  updateStatus(`Đang tải thiết kế ${fileInfo.name}...`);
  try {
    let content = null;
    let localRecord = null;

    if (String(fileInfo.path).startsWith('local:')) {
      // Proposal saved in this browser: load its template, edits are re-applied below
      localRecord = getLocalProposal(String(fileInfo.path).slice(6));
      if (!localRecord) throw new Error('Không tìm thấy proposal đã lưu trên máy này.');
      const resp = await fetch(localRecord.templatePath);
      if (!resp.ok) throw new Error('Không tải được file mẫu gốc.');
      content = await resp.text();
    } else if (appState.mode === 'static') {
      const resp = await fetch(fileInfo.path);
      if (!resp.ok) throw new Error('Không tải được file thiết kế.');
      content = await resp.text();
    } else {
      const response = await fetch(`/api/svgs/content?path=${encodeURIComponent(fileInfo.path)}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      content = data.content;
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
      const rawTextNodes = svgEl.querySelectorAll('text');
      let editorIdCounter = 1;
      rawTextNodes.forEach(textEl => {
        const tspans = Array.from(textEl.querySelectorAll('tspan'));
        const hasDirectText = Array.from(textEl.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
        
        if (tspans.length > 0) {
          const lines = {};
          tspans.forEach(tspan => {
            const y = tspan.getAttribute('y') || textEl.getAttribute('y') || '0';
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

      // Re-apply edits saved in this browser (static mode proposals)
      if (localRecord && localRecord.fields) {
        Object.keys(localRecord.fields).forEach(eid => {
          const target = svgEl.querySelector(`[data-editor-id="${eid}"]`);
          if (target) target.textContent = localRecord.fields[eid];
        });
      }

      // A proposal is now open → reveal the right-hand editor, clear any library preview
      setEditorVisible(true);
      hideLibraryPreview();

      // Update UI title (mark master templates, and lock their Save button)
      const isMaster = isMasterFile(fileInfo);
      const cleanName = fileInfo.name.replace(/\.svg$/i, '');
      dom.activeFileTitle.textContent = isMaster ? `${cleanName} — MẪU GỐC` : cleanName;
      dom.activeFileTitle.classList.add('is-active');
      dom.btnSaveTop.disabled = isMaster;

      // Enable export buttons (JPEG + PDF)
      if (dom.btnExportJpeg) dom.btnExportJpeg.disabled = false;
      if (dom.btnExportPdf) dom.btnExportPdf.disabled = false;
      
      // Setup Canvas
      renderSvgOnCanvas();
      resetPan();
      zoomToFit();
      
      // Update Inspector Panels
      updateInspectorDetails();
      populateTextsEditor();
      populateColorsEditor();
      
      // Tag canvas SVG text elements that are editable (after sidebar inputs exist)
      tagEditableCanvasElements();
      
      updateStatus(`Đang mở: ${fileInfo.name}`);
    }
  } catch (error) {
    alert(`Lỗi khi mở file thiết kế: ${error.message}`);
  }
}

async function saveSvgToServer() {
  if (!appState.activeFile || !appState.activeSvgDoc) return;

  if (isMasterFile(appState.activeFile)) {
    alert('Đây là file MẪU GỐC, không thể ghi đè.\n\nHãy bấm "Tạo Proposal Mới" để tạo bản sao cho khách hàng — mọi chỉnh sửa bạn vừa làm sẽ được mang sang bản sao đó.');
    return;
  }

  // Static mode (deployed): save the edited text values into this browser's storage
  if (appState.mode === 'static') {
    if (!String(appState.activeFile.path).startsWith('local:')) {
      alert('Hãy bấm "Tạo Proposal Mới" để tạo bản cho khách trước khi lưu.');
      return;
    }
    const all = getLocalProposals();
    const rec = all.find(r => String(r.id) === String(appState.activeFile.path).slice(6));
    if (!rec) {
      alert('Không tìm thấy proposal này trên máy.');
      return;
    }
    rec.fields = collectEditedFields();
    rec.mtime = new Date().toISOString();
    setLocalProposals(all);
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
      alert(`Không thể lưu file: ${data.error}`);
    }
  } catch (error) {
    alert(`Lỗi đường truyền mạng: ${error.message}`);
  }
}

// Create a new client proposal by cloning the currently open template (with any live edits)
async function createNewProposal() {
  if (!appState.activeFile || !appState.activeSvgDoc) {
    alert('Hãy chọn một bản mẫu (IUL hoặc Term Life) ở cột bên trái trước.');
    return;
  }

  const isNC = isNameCardFile(appState.activeFile);
  const clientName = prompt(isNC ? 'Nhập TÊN CỦA BẠN (để tạo name card riêng):' : 'Nhập tên khách hàng cho proposal mới:');
  if (!clientName || !clientName.trim()) return;

  // Static mode (deployed): create the proposal in this browser's storage
  if (appState.mode === 'static') {
    let templatePath, templateName, category;
    if (String(appState.activeFile.path).startsWith('local:')) {
      const src = getLocalProposal(String(appState.activeFile.path).slice(6));
      if (!src) {
        alert('Không tìm thấy mẫu gốc của proposal này.');
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

    await fetchStaticList();
    const newFile = appState.svgsList.find(f => f.path === `local:${rec.id}`);
    if (newFile) await loadSvgContent(newFile);
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
      alert(`Không thể tạo proposal: ${data.error}`);
      return;
    }

    // Refresh the tree and open the newly created client file
    await fetchSvgsList();
    const newFile = appState.svgsList.find(f => f.path === data.path);
    if (newFile) {
      await loadSvgContent(newFile);
      renderFileTree();
    }
    updateStatus(`Đã tạo proposal mới: ${data.name}`);
  } catch (error) {
    alert(`Lỗi khi tạo proposal: ${error.message}`);
  }
}

// --- NAVIGATION: main tools (Proposal / Brochure / Name Card) ---

// SVG icons used across the navigation
const NAV_ICONS = {
  proposal: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
  brochure: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  namecard: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><line x1="13" y1="10" x2="18" y2="10"/><line x1="13" y1="14" x2="17" y2="14"/></svg>',
  carrier: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
  fileDl: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
  download: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  bigFile: '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
};

const CARRIER_ORDER = ['AIG', 'NLG', 'Khách hàng', 'Chung', 'Khác'];

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
  if (file.localId || f.includes('client') || p.includes('4-clients') || f.includes('máy này')) return 'Khách hàng';
  if (f.includes('aig') || n.includes('aig')) return 'AIG';
  if (f.includes('nlg') || n.includes('nlg')) return 'NLG';
  return 'Khác';
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

// A clickable, editable proposal item
function makeProposalItem(file) {
  const el = document.createElement('div');
  const isActive = appState.activeFile && appState.activeFile.path === file.path;
  el.className = `tree-file-item ${isActive ? 'active' : ''}`.trim();
  const display = file.name.replace(/\.svg$/i, '');
  el.innerHTML = `
    <span class="tree-file-icon">${NAV_ICONS.file}</span>
    <span class="tree-file-name" title="${escapeHtml(file.name)}">${escapeHtml(display)}</span>
    ${file.localId ? '<span class="tree-file-delete" title="Xóa proposal này khỏi máy">✕</span>' : ''}
  `;
  el.addEventListener('click', () => {
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    loadSvgContent(file);
  });
  const del = el.querySelector('.tree-file-delete');
  if (del) {
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Xóa proposal "${file.name}" khỏi máy này?`)) return;
      setLocalProposals(getLocalProposals().filter(r => String(r.id) !== String(file.localId)));
      fetchStaticList();
    });
  }
  return el;
}

// A clickable, downloadable library item (brochure / name card)
function makeDownloadItem(item) {
  const el = document.createElement('div');
  const isActive = appState.activeLibraryPath === item.path || (appState.activeFile && appState.activeFile.path === item.path);
  el.className = `tree-file-item lib-item ${isActive ? 'active' : ''}`.trim();
  const display = item.name.replace(/\.[^.]+$/, '');
  el.innerHTML = `
    <span class="tree-file-icon">${NAV_ICONS.fileDl}</span>
    <span class="tree-file-name" title="${escapeHtml(item.name)}">${escapeHtml(display)}</span>
  `;
  el.addEventListener('click', () => {
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    
    // If it's an SVG file, load it as editable template on the canvas!
    if (item.ext === 'svg') {
      appState.activeLibraryPath = null;
      loadSvgContent(item);
    } else {
      openLibraryItem(item);
    }
  });
  return el;
}

function preprocessLibraryItems(items) {
  const processed = [];
  const groups = {}; // baseName -> { jpgs: [], pdf: null }

  items.forEach(it => {
    const ext = (it.ext || '').toLowerCase();
    // Normalize names to match "Name" and "Name (2)" to the same group
    const baseName = it.name.replace(/\s*\(\d+\)\.jpe?g$/i, '').replace(/\.jpe?g$/i, '').replace(/\.pdf$/i, '');
    
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'pdf') {
      if (!groups[baseName]) {
        groups[baseName] = { jpgs: [], pdf: null };
      }
      if (ext === 'pdf') {
        groups[baseName].pdf = it;
      } else {
        groups[baseName].jpgs.push(it);
      }
    } else {
      processed.push(it);
    }
  });

  Object.keys(groups).forEach(baseName => {
    const g = groups[baseName];
    // Sort pages so "AIG IUL.jpg" (page 1) comes before "AIG IUL (2).jpg" (page 2)
    g.jpgs.sort((a, b) => {
      const aHasParen = a.name.includes('(');
      const bHasParen = b.name.includes('(');
      if (aHasParen && !bHasParen) return 1;
      if (!aHasParen && bHasParen) return -1;
      return a.name.localeCompare(b.name);
    });

    // Multiple JPG pages (with or WITHOUT a PDF) → merge into ONE multi-page brochure
    if (g.jpgs.length > 1) {
      processed.push({
        name: baseName,
        path: g.pdf ? g.pdf.path : g.jpgs[0].path,   // download target: the PDF if present, else pages
        ext: g.pdf ? 'pdf' : (g.jpgs[0].ext || 'jpg'),
        size: g.pdf ? g.pdf.size : g.jpgs.reduce((s, j) => s + (j.size || 0), 0),
        isMultiPage: true,
        pages: g.jpgs.map(p => p.path)
      });
    } else {
      // Single file (one JPG or one PDF) → individual item
      if (g.pdf) processed.push(g.pdf);
      g.jpgs.forEach(jpg => processed.push(jpg));
    }
  });

  return processed;
}

function renderLibrarySection(container, label, iconHTML, groupsObj, q) {
  groupsObj = groupsObj || {};
  const section = makeCollapsibleFolder(label, { extraClass: 'nav-section', iconHTML });
  let count = 0;
  Object.keys(groupsObj).sort(carrierSort).forEach(carrier => {
    let items = (groupsObj[carrier] || []).filter(it => !q || it.name.toLowerCase().includes(q));
    if (!items.length) return;
    
    // Group multi-page brochures (PDF + JPEGs)
    items = preprocessLibraryItems(items);

    if (carrier === 'Chung') {
      // Append items directly to section content, bypassing folder grouping
      items.sort((a, b) => a.name.localeCompare(b.name)).forEach(it => section.content.appendChild(makeDownloadItem(it)));
    } else {
      const grp = makeCollapsibleFolder(`${escapeHtml(carrier)} <span class="nav-count">${items.length}</span>`, { extraClass: 'nav-carrier', iconHTML: NAV_ICONS.carrier });
      
      // Add click event to the carrier header to show all items
      const headerEl = grp.folder.querySelector('.tree-folder-header');
      if (headerEl) {
        headerEl.addEventListener('click', (e) => {
          openLibraryGroup(items, carrier);
        });
      }

      items.sort((a, b) => a.name.localeCompare(b.name)).forEach(it => grp.content.appendChild(makeDownloadItem(it)));
      section.content.appendChild(grp.folder);
    }
    count += items.length;
  });
  if (count === 0) {
    section.content.appendChild(makeEmptyHint(q ? 'Không có kết quả.' : `Chưa có file. Thả file vào folder "${label}/<Hãng>/".`));
  }
  container.appendChild(section.folder);
  return count;
}

function openLibraryGroup(items, groupName) {
  appState.activeLibraryPath = 'group:' + groupName;
  appState.activeFile = null;
  setEditorVisible(false);

  dom.activeFileTitle.textContent = groupName + ` (${items.length} files)`;
  dom.activeFileTitle.classList.add('is-active');
  dom.btnSaveTop.disabled = true;

  dom.canvasWrapper.innerHTML = '';
  showLibraryGroupPreview(items);
  updateStatus(`Đang xem nhóm: ${groupName}`);
}

function showLibraryGroupPreview(items) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }

  view.classList.add('has-group');

  let html = '<div class="library-view-group">';
  
  items.forEach(item => {
    const dl = `/api/download?path=${encodeURIComponent(item.path)}`;
    const inlineUrl = dl + '&inline=1';
    const ext = (item.ext || '').toLowerCase();
    const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
    const isPdf = ext === 'pdf';

    let previewHTML;
    if (item.isMultiPage) {
      const coverUrl = `/api/download?path=${encodeURIComponent(item.pages[0])}&inline=1`;
      previewHTML = `
        <div class="library-card-preview">
          <img src="${coverUrl}" alt="${escapeHtml(item.name)}">
          <div style="position: absolute; top: 12px; right: 12px; background: var(--brand); color: white; padding: 4px 10px; border-radius: var(--r-xs); font-size: 10px; font-weight: 800; letter-spacing: 0.5px; box-shadow: var(--shadow-sm);">${item.pages.length} TRANG</div>
        </div>`;
    } else if (isImg) {
      previewHTML = `
        <div class="library-card-preview">
          <img src="${inlineUrl}" alt="${escapeHtml(item.name)}">
        </div>`;
    } else if (isPdf) {
      previewHTML = `
        <div class="library-card-preview">
          <div class="library-card-preview-pdf">
            <div class="pdf-icon-wrapper">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style="font-size: 13px; font-weight: 700; opacity: 0.9;">Tài Liệu PDF</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Click để tải về xem chi tiết</div>
          </div>
        </div>`;
    } else {
      previewHTML = `
        <div class="library-card-preview">
          <div class="library-thumb-file" style="display: flex; align-items: center; justify-content: center;">${NAV_ICONS.bigFile}</div>
        </div>`;
    }

    html += `
      <div class="library-item-card">
        ${previewHTML}
        <div class="library-card-info">
          <div class="library-card-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name.replace(/\.[^.]+$/, ''))}</div>
          <div class="library-card-meta">
            <span class="library-card-ext">${escapeHtml((item.ext || '').toUpperCase())}</span>
            <span>·</span>
            <span>${formatBytes(item.size)}</span>
          </div>
          <a class="library-card-btn" href="${dl}" download>${NAV_ICONS.download} Tải về</a>
        </div>
      </div>
    `;
  });

  html += '</div>';
  view.innerHTML = html;
}

function renderFileTree() {
  const q = (appState.searchQuery || '').toLowerCase().trim();
  dom.treeContainer.innerHTML = '';
  let total = 0;

  // Split matched SVGs into proposals vs name cards
  const matched = appState.svgsList.filter(f => !q || f.name.toLowerCase().includes(q) || (f.path || '').toLowerCase().includes(q));
  const nameCards = matched.filter(isNameCardFile);
  const proposals = matched.filter(f => !isNameCardFile(f));

  // ---------- PROPOSAL / BÁO GIÁ ----------
  const propGroups = {};
  proposals.forEach(f => {
    const c = carrierOf(f);
    (propGroups[c] = propGroups[c] || []).push(f);
  });
  const propSection = makeCollapsibleFolder('Proposal / Báo giá', { extraClass: 'nav-section', iconHTML: NAV_ICONS.proposal });
  let propCount = 0;
  Object.keys(propGroups).sort(carrierSort).forEach(carrier => {
    const items = propGroups[carrier];
    if (!items || !items.length) return;
    const grp = makeCollapsibleFolder(`${escapeHtml(carrier)} <span class="nav-count">${items.length}</span>`, { extraClass: 'nav-carrier', iconHTML: NAV_ICONS.carrier });
    items.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => grp.content.appendChild(makeProposalItem(f)));
    propSection.content.appendChild(grp.folder);
    propCount += items.length;
  });
  if (propCount === 0) propSection.content.appendChild(makeEmptyHint(q ? 'Không có kết quả.' : 'Chưa có proposal.'));
  dom.treeContainer.appendChild(propSection.folder);
  total += propCount;

  // ---------- BROCHURE ----------
  total += renderLibrarySection(dom.treeContainer, 'Brochure', NAV_ICONS.brochure, appState.library.brochure, q);

  // ---------- NAME CARD (editable like proposals: master + personal copies) ----------
  const ncSection = makeCollapsibleFolder('Name Card', { extraClass: 'nav-section', iconHTML: NAV_ICONS.namecard });
  const ncMasters = nameCards.filter(f => (f.folder || '').toLowerCase().startsWith('name card'));
  const ncCopies = nameCards.filter(f => !(f.folder || '').toLowerCase().startsWith('name card'));
  let ncCount = 0;
  if (ncMasters.length) {
    // Master name cards appear directly under "Name Card" (no extra sub-group)
    ncMasters.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => ncSection.content.appendChild(makeProposalItem(f)));
    ncCount += ncMasters.length;
  }
  if (ncCopies.length) {
    const grp = makeCollapsibleFolder(`Của tôi <span class="nav-count">${ncCopies.length}</span>`, { extraClass: 'nav-carrier', iconHTML: NAV_ICONS.carrier });
    ncCopies.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => grp.content.appendChild(makeProposalItem(f)));
    ncSection.content.appendChild(grp.folder);
    ncCount += ncCopies.length;
  }
  if (ncCount === 0) ncSection.content.appendChild(makeEmptyHint(q ? 'Không có kết quả.' : 'Chưa có name card. Thả file .svg vào "Name Card/".'));
  dom.treeContainer.appendChild(ncSection.folder);
  total += ncCount;

  dom.fileCount.textContent = total;
}

// --- LIBRARY (download) helpers ---
async function fetchLibrary() {
  if (appState.mode !== 'server') {
    appState.library = { brochure: {}, namecard: {} };
    return;
  }
  try {
    const resp = await fetch('/api/library');
    const data = await resp.json();
    appState.library = (data && data.success && data.library) ? data.library : { brochure: {}, namecard: {} };
  } catch (e) {
    appState.library = { brochure: {}, namecard: {} };
  }
}

// Show/hide the right-hand editor panel (only visible while editing a proposal)
function setEditorVisible(visible) {
  document.body.classList.toggle('no-editor', !visible);
}

// Open a brochure / name card asset → preview in canvas + download button (no editor panel)
function openLibraryItem(item) {
  appState.activeLibraryPath = item.path;
  appState.activeFile = null;
  setEditorVisible(false);

  dom.activeFileTitle.textContent = item.name;
  dom.activeFileTitle.classList.add('is-active');
  dom.btnSaveTop.disabled = true;

  dom.canvasWrapper.innerHTML = '';
  
  let view = document.getElementById('library-view');
  if (view) view.classList.remove('has-group');

  if (item.isMultiPage) {
    showLibraryMultiPagePreview(item);
  } else {
    showLibraryPreview(item);
  }
  updateStatus(`Đang xem: ${item.name}`);
}

function showLibraryMultiPagePreview(item) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }

  view.classList.add('has-group');

  const isPdf = (item.ext || '').toLowerCase() === 'pdf';
  const dl = `/api/download?path=${encodeURIComponent(item.path)}`;

  let html = '<div class="library-view-group" style="padding-bottom: 20px;">';

  item.pages.forEach((pagePath, index) => {
    const inlineUrl = `/api/download?path=${encodeURIComponent(pagePath)}&inline=1`;
    const pageDl = `/api/download?path=${encodeURIComponent(pagePath)}`;
    html += `
      <div class="library-item-card">
        <div class="library-card-preview">
          <img src="${inlineUrl}" alt="Page ${index + 1}">
        </div>
        <div class="library-card-info" style="padding: 12px 20px; align-items: center; justify-content: center; gap: 8px;">
          <div style="font-size: var(--fs-xs); color: var(--text-3); font-weight: 700; letter-spacing: 0.5px;">TRANG ${index + 1}</div>
          ${isPdf ? '' : `<a class="btn btn-secondary btn-sm" href="${pageDl}" download>${NAV_ICONS.download} Tải trang ${index + 1}</a>`}
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Big download bar for the whole brochure
  html += `
    <div class="library-meta" style="margin-top: 10px; margin-bottom: 30px; padding: 0 40px; width: 100%;">
      ${isPdf
        ? `<a class="btn btn-primary library-download" href="${dl}" download style="padding: 12px 40px; font-size: 14px; font-weight: 700;">${NAV_ICONS.download} Tải file PDF trọn bộ</a>`
        : `<button class="btn btn-primary library-download" id="btn-dl-all-pages" style="padding: 12px 40px; font-size: 14px; font-weight: 700;">${NAV_ICONS.download} Tải tất cả ${item.pages.length} trang</button>`}
    </div>
  `;

  view.innerHTML = html;
  view.style.display = 'flex';

  // For image (non-PDF) multi-page brochures: download every page on "Tải tất cả"
  if (!isPdf) {
    const btnAll = view.querySelector('#btn-dl-all-pages');
    if (btnAll) {
      btnAll.addEventListener('click', () => {
        item.pages.forEach((pagePath, i) => {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = `/api/download?path=${encodeURIComponent(pagePath)}`;
            a.download = '';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }, i * 400);
        });
        updateStatus(`Đang tải ${item.pages.length} trang...`);
      });
    }
  }
}

function showLibraryPreview(item) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }

  const dl = `/api/download?path=${encodeURIComponent(item.path)}`;
  const inlineUrl = dl + '&inline=1';
  const ext = (item.ext || '').toLowerCase();
  const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';

  let previewHTML;
  if (isImg) {
    previewHTML = `<div class="library-thumb"><img src="${inlineUrl}" alt="${escapeHtml(item.name)}"></div>`;
  } else if (isPdf) {
    previewHTML = `<div class="library-thumb library-thumb-pdf"><iframe src="${inlineUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH" title="preview"></iframe></div>`;
  } else {
    previewHTML = `<div class="library-thumb library-thumb-file">${NAV_ICONS.bigFile}</div>`;
  }

  view.innerHTML = `
    ${previewHTML}
    <div class="library-meta">
      <a class="btn btn-primary library-download" href="${dl}" download>${NAV_ICONS.download} Tải về</a>
    </div>
  `;
  view.style.display = 'flex';
}

function hideLibraryPreview() {
  const view = document.getElementById('library-view');
  if (view) {
    view.style.display = 'none';
    view.classList.remove('has-group');
  }
  appState.activeLibraryPath = null;
}

function showErrorState(message) {
  dom.treeContainer.innerHTML = `
    <div class="error-state">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--color-danger)" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>Có lỗi xảy ra: ${message}</span>
      <button class="btn btn-secondary btn-sm" onclick="fetchSvgsList()">Thử lại</button>
    </div>
  `;
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

// Tag rendered SVG canvas text nodes that have a matching sidebar textarea
function tagEditableCanvasElements() {
  const renderedSvg = dom.canvasWrapper && dom.canvasWrapper.querySelector('svg');
  if (!renderedSvg) return;
  
  // Clear existing tags first
  renderedSvg.querySelectorAll('.svg-editable-text').forEach(el => {
    el.classList.remove('svg-editable-text');
  });
  
  const textareas = document.querySelectorAll('.text-input-field[data-editor-id]');
  textareas.forEach(textarea => {
    const editorId = textarea.getAttribute('data-editor-id');
    const svgTextEl = renderedSvg.querySelector(`[data-editor-id="${editorId}"]`);
    if (svgTextEl) {
      svgTextEl.classList.add('svg-editable-text');
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

// Helper to identify static label and paragraph texts that shouldn't be edited
function isStaticText(text) {
  const t = text.trim();
  if (!t) return true;
  
  // Rule 1: Skip if length is too long (paragraphs / disclaimers)
  if (t.length > 40) return true;
  
  // Rule 2: Skip common static labels (exact match or lowercase match)
  const staticLabels = [
    'presented by',
    'agent assistant',
    'licensed agent',
    'ceo / licensed agent',
    'bàn báo giá chương trình',
    'indexd universal life',
    'khách hàng / client',
    'tuổi / age',
    'giới tính / gender',
    'xếp hạng sức khoẻ / rate class',
    'xếp hạng sức khỏe / rate class',
    'tiểu bang / state',
    'tóm tắt quyền lợi & kế hoạch đóng phí',
    'benefits summary & payment plan',
    'quyền lợi chính / key benefits',
    'mức bảo vệ',
    'death & living benefits',
    'mức đóng mỗi tháng',
    'monthly premium',
    'giá trị tích lũy theo thời gian / cash value growth',
    'mức chi trả quyền lợi bệnh',
    'living benefits payout',
    'phí chấm dứt hợp đồng sớm',
    'early surrender charge',
    'cấp độ 1', 'cấp độ 2', 'cấp độ 3', 'cấp độ 4',
    'category 1', 'category 2', 'category 3', 'category 4',
    'dưới 25%', '25% - 50%', '50% - 75%', 'trên 75%',
    'ảnh hưởng nhẹ', 'ảnh hưởng vừa', 'ảnh hưởng nặng', 'nghiêm trọng',
    'chú thích:',
    'chú thích',
    'nhân bảo việt & kế hoạch đóng phí',
    'bảng dưới đây minh họa các mức chi trả tương ứng.',
    'bảng dưới đây minh họa các mức chi trả tương ứng'
  ];
  
  if (staticLabels.includes(t.toLowerCase())) return true;
  
  // Rule 3: Skip if it is just a label starting with standard static terms
  if (t.toLowerCase().startsWith('mức bảo vệ:') || 
      t.toLowerCase().startsWith('giá trị tích lũy:') ||
      t.toLowerCase().startsWith('trong giai đoạn đầu') ||
      t.toLowerCase().startsWith('khoản phí này thường') ||
      t.toLowerCase().startsWith('trong trường hợp mắc bệnh')) {
    return true;
  }
  
  return false;
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

// --- TEXT EDITOR PANELS ---
function populateTextsEditor() {
  if (!appState.activeSvgDoc) return;
  
  dom.textsList.innerHTML = '';
  const svgEl = appState.activeSvgDoc.documentElement;
  
  // Clear search field
  const textSearchInput = document.getElementById('text-search-input');
  if (textSearchInput) {
    textSearchInput.value = '';
  }
  
  // Warn when editing a master template
  if (isMasterFile(appState.activeFile)) {
    const warnEl = document.createElement('div');
    warnEl.className = 'template-warning';
    const isNC = (appState.activeFile.path || '').toLowerCase().includes('name card');
    warnEl.innerHTML = isNC
      ? 'Đây là <b>MẪU GỐC name card</b> — không thể lưu đè. Bấm <b>"Tạo Proposal Mới"</b> ở góc trên bên phải để tạo <b>bản riêng của bạn</b>, rồi chỉnh sửa và Xuất JPEG/PDF.'
      : 'Đây là <b>MẪU GỐC</b> — không thể lưu đè. Bấm <b>"Tạo Proposal Mới"</b> ở góc trên bên phải để tạo bản riêng cho khách hàng (các chỉnh sửa hiện tại sẽ được mang sang).';
    dom.textsList.appendChild(warnEl);
  }

  // Fetch text elements with data-editor-id (pre-assigned on load)
  const textElements = Array.from(svgEl.querySelectorAll('[data-editor-id]'));
  
  if (textElements.length === 0) {
    dom.textsList.innerHTML = '<div class="no-data">Không tìm thấy đối tượng văn bản `<text>`.</div>';
    return;
  }

  // --- CUSTOM EDITING FOR NAME CARD TEMPLATES ---
  const isNameCard = appState.activeFile && appState.activeFile.path.toLowerCase().includes('name card');
  if (isNameCard) {
    const personalGroup = document.createElement('div');
    personalGroup.className = 'text-group';
    personalGroup.innerHTML = `
      <div class="text-group-title">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>1. Thông tin cá nhân</span>
        <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </span>
      </div>
      <div class="text-group-items" id="group-personal"></div>
    `;

    const contactGroup = document.createElement('div');
    contactGroup.className = 'text-group';
    contactGroup.innerHTML = `
      <div class="text-group-title">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <span>2. Thông tin liên hệ</span>
        <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </span>
      </div>
      <div class="text-group-items" id="group-contact"></div>
    `;

    const socialGroup = document.createElement('div');
    socialGroup.className = 'text-group';
    socialGroup.innerHTML = `
      <div class="text-group-title">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>3. Địa chỉ & Mạng xã hội</span>
        <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </span>
      </div>
      <div class="text-group-items" id="group-social"></div>
    `;

    dom.textsList.appendChild(personalGroup);
    dom.textsList.appendChild(contactGroup);
    dom.textsList.appendChild(socialGroup);

    const personalContainer = personalGroup.querySelector('#group-personal');
    const contactContainer = contactGroup.querySelector('#group-contact');
    const socialContainer = socialGroup.querySelector('#group-social');

    // Add collapse listeners
    [personalGroup, contactGroup, socialGroup].forEach(group => {
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

    // Generic per-LINE editor — works with ANY name card content (no hard-coded names/phones).
    // Each visual line (tspans grouped by their y position) becomes its own editable field.
    function classifyLine(text) {
      const t = (text || '').trim();
      if (/@/.test(t)) return { label: 'Email', container: contactContainer };
      if (/youtube/i.test(t)) return { label: 'Youtube', container: socialContainer };
      if (/(www\.|https?:|\.com|\.net|\.org|\.vn)/i.test(t)) return { label: 'Website', container: socialContainer };
      if (/^\+?\(?\d[\d\s().-]{5,}$/.test(t)) return { label: 'Số điện thoại', container: contactContainer };
      if (/\d{2,}\s|(rd|st|ave|street|road|dr|blvd|ga|ca|#)\b/i.test(t)) return { label: 'Địa chỉ', container: socialContainer };
      return { label: 'Tên / Chức vụ', container: personalContainer };
    }

    // Split a <text> element into visual lines (each = the tspans sharing the same y)
    function getLines(textEl) {
      const tspans = Array.from(textEl.querySelectorAll('tspan'));
      if (tspans.length === 0) {
        const txt = textEl.textContent.trim();
        return txt ? [{ text: txt, apply: (v) => { textEl.textContent = v; } }] : [];
      }
      const order = [];
      const byY = {};
      tspans.forEach(ts => {
        const y = ts.getAttribute('y') || '_';
        if (!byY[y]) { byY[y] = []; order.push(y); }
        byY[y].push(ts);
      });
      return order.map(y => {
        const parts = byY[y];
        const text = parts.map(t => t.textContent).join('');
        return {
          text,
          apply: (v) => { parts[0].textContent = v; for (let i = 1; i < parts.length; i++) parts[i].textContent = ''; }
        };
      }).filter(l => l.text.trim() !== '');
    }

    // Helper to add one editable field bound to a line
    function addNcField(container, label, line) {
      if (!line) return;
      const itemBlock = document.createElement('div');
      itemBlock.className = 'text-edit-block';
      itemBlock.innerHTML = `
        <div class="text-meta"><span class="text-id">${escapeHtml(label)}</span></div>
        <input type="text" class="text-input-field" value="${escapeHtml(line.text)}">
      `;
      const inputEl = itemBlock.querySelector('.text-input-field');
      inputEl.addEventListener('input', (e) => { line.apply(e.target.value); renderSvgOnCanvas(); });
      container.appendChild(itemBlock);
    }

    // PREFERRED: if the card has tagged fields (data-nc), show EXACTLY those 5 — nothing else
    const ncNameEl = svgEl.querySelector('[data-nc="name"]');
    const ncTitleEl = svgEl.querySelector('[data-nc="title"]');
    const ncContactEl = svgEl.querySelector('[data-nc="contact"]');
    if (ncNameEl || ncTitleEl || ncContactEl) {
      if (ncNameEl)  addNcField(personalContainer, 'Họ và Tên', getLines(ncNameEl)[0]);
      if (ncTitleEl) addNcField(personalContainer, 'Chức vụ', getLines(ncTitleEl)[0]);
      if (ncContactEl) {
        const clines = getLines(ncContactEl);
        addNcField(contactContainer, 'Số điện thoại', clines[0]);
        addNcField(contactContainer, 'Fax / Văn phòng', clines[1]);
        addNcField(contactContainer, 'Email', clines.find(l => /@/.test(l.text)));
      }
      if (socialGroup) socialGroup.style.display = 'none'; // Website/Youtube/Địa chỉ cố định → ẩn
      return;
    }

    let ncFieldCount = 0;
    textElements.forEach(textEl => {
      getLines(textEl).forEach(line => {
        const { label, container } = classifyLine(line.text);
        const itemBlock = document.createElement('div');
        itemBlock.className = 'text-edit-block';
        itemBlock.innerHTML = `
          <div class="text-meta"><span class="text-id">${escapeHtml(label)}</span></div>
          <input type="text" class="text-input-field" value="${escapeHtml(line.text)}">
        `;
        const inputEl = itemBlock.querySelector('.text-input-field');
        inputEl.addEventListener('input', (e) => {
          line.apply(e.target.value);   // update the working SVG doc
          renderSvgOnCanvas();          // re-render the small name card (keeps pan/zoom)
        });
        container.appendChild(itemBlock);
        ncFieldCount++;
      });
    });

    if (ncFieldCount === 0) {
      dom.textsList.innerHTML = '<div class="no-data">Không tìm thấy chữ nào để chỉnh sửa trong name card này.</div>';
    }
    return;
  }
  
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
    let nameEl = svgEl.querySelector('#client-name');
    let ageEl = svgEl.querySelector('#client-age');
    let genderEl = svgEl.querySelector('#client-gender');
    let rateEl = svgEl.querySelector('#client-rate');
    let stateEl = svgEl.querySelector('#client-state');

    // data-editor-id sits on the FIRST tspan of each line, so a value split across several tspans
    // (e.g. "Standard Non-Tobacco", "Vu Nguyen") won't equal that tspan's own textContent.
    // Compare against the whole line instead so multi-tspan values are matched reliably.
    const line = el => getLineTextContent(el).trim();
    const isValue = t => t === '43' || /^\d+$/.test(t) || t === 'Male' || t === 'Female'
      || RATE_CLASSES.includes(t) || US_STATES.includes(t);

    if (!ageEl) {
      ageEl = textElementsList.find(el => line(el) === '43');
      if (ageEl) ageEl.setAttribute('id', 'client-age');
    }
    if (!genderEl) {
      genderEl = textElementsList.find(el => { const t = line(el); return t === 'Male' || t === 'Female'; });
      if (genderEl) genderEl.setAttribute('id', 'client-gender');
    }
    if (!rateEl) {
      rateEl = textElementsList.find(el => RATE_CLASSES.includes(line(el)));
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
  const planItems = [];
  
  textElements.forEach((el) => {
    // data-editor-id sits on the first tspan of a line → read the FULL line, not just that tspan
    const textContent = getLineTextContent(el).trim();
    if (!textContent) return; // Skip empty elements
    
    const editorId = el.getAttribute('data-editor-id');
    const id = el.getAttribute('id') || editorId;
    
    const absoluteY = getAbsoluteY(el);
    const absoluteX = getAbsoluteX(el);
    const fontSize = el.getAttribute('font-size') || el.style.fontSize || 'mặc định';
    
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
        : id === 'client-rate' ? RATE_CLASSES
        : id === 'client-state' ? US_STATES
        : null;

      const itemBlock = document.createElement('div');
      itemBlock.className = 'text-edit-block';

      if (dropdownOptions) {
        const opts = dropdownOptions.includes(textContent)
          ? dropdownOptions
          : [textContent, ...dropdownOptions];
        itemBlock.innerHTML = `
          <div class="text-meta">
            <span class="text-id">${displayName}</span>
          </div>
          <select class="text-input-field select-field" data-editor-id="${editorId}">
            ${opts.map(o => `<option value="${o}"${o === textContent ? ' selected' : ''}>${o}</option>`).join('')}
          </select>
        `;
        const select = itemBlock.querySelector('select');
        select.addEventListener('change', (e) => {
          applyTextValue(el, editorId, e.target.value);
        });
      } else {
        itemBlock.innerHTML = `
          <div class="text-meta">
            <span class="text-id">${displayName}</span>
          </div>
          <input type="text" class="text-input-field" data-editor-id="${editorId}" value="${escapeHtml(textContent)}">
        `;
        const inputEl = itemBlock.querySelector('.text-input-field');
        inputEl.addEventListener('input', (e) => {
          applyTextValue(el, editorId, e.target.value);
        });
      }

      clientBlocks[id] = itemBlock;
    }
    
    // --- SECTION 2: Plan & Benefits (Y >= 450 && Y < 1100) ---
    else if (absoluteY >= 450 && absoluteY < 1100) {
      // Only keep dollar values (except single "$")
      if (!textContent.startsWith('$') || textContent === '$') return;
      
      planItems.push({ el, editorId, textContent, fontSize, absoluteX, absoluteY });
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
      const isPhone = /^\(\d{3}\)/.test(textContent);
      const isName = !isPhone && textContent.length > 1 && textContent.length < 40;
      
      if (!isAgentZone || !isAgentColumn || isBottomBar || isLabel || (!isPhone && !isName)) return;
      
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
        <input type="text" class="text-input-field" data-editor-id="${editorId}" value="${escapeHtml(textContent)}">
      `;
      
      const inputEl = itemBlock.querySelector('.text-input-field');
      inputEl.addEventListener('input', (e) => {
        const newValue = e.target.value;
        el.textContent = newValue;
        const renderedBox = dom.canvasWrapper.querySelector('svg');
        if (renderedBox) {
          const canvasEl = renderedBox.querySelector(`[data-editor-id="${editorId}"]`);
          if (canvasEl) canvasEl.textContent = newValue;
        }
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
  const isTerm = appState.activeFile && appState.activeFile.name.toLowerCase().includes('term');
  const orderedPlanItems = [];
  
  if (isTerm) {
    // Term Life: 4 fields
    const mainBenefit = planItems.find(item => item.absoluteY < 600);
    const premiums = planItems.filter(item => item.absoluteY >= 600)
                              .sort((a, b) => a.absoluteX - b.absoluteX);
                              
    if (mainBenefit) mainBenefit.displayName = 'Mức bảo vệ (Mệnh giá)';
    if (premiums[0]) premiums[0].displayName = 'Phí đóng 10 năm';
    if (premiums[1]) premiums[1].displayName = 'Phí đóng 20 năm';
    if (premiums[2]) premiums[2].displayName = 'Phí đóng 30 năm';
    
    if (mainBenefit) orderedPlanItems.push(mainBenefit);
    premiums.forEach(p => orderedPlanItems.push(p));
  } else {
    // IUL: 6 fields
    const mainBenefit = planItems.find(item => item.absoluteX < 100 && item.absoluteY < 550);
    const monthlyPremium = planItems.find(item => item.absoluteX < 100 && item.absoluteY >= 550 && item.absoluteY < 650);
    const totalPremium = planItems.find(item => item.absoluteX < 100 && item.absoluteY >= 650);
    const chartProjections = planItems.filter(item => item.absoluteX >= 100)
                                      .sort((a, b) => b.absoluteY - a.absoluteY); // Descending Y -> chronological order
                                      
    if (mainBenefit) mainBenefit.displayName = 'Mức bảo vệ (Mệnh giá)';
    if (monthlyPremium) monthlyPremium.displayName = 'Phí đóng mỗi tháng';
    if (totalPremium) totalPremium.displayName = 'Tổng số tiền đóng (20 năm)';
    if (chartProjections[0]) chartProjections[0].displayName = 'Giá trị tích luỹ Tuổi 63';
    if (chartProjections[1]) chartProjections[1].displayName = 'Giá trị tích luỹ Tuổi 67';
    if (chartProjections[2]) chartProjections[2].displayName = 'Giá trị tích luỹ Tuổi 72';
    
    if (mainBenefit) orderedPlanItems.push(mainBenefit);
    if (monthlyPremium) orderedPlanItems.push(monthlyPremium);
    if (totalPremium) orderedPlanItems.push(totalPremium);
    chartProjections.forEach(cp => orderedPlanItems.push(cp));
  }

  // Create and append Section 2 elements
  orderedPlanItems.forEach(item => {
    const itemBlock = document.createElement('div');
    itemBlock.className = 'text-edit-block';
    itemBlock.innerHTML = `
      <div class="text-meta">
        <span class="text-id">${item.displayName || 'Giá trị'}</span>
      </div>
      <input type="text" class="text-input-field" data-editor-id="${item.editorId}" value="${escapeHtml(item.textContent)}">
    `;
    
    const inputEl = itemBlock.querySelector('.text-input-field');
    inputEl.addEventListener('input', (e) => {
      applyTextValue(item.el, item.editorId, e.target.value);
    });
    // Auto-format money on blur: "1000000" → "$1,000,000"
    inputEl.addEventListener('blur', (e) => {
      const formatted = formatCurrencyValue(e.target.value);
      if (formatted !== null && formatted !== e.target.value) {
        e.target.value = formatted;
        applyTextValue(item.el, item.editorId, formatted);
      }
    });

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
  } else {
    // Agent preset controls: save current agent info as default / fill saved info
    const presetBar = document.createElement('div');
    presetBar.className = 'agent-preset-bar';
    presetBar.innerHTML = `
      <button class="btn btn-secondary btn-sm" id="btn-save-agent-preset" title="Lưu tên & SĐT đại lý hiện tại làm mặc định trên máy này">Lưu làm mặc định</button>
      <button class="btn btn-secondary btn-sm" id="btn-apply-agent-preset" title="Điền lại thông tin đại lý đã lưu">Điền thông tin đã lưu</button>
    `;
    agentGroup.appendChild(presetBar);
    presetBar.querySelector('#btn-save-agent-preset').addEventListener('click', saveAgentPreset);
    presetBar.querySelector('#btn-apply-agent-preset').addEventListener('click', applyAgentPreset);
  }
}

// --- AGENT PRESET (saved in browser localStorage) ---
function collectAgentFields() {
  const result = {};
  document.querySelectorAll('#group-agent .text-edit-block').forEach(block => {
    const labelEl = block.querySelector('.text-id');
    const input = block.querySelector('.text-input-field');
    if (labelEl && input) result[labelEl.textContent] = input;
  });
  return result;
}

function saveAgentPreset() {
  const fields = collectAgentFields();
  const preset = {};
  Object.keys(fields).forEach(key => { preset[key] = fields[key].value; });
  if (Object.keys(preset).length === 0) {
    updateStatus('Không có thông tin đại lý để lưu.');
    return;
  }
  localStorage.setItem('agentPreset', JSON.stringify(preset));
  updateStatus('Đã lưu thông tin đại lý làm mặc định trên máy này.');
}

function applyAgentPreset() {
  const saved = localStorage.getItem('agentPreset');
  if (!saved) {
    updateStatus('Chưa có thông tin đại lý nào được lưu. Hãy điền rồi bấm "Lưu làm mặc định" trước.');
    return;
  }
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
    updateStatus(applied > 0 ? 'Đã điền thông tin đại lý đã lưu.' : 'Không khớp được trường nào để điền.');
  } catch (e) {
    updateStatus('Dữ liệu đại lý đã lưu bị lỗi.');
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



// --- BUTTON EXPORTS ---
function copySvgCode() {
  if (!appState.activeSvgDoc) return;
  
  const serializer = new XMLSerializer();
  const code = serializer.serializeToString(appState.activeSvgDoc);
  
  navigator.clipboard.writeText(code).then(() => {
    const prevText = dom.btnCopyCode.innerHTML;
    dom.btnCopyCode.innerHTML = '✓ Đã Copy Code!';
    setTimeout(() => {
      dom.btnCopyCode.innerHTML = prevText;
    }, 2000);
    updateStatus('Đã sao chép mã nguồn SVG vào Clipboard.');
  }).catch(err => {
    alert('Không thể copy code: ' + err);
  });
}

function downloadSvgFile() {
  if (!appState.activeFile || !appState.activeSvgDoc) return;
  
  const serializer = new XMLSerializer();
  const code = serializer.serializeToString(appState.activeSvgDoc);
  const blob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = appState.activeFile.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  updateStatus(`Đã tải xuống file SVG: ${appState.activeFile.name}`);
}

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

// Shared renderer: draws the active SVG onto a 2x canvas, then calls onReady(canvas)
// --- FONT EMBEDDING (so exports look identical on any machine) ---
const EMBED_FONTS = [
  { family: 'SFProDisplay-Black',   file: 'fonts/SFProDisplay-Black.woff' },
  { family: 'SFProDisplay-Bold',    file: 'fonts/SFProDisplay-Bold.woff' },
  { family: 'SFProDisplay-Heavy',   file: 'fonts/SFProDisplay-Heavy.woff' },
  { family: 'SFProDisplay-Medium',  file: 'fonts/SFProDisplay-Medium.woff' },
  { family: 'SFProDisplay-Regular', file: 'fonts/SFProDisplay-Regular.woff' },
  { family: 'SFProText-Bold',       file: 'fonts/SFProText-Bold.woff' },
  { family: 'SFProText-Regular',    file: 'fonts/SFProText-Regular.woff' }
];
// Italic weights aren't bundled → alias to the closest weight so text stays in the SF Pro family
const ITALIC_ALIASES = [
  { family: 'SFProDisplay-RegularItalic', from: 'SFProDisplay-Regular' },
  { family: 'SFProDisplay-MediumItalic',  from: 'SFProDisplay-Medium' },
  { family: 'SFProDisplay-BoldItalic',    from: 'SFProDisplay-Bold' }
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
      dataUrls[f.family] = 'data:font/woff;base64,' + arrayBufferToBase64(buf);
    }));
    let css = '';
    EMBED_FONTS.forEach(f => {
      if (dataUrls[f.family]) css += `@font-face{font-family:'${f.family}';src:url('${dataUrls[f.family]}') format('woff');font-display:swap;}`;
    });
    ITALIC_ALIASES.forEach(a => {
      if (dataUrls[a.from]) css += `@font-face{font-family:'${a.family}';src:url('${dataUrls[a.from]}') format('woff');font-display:swap;}`;
    });
    _embeddedFontCSS = css;
  } catch (e) {
    _embeddedFontCSS = '';
  }
  return _embeddedFontCSS;
}

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
    alert('Không thể chuyển đổi SVG sang ảnh. Có thể có fonts hoặc liên kết ngoài không hợp lệ.');
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

function exportToJpeg() {
  if (!appState.activeFile || !appState.activeSvgDoc) return;

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

    updateStatus(`Đã xuất và tải xuống ảnh JPEG: ${jpgName}`);
  }, '#ffffff');
}

// Copy the rendered proposal image straight to the clipboard (paste into Messenger/Zalo)
function copyPngToClipboard() {
  if (!appState.activeSvgDoc) return;

  updateStatus('Đang tạo ảnh để copy...');
  renderSvgToCanvas((canvas) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Không tạo được ảnh để copy.');
        return;
      }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        updateStatus('Đã copy ảnh — dán (Ctrl+V) vào Messenger/Zalo/Email để gửi khách.');
        flashButton(dom.btnCopyPng, '✓ Đã Copy!');
      }).catch(err => {
        alert('Không thể copy ảnh vào clipboard: ' + err);
      });
    }, 'image/png');
  });
}

// Export proposal as a PDF (white background) via jsPDF
function exportToPdf() {
  if (!appState.activeSvgDoc) return;

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('Thư viện PDF chưa tải xong (cần internet). Vui lòng thử lại sau vài giây.');
    return;
  }

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
    updateStatus(`Đã xuất PDF: ${pdfName}`);
  }, '#ffffff');
}

// --- UTILITIES & SYSTEM EVENT BINDINGS ---
function updateStatus(message) {
  dom.statusLeft.textContent = message;
}

function initEventListeners() {
  // Right editor panel starts hidden — only shown when a proposal is opened
  setEditorVisible(false);

  // Search & Filters
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      renderFileTree();
    });
  }
  
  // Text Editor Live Search
  const textSearchInput = document.getElementById('text-search-input');
  if (textSearchInput) {
    textSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const groups = dom.textsList.querySelectorAll('.text-group');
      
      groups.forEach(group => {
        const items = group.querySelectorAll('.text-edit-block');
        let hasMatch = false;
        
        items.forEach(item => {
          const textarea = item.querySelector('.text-input-field');
          const textValue = textarea ? textarea.value.toLowerCase() : '';
          const id = item.querySelector('.text-id') ? item.querySelector('.text-id').textContent.toLowerCase() : '';
          
          if (textValue.includes(query) || id.includes(query)) {
            item.style.display = 'flex';
            hasMatch = true;
          } else {
            item.style.display = 'none';
          }
        });
        
        if (hasMatch || query === '') {
          group.style.display = 'block';
        } else {
          group.style.display = 'none';
        }
      });
    });
  }
  
  if (dom.categoryPills) {
    dom.categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dom.categoryPills.forEach(el => el.classList.remove('active'));
        pill.classList.add('active');
        
        appState.selectedCategory = pill.dataset.category;
        renderFileTree();
      });
    });
  }
  
  // Canvas Control Bar Actions
  if (dom.btnZoomIn) dom.btnZoomIn.addEventListener('click', () => handleZoom(ZOOM_SPEED, window.innerWidth / 2, window.innerHeight / 2));
  if (dom.btnZoomOut) dom.btnZoomOut.addEventListener('click', () => handleZoom(-ZOOM_SPEED, window.innerWidth / 2, window.innerHeight / 2));
  if (dom.btnZoomFit) dom.btnZoomFit.addEventListener('click', zoomToFit);
  
  if (dom.btnToggleGrid) {
    dom.btnToggleGrid.addEventListener('click', () => {
      dom.btnToggleGrid.classList.toggle('active');
      dom.canvasContainer.classList.toggle('grid-backdrop');
    });
  }
  
  // Canvas Background Presets
  if (dom.presetBtns) {
    dom.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.presetBtns.forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        
        const bgColor = btn.dataset.bg;
        appState.canvasBgColor = bgColor;
        
        const renderBox = document.getElementById('svg-render-box');
        if (renderBox) {
          renderBox.style.backgroundColor = bgColor;
        }
      });
    });
  }
  
  // Zoom & Pan Mouse Wheel events
  if (dom.canvasContainer) {
    dom.canvasContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Delta direction mapping
      const delta = -e.deltaY * 0.0015;
      handleZoom(delta, e.clientX, e.clientY);
    }, { passive: false });
    
    // Panning drag-drop mouse event actions
    dom.canvasContainer.addEventListener('mousedown', (e) => {
      // Space key active or middle click / right click
      if (appState.isSpacePressed || e.button === 1 || e.button === 2) {
        e.preventDefault();
        appState.isPanning = true;
        appState.startX = e.clientX - appState.panX;
        appState.startY = e.clientY - appState.panY;
      }
    });
  }
  
  window.addEventListener('mousemove', (e) => {
    if (appState.isPanning) {
      appState.panX = e.clientX - appState.startX;
      appState.panY = e.clientY - appState.startY;
      applyTransform();
    }
  });
  
  window.addEventListener('mouseup', () => {
    appState.isPanning = false;
  });
  
  // Prevent context menu default popup on right click pan
  if (dom.canvasContainer) {
    dom.canvasContainer.addEventListener('contextmenu', (e) => {
      if (appState.isSpacePressed) {
        e.preventDefault();
      }
    });
  }
  
  // Handle space keydown mapping for Figma-like spacebar drag
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      // Avoid browser window auto-scroll down on space
      e.preventDefault();
      appState.isSpacePressed = true;
      if (dom.canvasContainer) dom.canvasContainer.style.cursor = 'grab';
      updateStatus('Mẹo: Nhấn kéo chuột để di chuyển canvas');
    }
    
    // Zoom Hotkeys: Ctrl + / Ctrl - / Ctrl 0
    if (e.ctrlKey && e.key === '=') {
      e.preventDefault();
      if (dom.btnZoomIn) dom.btnZoomIn.click();
    }
    if (e.ctrlKey && e.key === '-') {
      e.preventDefault();
      if (dom.btnZoomOut) dom.btnZoomOut.click();
    }
    if (e.shiftKey && e.key === '1') {
      e.preventDefault();
      if (dom.btnZoomFit) dom.btnZoomFit.click();
    }
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (dom.btnSaveTop && !dom.btnSaveTop.disabled) saveSvgToServer();
    }
  });
  
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      appState.isSpacePressed = false;
      dom.canvasContainer.style.cursor = '';
    }
  });
  
  // Save button
  if (dom.btnSaveTop) dom.btnSaveTop.addEventListener('click', saveSvgToServer);
  
  // Inspector export buttons (JPEG + PDF only)
  if (dom.btnExportJpeg) dom.btnExportJpeg.addEventListener('click', exportToJpeg);
  if (dom.btnExportPdf) dom.btnExportPdf.addEventListener('click', exportToPdf);

  // New proposal button
  if (dom.btnNewProposal) dom.btnNewProposal.addEventListener('click', createNewProposal);

  // Click-to-Edit Visual Inspector mapping
  if (dom.canvasWrapper) {
    dom.canvasWrapper.addEventListener('click', (e) => {
      const target = e.target.closest('.svg-editable-text');
      if (!target) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const editorId = target.getAttribute('data-editor-id');
      if (!editorId) return;
      
      // Find the corresponding textarea in the right sidebar
      const textarea = document.querySelector(`.text-input-field[data-editor-id="${editorId}"]`);
      if (!textarea) return;
      
      // Find the parent group section (.text-group) and expand it if collapsed
      const groupItems = textarea.closest('.text-group-items');
      if (groupItems && groupItems.style.display === 'none') {
        // Find the group title and simulate a click to expand
        const groupEl = groupItems.closest('.text-group');
        const groupTitle = groupEl ? groupEl.querySelector('.text-group-title') : null;
        if (groupTitle) groupTitle.click();
      }
      
      // Scroll the textarea into view smoothly
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus the textarea and select the text
      textarea.focus();
      textarea.select();
      
      // Briefly highlight the edit block to give visual feedback
      const editBlock = textarea.closest('.text-edit-block');
      if (editBlock) {
        editBlock.classList.add('highlight-flash');
        setTimeout(() => {
          editBlock.classList.remove('highlight-flash');
        }, 1500);
      }
    });
  }
}


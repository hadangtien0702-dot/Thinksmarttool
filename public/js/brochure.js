/**
 * THINKSMART TOOL — BROCHURE (thư viện tải về)
 * Mọi logic riêng của công cụ Brochure nằm ở file này:
 *  - Tải danh sách thư viện từ /api/library
 *  - Section "Brochure" trên cây điều hướng (nhóm theo hãng, gộp brochure nhiều trang)
 *  - Preview 1 file / nhiều trang / cả nhóm + nút tải về
 * Phần dùng chung (canvas, trạng thái, cây thư mục...) nằm ở js/core.js.
 */

// --- LIBRARY DATA ---
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

// A clickable, downloadable library item (brochure / name card)
function makeDownloadItem(item) {
  const el = document.createElement('div');
  const isActive = appState.activeLibraryPath === item.path || (appState.activeFile && appState.activeFile.path === item.path);
  el.className = `tree-file-item lib-item ${isActive ? 'active' : ''}`.trim();
  // Cùng quy tắc với cây Proposal: mục nằm dưới tiêu đề hãng rồi nên bỏ tên hãng
  // khỏi nhãn (xem tachTenMau trong core.js) — trước đây "AIG IUL", "NLG Termlife".
  const display = tachTenMau(item).chuongTrinh;
  el.innerHTML = `
    <span class="tree-file-icon">${NAV_ICONS.fileDl}</span>
    <span class="tree-file-name" title="${escapeHtml(item.name)}">${escapeHtml(display)}</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
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
  makeKeyboardActivatable(el);
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

// --- NAV SECTION: "Brochure" (gọi từ renderFileTree trong js/main.js) ---
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
        headerEl.addEventListener('click', async (e) => {
          if (!(await confirmLeaveUnsaved())) return;
          openLibraryGroup(items, carrier);
        });
      }

      items.sort((a, b) => a.name.localeCompare(b.name)).forEach(it => grp.content.appendChild(makeDownloadItem(it)));
      section.content.appendChild(grp.folder);
    }
    count += items.length;
  });
  if (count === 0) {
    // The hint must show the REAL folder name (before the " / vietnamese" display suffix)
    const folderName = String(label).split(' / ')[0];
    section.content.appendChild(makeEmptyHint(q ? 'Không có kết quả.' : `Chưa có file. Thả file vào folder "${folderName}/<Hãng>/".`));
  }
  container.appendChild(section.folder);
  return count;
}

// --- PREVIEWS ---
function openLibraryGroup(items, groupName) {
  appState.activeLibraryPath = 'group:' + groupName;
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = groupName + ` (${items.length} files)`;
    dom.activeFileTitle.classList.add('is-active');
  }
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

// Open a brochure / name card asset → preview in canvas + download button (no editor panel)
function openLibraryItem(item) {
  appState.activeLibraryPath = item.path;
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = item.name;
    dom.activeFileTitle.classList.add('is-active');
  }
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

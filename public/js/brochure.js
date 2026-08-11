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
    appState.library = { brochure: {}, namecard: {}, sms: {} };
    return;
  }
  try {
    const resp = await fetch('/api/library');
    const data = await resp.json();
    appState.library = (data && data.success && data.library) ? data.library : { brochure: {}, namecard: {}, sms: {} };
  } catch (e) {
    appState.library = { brochure: {}, namecard: {}, sms: {} };
  }
}

// A clickable, downloadable library item (brochure / name card)
// `giuTenHang` = true → KHÔNG cắt tên hãng khỏi nhãn.
// ☠️ Bắt được 11/08/2026 ở mục Application Form: file rơi vào nhóm "Chung" (folder
// không chia hãng con) nên KHÔNG có tiêu đề hãng ở trên — mà nhãn vẫn bị cắt tên
// hãng, thành ra "AIG Application Form" và "Allianz Application Form" hiện ra
// GIỐNG HỆT NHAU: hai dòng "Application Form". Sale bấm nhầm hãng mà không biết.
// Cắt tên hãng chỉ đúng khi mục nằm DƯỚI tiêu đề hãng; nhóm "Chung" thì không.
function makeDownloadItem(item, giuTenHang) {
  const el = document.createElement('div');
  const isActive = appState.activeLibraryPath === item.path || (appState.activeFile && appState.activeFile.path === item.path);
  el.className = `tree-file-item lib-item ${isActive ? 'active' : ''}`.trim();
  const t = tachTenMau(item);
  const display = giuTenHang ? (t.hang ? `${t.hang} — ${t.chuongTrinh}` : t.chuongTrinh)
                             : t.chuongTrinh;
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
// `moi` = true → gắn huy hiệu "new" cạnh tên mục.
// ☠️ Có tham số riêng vì bản đầu (11/08/2026) nhét thẳng chuỗi
// `Application Form / Biểu mẫu</span><span class="nav-new">NEW` vào chỗ `label`.
// Nó CHẠY ĐƯỢC — nhưng chỉ vì `label` tình cờ đi thẳng vào innerHTML. Ngày nào
// có người bọc `escapeHtml(label)` cho an toàn thì tên mục hiện ra nguyên đoạn
// thẻ HTML, và lỗi đó không liên quan gì tới người vừa sửa.
function renderLibrarySection(container, label, iconHTML, groupsObj, q, moi) {
  groupsObj = groupsObj || {};
  // Huy hiệu truyền bằng `moi` để makeCollapsibleFolder đặt NGOÀI nhãn — nhét vào
  // trong nhãn thì bị `text-overflow: ellipsis` cắt thành "NE…" (chủ tool bắt được
  // 11/08/2026 ở đúng mục này, vì nó là mục CÓ dropdown nên nhãn hẹp hơn).
  const section = makeCollapsibleFolder(nhanMuc(label), { extraClass: 'nav-section', iconHTML, moi });
  let count = 0;
  Object.keys(groupsObj).sort(carrierSort).forEach(carrier => {
    let items = (groupsObj[carrier] || []).filter(it => !q || it.name.toLowerCase().includes(q));
    if (!items.length) return;

    // Group multi-page brochures (PDF + JPEGs)
    items = preprocessLibraryItems(items);

    if (carrier === 'Chung') {
      // Append items directly to section content, bypassing folder grouping.
      // GIỮ tên hãng trong nhãn: ở đây không có tiêu đề hãng phía trên để bù lại.
      items.sort((a, b) => a.name.localeCompare(b.name)).forEach(it => section.content.appendChild(makeDownloadItem(it, true)));
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

// Mục "So sánh quyền lợi / Compare" đã CHUYỂN sang js/sosanh.js (21/07/2026):
// từ danh sách 16 logo → bảng 5 cột theo yêu cầu chủ tool. Đừng viết lại ở đây.

// --- PREVIEWS ---
function openLibraryGroup(items, groupName) {
  // ☠️ LỖI CÓ SẴN, SỬA 10/08/2026: hai hàm mở thư viện này KHÔNG gọi
  // hideLibraryPreview → mở bảng So sánh (bật `doc-mode`) rồi bấm sang một
  // brochure thì thân trang vẫn ở doc-mode: canvas bị ẩn, người dùng vẫn nhìn
  // thấy BẢNG SO SÁNH trong khi tool tưởng đang mở brochure. Gọi TRƯỚC khi đặt
  // activeLibraryPath, vì hàm này xoá giá trị đó (bẫy đã ghi ở openCompareTable).
  hideLibraryPreview();
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

// ---------------------------------------------------------------------------
// MỤC "SMS / Tin nhắn mẫu" — MỘT DÒNG PHẲNG, KHÔNG menu phụ (10/08/2026)
//
// Chủ tool: *"phần này em hãy để giống phần ở trên, nó không sinh ra menu phụ"*
// (phần ở trên = Compare). Bản đầu em dựng nó thành nhóm xổ được như Brochure →
// thanh bên dài thêm một tầng cho đúng MỘT dòng con. Cùng lý do đã ghi ở
// renderCompareNavSection: dựng dropdown chứa một dòng là bắt bấm hai lần cho
// một việc.
// Nhiều ảnh thì sao? Bấm một lần mở HẾT, xếp dọc trong cùng khung cuộn — đọc
// liền mạch, vẫn không đẻ thêm tầng menu nào.
// ---------------------------------------------------------------------------
function danhSachSms() {
  const groups = appState.library.sms || {};
  return Object.keys(groups).sort(carrierSort)
    .flatMap(g => preprocessLibraryItems(groups[g] || []))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderSmsNavSection(container, q) {
  const items = danhSachSms();
  if (q && !'sms tin nhắn mẫu'.includes(q) && !items.some(it => it.name.toLowerCase().includes(q))) return 0;

  const folder = document.createElement('div');
  folder.className = 'tree-folder nav-section nav-section-flat';

  const el = document.createElement('div');
  el.className = 'tree-folder-header' + (appState.activeLibraryPath === 'sms:all' ? ' is-open' : '');
  el.setAttribute('title', items.length ? `${items.length} tin nhắn mẫu` : 'Chưa có tin nhắn mẫu');
  el.innerHTML = `
    <span class="tree-folder-icon">${NAV_ICONS.sms}</span>
    <span class="tree-folder-label">${nhanMuc('SMS / Tin nhắn mẫu')}</span><span class="nav-new">new</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    openSmsAll();               // gọi TRƯỚC: bên trong nó gọi hideLibraryPreview, hàm này xoá dấu is-open
    el.classList.add('is-open');
  });
  makeKeyboardActivatable(el);

  folder.appendChild(el);
  container.appendChild(folder);
  return 1;
}

function openSmsAll() {
  const items = danhSachSms();

  // Dọn khung cũ TRƯỚC rồi mới đặt trạng thái mới — hideLibraryPreview xoá
  // activeLibraryPath, gọi sau là mất luôn dấu chọn ở thanh bên (đúng bẫy đã
  // ghi trong openCompareTable).
  hideLibraryPreview();
  dom.canvasWrapper.innerHTML = '';

  appState.activeLibraryPath = 'sms:all';
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  const ten = items.length === 1
    ? String(items[0].name).replace(/\.(jpe?g|png|pdf|svg|webp)$/i, '')
    : `Tin nhắn mẫu (${items.length})`;
  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = items.length ? ten : 'Tin nhắn mẫu';
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  // Đo lường: 1 lượt XEM, gộp nhóm giống brochure. Best-effort.
  if (items.length && window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('view', 'Tin nhắn mẫu: ' + ten);

  showTallPreview(items);
  updateStatus(items.length ? `Đang xem: ${ten}` : 'Chưa có tin nhắn mẫu nào');
}

// ---------------------------------------------------------------------------
// KHUNG XEM ẢNH DỌC RẤT CAO — "SMS / Tin nhắn mẫu" (10/08/2026)
//
// ☠️ Vì sao phải có khung riêng, đừng gộp lại: khung brochure thường ghim
// `max-height: 60vh` lên ảnh (style.css .library-thumb img). Ảnh SMS đầu tiên đo
// được 1080 x 7082 — cao gấp 6,6 lần bề ngang. Ghim chiều cao xong nó chỉ còn
// ~9vh bề ngang: một SỢI CHỈ trên màn hình, chữ không đọc nổi.
// Ở đây làm ngược lại: ghim BỀ NGANG cỡ một cái điện thoại (~480px) rồi cho
// CUỘN DỌC. Nhận cả một mảng item nên dùng được cho 1 ảnh lẫn cả nhóm.
//
// Nút "Tải về" nằm trong thanh DÍNH TRÊN ĐỈNH (position: sticky), không để dưới
// đáy — với ảnh cao 7000px thì nút ở đáy cách nội dung cả một quãng cuộn, đúng
// lỗi chủ tool đã bắt hôm 31/07 ("nút download bị tọt xuống dưới luôn").
// ---------------------------------------------------------------------------
function showTallPreview(items) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }
  view.classList.remove('has-group');
  view.classList.add('is-tall');

  if (!items.length) {
    view.innerHTML = `<div class="tall-doc"><div class="tall-doc-bar">
        <span class="tall-doc-title">Chưa có tin nhắn mẫu — thả ảnh vào folder "SMS/" ở gốc dự án.</span>
      </div></div>`;
    view.style.display = 'block';
    return;
  }

  view.innerHTML = items.map(item => {
    const pages = item.isMultiPage ? item.pages : [item.path];
    const dl = `/api/download?path=${encodeURIComponent(item.path)}`;
    const ten = String(item.name).replace(/\.(jpe?g|png|pdf|svg|webp)$/i, '');
    const anh = pages.map((p, i) => `
      <img class="tall-doc-img" loading="${i === 0 ? 'eager' : 'lazy'}"
           src="/api/download?path=${encodeURIComponent(p)}&inline=1"
           alt="${escapeHtml(ten)}${pages.length > 1 ? ' — trang ' + (i + 1) : ''}">`).join('');
    return `
      <div class="tall-doc">
        <div class="tall-doc-bar">
          <span class="tall-doc-title" title="${escapeHtml(item.name)}">${escapeHtml(ten)}</span>
          <a class="btn btn-primary btn-sm tall-doc-dl" href="${dl}" download>${NAV_ICONS.download} Tải về</a>
        </div>
        ${anh}
      </div>`;
  }).join('');

  view.style.display = 'block';
  view.scrollTop = 0;
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

  view.classList.remove('is-tall');
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
          <img src="${coverUrl}" alt="${escapeHtml(item.name)}" loading="lazy">
          <div style="position: absolute; top: 12px; right: 12px; background: var(--brand); color: white; padding: 4px 10px; border-radius: var(--r-xs); font-size: 10px; font-weight: 800; letter-spacing: 0.5px; box-shadow: var(--shadow-sm);">${item.pages.length} TRANG</div>
        </div>`;
    } else if (isImg) {
      previewHTML = `
        <div class="library-card-preview">
          <img src="${inlineUrl}" alt="${escapeHtml(item.name)}" loading="lazy">
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
          <!-- KHÔNG hiện định dạng + dung lượng ("PDF · 249 KB") — chủ tool gạch bỏ 22/07,
               cùng lý do đã bỏ đuôi file khỏi tiêu đề hôm 21/07: đội sale chỉ cần biết
               "NLG IUL" và bấm Tải về, dung lượng là chi tiết kỹ thuật gây nhiễu. -->
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
  hideLibraryPreview();   // xem chú thích ở openLibraryGroup — thoát doc-mode của bảng So sánh
  appState.activeLibraryPath = item.path;
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  // Tên hiển thị KHÔNG kèm đuôi file (.jpg/.pdf…) — chủ tool gạch bỏ 21/07:
  // đội sale đọc "NLG IUL" chứ không cần biết định dạng. Tên file thật giữ nguyên.
  const tenSach = String(item.name).replace(/\.(jpe?g|png|pdf|svg|webp)$/i, '');

  // Đo lường: 1 lượt XEM brochure/tài liệu (kind='view', N2). "Tài liệu:" khớp nhãn download →
  // xếp hạng "chạy nhiều nhất" nhóm gọn. Throttle 15'/tài liệu nằm trong logUsage. Best-effort.
  if (window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('view', 'Tài liệu: ' + tenSach);

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = tenSach;
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  dom.canvasWrapper.innerHTML = '';

  let view = document.getElementById('library-view');
  if (view) view.classList.remove('has-group', 'is-tall');

  if (item.isMultiPage) {
    showLibraryMultiPagePreview(item);
  } else {
    showLibraryPreview(item);
  }
  updateStatus(`Đang xem: ${tenSach}`);
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
          <img src="${inlineUrl}" alt="Page ${index + 1}" loading="lazy" onload="if(this.naturalWidth > this.naturalHeight) this.closest('.library-item-card').classList.add('is-landscape')">
        </div>
        <div class="library-card-info">
          ${isPdf ? '' : `<a class="btn btn-primary library-card-btn" href="${pageDl}" download>${NAV_ICONS.download} Tải về</a>`}
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
    view.classList.remove('has-group', 'is-tall');
  }
  // Đây là chỗ DUY NHẤT mọi luồng "mở thứ khác" đều đi qua (loadSvgContent,
  // resetCanvasToWelcome, mở brochure/name card) → tắt luôn khung tài liệu của
  // công cụ So sánh ở đây, khỏi phải nhớ gọi tay ở từng chỗ. (js/sosanh.js)
  if (typeof exitDocMode === 'function') exitDocMode();
  // Bỏ luôn dấu "đang mở" của các mục PHẲNG (Compare, SMS). Cùng lý do: đây là
  // chỗ duy nhất mọi luồng "mở thứ khác" đi qua. Trước đây mở Compare rồi bấm
  // sang một mẫu Proposal thì dòng Compare vẫn sáng như đang mở.
  // ⚠️ Hàm nào tự bật lại dấu đó thì phải bật SAU khi gọi hàm mở của nó
  // (openCompareTable / openSmsAll), không thì bị chính chỗ này xoá đi.
  document.querySelectorAll('.nav-section-flat > .tree-folder-header.is-open')
    .forEach(x => x.classList.remove('is-open'));
  appState.activeLibraryPath = null;
}

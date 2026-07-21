/**
 * THINKSMART TOOL — MAIN (khởi động app)
 * Ghép các công cụ lại: cây điều hướng trái (mỗi tool tự render section của mình),
 * gắn toàn bộ sự kiện chung (zoom/pan, phím tắt, nút lưu/xuất), và chạy app.
 *
 * Thêm công cụ mới: tạo js/<tool>.js với hàm render<Tool>NavSection(...) riêng,
 * rồi gọi nó trong renderFileTree() bên dưới + thêm <script> vào index.html.
 */

// --- CÂY ĐIỀU HƯỚNG TRÁI: mỗi tool một section ---
function renderFileTree() {
  const q = (appState.searchQuery || '').toLowerCase().trim();
  dom.treeContainer.innerHTML = '';
  let total = 0;

  // Split matched SVGs into proposals vs name cards
  const matched = appState.svgsList.filter(f => !q || f.name.toLowerCase().includes(q) || (f.path || '').toLowerCase().includes(q));
  const nameCards = matched.filter(isNameCardFile);
  const proposals = matched.filter(f => !isNameCardFile(f));

  // ---------- PROPOSAL / BÁO GIÁ (js/proposal.js) ----------
  total += renderProposalNavSection(dom.treeContainer, proposals, q);

  // ---------- BROCHURE (js/brochure.js) ----------
  total += renderLibrarySection(dom.treeContainer, 'Brochure / Tài liệu', NAV_ICONS.brochure, appState.library.brochure, q);

  // ---------- NAME CARD (js/namecard.js) ----------
  total += renderNameCardNavSection(dom.treeContainer, nameCards, q);

  // ---------- SO SÁNH QUYỀN LỢI CÁC HÃNG (js/brochure.js) ----------
  total += renderCompareNavSection(dom.treeContainer, q);

  dom.fileCount.textContent = total;
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

// --- UTILITIES & SYSTEM EVENT BINDINGS ---
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

      // The tag may sit on the <text> block (data-editor-target) or on the id-carrying tspan
      const editorId = target.getAttribute('data-editor-target') || target.getAttribute('data-editor-id');
      if (!editorId) return;

      // Find the corresponding textarea in the right sidebar
      const textarea = document.querySelector(`.text-input-field[data-editor-id="${editorId}"]`);
      if (!textarea) return;

      // Mobile: tapping text on the canvas opens the editor bottom-sheet first
      if (isMobileViewport()) {
        document.body.classList.remove('nav-open');
        document.body.classList.add('editor-open');
      }

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

      // Focus the field; select its text when it's a text input (dropdowns have no .select())
      textarea.focus();
      if (typeof textarea.select === 'function') textarea.select();

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

// --- MOBILE UI: drawer trái (danh sách file) + bottom-sheet phải (sửa chữ) ---
const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;

function initMobileUI() {
  const btnNav = document.getElementById('btn-mobile-nav');
  const btnEditor = document.getElementById('btn-mobile-editor');
  const btnEditorClose = document.getElementById('btn-editor-close');
  const backdrop = document.getElementById('mobile-backdrop');

  const closeAll = () => document.body.classList.remove('nav-open', 'editor-open');

  if (btnNav) btnNav.addEventListener('click', () => {
    document.body.classList.remove('editor-open');
    document.body.classList.toggle('nav-open');
  });
  if (btnEditor) btnEditor.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    document.body.classList.toggle('editor-open');
  });
  if (btnEditorClose) btnEditorClose.addEventListener('click', closeAll);
  if (backdrop) backdrop.addEventListener('click', closeAll);

  // Chọn một file trong drawer → tự đóng drawer để lộ canvas
  if (dom.treeContainer) {
    dom.treeContainer.addEventListener('click', (e) => {
      if (isMobileViewport() && e.target.closest('.tree-file-item')) {
        document.body.classList.remove('nav-open');
      }
    });
  }
}

// --- TOUCH GESTURES trên canvas: 1 ngón kéo = pan, 2 ngón chụm = zoom ---
function initTouchGestures() {
  const cc = dom.canvasContainer;
  if (!cc) return;

  let mode = null; // 'pan' | 'pinch'
  let lastX = 0, lastY = 0, lastDist = 0;

  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  cc.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      mode = 'pan';
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length >= 2) {
      mode = 'pinch';
      lastDist = touchDist(e.touches);
    }
  }, { passive: true });

  cc.addEventListener('touchmove', (e) => {
    if (mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      appState.panX += dx;
      appState.panY += dy;
      applyTransform();
      e.preventDefault();
    } else if (mode === 'pinch' && e.touches.length >= 2) {
      const dist = touchDist(e.touches);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (lastDist > 0 && dist > 0) {
        handleZoom(dist / lastDist - 1, midX, midY); // zoom quanh trung điểm 2 ngón
      }
      lastDist = dist;
      e.preventDefault();
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (e.touches.length === 0) {
      mode = null;
    } else if (e.touches.length === 1) {
      mode = 'pan';
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  };
  cc.addEventListener('touchend', endTouch);
  cc.addEventListener('touchcancel', endTouch);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  initMobileUI();
  initTouchGestures();
  updateHeaderActions();
  fetchSvgsList();
});

// Đóng tab / tải lại khi bản khách còn thay đổi chưa Lưu Nháp → trình duyệt hỏi xác nhận
window.addEventListener('beforeunload', (e) => {
  if (appState.isDirty && appState.activeFile && !isMasterFile(appState.activeFile)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

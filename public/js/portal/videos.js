// ============================================================================
// VIDEOS PAGE — thư viện video học (YouTube + Google Drive)
// User đã duyệt: xem. Admin: thêm / sửa / xoá (dán link).
// ============================================================================
(function () {
  'use strict';

  let allVideos = [];
  let activeCategory = 'Tất cả';
  let isAdmin = false;
  let editingId = null; // null = thêm mới

  // ---- Parse link → { source, embedUrl, thumbUrl } -------------------------
  function parseVideoUrl(raw) {
    const url = (raw || '').trim();

    // YouTube: watch?v= / youtu.be/ / shorts/ / embed/ / live/
    const yt = url.match(
      /(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/
    );
    if (yt) {
      return {
        source: 'youtube',
        id: yt[1],
        embedUrl: 'https://www.youtube-nocookie.com/embed/' + yt[1],
        thumbUrl: 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg',
      };
    }

    // Google Drive: /file/d/<id>/ hoặc open?id=<id>
    const gd = url.match(/drive\.google\.com\/(?:file\/d\/([\w-]{10,})|open\?[^#]*\bid=([\w-]{10,}))/);
    if (gd) {
      const id = gd[1] || gd[2];
      return {
        source: 'drive',
        id: id,
        embedUrl: 'https://drive.google.com/file/d/' + id + '/preview',
        thumbUrl: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w640',
      };
    }

    return null;
  }

  // ---- Modal helpers (mở ĐỒNG BỘ — không rAF, xem design-lessons) ----------
  function openModal(backdrop) {
    void backdrop.offsetWidth; // force reflow trước khi thêm class mở
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
  }
  function closeModal(backdrop) {
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
  }

  // ---- Render --------------------------------------------------------------
  function categories() {
    const set = new Set(allVideos.map(function (v) { return v.category || 'Chung'; }));
    return ['Tất cả'].concat(Array.from(set).sort(function (a, b) { return a.localeCompare(b, 'vi'); }));
  }

  function renderChips() {
    const row = document.getElementById('chip-row');
    row.innerHTML = '';
    categories().forEach(function (cat) {
      const b = document.createElement('button');
      b.className = 'chip' + (cat === activeCategory ? ' active' : '');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', cat === activeCategory ? 'true' : 'false');
      b.textContent = cat;
      b.addEventListener('click', function () {
        activeCategory = cat;
        renderChips();
        renderGrid();
      });
      row.appendChild(b);
    });

    // Gợi ý chuyên mục sẵn có trong form admin
    const dl = document.getElementById('cat-list');
    dl.innerHTML = '';
    categories().slice(1).forEach(function (cat) {
      const opt = document.createElement('option');
      opt.value = cat;
      dl.appendChild(opt);
    });
  }

  function renderGrid() {
    const grid = document.getElementById('video-grid');
    const empty = document.getElementById('empty-state');
    grid.innerHTML = '';

    const list = allVideos.filter(function (v) {
      return activeCategory === 'Tất cả' || (v.category || 'Chung') === activeCategory;
    });

    empty.style.display = list.length ? 'none' : 'block';
    if (!isAdmin) {
      document.getElementById('empty-hint').textContent = 'Chưa có video trong mục này — quay lại sau nhé.';
    }

    list.forEach(function (v) {
      const meta = parseVideoUrl(v.url);
      const card = document.createElement('article');
      card.className = 'video-card';

      const thumb = document.createElement('button');
      thumb.className = 'video-thumb';
      thumb.type = 'button';
      thumb.setAttribute('aria-label', 'Xem: ' + v.title);
      if (meta && meta.thumbUrl) {
        const img = document.createElement('img');
        img.src = meta.thumbUrl;
        img.alt = '';
        img.loading = 'lazy';
        // Drive không public thumbnail thì rớt về nền trống
        img.addEventListener('error', function () { img.remove(); });
        thumb.appendChild(img);
      }
      const play = document.createElement('span');
      play.className = 'play-badge';
      play.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
      thumb.appendChild(play);
      const tag = document.createElement('span');
      tag.className = 'src-tag';
      tag.textContent = meta && meta.source === 'drive' ? 'Drive' : 'YouTube';
      thumb.appendChild(tag);
      thumb.addEventListener('click', function () { openPlayer(v); });
      card.appendChild(thumb);

      const body = document.createElement('div');
      body.className = 'video-body';
      const cat = document.createElement('div');
      cat.className = 'video-cat';
      cat.textContent = v.category || 'Chung';
      const h = document.createElement('h3');
      h.textContent = v.title;
      const p = document.createElement('p');
      p.textContent = v.description || '';
      body.appendChild(cat); body.appendChild(h); body.appendChild(p);

      if (isAdmin) {
        const row = document.createElement('div');
        row.className = 'video-admin-row';
        const bEdit = document.createElement('button');
        bEdit.type = 'button'; bEdit.textContent = 'Sửa';
        bEdit.addEventListener('click', function () { openForm(v); });
        const bDel = document.createElement('button');
        bDel.type = 'button'; bDel.className = 'del'; bDel.textContent = 'Xoá';
        bDel.addEventListener('click', function () { removeVideo(v); });
        row.appendChild(bEdit); row.appendChild(bDel);
        body.appendChild(row);
      }
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  // ---- Player --------------------------------------------------------------
  function openPlayer(v) {
    const meta = parseVideoUrl(v.url);
    if (!meta) return;
    document.getElementById('player-title').textContent = v.title;
    document.getElementById('player-desc').textContent = v.description || '';
    document.getElementById('player-frame').src = meta.embedUrl;
    openModal(document.getElementById('player-backdrop'));
  }
  function closePlayer() {
    closeModal(document.getElementById('player-backdrop'));
    document.getElementById('player-frame').src = 'about:blank'; // dừng phát
  }

  // ---- Admin CRUD ----------------------------------------------------------
  function openForm(v) {
    editingId = v ? v.id : null;
    document.getElementById('form-title').textContent = v ? 'Sửa video' : 'Thêm video';
    document.getElementById('vf-url').value = v ? v.url : '';
    document.getElementById('vf-title').value = v ? v.title : '';
    document.getElementById('vf-category').value = v ? (v.category || '') : (activeCategory !== 'Tất cả' ? activeCategory : '');
    document.getElementById('vf-desc').value = v ? (v.description || '') : '';
    setFormMsg('', '');
    openModal(document.getElementById('form-backdrop'));
    document.getElementById('vf-url').focus();
  }
  function setFormMsg(text, kind) {
    const el = document.getElementById('vf-msg');
    el.textContent = text;
    el.className = 'auth-msg' + (kind ? ' ' + kind : '');
  }

  async function saveVideo() {
    const url = document.getElementById('vf-url').value.trim();
    const title = document.getElementById('vf-title').value.trim();
    const category = document.getElementById('vf-category').value.trim() || 'Chung';
    const description = document.getElementById('vf-desc').value.trim();

    const meta = parseVideoUrl(url);
    if (!meta) { setFormMsg('Link chưa đúng — dán link YouTube (watch/youtu.be/shorts) hoặc Google Drive (file/d/…).', 'error'); return; }
    if (!title) { setFormMsg('Điền tiêu đề để đội sale biết video nói về gì.', 'error'); return; }

    const sb = TSTAuth.getClient();
    const row = { url: url, title: title, category: category, description: description, source: meta.source };

    const btn = document.getElementById('btn-form-save');
    btn.disabled = true;
    try {
      let error;
      if (editingId) {
        error = (await sb.from('videos').update(row).eq('id', editingId)).error;
      } else {
        const profile = await TSTAuth.getProfile();
        row.created_by = profile ? profile.id : null;
        error = (await sb.from('videos').insert(row)).error;
      }
      if (error) { setFormMsg('Lưu chưa được: ' + error.message, 'error'); return; }
      closeModal(document.getElementById('form-backdrop'));
      await loadVideos();
    } finally {
      btn.disabled = false;
    }
  }

  async function removeVideo(v) {
    if (!window.confirm('Xoá video "' + v.title + '"? Hành động này không hoàn tác được.')) return;
    const sb = TSTAuth.getClient();
    const { error } = await sb.from('videos').delete().eq('id', v.id);
    if (error) { window.alert('Xoá chưa được: ' + error.message); return; }
    await loadVideos();
  }

  // ---- Data ----------------------------------------------------------------
  async function loadVideos() {
    const sb = TSTAuth.getClient();
    const { data, error } = await sb
      .from('videos')
      .select('id, title, description, source, url, category, sort_order, created_at')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      document.getElementById('empty-state').style.display = 'block';
      document.getElementById('empty-hint').textContent = 'Không tải được danh sách (' + error.message + '). Thử tải lại trang.';
      return;
    }
    allVideos = data || [];
    if (!categories().includes(activeCategory)) activeCategory = 'Tất cả';
    renderChips();
    renderGrid();
  }

  // ---- Init ----------------------------------------------------------------
  (async function init() {
    TSTAuth.initShell();

    if (!TSTAuth.configured) {
      document.getElementById('config-notice').style.display = 'flex';
      return;
    }

    const { profile } = await TSTAuth.requireLogin();
    // Chưa được duyệt → quay về login (màn hình chờ duyệt)
    if (!profile || !profile.approved) {
      await TSTAuth.signOut();
      return;
    }

    isAdmin = profile.role === 'admin';
    document.getElementById('page-content').style.display = 'block';
    if (isAdmin) document.getElementById('btn-add-video').style.display = 'inline-flex';

    document.getElementById('btn-add-video').addEventListener('click', function () { openForm(null); });
    document.getElementById('btn-player-close').addEventListener('click', closePlayer);
    document.getElementById('btn-form-close').addEventListener('click', function () { closeModal(document.getElementById('form-backdrop')); });
    document.getElementById('btn-form-cancel').addEventListener('click', function () { closeModal(document.getElementById('form-backdrop')); });
    document.getElementById('btn-form-save').addEventListener('click', saveVideo);
    document.getElementById('video-form').addEventListener('submit', function (e) { e.preventDefault(); saveVideo(); });

    // Đóng modal khi bấm nền tối / phím Esc
    [document.getElementById('player-backdrop'), document.getElementById('form-backdrop')].forEach(function (bd) {
      bd.addEventListener('click', function (e) {
        if (e.target === bd) { bd.id === 'player-backdrop' ? closePlayer() : closeModal(bd); }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closePlayer();
      closeModal(document.getElementById('form-backdrop'));
    });

    await loadVideos();
  })();
})();

/**
 * THINKSMART TOOL — NAME CARD
 * Mọi logic riêng của công cụ Name Card nằm ở file này:
 *  - Section "Name Card" trên cây điều hướng (mẫu gốc + bản "Của tôi")
 *  - Panel chỉnh sửa: ưu tiên 5 ô gắn thẻ data-nc (name/title/contact),
 *    nếu mẫu chưa gắn thẻ thì rơi về chế độ nhận diện từng dòng.
 * Phần dùng chung (load/save/copy, canvas, export...) nằm ở js/core.js.
 */

// --- NAV SECTION: "Name Card" (gọi từ renderFileTree trong js/main.js) ---
function renderNameCardNavSection(container, nameCards, q) {
  const ncSection = makeCollapsibleFolder('Name Card / Danh thiếp', { extraClass: 'nav-section', iconHTML: NAV_ICONS.namecard });
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
  container.appendChild(ncSection.folder);
  return ncCount;
}

// --- TEXTS EDITOR: các ô của name card (gọi từ populateTextsEditor trong js/core.js) ---
function populateNameCardTextsEditor(svgEl, textElements) {
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
    const isPhoneField = /điện thoại|fax/i.test(label);
    const itemBlock = document.createElement('div');
    itemBlock.className = 'text-edit-block';
    itemBlock.innerHTML = `
      <div class="text-meta"><span class="text-id">${escapeHtml(label)}</span></div>
      <input type="text" class="text-input-field" value="${escapeHtml(line.text)}">
    `;
    const inputEl = itemBlock.querySelector('.text-input-field');
    inputEl.addEventListener('input', (e) => {
      let v = e.target.value;
      // Auto-format 10 US digits as "(123) 456-7890" once complete
      if (isPhoneField) {
        const formatted = formatPhoneValue(v);
        if (formatted && formatted !== v) { v = formatted; e.target.value = formatted; }
      }
      markDirty();
      line.apply(v);
      renderSvgOnCanvas();
    });
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
      addNcField(container, label, line);
      ncFieldCount++;
    });
  });

  if (ncFieldCount === 0) {
    dom.textsList.innerHTML = '<div class="no-data">Không tìm thấy chữ nào để chỉnh sửa trong name card này.</div>';
  }
}

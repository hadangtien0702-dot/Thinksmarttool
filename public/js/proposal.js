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
          <select class="text-input-field select-field" data-editor-id="${editorId}" aria-label="${escapeHtml(displayName)}">
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
          <input type="text" class="text-input-field" data-editor-id="${editorId}" value="${escapeHtml(textContent)}" aria-label="${escapeHtml(displayName)}">
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
      // Dollar values (except single "$")
      if (textContent.startsWith('$') && textContent !== '$') {
        planItems.push({ el, editorId, textContent, fontSize, absoluteX, absoluteY });
        return;
      }

      // Benefit-plan labels (IUL): payment period / coverage age / chart age labels.
      // Collected here, appended to the editor only in the IUL ordering branch below.
      const base = { el, editorId, textContent, absoluteX, absoluteY, noCurrency: true };
      if (/^\d+\s*năm$/i.test(textContent)) planExtras.push({ ...base, kind: 'period' });        // "20 năm"
      else if (/^\d+\s*tuổi$/i.test(textContent)) planExtras.push({ ...base, kind: 'coverage' }); // "120 tuổi"
      else if (/^Tuổi\s*\d+$/i.test(textContent)) planExtras.push({ ...base, kind: 'age' });      // "Tuổi 63"
      else if (/^Cash\s*Value at\s*\d+$/i.test(textContent)) planExtras.push({ ...base, kind: 'cashAt' });
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
    // "Bảo vệ đến khi nào / 120 tuổi" bị KHOÁ theo yêu cầu chủ tool (2026-07-15): giá trị cố định
    // của sản phẩm, không đưa vào bảng chỉnh sửa (coverage vẫn được thu thập làm mốc hàng ô ở trên).
  }

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
      });
      moneyInput.addEventListener('blur', (e) => {
        const formatted = formatCurrencyValue(e.target.value);
        if (formatted !== null && formatted !== e.target.value) {
          e.target.value = formatted;
          applyTextValue(combo.money.el, combo.money.editorId, formatted);
        }
      });
    }
    if (combo.age) {
      const ageInput = block.querySelector(`input[data-editor-id="${combo.age.editorId}"]`);
      ageInput.addEventListener('input', (e) => {
        applyTextValue(combo.age.el, combo.age.editorId, e.target.value);
        // Giữ dòng phụ tiếng Anh "Cash Value at N" khớp với tuổi mới
        if (combo.age.paired) {
          const num = (e.target.value.match(/\d+/) || [null])[0];
          if (num) applyTextValue(combo.age.paired.el, combo.age.paired.editorId, 'Cash Value at ' + num);
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
    });
    // Auto-format money on blur: "1000000" → "$1,000,000" (skip label fields like "20 năm")
    if (!item.noCurrency) {
      inputEl.addEventListener('blur', (e) => {
        const formatted = formatCurrencyValue(e.target.value);
        if (formatted !== null && formatted !== e.target.value) {
          e.target.value = formatted;
          applyTextValue(item.el, item.editorId, formatted);
        }
      });
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

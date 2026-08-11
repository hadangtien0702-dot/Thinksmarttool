/**
 * THINKSMART TOOL — TÍNH TUỔI BẢO HIỂM (Insurance Age Calculator)
 * Đưa về từ bản chủ tool đã làm trên forum.thinksmartinsurance.com (10/08/2026).
 *
 * ☠️ QUY TẮC TUỔI — **AGE NEAREST BIRTHDAY, ĐO BẰNG THÁNG LỊCH**:
 *   qua sinh nhật ĐÚNG 6 tháng hoặc ít hơn → giữ nguyên tuổi thật
 *   qua sinh nhật HƠN 6 tháng              → CỘNG 1
 *
 * ☠️☠️ ĐÃ VIẾT SAI MỘT LẦN, ĐỪNG LẶP LẠI: bản đầu tôi đo bằng SỐ NGÀY (so
 * "ngày đã qua" với "ngày còn lại", tức mốc 182,5 ngày). Nghe rất hợp lý và
 * bộ tự kiểm 9/9 đều đạt — nhưng **sai so với bản forum của chủ tool**.
 * Dò ranh giới trên chính bản forum ngày 10/08/2026 (dùng làm thước đo NGOÀI):
 *     sinh 02/09/1990 → forum 37, bản đo-bằng-ngày ra 36   ← LỆCH 1 TUỔI
 *     sinh 02/10/1990 → forum 36, bản đo-bằng-ngày ra 36
 * Vì 6 tháng lịch (10/02 → 10/08) chỉ có 181 ngày, không phải 182,5. Hai cách
 * lệch nhau vài ngày mỗi năm — và mỗi ngày lệch đó là một khách bị báo sai
 * nguyên một bậc tuổi, tức sai bậc phí.
 * → Bài học: quy tắc nghe "hiển nhiên" vẫn phải đo lại trên bản đang chạy thật.
 *
 * ⚠️ Ca ĐÚNG 6 tháng chẵn: KHÔNG cộng (forum cũng vậy — đã đo).
 *
 * Lịch sử tính lưu Ở MÁY NGƯỜI DÙNG (localStorage), chủ tool chốt: nó chứa NGÀY
 * SINH KHÁCH HÀNG — không đẩy lên máy chủ.
 */

const TT_KHOA_LS = 'tst-tinhtuoi-lichsu';   // localStorage
const TT_TOI_DA = 20;                        // giữ 20 lần gần nhất

// --- TÍNH TOÁN (tách riêng, không đụng DOM — để bàn đo gọi thẳng được) ---

// ---------------------------------------------------------------------------
// ĐỌC NGÀY SINH — chỗ nguy hiểm nhất của cả công cụ (sửa 10/08/2026)
//
// ☠️ Chủ tool gõ `22/05/1979` (kiểu Việt: NGÀY trước) trong khi tool đọc kiểu Mỹ
// (THÁNG trước) → bị chặn. Chặn được là còn may. Nguy hiểm thật nằm ở những ngày
// mà CẢ HAI cách đọc đều hợp lệ (`05/06/1979`): tool sẽ im lặng hiểu sai, ra sai
// tuổi, sai bậc phí, và KHÔNG có dấu hiệu nào cho người dùng biết.
// Gần một nửa số ngày trong năm rơi vào vùng nhập nhằng này.
//
// Cách xử: người dùng CHỌN kiểu gõ (nhớ lại lần sau), và tool luôn ĐỌC NGƯỢC
// ngày ra chữ ngay dưới ô nhập. Gõ sai kiểu mà ngày đó chỉ hợp lệ ở kiểu kia thì
// tự hiểu theo kiểu kia VÀ nói rõ là đã tự đổi — không im lặng.
// ---------------------------------------------------------------------------
const TT_KHOA_THUTU = 'tst-tinhtuoi-thutu';   // 'MDY' (Mỹ) | 'DMY' (Việt)

function ttThuTu() {
  try { return localStorage.getItem(TT_KHOA_THUTU) === 'DMY' ? 'DMY' : 'MDY'; } catch (e) { return 'MDY'; }
}
function ttDatThuTu(v) { try { localStorage.setItem(TT_KHOA_THUTU, v); } catch (e) {} }

// Dựng ngày từ 3 số, trả null nếu ngày không tồn tại (31/02, 29/02 năm thường…)
function ttDungNgay(nam, thang, ngay) {
  if (thang < 1 || thang > 12 || ngay < 1 || ngay > 31) return null;
  if (nam < 1900 || nam > 2100) return null;
  const d = new Date(nam, thang - 1, ngay);
  if (d.getFullYear() !== nam || d.getMonth() !== thang - 1 || d.getDate() !== ngay) return null;
  return { nam, thang, ngay, d };
}

// Đọc theo ĐÚNG một thứ tự. KHÔNG dùng new Date(chuỗi): mỗi trình duyệt đoán một kiểu.
function ttDocNgayTheo(chuoi, thuTu) {
  const m = String(chuoi || '').trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  const a = +m[1], b = +m[2], nam = +m[3];
  return thuTu === 'DMY' ? ttDungNgay(nam, b, a) : ttDungNgay(nam, a, b);
}

// Giữ tên cũ cho bàn đo + scripts/kiem-tinh-tuoi.js: mặc định kiểu Mỹ.
function ttDocNgay(chuoi) { return ttDocNgayTheo(chuoi, 'MDY'); }

/**
 * Đọc theo kiểu người dùng đang chọn; nếu kiểu đó không ra ngày hợp lệ mà kiểu kia
 * ra được thì dùng kiểu kia và BÁO là đã tự đổi.
 * → { ns, tuDoi: bool, nhapNhang: bool }  ·  ns = null nếu không đọc được kiểu nào
 */
function ttDocNgayThongMinh(chuoi) {
  const uu = ttThuTu(), kia = uu === 'MDY' ? 'DMY' : 'MDY';
  const a = ttDocNgayTheo(chuoi, uu);
  const b = ttDocNgayTheo(chuoi, kia);
  if (a) return { ns: a, tuDoi: false, nhapNhang: !!b && b.ngay !== b.thang };
  if (b) return { ns: b, tuDoi: true, nhapNhang: false };
  return { ns: null, tuDoi: false, nhapNhang: false };
}

// Sinh nhật rơi vào 29/02 mà năm đích không nhuận → lấy 28/02 (thông lệ ngành)
function ttSinhNhatTrongNam(ns, nam) {
  const d = new Date(nam, ns.thang - 1, ns.ngay);
  if (d.getMonth() !== ns.thang - 1) return new Date(nam, ns.thang - 1 + 1, 0);
  return d;
}

// Cộng n tháng vào một ngày, KẸP về cuối tháng nếu tràn (31/08 + 6 tháng = 28/02,
// không phải 03/03). Không kẹp là ca sinh cuối tháng lệch mất một ngày.
function ttCongThang(d, n) {
  const nam = d.getFullYear(), thang = d.getMonth() + n, ngay = d.getDate();
  const cuoi = new Date(nam, thang + 1, 0).getDate();
  return new Date(nam, thang, Math.min(ngay, cuoi));
}

/**
 * Trả về { tuoiThat, tuoiBaoHiem, snVua, snToi, mocDoiTuoi, daQua, conLai, homNay }
 * @param ns  kết quả của ttDocNgay
 * @param moc ngày tính (mặc định hôm nay) — truyền vào được để bàn đo kiểm ca biên
 */
function tinhTuoiBaoHiem(ns, moc) {
  const homNay = moc ? new Date(moc.getFullYear(), moc.getMonth(), moc.getDate()) : (function () {
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  })();

  let tuoiThat = homNay.getFullYear() - ns.nam;
  const snNamNay = ttSinhNhatTrongNam(ns, homNay.getFullYear());
  if (homNay < snNamNay) tuoiThat -= 1;

  const snVua = ttSinhNhatTrongNam(ns, homNay < snNamNay ? homNay.getFullYear() - 1 : homNay.getFullYear());
  const snToi = ttSinhNhatTrongNam(ns, snVua.getFullYear() + 1);

  // ☠️ ĐO BẰNG THÁNG LỊCH, KHÔNG PHẢI SỐ NGÀY — xem chú thích đầu file.
  // `mocDoiTuoi` = ngày đầu tiên khách bị tính lên một tuổi. Đưa luôn ra giao diện:
  // sale nhìn là biết còn bao lâu nữa thì bậc phí đổi.
  const ngaySau = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const sauSauThang = ttCongThang(snVua, 6);
  const tuoiBaoHiem = homNay > sauSauThang ? tuoiThat + 1 : tuoiThat;

  // `mocTiepTheo` = ngày ĐẦU TIÊN khách được tính tuổi mới.
  // ⚠️ Đã lên tuổi rồi thì mốc kế tiếp nằm ở CHU KỲ SAU (sinh nhật tới + 6 tháng),
  // không phải mốc vừa qua — không có nhánh này là hiện ra ngày trong quá khứ.
  // ⚠️ KHÁC bản forum 1 ngày: forum hiện đúng ngày "sinh nhật + 6 tháng", nhưng
  // chính nó vẫn tính tuổi CŨ trong ngày đó (đo 10/08/2026: sinh 02/10/1990 →
  // forum ghi "Ngày Tăng Tuổi = Aug 10, 2026" mà tuổi bảo hiểm vẫn 36). Ở đây lấy
  // ngày HÔM SAU — tức ngày con số thật sự đổi.
  const mocTiepTheo = ngaySau(tuoiBaoHiem > tuoiThat ? ttCongThang(snToi, 6) : sauSauThang);

  const NGAY = 86400000;
  const daQua = Math.round((homNay - snVua) / NGAY);
  const conLai = Math.round((snToi - homNay) / NGAY);

  return { tuoiThat, tuoiBaoHiem, snVua, snToi, mocTiepTheo, daQua, conLai, homNay };
}

// --- LỊCH SỬ (localStorage — KHÔNG lên máy chủ) ---
function ttDocLichSu() {
  try {
    const raw = localStorage.getItem(TT_KHOA_LS);
    const ds = raw ? JSON.parse(raw) : [];
    return Array.isArray(ds) ? ds : [];
  } catch (e) { return []; }
}
function ttGhiLichSu(ds) {
  try { localStorage.setItem(TT_KHOA_LS, JSON.stringify(ds.slice(0, TT_TOI_DA))); } catch (e) {}
}

// --- MỤC TRÊN CÂY ĐIỀU HƯỚNG: MỘT DÒNG PHẲNG, không menu phụ ---
// Cùng lý do đã ghi ở renderCompareNavSection / renderSmsNavSection: bên trong chỉ
// có MỘT màn hình, dựng dropdown chứa một dòng là bắt bấm hai lần cho một việc.
function renderTinhTuoiNavSection(container, q) {
  if (q && !'tính tuổi bảo hiểm age calculator'.includes(q)) return 0;

  const folder = document.createElement('div');
  folder.className = 'tree-folder nav-section nav-section-flat';

  const el = document.createElement('div');
  el.className = 'tree-folder-header' + (appState.activeLibraryPath === 'tinhtuoi' ? ' is-open' : '');
  el.setAttribute('title', 'Tính tuổi bảo hiểm từ ngày sinh khách hàng');
  el.innerHTML = `
    <span class="tree-folder-icon">${NAV_ICONS.tinhtuoi}</span>
    <span class="tree-folder-label">${nhanMuc('Age / Tính tuổi')}</span><span class="nav-new">new</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    openTinhTuoi();            // gọi TRƯỚC: bên trong gọi hideLibraryPreview, hàm đó xoá dấu is-open
    el.classList.add('is-open');
  });
  makeKeyboardActivatable(el);

  folder.appendChild(el);
  container.appendChild(folder);
  return 1;
}

// --- MÀN HÌNH: vẽ vào #doc-viewport, KHÔNG PHẢI CANVAS ---
// Canvas chỉ dành cho công cụ MỞ FILE SVG và sửa trực tiếp. Công cụ này có ô gõ chữ:
// nhét vào canvas là dính `user-select:none` + lăn chuột bị nuốt thành zoom (cảnh báo
// đã ghi ở đầu openCompareTable trong js/sosanh.js).
function openTinhTuoi() {
  hideLibraryPreview();
  dom.canvasWrapper.innerHTML = '';
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  appState.activeLibraryPath = 'tinhtuoi';
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = 'Age / Tính tuổi';
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  // Đo lường: 1 lượt MỞ công cụ. KHÔNG bao giờ ghi ngày sinh khách vào đây.
  if (window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('view', 'Age / Tính tuổi');

  document.body.classList.add('doc-mode');
  const view = document.getElementById('doc-viewport');
  view.innerHTML = `
    <div class="tt-wrap">
      <section class="tt-card tt-card-main">
        <h2 class="tt-title">Tính tuổi bảo hiểm</h2>

        <div class="tt-label-hang">
          <label class="tt-label" for="tt-dob">Ngày sinh khách hàng</label>
          <!-- Chọn KIỂU GÕ. Bày ra ngay cạnh ô nhập chứ không giấu trong cài đặt:
               đây là thứ quyết định con số ra đúng hay sai. Nhớ lại cho lần sau. -->
          <div class="tt-thutu" role="group" aria-label="Kiểu gõ ngày">
            <button type="button" class="tt-thutu-o" data-thutu="MDY">Tháng / Ngày</button>
            <button type="button" class="tt-thutu-o" data-thutu="DMY">Ngày / Tháng</button>
          </div>
        </div>
        <div class="tt-row">
          <div class="tt-input-wrap">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input id="tt-dob" class="tt-input" type="text" inputmode="numeric" autocomplete="off"
                   placeholder="MM/DD/YYYY" maxlength="10" aria-describedby="tt-doclai">
          </div>
          <button class="btn btn-primary tt-btn" id="tt-tinh">Tính</button>
        </div>
        <!-- Một hàng phụ: bên trái là ngày đọc ngược ra chữ (MM/DD hay DD/MM là chỗ
             dễ hiểu nhầm nhất, nhầm là sai luôn bậc phí), bên phải là câu giải thích
             vì sao ra tuổi đó. Gộp một hàng để khỏi đẻ thêm dòng dưới bảng kết quả. -->
        <div class="tt-dong-phu">
          <div class="tt-doclai" id="tt-doclai" aria-live="polite"></div>
          <p class="tt-giaithich" id="tt-giaithich"></p>
        </div>

        <div class="tt-ketqua" id="tt-ketqua" hidden>
          <div class="tt-o">
            <span class="tt-o-nhan">Tuổi thật</span>
            <span class="tt-o-so" id="tt-tuoithat">—</span>
          </div>
          <div class="tt-o tt-o-chinh">
            <span class="tt-o-nhan">Tuổi bảo hiểm</span>
            <span class="tt-o-so" id="tt-tuoibh">—</span>
          </div>
          <!-- Ngày tăng tuổi: sale cần biết còn bao lâu nữa khách nhảy bậc phí.
               Đây là ngày ĐẦU TIÊN khách được tính tuổi mới (khác bản forum — xem
               chú thích ở tinhTuoiBaoHiem). -->
          <div class="tt-o tt-o-ngay" id="tt-o-ngay">
            <span class="tt-o-nhan">Ngày tăng tuổi</span>
            <span class="tt-o-ngay-so" id="tt-ngaytang">—</span>
            <span class="tt-o-conlai" id="tt-conlai"></span>
          </div>
        </div>
      </section>

      <aside class="tt-card tt-card-ls">
        <div class="tt-ls-dau">
          <h3 class="tt-ls-tieude">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
            Gần đây
          </h3>
          <button class="btn btn-secondary btn-sm" id="tt-xoa-ls">Xoá</button>
        </div>
        <div class="tt-ls-bang" id="tt-ls-bang"></div>
      </aside>
    </div>
  `;

  veLichSuTuoi();

  const oDob = document.getElementById('tt-dob');
  const nutTinh = document.getElementById('tt-tinh');

  // Tự chèn dấu "/" khi gõ — bớt một chỗ gõ sai định dạng
  oDob.addEventListener('input', () => {
    const so = oDob.value.replace(/\D/g, '').slice(0, 8);
    let ra = so;
    if (so.length > 4) ra = `${so.slice(0, 2)}/${so.slice(2, 4)}/${so.slice(4)}`;
    else if (so.length > 2) ra = `${so.slice(0, 2)}/${so.slice(2)}`;
    oDob.value = ra;
    docLaiNgay();
  });
  oDob.addEventListener('keydown', e => { if (e.key === 'Enter') nutTinh.click(); });
  nutTinh.addEventListener('click', bamTinh);

  // Dải chọn kiểu gõ ngày
  const daiThuTu = document.querySelector('.tt-thutu');
  const veThuTu = () => {
    const t = ttThuTu();
    daiThuTu.querySelectorAll('[data-thutu]').forEach(b => {
      b.classList.toggle('dang-chon', b.dataset.thutu === t);
      b.setAttribute('aria-pressed', b.dataset.thutu === t ? 'true' : 'false');
    });
    oDob.placeholder = t === 'DMY' ? 'DD/MM/YYYY' : 'MM/DD/YYYY';
    docLaiNgay();
  };
  daiThuTu.addEventListener('click', e => {
    const b = e.target.closest('[data-thutu]');
    if (!b) return;
    ttDatThuTu(b.dataset.thutu);
    veThuTu();
    if (!document.getElementById('tt-ketqua').hidden) bamTinh();   // tính lại theo kiểu mới
  });
  veThuTu();
  document.getElementById('tt-xoa-ls').addEventListener('click', async () => {
    const ds = ttDocLichSu();
    if (!ds.length) return;
    if (!(await showAppConfirm(`Xoá ${ds.length} lần tính đã lưu trên máy này?`,
      { title: 'Xoá lịch sử', tone: 'danger', okText: 'Xoá' }))) return;
    ttGhiLichSu([]);
    veLichSuTuoi();
  });

  capChieuCaoLichSu();
  // Đo lại khi đổi cỡ cửa sổ. Gỡ listener cũ trước để mở lại màn không chồng listener.
  if (window.__ttResize) window.removeEventListener('resize', window.__ttResize);
  window.__ttResize = () => { if (document.getElementById('tt-ls-bang')) capChieuCaoLichSu(); };
  window.addEventListener('resize', window.__ttResize);

  oDob.focus();
  updateStatus('Tính tuổi bảo hiểm — nhập ngày sinh khách hàng');
}

const TT_THANG = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
                  'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];

function docLaiNgay() {
  const o = document.getElementById('tt-doclai');
  if (!o) return;
  const { ns, tuDoi } = ttDocNgayThongMinh(document.getElementById('tt-dob').value);
  o.classList.remove('ok', 'canh-bao');
  if (!ns) { o.textContent = ''; return; }
  // Chữ ngắn gọn (chủ tool 10/08/2026) — bỏ "Tức ngày…", giữ đúng phần có ích
  o.textContent = (tuDoi ? '⚠️ Hiểu là ' : '→ ') +
    `${ns.ngay} ${TT_THANG[ns.thang - 1]}, ${ns.nam}`;
  o.classList.add(tuDoi ? 'canh-bao' : 'ok');
}

function bamTinh() {
  const oDob = document.getElementById('tt-dob');
  const { ns, tuDoi } = ttDocNgayThongMinh(oDob.value);
  const oKq = document.getElementById('tt-ketqua');
  if (!ns) {
    oKq.hidden = true;
    const kieu = ttThuTu() === 'DMY' ? 'DD/MM/YYYY — ngày trước, tháng sau' : 'MM/DD/YYYY — tháng trước, ngày sau';
    updateStatus('Chưa đọc được ngày sinh');
    showAppAlert(`Đang nhận kiểu ${kieu}. Ngày vừa gõ không hợp lệ ở cả hai kiểu.\n\n` +
      'Đổi kiểu gõ bằng hai nút ngay trên ô nhập.',
      { title: 'Chưa đọc được ngày sinh', tone: 'danger' });
    return;
  }
  if (tuDoi) {
    // Tự đổi kiểu thì phải NÓI RA. Im lặng đổi là loại lỗi tệ nhất: số vẫn ra, và sai.
    updateStatus(`Đã hiểu theo kiểu ${ttThuTu() === 'MDY' ? 'Ngày/Tháng' : 'Tháng/Ngày'}`);
  }
  const kq = tinhTuoiBaoHiem(ns);
  if (kq.tuoiThat < 0) {
    oKq.hidden = true;
    showAppAlert('Ngày sinh đang ở tương lai.', { title: 'Ngày sinh không hợp lệ', tone: 'danger' });
    return;
  }

  document.getElementById('tt-tuoithat').textContent = kq.tuoiThat;
  document.getElementById('tt-tuoibh').textContent = kq.tuoiBaoHiem;
  // Hiện ngày theo ĐÚNG kiểu người dùng đang gõ — bày ra kiểu khác là mời họ đọc nhầm
  const dd = d => {
    const t = String(d.getDate()).padStart(2, '0'), th = String(d.getMonth() + 1).padStart(2, '0');
    return ttThuTu() === 'DMY' ? `${t}/${th}/${d.getFullYear()}` : `${th}/${t}/${d.getFullYear()}`;
  };
  const conNgay = Math.round((kq.mocTiepTheo - kq.homNay) / 86400000);
  document.getElementById('tt-ngaytang').textContent = dd(kq.mocTiepTheo);
  const oCon = document.getElementById('tt-conlai');
  oCon.textContent = conNgay === 0 ? 'Hôm nay đã lên tuổi' : `Còn ${conNgay} ngày`;
  // Dưới 30 ngày thì đổi màu cảnh báo — sale nên chốt trước khi khách nhảy bậc phí
  document.getElementById('tt-o-ngay').classList.toggle('gan-ke', conNgay <= 30);
  // Ngắn gọn: giữ đúng LÝ DO (mốc 6 tháng) mà bỏ hết chữ đệm
  document.getElementById('tt-giaithich').textContent = kq.tuoiBaoHiem === kq.tuoiThat
    ? 'Chưa qua sinh nhật 6 tháng → giữ nguyên'
    : 'Qua sinh nhật hơn 6 tháng → +1 tuổi';
  oKq.hidden = false;

  const ds = ttDocLichSu();
  ds.unshift({
    luc: new Date().toLocaleTimeString('vi-VN'),
    // Ghi dạng KHÔNG NHẬP NHẰNG ("2 thg 7, 1998"), đừng ghi "02/07/1998": đọc lại
    // vào hôm sau thì chính mình cũng không biết là ngày 2 tháng 7 hay 7 tháng 2.
    dob: `${ns.ngay} thg ${ns.thang}, ${ns.nam}`,
    that: kq.tuoiThat,
    bh: kq.tuoiBaoHiem
  });
  ttGhiLichSu(ds);
  veLichSuTuoi();
  capChieuCaoLichSu();          // khối kết quả vừa hiện ra → cột trái cao lên, đo lại
  updateStatus(`Tuổi bảo hiểm: ${kq.tuoiBaoHiem}`);
}

// Kẹp chiều cao danh sách lịch sử = đúng chiều cao cột trái (chủ tool 10/08/2026).
// CSS không tự đo được chiều cao của phần tử ANH EM nên phải đo bằng JS. Đo lại sau
// mỗi lần cột trái đổi chiều cao (hiện/ẩn khối kết quả) và khi đổi cỡ cửa sổ.
function capChieuCaoLichSu() {
  const khung = document.querySelector('.tt-wrap');
  const trai = document.querySelector('.tt-card-main');
  const the = document.querySelector('.tt-card-ls');
  const bang = document.getElementById('tt-ls-bang');
  if (!khung || !trai || !the || !bang) return;

  // ☠️ Phải đo chiều cao THẬT của cột trái, không phải chiều cao đang hiển thị.
  // Khung dùng `align-items: stretch` nên cột trái bị KÉO GIÃN bằng cột phải —
  // đo lúc đó là đo chính cái mình định kẹp, kẹp xong vẫn dư khoảng trắng ở đáy
  // cột trái (chủ tool bắt được 10/08/2026). Bỏ kéo giãn → đo → trả lại.
  bang.style.maxHeight = '';
  const cu = khung.style.alignItems;
  khung.style.alignItems = 'start';
  const caoTrai = trai.getBoundingClientRect().height;
  const thua = the.getBoundingClientRect().height - bang.getBoundingClientRect().height;
  khung.style.alignItems = cu;

  bang.style.maxHeight = Math.max(120, Math.round(caoTrai - thua)) + 'px';
}

function veLichSuTuoi() {
  const ds = ttDocLichSu();
  const o = document.getElementById('tt-ls-bang');
  if (!o) return;
  if (!ds.length) {
    o.innerHTML = '<p class="tt-ls-trong">Chưa có lần tính nào.</p>';
    return;
  }
  o.innerHTML = `
    <div class="tt-ls-hang tt-ls-dau-cot">
      <span>Lúc</span><span>Ngày sinh</span><span>Tuổi BH</span>
    </div>
    ${ds.map(r => `
      <div class="tt-ls-hang">
        <span>${escapeHtml(r.luc)}</span>
        <span>${escapeHtml(r.dob)}</span>
        <span class="tt-ls-tuoi">${escapeHtml(String(r.bh))}</span>
      </div>`).join('')}
  `;
}

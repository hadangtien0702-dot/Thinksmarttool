/**
 * THINKSMART TOOL — HỘP THOẠI DÙNG CHUNG
 *
 * Thay TOÀN BỘ alert() / confirm() / prompt() mặc định của trình duyệt.
 * Hộp thoại mặc định hiện dòng "localhost:8000 says", không theo giao diện, không
 * đổi được chữ nút — chủ tool đã cấm dùng (21/07/2026).
 *
 * ⚠️ File này nạp cho CẢ Tool (tool.html) LẪN Portal (members/videos/...) — cố ý
 * viết độc lập, không phụ thuộc core.js hay portal.js. Style ở public/dialog.css
 * (cũng nạp cho cả hai). Đừng chép hàm này sang file khác — bài học 2 file CSS
 * chép tay lẫn nhau đã đủ đau rồi.
 *
 * Dùng:
 *   await showAppAlert('Xong rồi.');
 *   if (await showAppConfirm('Xoá?', { tone: 'danger', confirmText: 'Xoá' })) { ... }
 *   const ten = await showAppPrompt('Tên khách hàng?');   // null nếu bấm Huỷ
 */

function dlgEscape(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const DLG_ICONS = {
  info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  success: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  warning: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  danger: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  prompt: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>'
};

function showAppDialog(opts) {
  return new Promise((resolve) => {
    const kieu = opts.type || 'alert';        // alert | confirm | prompt
    const laPrompt = kieu === 'prompt';
    const coHuy = laPrompt || kieu === 'confirm';
    const tone = opts.tone || 'info';
    const oNenTruoc = document.activeElement;
    const icon = DLG_ICONS[laPrompt ? 'prompt' : tone] || DLG_ICONS.info;
    // Hành động phá huỷ → nút chính màu đỏ, để người dùng không bấm nhầm theo quán tính
    const lopNutChinh = tone === 'danger' ? 'btn-danger-solid' : 'btn-primary';

    const backdrop = document.createElement('div');
    backdrop.className = 'app-dialog-backdrop';
    backdrop.innerHTML = `
      <div class="app-dialog tone-${tone}" role="${coHuy ? 'alertdialog' : 'dialog'}" aria-modal="true"
           aria-label="${dlgEscape(opts.title || opts.message || '')}">
        <div class="app-dialog-head">
          <div class="app-dialog-icon">${icon}</div>
          <div class="app-dialog-title">${dlgEscape(opts.title || 'Thông báo')}</div>
        </div>
        <div class="app-dialog-message">${dlgEscape(opts.message || '')}</div>
        ${laPrompt ? `<input type="text" class="app-dialog-input" aria-label="${dlgEscape(opts.title || 'Nhập thông tin')}" placeholder="${dlgEscape(opts.placeholder || '')}" value="${dlgEscape(opts.initialValue || '')}">` : ''}
        <div class="app-dialog-actions">
          ${coHuy ? `<button type="button" class="btn btn-secondary app-dialog-cancel">${dlgEscape(opts.cancelText || 'Huỷ')}</button>` : ''}
          <button type="button" class="btn ${lopNutChinh} app-dialog-confirm">${dlgEscape(opts.confirmText || 'OK')}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    const input = backdrop.querySelector('.app-dialog-input');
    const btnOk = backdrop.querySelector('.app-dialog-confirm');
    const btnHuy = backdrop.querySelector('.app-dialog-cancel');

    let daDong = false;
    const dong = (ketQua) => {
      if (daDong) return;
      daDong = true;
      backdrop.classList.remove('open');
      backdrop.classList.add('dang-dong');
      setTimeout(() => {
        backdrop.remove();
        if (oNenTruoc && typeof oNenTruoc.focus === 'function') oNenTruoc.focus();
      }, 180);
      resolve(ketQua);
    };
    // alert: đóng kiểu nào cũng trả true. confirm: chỉ nút chính mới là true.
    const dongY = () => dong(laPrompt ? (input ? input.value : '') : true);
    const huy = () => dong(laPrompt ? null : (kieu === 'confirm' ? false : true));

    btnOk.addEventListener('click', dongY);
    if (btnHuy) btnHuy.addEventListener('click', huy);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) huy(); });
    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); huy(); }
      else if (e.key === 'Enter' && (laPrompt ? e.target === input : true)) { e.preventDefault(); dongY(); }
      else if (e.key === 'Tab') {                       // nhốt tiêu điểm trong hộp thoại
        const nut = Array.from(backdrop.querySelectorAll('button, input')).filter(n => !n.disabled);
        if (!nut.length) return;
        const dau = nut[0], cuoi = nut[nut.length - 1];
        if (e.shiftKey && document.activeElement === dau) { e.preventDefault(); cuoi.focus(); }
        else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
      }
    });

    // .open chỉ bật HIỆU ỨNG mở. Hộp thoại hiện ra được là nhờ CSS mặc định, KHÔNG
    // phụ thuộc animation chạy hay không — xem ghi chú đầu public/dialog.css.
    backdrop.classList.add('open');
    // Hành động phá huỷ: để tiêu điểm ở nút HUỶ, đừng mồi sẵn nút xoá
    ((tone === 'danger' && btnHuy) ? btnHuy : (input || btnOk)).focus();
    if (input && opts.initialValue) input.select();
  });
}

function showAppAlert(message, opts = {}) {
  return showAppDialog({ ...opts, type: 'alert', message, title: opts.title || 'Thông báo', tone: opts.tone || 'info' });
}
function showAppConfirm(message, opts = {}) {
  return showAppDialog({ ...opts, type: 'confirm', message, title: opts.title || 'Xác nhận', tone: opts.tone || 'warning' });
}
function showAppPrompt(message, opts = {}) {
  return showAppDialog({ ...opts, type: 'prompt', message, title: opts.title || 'Nhập thông tin', confirmText: opts.confirmText || 'OK' });
}

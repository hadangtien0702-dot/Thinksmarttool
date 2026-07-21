/**
 * Thinksmart Tool — Animation Framework (GSAP Integration)
 * Chuyển động xuất hiện (entrance) cho Dashboard portal.
 * Ghi chú: Chuyển động Sidebar 100% điều khiển bằng CSS — không đụng tới ở đây.
 *
 * QUAN TRỌNG: các trang portal (#app-shell) bị display:none cho tới khi auth xong.
 * Entrance phải chờ shell HIỆN rồi mới chạy — chạy lúc còn ẩn thì người dùng không
 * thấy animation, và tween có thể đứng hình giữa chừng (rAF ngừng ở tab nền).
 *
 * BA CÁI BẪY ĐÃ DÍNH (20/07/2026) — đừng lặp lại:
 *
 *  1. `clearProps: 'all'` XOÁ SẠCH thuộc tính style, kể cả `display:none` mà code
 *     phân quyền đặt vào → Super Admin thấy thẻ "Tạo báo giá", Nhân viên thấy thẻ
 *     số liệu + panel dành riêng Admin. Đã đo: style "display:none" → "" sau tween.
 *     LUÔN liệt kê cụ thể: clearProps: 'transform,opacity'.
 *
 *  2. `gsap.from()` để lộ một khung hình ở trạng thái CUỐI trước khi tween kéo về
 *     trạng thái đầu → giật một cái lúc hiện. Cách tránh: đặt trạng thái đầu bằng
 *     gsap.set() NGAY khi script chạy (lúc shell còn display:none, chưa vẽ gì),
 *     rồi tween TỚI trạng thái cuối bằng .to().
 *
 *  3. CSS `transition: transform .25s` trên .stat-card đánh nhau với GSAP: GSAP ghi
 *     transform mỗi khung hình, transition lại nội suy từng lần ghi → trễ + snap lúc
 *     kết thúc. Trong lúc tween phải tắt transition (body.is-entering, xem portal.css).
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const greeting = document.querySelector('.topbar-greeting');
  const statRow  = document.querySelector('.stat-row');
  const dashGrid = document.querySelector('.dash-grid');
  if (!greeting && !statRow && !dashGrid) return;

  // Một nhịp duy nhất: mờ → rõ, nhô lên 10px. Chủ tool chốt "animation đơn giản"
  // (20/07/2026) — bỏ kiểu 3 nhóm lệch nhịp với độ dịch/thời lượng khác nhau.
  const RISE = 10, DUR = 0.32, STAGGER = 0.04;

  const els = [];
  if (greeting) els.push(greeting);
  if (statRow)  els.push(...statRow.children);
  if (dashGrid) els.push(...dashGrid.children);
  if (!els.length) return;

  // Bẫy 2: đặt trạng thái đầu NGAY BÂY GIỜ, lúc shell còn ẩn nên chưa vẽ ra màn hình.
  gsap.set(els, { opacity: 0, y: RISE });

  const isShown = el => window.getComputedStyle(el).display !== 'none';

  function startEntrance() {
    // Bẫy 1: phần tử bị ẩn theo QUYỀN phải ở yên — không tween, và trả lại style sạch.
    const shown = els.filter(isShown);
    const hidden = els.filter(el => !isShown(el));
    // clearProps liệt kê cụ thể: dọn hết dấu vết GSAP (kể cả translate/rotate/scale)
    // mà KHÔNG đụng tới display:none của tầng phân quyền.
    if (hidden.length) gsap.set(hidden, { clearProps: 'transform,opacity' });
    if (!shown.length) return;

    // Bẫy 3: tắt CSS transition của vùng đang tween.
    document.body.classList.add('is-entering');

    gsap.to(shown, {
      opacity: 1, y: 0,
      duration: DUR, stagger: STAGGER, ease: 'power2.out',
      onComplete() {
        document.body.classList.remove('is-entering');
        // KHÔNG dùng 'all' — xem bẫy 1.
        gsap.set(shown, { clearProps: 'transform,opacity' });
      }
    });
  }

  const shell = document.getElementById('app-shell');
  if (!shell) { startEntrance(); return; }                                  // trang không dùng app-shell (vd /tool)
  if (window.getComputedStyle(shell).display !== 'none') { startEntrance(); return; }

  // Chờ inline script auth đổi style của shell (display:none → flex) rồi mới chạy
  const mo = new MutationObserver(() => {
    if (window.getComputedStyle(shell).display !== 'none') {
      mo.disconnect();
      startEntrance();
    }
  });
  mo.observe(shell, { attributes: true, attributeFilter: ['style'] });
});

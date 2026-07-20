/**
 * Thinksmart Tool — Animation Framework (GSAP Integration)
 * Quản lý chuyển động xuất hiện 3D (Entrance Animations) cho Dashboard & UI Components.
 * Ghi chú: Chuyển động Sidebar 100% điều khiển bằng CSS Hardware Acceleration để đảm bảo mượt 60fps tuyệt đối.
 *
 * QUAN TRỌNG: các trang portal (#app-shell) bị display:none cho tới khi auth xong.
 * Entrance phải chờ shell HIỆN rồi mới chạy — chạy lúc còn ẩn thì người dùng không
 * thấy animation, và tween có thể đứng hình giữa chừng (rAF ngừng ở tab nền) làm
 * nội dung kẹt ở opacity 0. clearProps đảm bảo trạng thái cuối luôn sạch.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Kiểm tra GSAP đã được tải + tôn trọng reduced-motion
  if (typeof gsap === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 2. Chuyển động xuất hiện (Entrance Animations) cho Trang Chủ Portal
  function startEntrance() {
    const dashGrid = document.querySelector('.dash-grid');
    const statRow = document.querySelector('.stat-row');
    const topbarGreeting = document.querySelector('.topbar-greeting');
    if (!topbarGreeting && !statRow && !dashGrid) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.5 } });

    if (topbarGreeting) {
      tl.from(topbarGreeting, { y: -15, opacity: 0, duration: 0.4, clearProps: 'all' });
    }
    if (statRow && statRow.children.length > 0) {
      tl.from(statRow.children, { y: 20, opacity: 0, stagger: 0.08, clearProps: 'all' }, '-=0.2');
    }
    if (dashGrid && dashGrid.children.length > 0) {
      tl.from(dashGrid.children, { y: 25, opacity: 0, stagger: 0.12, clearProps: 'all' }, '-=0.2');
    }
  }

  const shell = document.getElementById('app-shell');
  if (!shell) { startEntrance(); return; }                                  // trang không dùng app-shell (vd /tool)
  if (getComputedStyle(shell).display !== 'none') { startEntrance(); return; } // shell đã hiện sẵn (chế độ mở)

  // Chờ inline script auth đổi style của shell (display:none → flex) rồi mới chạy
  const mo = new MutationObserver(() => {
    if (getComputedStyle(shell).display !== 'none') {
      mo.disconnect();
      startEntrance();
    }
  });
  mo.observe(shell, { attributes: true, attributeFilter: ['style'] });
});

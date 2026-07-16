# Design lessons — sổ bài học thiết kế (cập nhật mỗi ngày làm việc)

**Mục đích:** mỗi phiên làm UI cho Thinksmart Tool, ghi lại bài học thiết kế đã áp dụng/rút ra ở đây
(kèm ngày), để kiến thức cộng dồn — giống changelog nhưng dành riêng cho design. Đây là một phần của
quy trình "Keep this skill current" trong SKILL.md.

**Bộ skill thiết kế nằm ở TẦNG CÁ NHÂN** `%USERPROFILE%\.claude\skills\` (mọi dự án tự có;
bản gốc lâu dài: `E:\2026\Claude\.claude\skills\`):
- **ui-ux-pro-max** — dùng khi RÀ SOÁT/QC: checklist accessibility, touch target, contrast, form,
  navigation; tra cứu database (`python "$env:USERPROFILE/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <ux|style|color|typography>`).
- **frontend-design** — dùng khi TẠO MỚI/LÀM ĐẸP UI: triết lý thiết kế có chủ đích, chống "AI-look"
  (tránh 3 look mặc định: cream+serif+terracotta / nền đen+xanh acid / broadsheet hairline).
  Quy trình: brainstorm token system (màu/type/layout/signature) → tự phê bình → mới code.
- **design-lessons** — SỔ BÀI HỌC TOÀN CỤC (`%USERPROFILE%\.claude\skills\design-lessons\LESSONS.md`,
  cấu trúc theo tuần). File bạn đang đọc là sổ RIÊNG của Thinksmart Tool — bài học nào **tái dùng
  được cho dự án khác thì PHẢI promote sang LESSONS.md toàn cục** (dưới tuần hiện tại).

---

## Quy tắc đúc kết cho Thinksmart Tool (cập nhật khi có bài mới)

1. **Contrast AA là sàn**: chữ có nghĩa phải ≥4.5:1 cả 2 theme (đo bằng công thức luminance, đừng đoán).
   Token hiện tại: light `--text-3: #667085` (4.97), dark `--text-3: #8B93A8` (5.87).
2. **Touch target mobile ≥44px** cho MỌI thứ bấm được (toolbar, icon-btn, dòng file, nút xoá) —
   dùng padding + negative margin nếu không muốn phần tử to ra.
3. **Bàn phím là công dân hạng nhất**: mọi phần tử click được phải Tab tới được —
   dùng `makeKeyboardActivatable()` (core.js) cho div/span có click handler.
4. **aria-label cho input tạo động** + `aria-live="polite"` cho status bar.
5. **Một màn hình một CTA chính**: nút đổi theo ngữ cảnh (mẫu gốc → "Tạo bản cho khách" primary;
   bản nháp → "Lưu Nháp" primary). Đừng bày mọi nút cùng lúc.
6. **Sale hay bị gián đoạn** (khách gọi) → dirty-state + chấm cam + confirm rời trang + export tự lưu.
7. **Không tin số đo từ Browser pane của Claude** sau khi resize — style recalc bị đơ; đo bằng
   phần tử tạo mới hoặc reload rồi đo.
8. **Chỉnh vị trí phần tử SVG**: đo lệch thật bằng getBoundingClientRect (chia appState.zoom) rồi
   vá `translate(x y)` vào file — vá ĐỒNG BỘ `public/templates/` + `2-Templates/`.
9. **Nhãn đôi song ngữ** (EN / VN) cho tiêu đề điều hướng — nhất quán cả 3 section.
10. **Field editor gọn theo ngữ nghĩa**: 2 giá trị liên quan chặt (tiền + tuổi của 1 cột biểu đồ)
    → 1 hàng 2 ô (`.dual-input-row`), đừng rải thành 2 nhóm xa nhau.

## Log bài học theo ngày

### 2026-07-15 (ngày đầu áp dụng)
- Chạy audit toàn tool bằng ui-ux-pro-max: phát hiện tooltip zoom tráo ngược, thiếu keyboard access,
  contrast text-3 dưới chuẩn, touch target mobile thiếu 44px → tất cả đã sửa (xem changelog later 13).
- Học từ user testing thật: sale cần workflow 4 bước rõ ràng (Chọn mẫu → Điền → Lưu Nháp → Xuất),
  ghét nút thừa ("4 nút lằng nhằng") → rút gọn còn nút theo ngữ cảnh + tự động hoá preset đại lý.
- Ô nhập nên phản chiếu cấu trúc THẬT của bản vẽ: "Tổng số tiền đóng" từng bị nhận nhầm là cột
  biểu đồ vì lọc theo toạ độ thô — anchor theo hàng ô ("20 năm") mới bền.
- Khoá field cố định ("120 tuổi") khỏi editor: ít lựa chọn hơn = ít sai hơn.
- Căn giữa số La Mã I/II trong badge bằng phép đo thật (bài học #8 ở trên).

---
## Nhắc quy trình (cho phiên sau)
Cuối mỗi phiên có đụng UI: thêm mục `### YYYY-MM-DD` phía trên với 1-5 gạch đầu dòng bài học mới,
và nếu bài học mang tính QUY TẮC lâu dài thì thêm/sửa mục trong "Quy tắc đúc kết". Prune quy tắc sai.

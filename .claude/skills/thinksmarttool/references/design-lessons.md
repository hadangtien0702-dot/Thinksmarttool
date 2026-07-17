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

### 2026-07-17 (audit /frontend-design + tối ưu mobile /ui-ux-pro-max, máy D:)
- **A11y tree hiện attribute `title` chứ không phải text nhìn thấy**: cây accessibility báo
  "AIG IUL.svg" trong khi màn hình hiển thị "AIG IUL" sạch — suýt "sửa" một lỗi không tồn tại.
  Trước khi sửa lỗi phát hiện qua a11y tree, verify lại bằng `textContent` của phần tử thật.
- **`viewport-fit=cover` mà không có `env(safe-area-inset-*)` là mới làm nửa việc**: meta này
  kéo web tràn xuống vùng tai thỏ/thanh home, mọi bar cố định (status bar, footer bottom-sheet,
  chân drawer) phải cộng thêm env() không thì bị OS chrome đè. Fallback `env(..., 0px)` giữ
  desktop/Android nguyên vẹn.
- **Media query nâng touch target phải quét MỌI nút trong vùng, đừng chỉ icon-btn**: nút `.btn`
  primary bị giấu chữ (font-size:0) trong header mobile còn 42×38 trong khi icon-btn cạnh nó đã 44.
- **Pane đơ recalc kể cả sau reload** (nâng cấp bài học #7): số đo phần tử CŨ sau resize có thể
  sai hoàn toàn (báo style mobile ở viewport 1280). Phân xử bằng 2 nguồn độc lập: phần tử TẠO MỚI
  + đọc CSSOM (`document.styleSheets` xem rule nằm trong @media nào) — CSSOM không bao giờ stale.
- Thêm cho mobile: `overscroll-behavior: none` (body) + `contain` (vùng scroll trong drawer/sheet)
  chặn pull-to-refresh Android phá thao tác kéo canvas; `.tree-file-item:active` làm tap feedback
  vì cảm ứng không có hover.

### 2026-07-16 (chuẩn hóa design system theo /frontend-design)
- **"Chuẩn hóa" một tool đang dùng hằng ngày = siết độ chính xác, KHÔNG đổi look**: giữ nguyên
  bản sắc (ramp tím #4F00CA, Plus Jakarta Sans, canvas chấm bi, workflow 4 bước) — bold đã tiêu
  đúng chỗ; giá trị nằm ở dọn nhiễu quanh nó.
- **CSS chết tích tụ theo mỗi lần gỡ tính năng**: sau các đợt bỏ nút preset/banner/code-tab còn
  ~60 dòng mồ côi (template-warning, agent-preset-bar, section CODE EDITOR, metadata-grid,
  toolbar-label, lib-ext…). Cách tìm nhanh: grep từng class trong index.html + js/*.js.
- **Màu "theo loại file" là thông tin → phải thành token có tên**: `--ft-jpeg-1/2` (teal = ảnh),
  `--ft-pdf-1/2` (đỏ = tài liệu), `--attention` (chấm chưa lưu — đèn báo nên sáng hơn --warning
  vốn dành cho CHỮ đạt AA). Hex swatch literal (nút chọn màu nền canvas) thì GIỮ literal.
- **Type scale: thêm bậc thiếu thay vì rải px**: mọi 9/9.5/10/10.5px quy về `--fs-2xs: 10.5px`
  (eyebrow/chip), 11→--fs-xs, 12→--fs-sm, 14→--fs-base. Literal duy nhất còn lại: 16px mobile
  input (hằng số chức năng chống iOS auto-zoom — comment rõ, không thuộc scale).
- **Selector khai báo 2 nơi là bug chờ nổ** (.sidebar-actions-footer 2 định nghĩa lệch padding/gap,
  .tree-file-name 2 nơi): gộp về 1, để comment trỏ chéo nếu dùng ở section khác.
- **100vh → thêm dòng `height: 100dvh` ngay sau** (fallback tự nhiên của CSS): mobile không hụt
  đáy khi thanh URL co giãn; bottom-sheet cũng `min(66dvh, …)`.
- **Đo dark-theme trong pane: toggle class rồi đọc computed style CÙNG call là số ĐÈN CŨ** (pane
  đơ recalc) — đọc token qua PHẦN TỬ TẠO MỚI (`getPropertyValue('--x')` trên div vừa append) mới tin được.

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

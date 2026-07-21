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
11. **Chữ trong SVG không tự giãn — mọi thứ đứng cạnh nhau đều phải tính lại tay.** Hai giá trị nằm
    cạnh nhau trong bản vẽ là hai thẻ `<text>` với `translate()` cứng: giá trị dài ra là đè lên nhau.
    Cách xử đúng: đo `getBBox().width` thật rồi đặt lại toạ độ cho CẢ HAI, và **neo theo TÂM cụm**
    (đo một lần theo bản gốc) chứ đừng neo mép trái — neo tâm thì dài ngắn thế nào khối chữ vẫn cân
    giữa thẻ nền, và tâm không trôi qua các lần sửa.
12. **Kerning của Illustrator là kerning của CHỮ CÁI GỐC, không phải của ô.** Mỗi tspan mang một class
    `letter-spacing` riêng dành cho đúng mảnh chữ ban đầu. Ghi chữ mới vào mảnh đó = áp nhầm kerning
    cho toàn bộ chữ (chữ dính chùm). Luôn `letter-spacing: inherit` cho mảnh vừa ghi
    (**`inherit` chứ không `normal`** — để tracking cố ý ở cấp `<text>` không bị xoá).
13. **Mẫu này chạy được không có nghĩa mẫu kia chạy được.** 3 lỗi ngày 21/07 chỉ nổ ở Allianz vì các
    mẫu AIG/NLG tình cờ không có class kerning âm ở mảnh đầu. Thêm mẫu mới = phải mở từng ô ra gõ thử,
    không suy ra từ mẫu cũ.

## Log bài học theo ngày

### 2026-07-21 (later 2 — 3 lỗi Allianz, xem changelog cùng ngày)
- Rút ra quy tắc **11, 12, 13** ở trên. Cả 3 lỗi đều lọt vì phiên trước chỉ chạy `node --check`
  rồi coi như xong; chỉ cần mở đúng mẫu Allianz gõ thử 3 ô là lộ hết ngay.
- **Sửa chỗ nhìn thấy được thì phải NHÌN, không đọc code rồi suy.** Ảnh chụp Browser pane treo với
  SVG 2.3 MB → thay bằng `javascript_tool` đọc `getBBox()`/`getComputedStyle()`/`transform` (số đo
  thật, còn chắc hơn nhìn ảnh), và clone SVG đổi `viewBox` để cắt vùng cần xem gửi chủ tool.
- **Ô sửa chữ phải kiểm CẢ HAI cây DOM.** Canvas đúng mà `activeSvgDoc` sai thì file xuất ra sai —
  và đây là thứ chủ tool gửi cho khách. Test xong luôn đối chiếu `appState.activeSvgDoc`.

### 2026-07-17 (tối — nháp trình duyệt cho site live)
- **Snapshot dạng key→value của SVG nhiều tspan phải lưu CẢ DÒNG** (`getLineTextContent`), đừng lưu
  `.textContent` của tspan đầu: lưu mảnh thì lúc áp lại không phân biệt được "dòng chưa sửa" với
  "dòng đã sửa", và xoá siblings mù sẽ phá dòng chưa sửa. Round-trip test (lưu → reload → so từng
  field) là cách duy nhất lộ bug này — sửa xong nhìn đúng, mở lại mới sai.
- **Nghĩ theo "ai giữ state"**: 100 người dùng đồng thời không có nghĩa cần backend — nháp cá nhân
  thuộc về MÁY người đó (localStorage), server chỉ phục vụ mẫu đọc-chung. Ranh giới quyết bằng env
  flag server trả về (`draftsMode`), client không tự đoán môi trường.

### 2026-07-17 (chiều — app dialog thay alert hệ thống)
- **Dialog tự vẽ phải mở ĐỒNG BỘ, không qua rAF**: `requestAnimationFrame` không chạy khi tab bị
  throttle (tab nền, pane nhúng) → dialog nằm ở opacity 0 vô hạn. Pattern đúng: append → `void
  el.offsetWidth` (force reflow) → add class `.open` → focus, tất cả trong cùng call stack.
- **Thay alert() nhưng ĐỪNG vội thay confirm() sync**: caller của confirm đang rẽ nhánh đồng bộ
  (guard rời trang) — thay bằng modal Promise là phải async-hoá cả chuỗi. Tách scope: alert/prompt
  (fire-and-forget hoặc caller đã async) đổi trước, confirm để đợt riêng.
- **Modal điền form nên mang placeholder ví dụ đúng định dạng** ("Ví dụ: Nguyen Van A") — rẻ mà
  giảm hẳn nhập sai, nhất quán với bộ placeholder của master.

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

### 2026-07-21 (phiên dài — rail, layout Tool, bảng thành viên, mẫu Allianz)
- **ĐO PHẦN TỬ THẬT, ĐỪNG ĐO PHẦN TỬ TỰ DỰNG.** Sai 4 lần trong một phiên, đều cùng kiểu:
  (a) dựng nút bằng class mà quên `id` → không thấy rule `#id !important` → báo sai "hai nút giống
  nhau" trong khi thực tế 149×48 vs 121×38, chủ tool phải mở DevTools chỉ ra; (b) đo trúng phần tử
  nằm trong khối `display:none` → mọi số ra 0; (c) đo bố cục SVG khi chưa nạp CSS chứa `@font-face`
  → chạy bằng font thay thế, số đo lệch hoàn toàn; (d) vá toạ độ SVG bằng pixel màn hình mà quên
  chia hệ số thu phóng → vá quá tay. Buộc phải dựng thì kèm ĐỦ id + class + ngữ cảnh cha, nạp đúng
  CSS/font, kiểm `innerWidth` và `display` trước khi tin con số.
- **Hai file CSS chép tay lẫn nhau = lỗi lặp vô hạn.** Cùng một bug logo rail phải sửa 2 lần vì
  Tool dùng `style.css` còn portal dùng `portal.css`. Hệ nút cũng lệch (37/44px). Khi thấy mình
  đang "sửa cả hai file cho giống nhau" → đó là tín hiệu phải gộp, không phải chép tiếp.
- **`scaleY` để làm animation "dài ra" thì BÓP MÉO nội dung** (icon, chữ) — người dùng gọi là "giật".
  Dùng `clip-path: inset()` để lộ dần: khung trông như dài ra mà nội dung không biến dạng.
- **Hiệu ứng chuyển trang chụp KHUNG HÌNH ĐẦU của trang đích.** Trang nào giấu nội dung chờ xác thực
  thì khung hình đó TRẮNG → người dùng thấy chớp, tưởng không có animation. Khai báo CSS thôi chưa
  đủ, phải cho nội dung trang đích có nhịp hiện vào.
- **Bảng nhiều hàng: `subgrid` là bắt buộc khi có cột co giãn theo nội dung.** Cột "Thao tác" đổi số
  nút theo quyền → mỗi hàng tự dựng lưới là lệch tới 70px.
- **Hàng thao tác trong bảng: 1 hành động chính + menu "⋯".** Bày 4 nút trộn 3 kiểu (nút viền, chữ
  đỏ, nút đặc) vừa rối vừa kéo cột rộng ra. Gom lại: cột co từ rất rộng còn 180px.
- **Ô chỉnh sửa phải phản chiếu ĐÚNG nội dung bản vẽ.** Mẫu Allianz dùng logic toạ độ của IUL nên
  dán nhãn sai toàn bộ ("Giá trị tích luỹ Cột 2" thực ra là Tổng dòng tiền). Ghép theo NEO CHỮ
  (nhãn tiếng Việt đứng ngay trên giá trị) là đúng 7/7 và bền khi bản vẽ đổi.
- **SVG xuất từ Illustrator: tspan là anh em ruột, mỗi cái có `x` cố định.** Viết chữ dài/ngắn khác
  vào một tspan là các tspan sau chồng lên nhau. Muốn cho sửa tự do phải DỒN cả cụm vào một tspan
  rồi làm rỗng các tspan còn lại.
- **Gỡ phần tử khỏi HTML thì phải soát JS còn ghi vào nó không** — `.textContent` trên `null` làm
  chết cả hàm, trang trắng. Bọc null-safe cho các chỗ ghi số liệu.
- **Icon raster tỉ lệ 1:1 trong file thiết kế = nhoè khi xuất.** App xuất 2x nên icon 23px thành 46px.
  Đo độ phân giải thật (giải mã base64 lấy width/height) rồi đối chiếu cỡ hiển thị để chứng minh,
  đừng tranh luận bằng mắt.

### 2026-07-20 (Portal `feat/login` — animation, bảng thành viên)
- **TRƯỚC KHI SỬA ANIMATION, KIỂM TRA MÔI TRƯỜNG.** Chủ tool sửa nhiều lần không thấy khác gì vì
  Windows tắt Animation effects (`MinAnimate=0`) → `prefers-reduced-motion: reduce` → block trong
  portal.css ép mọi transition về `0.01ms` và animations.js return sớm. Cách kiểm nhanh:
  `matchMedia('(prefers-reduced-motion: reduce)').matches` + đo `transitionDuration` thật.
  Bật lại phải KHỞI ĐỘNG LẠI Chrome, reload không đủ.
- **`clearProps: 'all'` của GSAP xoá SẠCH thuộc tính `style`, kể cả `display:none` của phân quyền.**
  Đây là lỗ hổng HIỂN THỊ THEO QUYỀN, không chỉ là lỗi thẩm mỹ: Nhân viên thường thấy được thẻ và
  panel dành riêng Admin sau khi hiệu ứng chạy xong. LUÔN liệt kê cụ thể `'transform,opacity'`,
  và đừng tween phần tử đang bị ẩn theo quyền.
- **`gsap.from()` để lộ một khung hình ở trạng thái CUỐI** trước khi kéo về trạng thái đầu → giật.
  Đặt trạng thái đầu bằng `gsap.set()` lúc container còn `display:none`, rồi `.to()` tới đích.
- **CSS `transition` trên phần tử GSAP đang tween = xung đột**: GSAP ghi transform mỗi khung hình,
  transition nội suy lại từng lần ghi → trễ và snap lúc kết thúc. Tắt transition bằng một class
  bật trong lúc tween (`body.is-entering`).
- **Bảng nhiều hàng chia cột PHẢI dùng `subgrid`**, không cho mỗi hàng tự dựng lưới: cột có nội
  dung co giãn (nhóm nút đổi theo quyền) sẽ kéo các cột khác lệch mỗi hàng một kiểu — đo được 70px.
  Chỉ container cha định nghĩa `grid-template-columns`; hàng con dùng `subgrid`. Đánh đổi: không
  được thêm padding/border TRÁI-PHẢI cho phần tử subgrid (nó thụt vào là lệch lại).
- **Trạng thái "đang tải" không được làm xê dịch bố cục**: banner chen giữa trang đẩy nội dung rồi
  biến mất = giật mỗi lần refresh. Thay bằng phản hồi tại chỗ (nút đổi nhãn + khoá, vùng dữ liệu mờ
  đi). Khung xương cho lần tải đầu phải cao ĐÚNG BẰNG hàng thật, nếu không lúc thay dữ liệu lại nhảy.
- **Ẩn theo quyền phải gỡ ở MỌI tầng, không chỉ tầng nút**: bỏ chặn Super Admin có 5 chỗ, nặng nhất
  là `location.replace()` chặn ở trang đích — gỡ 4 chỗ hiển thị mà quên chỗ này thì bấm vào vẫn văng ra.

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

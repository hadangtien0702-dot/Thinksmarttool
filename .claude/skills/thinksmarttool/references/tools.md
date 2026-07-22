# The tools (left-nav sections)

The left sidebar is the platform's main navigation. Each top-level section is a "tool". Labels are clean:
no folder prefixes, no file extensions.

## 1. Proposal / Báo giá  (editable)

Insurance quote designs, grouped by carrier: **AIG**, **NLG**, and **Khách hàng** (saved client copies).

- Masters live in `2-Templates/AIG|NLG/` and are **protected** (`isMasterFile` true → a
  "MẪU GỐC — không thể lưu đè" banner shows). Editing a master shows fields but you can't overwrite it.
- **Sale workflow (4 steps, owner-defined 2026-07-15): Chọn mẫu → Điền → Lưu Nháp → Xuất.**
- **Context-aware header buttons** (`updateHeaderActions()` in core.js): master open → single primary CTA
  **"Tạo bản cho khách"** (Save hidden); client copy open → **"Lưu Nháp"** (primary, orange dot via
  `.has-unsaved` when there are unsaved edits) + "Tạo bản mới" (secondary). Welcome screen shows the 4 steps.
- Flow: open a master → edit text → click **"Tạo bản cho khách"** → enter client name → server clones it to
  `4-Clients/<client> - <base>.svg` → that copy is editable + savable, appears under **"Bản nháp"**.
- Drafts have a **trash icon** (hover; always visible on mobile) → confirm → `POST /api/svgs/delete`
  (restricted to `4-Clients/*.svg`). Deleting the open draft resets to the welcome screen
  (`resetCanvasToWelcome()`).
- **Agent info is remembered automatically** (no buttons): every successful Lưu Nháp / Xuất calls
  `storeAgentPreset()` (localStorage), and "Tạo bản cho khách" auto-fills it via `applyAgentPresetQuiet()`.
- **Unsaved-changes protection** (`appState.isDirty`, set in `applyTextValue`/`replaceColorInDoc`/name-card
  edits): switching files asks to confirm (`confirmLeaveUnsaved()`), closing the tab warns (beforeunload),
  and **Xuất JPEG/PDF auto-saves the draft first** on client copies.
- The right editor groups proposal fields into **1. Thông tin khách hàng**, **2. Kế hoạch & Quyền lợi**,
  **3. Thông tin đại lý & Khác** using position/content heuristics in `populateTextsEditor()`. Some fields
  are dropdowns (gender, rate class, US state); currency + US phone numbers auto-format.
- Export: **Xuất JPEG** + **Xuất PDF** (bottom of the right panel). Fonts are embedded on export.

## 2. Brochure  (download library)

Marketing PDFs/images by carrier for sales to download. Comes from `/api/library` scanning `Brochure/`.

- Clicking an item shows a **preview + "Tải về"** (no filename/size text — kept minimal). PDF preview hides
  the browser PDF chrome (`#toolbar=0&navpanes=0&scrollbar=0`).
- **Multi-page grouping** (`preprocessLibraryItems`): files named `X.jpg` + `X (2).jpg` (± `X.pdf`) collapse
  into ONE item shown as multiple pages, with per-page download + "Tải tất cả N trang" (or "Tải PDF trọn bộ").
- To add brochures: drop files into `Brochure/AIG/` or `Brochure/NLG/` (loose files → "Chung" group). JPGs
  are committed so they appear on the live site too.

## 3. Name Card  (editable — works like a proposal)

Agent business cards. Master: `Name Card/Chung/Sale Name Card.svg`. Routed through `/api/svgs` (not the
download library). Protected like a proposal master; "Tạo bản cho khách" makes a personal copy → "Của tôi".

### The `data-nc` tagging system (important)
The editor shows **exactly the fields tagged in the SVG**, nothing else. Tags:
- `data-nc="name"` → Họ và Tên (the cls-19 / large name `<text>`)
- `data-nc="title"` → Chức vụ (the visible "Agent Assistant" `<text>` — 2nd `cls-17` since there's a hidden
  duplicate card behind)
- `data-nc="contact"` → the `<text>` block whose lines become **Số điện thoại / Fax / Email** (by line/`y`
  order; Website/Youtube/Địa chỉ lines are intentionally NOT shown — company info stays fixed).

If no `data-nc` tags exist, the editor falls back to listing every text line generically.

### ⚠️ Re-tagging after a re-export
If the user re-exports the name card from Illustrator, the `data-nc` tags are **lost**. Re-add them with a
small node script that inserts `data-nc="name"` on the `cls-19` `<text>`, `data-nc="title"` on the 2nd
`cls-17` `<text>`, and `data-nc="contact"` on the contact `<text>` (its id starts with the phone number, e.g.
`_657...`). Then copy the tagged SVG to `public/templates/` and add it to `manifest.json` (so it works on
the live static fallback too). Editing per line updates only that line's tspans, then `renderSvgOnCanvas()`
re-renders (keeps zoom/pan).

### Known limitation (PENDING)
The 5 contact icons are **tiny raster (bitmap) images** (~22–35px) embedded in the SVG, so they look rough
/ "mất góc" when zoomed or exported. It's a source-asset issue, not a tool bug (confirmed by extracting the
images). Fix = replace with vector icons — preferably by the user re-exporting from Illustrator with icons
kept **vector** (Export SVG → Images: Preserve), or in code (harder: per-icon ratios, YouTube uses a mask,
2 overlapping card copies, color match). See `references/changelog.md` for the live status.

---

## 4. SO SÁNH QUYỀN LỢI CÁC HÃNG (`public/js/sosanh.js`) — thêm 21/07/2026

Công cụ **KHÔNG mở file SVG** đầu tiên của tool. Đây là bản mẫu tham khảo cho các công cụ sắp
tới (Tính tuổi bảo hiểm, Run quotes) — xem PENDING -3.

**Cách hoạt động**
- Nav: mục "So sánh quyền lợi / Compare" → một mục con duy nhất "Living Benefits — 16 hãng".
- Bấm vào → `openCompareTable()` vẽ HTML thẳng vào `#library-view` (dùng chung vòng đời với
  brochure preview: `hideLibraryPreview()` tự dọn khi mở file khác). Không dùng canvas SVG,
  không hiện panel "Sửa chữ bản vẽ".
- Bảng **5 cột**: 1 cột hãng + 4 nhóm Living Benefits. Mỗi hãng là **một thẻ bo tròn riêng**
  (không phải bảng kẻ ô) — chủ tool chốt ngôn ngữ này 21/07. Bấm một thẻ → bung 4 thẻ chi tiết
  điều khoản ngay bên trong.

**Dữ liệu — ĐỌC KỸ TRƯỚC KHI SỬA**
- Nằm trong hằng `SS_DATA` ở đầu `sosanh.js`. Mỗi ô: `{ s:'ok'|'no'|'wr', d:'chi tiết' }`
  (`ok` = có · `no` = không · `wr` = chưa xác nhận).
- Nguồn gốc: `Bang so sanh quyen loi cac hang/Compare.html` do chủ tool cung cấp. Chép **nguyên
  văn**, không rút gọn.
- ⚠️ **Đây là điều khoản bảo hiểm đội sale đọc cho khách nghe.** Sửa con số/điều kiện phải có
  nguồn từ chủ tool. Tuyệt đối không tự "làm gọn cho dễ đọc" hay tự suy ra giá trị thiếu.
- Muốn thêm hãng: thêm một object vào `SS_DATA` + bỏ file logo `NN_Ten_Hang.png` vào folder
  (số đầu tên quyết định thứ tự, dùng cho cả sắp xếp lẫn tra logo).

**Logo**: 16 PNG trong `Bang so sanh quyen loi cac hang/`, nạp qua `/api/download?...&inline=1`.
Đặt trong chip **nền trắng cố ý** — nhiều logo có nền đặc, để trong suốt sẽ chìm ở theme tối.
⚠️ KHÔNG dùng `loading="lazy"` cho ảnh trong `#library-view` (xem changelog later 15).

**CSS**: mục **22b** trong `style.css` (`.ss-*`). Toàn token của design system → theme tối tự
đúng. Riêng màu chữ badge phải đặt tay vì cặp token mặc định không đạt AA — xem PENDING Z.

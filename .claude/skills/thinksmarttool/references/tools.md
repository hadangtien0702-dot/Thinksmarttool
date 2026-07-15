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

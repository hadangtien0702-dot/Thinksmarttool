# Changelog & current state

**This is the freshest source of truth.** Read it first every session; update it last every session.
Newest entries on top. Keep it concrete (versions, files, commands).

## Current state (as of 2026-07-17)
- **Frontend is modular**: `public/app.js` is GONE, replaced by `public/js/`
  (`core.js` / `proposal.js` / `brochure.js` / `namecard.js` / `main.js`); versions: `core.js?v=12`,
  `proposal.js?v=10`, `main.js?v=5`, `brochure.js?v=4`, `namecard.js?v=5`, `style.css?v=17`.
- Fonts: `public/fonts/` chứa 11 file THẬT (7 SF Pro weights + 3 SF Pro italics + Bodoni Moda);
  export nhúng đủ 11. Đừng copy đè từ `5-Design-Sections/sf pro/` (bộ giả cũ).
- Proposal carriers: AIG, NLG, **Allianz (empty — awaiting owner's design)**; the 3 master carriers
  always render in the nav even with 0 templates (`MASTER_CARRIERS` in core.js).
- `/api/svgs` workspace scan is now an ALLOWLIST (`PROPOSAL_SCAN_DIRS` in server.js:
  `2-Templates`, `4-Clients`, `Name Card`) — new root folders (design WIP etc.) can't leak into the tree.
- Sale workflow: **Chọn mẫu → Điền → Lưu Nháp → Xuất** — context-aware header buttons, auto agent
  preset, dirty tracking + confirmations, draft trash-delete (`/api/svgs/delete`), drafts grouped
  under **"Bản nháp"** (see 2026-07-15 later 8/11/12).
- Mobile-ready: ≤900px = drawer + bottom-sheet + touch pan/pinch (see 2026-07-15 later 5).
- Bilingual nav: Proposal / Báo giá · Brochure / Tài liệu · Name Card / Danh thiếp.
- All local work through 2026-07-17 committed & pushed (see Log).
- Live at `thinksmarttool-gy6f.vercel.app`.
- All 3 tools working: Proposal (AIG/NLG + Bản nháp), Brochure (multi-page grouping, minimal preview),
  Name Card (5 tagged fields, editable, fit-to-viewport zoom, master-protected + copy flow).
- Font embedding on export is live. Design system + light/dark theme live.

## PENDING / open tasks
-1. **Verify save/clone/delete on the LIVE site (Vercel serverless)**: those routes write/delete files
   on the serverless filesystem, which is read-only/ephemeral — drafts on the live site probably can't
   persist (may alert an error). Needs a real test on thinksmarttool-gy6f.vercel.app; if broken, the fix
   is routing live-site drafts through the static-mode localStorage path (or a real storage backend).
0. **`TERMLIFE - NLG` master polluted with test data** (see 2026-07-15 log) — owner to supply/restore
   a clean master (both `2-Templates/NLG/` and `public/templates/`).
1. **Name Card icons are low-res raster** → look rough / "mất góc" when zoomed/exported. Confirmed a
   source-asset issue, not a tool bug. Awaiting the owner's choice: re-export from Illustrator with vector
   icons (preferred) OR replace icons with vectors in code. See `tools.md` → "Known limitation".
2. ~~SF Pro italics + Bodoni Moda not truly bundled~~ **FIXED 2026-07-17** — all 11 fonts are now
   real files (see log). Rebuild script: `build-fonts.py` (repo root; fontTools subset from
   `C:\Windows\Fonts` OTFs).
2b. **Custom domain `tool.thinksmartinsurance.com` — CHỜ OWNER THÊM DNS Ở A2 HOSTING** (added to
   project thinksmarttool-gy6f 2026-07-17 via `vercel api`, verified:false). Owner cần vào cPanel
   A2 Hosting → Zone Editor → thêm 2 record:
   - CNAME: name `tool` → `538e043f27a6d167.vercel-dns-017.com.` (hoặc `cname.vercel-dns.com.`)
   - TXT: name `_vercel` → `vc-domain-verify=tool.thinksmartinsurance.com,557b9ed5f517d8d589b4`
   Sau khi DNS chạy: Vercel tự verify (hoặc `vercel api /v9/projects/thinksmarttool-gy6f/domains/tool.thinksmartinsurance.com/verify -X POST`
   trong PowerShell — Git Bash sẽ nuốt path /v9). Rồi cập nhật URL mới trong SKILL.md/deployment.md.
3. **Two Vercel URLs** (gy6f vs editor-proposesalsale) — consider consolidating/removing one in the dashboard.
4. Future tools the owner may add (platform vision): more sales tools beyond proposals (video, training docs,
   FB post templates, client management…). Keep the structure modular.

## Log
### 2026-07-17 (font thật thay font giả — "font bị đổi khi sửa/xuất")
- **User report: "cảm giác khi sửa nội dung font bị đổi"** → điều tra toàn tuyến font. Kết luận:
  - Code sửa chữ KHÔNG đổi font (applyTextValue giữ nguyên tspan + class; đã kiểm tra 92 dòng
    editable của AIG IUL — các field khách/kế hoạch/đại lý đều 1 font/dòng; chỉ 7 dòng trộn font
    là tiêu đề lớn + slogan + disclaimer, sửa chúng sẽ mất bold/nhấn giữa câu — hạn chế đã biết).
  - **THỦ PHẠM THẬT: 7 file woff cũ trong `public/fonts/` là đồ giả** — md5 cho thấy
    Black = Bold = Heavy = Text-Bold (cùng 1 file!), Text-Regular = Display-Regular. Máy có cài
    SF Pro (local()) thì canvas đẹp, nhưng EXPORT chỉ nhúng woff → Heavy/Black tụt về Bold,
    italic bị alias thành đứng, Bodoni (slogan NLG) rớt sang serif fallback. Máy KHÔNG cài
    SF Pro (laptop sale, live site) thì canvas cũng sai luôn.
- **Fix: build lại 10 woff THẬT** bằng fontTools (subset Latin + đủ tiếng Việt U+1E00-1EFF,
  layout features giữ nguyên) từ OTF cài trong `C:\Windows\Fonts` — gồm cả 3 italic thật;
  \+ tải **BodoniModa18pt-Italic.woff2** (Google Fonts OFL, pinned ital/opsz18/wght400).
  Script: `build-fonts.py` (repo root — cần `pip install fonttools brotli zopfli`).
- `style.css` @font-face: 3 italic trỏ file thật, thêm khai báo Bodoni. `core.js`: EMBED_FONTS
  đủ 11 font (hỗ trợ per-font `format`), XÓA `ITALIC_ALIASES`.
- Verified (probe @font-face tên riêng, né local()): Black/Heavy/Bold width khác nhau thật,
  italic nghiêng thật, Bodoni load; `getEmbeddedFontCSS()` build đủ 11 families (~2.4MB base64),
  0 lỗi console. `core.js?v=12`, `style.css?v=17`.
- NOTE: repo public đang chứa SF Pro subset (Apple license không cho redistribute — trước giờ
  vẫn vậy với bộ giả). Nếu owner muốn kín kẽ: chuyển repo private hoặc mua/kiểm tra license.
- NOTE: folder `5-Design-Sections/sf pro/` của owner cũng là bộ woff GIẢ cũ — nếu cần dùng
  cho design mới, copy từ `public/fonts/` sang.

### 2026-07-16 (later 2 — chuẩn hóa design system, /frontend-design)
- **Standardization pass on `style.css`** (owner: "chuẩn hóa Thinksmart Tool"); no visual redesign —
  identity kept (violet ramp, Plus Jakarta Sans, dotted canvas, 4-step workflow). Changes:
  - Deleted ~60 lines of DEAD CSS left by removed features: `.template-warning`, `.agent-preset-bar`,
    whole CODE EDITOR section (`#raw-code-area`…), `.pane-section h3`, `.pane-description`,
    `.metadata-grid`/`.meta-*`, `.font-semibold`/`.font-mono`/`.text-xs`, `.toolbar-label`,
    `.text-font-info`, `.lib-ext`. (Verified dead by grepping index.html + js/*.js.)
  - New tokens: `--attention: #F59E0B` (unsaved dot), `--ft-jpeg-1/2` (teal, export JPEG),
    `--ft-pdf-1/2` (red, PDF mockup cover), `--fs-2xs: 10.5px` (eyebrows/chips).
  - All stray font-sizes (9–14px) mapped to the type scale; ONLY literal left: mobile 16px input
    (iOS anti-zoom functional constant). Swatch hexes (preset-btn) intentionally stay literal.
  - Deduped double-defined `.sidebar-actions-footer` and `.tree-file-name`.
  - `100vh` now paired with `100dvh` fallback (body/.app-container/.app-body/bottom-sheet 66dvh).
- Verified localhost: tokens resolve both themes (fresh-element probe: light/dark --text-3,
  --app-bg, --attention), export gradients from tokens, 19 editor fields intact, 0 console errors.
- GOTCHA reconfirmed: pane freezes style recalc on body-class toggle — computed styles of EXISTING
  elements are stale; read tokens via a freshly created element.
- `style.css?v=16`. Design lessons appended (project notebook + global LESSONS.md rule 15).

### 2026-07-16 (later — banner gỡ, allowlist scan, hãng Allianz)
- **Removed the "Đây là MẪU GỐC…" warning banner** in the texts editor panel (owner request) —
  deleted the `template-warning` block in `populateTextsEditor()` (core.js). Master protection
  itself unchanged (save still blocked, "Tạo bản cho khách" still the flow). `core.js?v=10`.
- **`/api/svgs` scan switched from blocklist to ALLOWLIST** (`PROPOSAL_SCAN_DIRS =
  ['2-Templates', '4-Clients', 'Name Card']` in server.js) after the owner's new WIP folder
  `5-Design-Sections/` (11 Allianz section SVGs) leaked into the tree as "Khác 11". Any future
  root folder stays out automatically; `_Archive` also skipped at any depth.
- **New carrier "Allianz"** in Proposal / Báo giá (owner is designing Allianz templates):
  `carrierOf()` + `CARRIER_ORDER` + new `MASTER_CARRIERS` (core.js); nav renders the 3 master
  carriers even when empty with hint "Chưa có mẫu." (proposal.js, skipped while searching);
  server-side carrier detection for `public/templates` fallback also knows Allianz. Created
  empty `2-Templates/Allianz/`. When the design is final: drop the SVG there (filename should
  contain "Allianz") + copy to `public/templates/` for Vercel.
- **`.gitignore` += `5-Design-Sections/`** — design WIP must not reach the public repo.
- Verified on localhost: tree = AIG 2 / NLG 2 / Allianz 0 ("Chưa có mẫu."), banner gone,
  19 editor fields intact on IUL - NLG, no console errors. `core.js?v=11`, `proposal.js?v=10`.

### 2026-07-16 (máy mới sau cài Windows — khôi phục môi trường)
- **Máy được cài lại Windows**: user cũ `Kinn` → user mới `DRT-G21`; ổ dữ liệu cũ `G:` giờ mang
  tên **`E:`** (cùng ổ vật lý). Repo giờ ở `E:\2026\Thinksmart\Sale\Proposal2026`.
- Fix git "dubious ownership": `git config --global --add safe.directory E:/2026/Thinksmart/Sale/Proposal2026`.
- **Khôi phục 4 skill user-level** từ backup `E:\2026\Claude\.claude\skills\` →
  `C:\Users\DRT-G21\.claude\skills\` (frontend-design, ui-ux-pro-max, design-lessons, backend-patterns).
- **2 file .bat backup/restore ở `E:\2026\Claude` viết lại dùng `%~dp0`** (tự nhận ổ đĩa — hết
  hardcode `G:`); thêm guard "đã là junction thì bỏ qua". README cập nhật. Junction CHƯA chạy
  (cần đóng Claude Code + Run as administrator) — tuỳ chủ dự án chạy `2-khoi-phuc-sau-khi-cai-win.bat`.
- **Đường dẫn trong skill/tài liệu đổi hết** `G:\` → `E:\`, `C:\Users\Kinn` → `%USERPROFILE%`
  (SKILL.md, architecture.md, conventions.md, design-lessons.md, design-lessons user-level).
- Khối thay đổi 2026-07-15 VẪN CHƯA COMMIT (nguyên vẹn sau chuyển máy) — commit ở EOD như thường lệ.

### 2026-07-15 (later 19 — design skills moved to USER level + global lesson notebook)
- **Restructured per owner clarification** ("dự án nào cũng dùng, có bản lưu local, muốn biết hàng
  tuần học thêm gì"): the design toolkit now lives at `C:\Users\Kinn\.claude\skills\` —
  `frontend-design`, `ui-ux-pro-max`, and NEW **`design-lessons`** (global lesson notebook,
  LESSONS.md with ⭐ golden rules + per-ISO-week log + weekly summary slot). Every project on the
  machine sees them automatically.
- Removed the project-level copies installed earlier the same day (duplicate names); `.gitignore`
  entries kept as a guard. `conventions.md`/`SKILL.md`/`design-lessons.md` updated: project notebook
  keeps Thinksmart-specific lessons, generalizable ones get PROMOTED to the global LESSONS.md.
- Owner's philosophy captured in the global skill: solve short-term → extract lessons → compound
  daily for long-term. Weekly review: ask "tuần này học được gì" (reads LESSONS.md current week).

### 2026-07-15 (later 18 — design skills bundled + daily design lessons)
- **Installed 2 design skills INTO the project** (owner: "đi theo dự án"): `.claude/skills/frontend-design/`
  (from anthropics/claude-code plugins, v1.1.0) and `.claude/skills/ui-ux-pro-max/` (copied from user-level).
  Both **gitignored** (licenses: Anthropic all-rights-reserved / none) — reinstall notes in `conventions.md`.
- **New compounding file `references/design-lessons.md`** (owner: "update bài học mỗi ngày"): 10 seeded
  rules + dated lesson log; SKILL.md now mandates using both skills for UI work and appending lessons
  at session end (self-learn step 3).
- NOTE: `4-Clients/` empty today = owner deleted their test drafts with the trash button (confirmed benign).

### 2026-07-15 (later 17 — Roman numeral badges centered)
- **Section badges "I" / "II" centered inside their rounded squares** (owner request) on all 4
  proposal templates. Method worth reusing: measured the real offset in-browser
  (getBoundingClientRect of rect vs text, divided by appState.zoom), then patched the `<text>`
  `translate(x y)` values in the SVG files directly — patched BOTH `public/templates/*.svg` and
  `2-Templates/**/*.svg` (8 files, each replacement matched exactly once). Re-measured: 0.00px
  offset on every badge, all 4 templates.
- NOTE: `4-Clients/` was EMPTY at patch time (owner deleted their test drafts with the new trash
  button) — no drafts needed patching. Drafts created from now on inherit the centered badges.

### 2026-07-15 (later 16 — chart columns edit as one [money | age] row)
- **Each IUL chart column is now ONE combined edit row** (owner request): label
  "Giá trị tích luỹ — Cột N biểu đồ" with two side-by-side inputs — MONEY on the left,
  AGE on the right (replaces the separate "Giá trị tích luỹ Tuổi N" + "Tuổi cột N" fields).
- Implementation: IUL branch pushes `{ isChartCombo, index, money, age }` items;
  `buildChartComboBlock()` in `populateProposalTextsEditor` renders `.dual-input-row`
  (CSS: money flex 1, age flex 0 0 40%). Money input keeps blur $-format; age input keeps
  the "Cash Value at N" EN sync. Both carry data-editor-id → canvas hover/click-to-edit
  still focuses the right input.
- Verified AIG IUL + IUL - NLG: 3 combo rows, money blur "$52,000", age→"Tuổi 65" syncs
  "Cash Value at 65", old EN gone; no console errors. `proposal.js?v=9`, `style.css?v=15`.

### 2026-07-15 (later 15 — "Bảo vệ đến tuổi" locked)
- **"Bảo vệ đến khi nào / 120 tuổi" is LOCKED** (owner decision): it's a fixed product value, removed
  from the editable plan fields (the `coverage` extra is still collected — it stays the box-row Y
  anchor fallback for the totalPremium detection). Canvas "120 tuổi" no longer hover/click-editable.
  Verified on AIG IUL + IUL - NLG. `proposal.js?v=8`.

### 2026-07-15 (later 14 — "Tổng số tiền đóng" mislabeled as chart value)
- **Fixed one-off label shift in IUL Section 2** (user report from the LIVE site): the "Tổng số tiền
  đóng" box value ($36,648, at X≈212 Y≈698) was being captured as the first chart projection because
  the old `totalPremium` finder expected X<100 — so it got labeled "Giá trị tích luỹ Tuổi 63" and every
  cash-value label shifted by one (the real Tuổi-72 value fell off into a generic "Giá trị" field).
- Fix in `proposal.js` IUL branch: pull the box-row value OUT of `chartCandidates` first — it's the
  item whose Y is within 25px of the "20 năm" (period) row — then sort the remainder as chart
  projections. Label is now dynamic too: "Tổng số tiền đóng (" + period text + ")".
- Verified AIG IUL + IUL - NLG: Tổng số tiền đóng=$36,648, Tuổi 63=$49,515, Tuổi 67=$61,945,
  Tuổi 72=$85,078 (matches canvas), no stray "Giá trị" field; editing writes to the right canvas
  element (translate 212,698). `proposal.js?v=7`.

### 2026-07-15 (later 13 — full UI/UX audit via /ui-ux-pro-max)
- Ran a full audit with the ui-ux-pro-max skill checklist (accessibility/touch/contrast/keyboard).
  **Fixed:**
  - Zoom tooltips were SWAPPED (minus said "Phóng to", plus said "Thu nhỏ") → corrected + aria-labels
    on all 3 zoom buttons; aria-label on `#search-input`; `aria-live="polite"` on `#status-left`.
  - Keyboard access: new `makeKeyboardActivatable()` (core.js) — tabindex=0 + role=button +
    Enter/Space→click (with stopPropagation for the nested trash button) applied to tree file items,
    folder headers, brochure items, and draft-delete buttons. Verified Enter opens a file.
  - All editor inputs/selects now carry `aria-label` (proposal client/plan/agent + name card) — 20/20.
  - Contrast: `--text-3` light `#8A90A2`→`#667085` (3.19→4.97:1), dark `#6D7488`→`#8B93A8`
    (3.87→5.87:1) — WCAG AA.
  - Mobile touch targets to 44px standard: `.toolbar-btn` 44, `.icon-btn` 44, tree rows padding 12px,
    trash button padding 10px (negative margin keeps row height).
  - Welcome heading h3→h2 (no more h1→h3 skip).
- **Noted, not fixed** (minor): export buttons not disabled during export; `user-scalable=no` is an
  intentional tradeoff (app has its own pinch zoom).
- GOTCHA (testing): the in-app Browser pane also freezes STYLE RECALC after viewport resize — existing
  elements report stale computed styles; verify with a freshly created element instead.
- Versions: `core.js?v=9`, `proposal.js?v=6`, `brochure.js?v=4`, `namecard.js?v=5`, `style.css?v=14`.

### 2026-07-15 (later 12 — trash icon to delete drafts)
- **Draft items now have a trash icon** (hover on desktop, always visible on mobile). Applies to any
  item in "Bản nháp" (4-Clients files) and browser-saved (localId) proposals — masters never get it.
- New server route `POST /api/svgs/delete` (server.js, after clone): hard-restricted to `.svg` paths
  starting with `4-clients/` + `isPathSafe` (verified: master path → 403, traversal → 400).
- Client (`makeProposalItem`, core.js): confirm dialog ("không thể hoàn tác"), then localStorage
  removal (static) or the delete API (server). If the deleted draft was open →
  `resetCanvasToWelcome()` (new core helper: clears state/canvas, shows welcome, hides save,
  disables exports). Tree refreshes after.
- Verified full cycle: created ZZZ test draft via clone API, trash icon appeared (only on 4 drafts,
  0 masters), UI delete removed it from disk + tree + reset canvas; real drafts untouched; no console
  errors. Server restarted for the new route. `core.js?v=8`, `style.css?v=13`.

### 2026-07-15 (later 11 — "Khách hàng" group renamed to "Bản nháp")
- The proposal sub-group holding client copies (4-Clients / browser-saved) is now labeled **"Bản nháp"**
  (was "Khách hàng") — matches the Lưu Nháp workflow wording. Changed `carrierOf()` return value +
  `CARRIER_ORDER` in core.js. The client-name FIELD label "Khách hàng" in the editor is unchanged.
  `core.js?v=7`.

### 2026-07-15 (later 10 — bilingual nav section titles)
- Nav sections now all bilingual like "Proposal / Báo giá": **"Brochure / Tài liệu"** (label in
  main.js renderFileTree call) and **"Name Card / Danh thiếp"** (namecard.js). The Brochure empty-state
  hint strips the display suffix (`label.split(' / ')[0]`) so it still shows the REAL folder name
  ("Thả file vào folder "Brochure/<Hãng>/""). `brochure.js?v=3`, `namecard.js?v=4`, `main.js?v=5`.

### 2026-07-15 (later 9 — welcome title on one line)
- Welcome card: title "Chào mừng bạn đến với Thinksmart Tool" no longer wraps — card `max-width`
  400→560px + `white-space: nowrap` on the h3; mobile (≤900px) override sets the card to `width: 88vw`
  and lets the title wrap normally. Verified 1 line at 1280px, no overflow at 375px. `style.css?v=12`.

### 2026-07-15 (later 8 — simplified sale workflow)
- **Workflow simplified for new sales** after a role-play UX review with the owner. Owner's canonical
  flow (keep this wording): **Chọn mẫu → Điền → Lưu Nháp → Xuất** — explicit Lưu Nháp matters because
  sales get interrupted by client calls and forget.
- Changes:
  - **Context-aware header** (`updateHeaderActions()`, core.js): master → one primary "Tạo bản cho
    khách" (Save hidden); client copy → "Lưu Nháp" primary + "Tạo bản mới" secondary. Button labels
    live in `<span class="btn-label">` so JS can swap text without touching the svg.
  - **Removed the 2 agent-preset buttons** ("Lưu làm mặc định"/"Điền thông tin đã lưu"). Now automatic:
    `storeAgentPreset()` on every successful save/export; `applyAgentPresetQuiet()` after
    createNewProposal (both server + static branches, skipped for name cards).
  - **Dirty tracking** (`appState.isDirty`, `markDirty`/`clearDirty` in core.js): set in
    `applyTextValue`, `replaceColorInDoc`, name-card edits; cleared on load + successful save. Orange
    dot on Lưu Nháp (`.has-unsaved`), `confirmLeaveUnsaved()` guard on tree/brochure clicks,
    beforeunload warning, and exports auto-save dirty client copies first (exportToJpeg/Pdf now async).
  - Welcome screen shows the 4 steps (`.welcome-steps`, style.css section 21). Master banner + alerts
    reworded to "Tạo bản cho khách".
- Verified end-to-end on localhost (server mode): master state, create-copy flow (real clone in
  4-Clients, then deleted), auto-fill from preset, dot lifecycle, switch-file confirm, no console
  errors. `core.js?v=6`, `proposal.js?v=5`, `brochure.js?v=2`, `namecard.js?v=3`, `main.js?v=4`,
  `style.css?v=11`.

### 2026-07-15 (later 7 — US phone auto-format)
- **Phone fields auto-format while typing**: 10 digits → "(123) 456-7890" the moment the 10th digit
  lands. New `formatPhoneValue()` in `core.js`: strips non-digits, drops a leading "1" on 11-digit
  (+1) input, returns null unless exactly 10 digits, and **leaves numbers starting with 0 untouched**
  (VN format like 0938169130). NOTE: do NOT also exclude leading "1" — the owner's canonical example
  is literally "1234567890 → (123) 456-7890".
- Wired into: proposal agent SĐT inputs (`proposal.js`, only when `isPhone`) and Name Card
  "Số điện thoại"/"Fax / Văn phòng" (`namecard.js` `addNcField`, label-matched `/điện thoại|fax/i`).
  Name-card fallback per-line editor now reuses `addNcField` (dedupe).
- Verified: "1234567890"→"(123) 456-7890", "+1 832 980 4749"→"(832) 980-4749",
  "346.858.4277"→"(346) 858-4277", "0938169130" + short numbers + name fields untouched; canvas
  synced; no console errors. `core.js?v=5`, `proposal.js?v=4`, `namecard.js?v=2`.

### 2026-07-15 (later 6 — editable benefit-plan labels on IUL)
- **New editable fields in Section 2 (IUL only)** (user request): "Thời gian đóng phí" (20 năm),
  "Bảo vệ đến tuổi" (120 tuổi), "Tuổi cột 1/2/3 (biểu đồ)" (Tuổi 63/67/72). Section-2 collection in
  `proposal.js` now also gathers non-$ labels into `planExtras` by pattern (`/^\d+ năm$/`,
  `/^\d+ tuổi$/`, `/^Tuổi \d+$/`, `/^Cash Value at \d+$/`); appended ONLY in the IUL ordering branch
  (Termlife untouched — its "10/20/30 năm" are column headers there, verified no extra fields).
- Editing an age label auto-syncs its paired English subtitle: "Tuổi 63"→"Tuổi 65" also rewrites
  "Cash Value at 63"→"Cash Value at 65" (paired by matching number at build time).
- Money field labels now follow actual chart ages ("Giá trị tích luỹ " + ageLabels[i]) instead of
  hardcoded 63/67/72. Label fields carry `noCurrency: true` → blur $-format skipped ("25 năm" stays).
- Verified AIG IUL + IUL - NLG: 11 plan fields, edits hit canvas, EN sync works, no console errors.
  `proposal.js?v=3`.

### 2026-07-15 (later 5 — mobile UI)
- **Mobile optimization** (≤900px breakpoint, CSS section 20 in `style.css`):
  - Left sidebar → slide-in drawer (hamburger `#btn-mobile-nav` in header); picking a file auto-closes it.
  - Right editor → bottom sheet (66vh, rounded top): opens via pencil `#btn-mobile-editor` (visible only
    when a file is open) or by tapping editable text on canvas; closes via `#btn-editor-close` / backdrop.
  - Body classes drive it: `nav-open` / `editor-open` + `#mobile-backdrop`. Buttons use `.mobile-only`
    (hidden on desktop). Header compact: brand text + file title hidden, action buttons icon-only
    (`font-size: 0` trick keeps the svg).
  - **Touch gestures** in `main.js` `initTouchGestures()`: 1-finger drag = pan, 2-finger pinch = zoom
    around midpoint (reuses `handleZoom`). `.canvas-container { touch-action: none; }` on mobile.
  - Inputs ≥16px on mobile (blocks iOS focus auto-zoom); viewport meta now `user-scalable=no`.
  - Verified at 375×812: drawer/sheet/backdrop flows, tap-text→sheet+focus, synthetic TouchEvent pan
    (+50/+60 exact) and pinch (2× spread → 2× zoom exact); desktop at 1280px unchanged. NOTE: the
    in-app browser pane freezes CSS transitions (rendering throttled) — computed transform stays at the
    START value; inject `*{transition:none!important}` to assert end states when testing there.
  - `style.css?v=10`, `main.js?v=3`.

### 2026-07-15 (later 4 — keep typed ".00" in money fields)
- **"$120.00" no longer collapses to "$120"** (user report). `formatCurrencyValue()` (core.js) only
  kept decimals when the number was fractional; now it also keeps them when the user explicitly
  typed a decimal part (`/\.\d+$/` on the cleaned string). "120" → "$120" unchanged; "120.5" →
  "$120.50"; "1234567.00" → "$1,234,567.00". Verified on the blur auto-format of plan fields
  (AIG IUL, "Phí đóng mỗi tháng") — input + canvas both correct. `core.js?v=3`.

### 2026-07-15 (later 3 — full-text hover/click on canvas)
- **Hover/click-to-edit now covers the WHOLE field text** (user report: only the first 1–2 chars of
  "Male"/"$100,000"/"Standard Non-Tobacco" were hoverable). Cause: `.svg-editable-text` was applied to
  the id-carrying FIRST tspan only. Fix in `tagEditableCanvasElements()` (core.js): tag the parent
  `<text>` block (+ `data-editor-target="<editorId>"`) when it holds ≤1 editable line — hover anywhere
  on the value glows the whole block; fallback tags every same-y tspan for multi-line texts. Click
  handler (main.js) reads `data-editor-target || data-editor-id`.
- Hardened click-to-edit for dropdown fields: `<select>` has no `.select()` → guarded with
  `typeof textarea.select === 'function'`.
- Verified AIG IUL + IUL - NLG: all 15 fields tagged at text level; clicking the LAST piece of
  Male / Standard Non-Tobacco / $100,000 / Vu Nguyen / TONY PHU focuses the right sidebar field.
  `core.js?v=2`, `main.js?v=2`.

### 2026-07-15 (later 2 — agent field overwrite bug)
- **Fixed agent fields overlaying instead of replacing** (user report: typing "anh thay tên" gave
  "anh thay tênONY PHU" on canvas). Cause: the Section-3 (agent) input handler in `js/proposal.js`
  wrote `el.textContent = newValue` directly — that only replaces the FIRST tspan of the line and
  leaves sibling tspans ("ONY PHU", "46) 858-4277") untouched. Fix: use `applyTextValue()` (which
  calls `clearSiblingTspans`) like Sections 1–2 already did. `js/proposal.js?v=2`.
- RULE reinforced: **any write to a proposal line MUST go through `applyTextValue()`** — never set
  `.textContent` directly on a line's first tspan (multi-tspan values will leave tails).
- Verified typing into all 4 agent fields + client name on all 4 templates + Jenny client file:
  canvas line equals exactly the typed value. Name Card fields unaffected (its `getLines().apply`
  already clears same-line parts).

### 2026-07-15 (later — module split)
- **Split monolithic `public/app.js` (2446 lines) into per-tool modules** at the owner's request
  ("tách riêng từng phần"): `public/js/core.js` (shared engine: state, dom, load/save/clone, canvas,
  colors, fonts, export, texts-editor DISPATCHER), `js/proposal.js` (nav section + 3-group editor +
  agent presets + GENDERS/RATE_CLASSES/US_STATES), `js/brochure.js` (library fetch/preview/downloads),
  `js/namecard.js` (nav section + data-nc editor), `js/main.js` (renderFileTree composition +
  initEventListeners + boot). Plain global scripts, NO bundler/modules — load order matters:
  core → proposal → brochure → namecard → main (see index.html).
- New seams: `renderFileTree()` (main.js) calls `renderProposalNavSection` / `renderLibrarySection` /
  `renderNameCardNavSection`; `populateTextsEditor()` (core.js) routes to
  `populateProposalTextsEditor(svgEl, textElements)` or `populateNameCardTextsEditor(svgEl, textElements)`.
- Dropped dead code during the split: `copySvgCode`, `downloadSvgFile`, `copyPngToClipboard`,
  `isStaticText` (buttons removed earlier; nothing called them).
- Per-file cache versions now (`js/core.js?v=1` etc.) — bump only the file(s) you touch.
- Verified on localhost:8000 after split AND after deleting app.js: 3 nav sections, AIG IUL proposal
  15 fields + edit→canvas OK, brochure multi-page preview + download OK, name card 5 data-nc fields +
  edit→canvas OK, zero console errors. `node --check` passed on all 5 files.
- Updated `architecture.md` (module map), `conventions.md` (per-file `?v=` bump, one-global-namespace
  warning), `deployment.md` (poll `js/core.js?v=`), `SKILL.md` accordingly.

### 2026-07-15
- **Fixed bogus duplicate "Tên Agent Assistant" field** (user report, AIG IUL + IUL - NLG): the
  surrender-charge disclaimer paragraph wraps, and its short last line "khi không còn áp dụng."
  (Y≈1177, X≈66, <40 chars) slipped through the agent-zone filters in `populateTextsEditor`.
  Fix: in Section 3, skip any line whose parent `<text>` holds 2+ `[data-editor-id]` lines
  (`isParagraphLine`) — real agent fields are always single-line `<text>` elements.
- **loadSvgContent now strips stale `data-editor-id`** saved into files by older versions before
  re-assigning fresh ids (old files carried ids on the `<text>` wrapper → duplicate rows + id
  collisions). Follow-up: `tagClientInfoElements` got a `reclaimTag()` helper — if a saved
  `id="client-*"` sits on an element without `data-editor-id` (old `<text>`-level tagging, e.g.
  `IUL - NLG.svg`), the id is moved down to the inner tspan that carries the fresh editor id,
  otherwise the client fields disappear (the editor loop only iterates `[data-editor-id]`).
- **Wider phone detection in agent zone**: `isPhone` now also matches all-digit numbers like
  `0938169130` (VN format), not just `(346) 858-4277` — TERMLIFE - NLG labeled phones as "Tên".
- Verified all 4 templates + Jenny client file: 5 client fields, plan values, exactly 4 agent
  fields, edit propagates to canvas. `app.js?v=22`.
- NOTE for owner: **`TERMLIFE - NLG` master (both `2-Templates` and `public/templates`) contains
  saved test data** (client "Trương thị thanh hảo", state "Sài gòn bình thạnh", VN phones) — it was
  overwritten before master-protection existed. Needs a clean re-export/restore of that master.

### 2026-07-14 (later 2)
- **Fixed empty Proposal section on Vercel** (commit `6bda21f`): `2-Templates/` is gitignored so it isn't on
  Vercel; `/api/svgs` now also scans `public/templates/*.svg` (deduped by filename, synthetic
  `folder` so master-detection + carrier grouping work). Keep `public/templates/` + `manifest.json` in
  sync with `2-Templates/`.
- **Fixed proposal client fields (name/gender/rate) not showing** (commit `43eb973`). IMPORTANT ARCHITECTURE
  GOTCHA: `data-editor-id` is assigned to the **FIRST `<tspan>` of each line** (see loadSvgContent ~line 312),
  NOT the `<text>` element. So a value split across several tspans (e.g. "Standard Non-Tobacco" = 8 tspans,
  a person name = 4 tspans) is NOT equal to that first tspan's `.textContent`. Any code that reads/matches a
  field value must use **`getLineTextContent(el)`** (concatenates all tspans on the same line), and any write
  must clear the sibling tspans (`applyTextValue` already calls `clearSiblingTspans`). Fixed
  `tagClientInfoElements` (match via getLineTextContent; match rate/state against `RATE_CLASSES`/`US_STATES`;
  detect the client name by a capitalized-multiword pattern in the client zone instead of a hardcoded string)
  and the field-render read in `populateTextsEditor`. Verified all 4 templates show 5 client fields + editing
  updates the canvas. Debug tip that worked: temporarily add `window.appState = appState;` to inspect
  `activeSvgDoc` from `mcp__Claude_Browser__javascript_tool` (sync evals only — Promise evals hang the pane).

### 2026-07-14 (later)
- **Fixed empty Proposal section on Vercel.** Root cause: `2-Templates/` is gitignored → not deployed →
  `/api/svgs` (Vercel runs server mode) found no proposal masters. Fix in `server.js` `/api/svgs` handler:
  after the workspace scan, also scan `public/templates/*.svg` and add any not already found (dedupe by
  filename), with a synthetic `folder` (`2-Templates/<carrier>` or `Name Card/Chung`) so master-protection +
  carrier grouping still work. Their `path` is `public/templates/<file>` (loads fine via `/api/svgs/content`).
  Also added `public/templates/` to the save-protection prefixes. Commit `6bda21f`. So: **keep the deployed
  proposal copies in `public/templates/` + `manifest.json` in sync with `2-Templates/`** (deploy-vercel.bat
  does the copy) — that's now what the live site serves. Local still uses `2-Templates/` (deduped).

### 2026-07-14
- Created this `thinksmarttool` skill (project knowledge base) under `.claude/skills/thinksmarttool/`.
- Fixed `itemBlock is not defined` crash (missing `const itemBlock` in the agent-fields render). Commit `e1417be`.
- Name Card: removed the "Mẫu gốc" sub-group — masters show directly under the Name Card section.
- Name Card: only 5 tagged fields shown (name/title/phone/fax/email); added `data-nc` tagging + generic fallback.
- Name Card made editable like a proposal (master-protected + "Tạo bản riêng" copy flow); routed via `/api/svgs`.
- Fit-to-viewport zoom fix (`zoomToFit` cap → `MAX_ZOOM`) so small designs open readable, not tiny.
- Brochure: group multi-page image brochures even without a PDF; cleaner preview (dropped filename/type/size).
- Font embedding for JPEG/PDF export. Exports reduced to JPEG + PDF (removed SVG/PNG/copy buttons).
- Established owner workflow: local-first, one commit+push at end of day.

### 2026-07-13 (earlier work, condensed)
- Rebrand to "Thinksmart Tool" across UI + package + server logs.
- Premium SaaS design-system reskin (tokens, Plus Jakarta Sans, light/dark theme toggle).
- Reorganized folders → `1-Design / 2-Templates / 3-Export-PDF / 4-Clients / Brochure / Name Card / _Archive`.
- Left nav restructured into tool sections (Proposal / Brochure / Name Card); clean labels (no folder/ext).
- Right editor panel shows only when a proposal/name-card is open.
- Added Brochure download library (`/api/library`, `/api/download`) + downloaded the real AIG/NLG brochures.

---
## How to update this file (reminder)
At session end (or when told to wrap up / update memory / push): add a dated `### YYYY-MM-DD` block under
**Log** with what changed + why, refresh **Current state** (version numbers, last commit), and edit the
**PENDING** list (add new items, remove finished ones). Push it with the rest of the day's commit.

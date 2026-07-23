# Architecture

## PORTAL (từ 2026-07-19 — Đợt 1)

Web giờ là **trang nội bộ công ty**, tool là mục con. Route (khai báo `PORTAL_PAGES` cuối server.js;
mỗi route tự redirect bản có "/" cuối về không "/" để giữ đường dẫn tương đối):

| Route | File | Ghi chú |
|-------|------|---------|
| `/` | `public/index.html` | Trang chủ portal (hero chào theo buổi + 3 thẻ khu vực: Học/teal · Tool/violet · Forum/amber) |
| `/login` | `public/login.html` | Đăng nhập/Đăng ký (Supabase email+password), màn "chờ admin duyệt" |
| `/videos` | `public/videos.html` + `js/portal/videos.js` | Thư viện video (YouTube unlisted + Drive preview), admin CRUD dán link |
| `/tool` | `public/tool.html` | Editor SVG cũ nguyên vẹn (đổi tên từ index.html; asset tương đối vẫn resolve về gốc) |

- **Auth stack:** `js/portal/config.js` (owner dán Supabase URL + anon key — trống = "chế độ mở",
  không bắt login) → `js/portal/auth.js` (`TSTAuth`: requireLogin/getProfile/initShell/**logUsage**) →
  `supabase/schema.sql` (bảng `profiles` role super_admin|admin|user + status, bảng `videos`,
  **bảng `usage_events`**, RLS, trigger tạo profile, helper `is_admin()`/`is_super_admin()`/`is_approved()`).
  Hướng dẫn: `SETUP-SUPABASE.md`.
- **ĐO LƯỜNG SỬ DỤNG (N1, 23/07/2026):** bảng **`usage_events`** (`user_id, kind ('login'|'open_tool'), at`)
  append-only, RLS **anon key** (INSERT của mình / SELECT chỉ super_admin / KHÔNG update-delete → giữ lịch sử).
  Ghi qua `TSTAuth.logUsage(kind)` (best-effort, nuốt lỗi): `login.html` ghi `'login'` sau đăng nhập;
  `tool.html` ghi `'open_tool'` khi mở /tool (throttle 1 lần/giờ/máy qua localStorage). Đọc/hiển thị ở
  **tab "Đo lường" trong `/members`** (CHỈ super_admin — `initTracking`/`taiDoLuong`/`veDoLuong` trong
  `members.js`): 3 thẻ số hôm nay + biểu đồ 14 ngày (CSS thuần) + bảng theo người. Tổng hợp CLIENT-SIDE.
- **CSS:** `public/portal.css` — token copy từ `style.css` §1 (đổi token sửa CẢ HAI); portal cuộn
  dọc bình thường (khác tool overflow hidden). Version badge ở 4 chỗ: tool sidebar + 3 footer.
- Forum = Đợt 2 (nav có chip "Sắp có").

## Folder structure (repo root: `E:\2026\Thinksmart\Sale\Proposal2026` — trước 16/07/2026 ổ này tên `G:`)

| Path | What it is | In git? |
|------|-----------|---------|
| `public/` | The web app served by Express — `index.html`, `js/` (per-tool modules), `style.css`, `fonts/`, `templates/` | yes |
| `public/js/` | **One JS file per tool** (since 2026-07-15; replaced monolithic `app.js`): `core.js` (shared), `proposal.js`, `brochure.js`, `namecard.js`, `sosanh.js`, `main.js` (bootstrap). Thêm `ui-dialog.js` (hộp thoại dùng chung Tool+Portal). Load order trong **`tool.html`** (KHÔNG phải index.html — index.html giờ là trang chủ portal): ui-dialog → core → tools → main | yes |
| `public/templates/` | SVGs + `manifest.json` served in **static mode** (Vercel fallback). Copies of the master templates + name card | yes |
| `public/fonts/` | SF Pro woff files used by the SVGs and embedded on export | yes |
| `server.js` | Express server + all API routes | yes |
| `1-Design/` | Illustrator sources (`.ai`, ~40MB each). `~ai*.tmp` = Illustrator temp junk (gitignored) | yes (heavy) |
| `2-Templates/` | Master SVG templates, by carrier: `AIG/`, `NLG/` | **gitignored** |
| `3-Export-PDF/` | PDF chủ tool xuất ra. ⚠️ **CHƯA gitignore** nên file mới hiện lên mỗi lần commit — cân nhắc ignore (file gửi khách không nên nằm trên repo public) | yes |
| `4-Clients/` | Per-client saved proposals — **CUSTOMER DATA, gitignored, never push** | **gitignored** |
| `Brochure/` | Downloadable brochures by carrier (`AIG/`, `NLG/`). JPGs are tracked so they deploy | JPGs tracked |
| `Name Card/` | Name card master SVG(s), e.g. `Chung/Sale Name Card.svg` | tracked (was added) |
| `Bang so sanh quyen loi cac hang/` | 16 logo PNG + `Compare.html` (nguồn dữ liệu Living Benefits). Chủ tool chốt push lên git 21/07. Ở gốc repo, KHÔNG trong `public/` → không bị serve ra domain | yes |
| `_Archive/` | Old/junk files | **gitignored** |
| `deploy-vercel.bat` | Copies masters → `public/templates`, then git add/commit/push | yes |
| `start-local.bat` | Local launcher | yes |

`.gitignore` ignores: `node_modules/`, `2-Templates/`, `4-Clients/`, `_Archive/`, `Brochure/` (but JPGs
were force/committed earlier so they deploy), `Name Card/` (master is tracked despite this), `*.tmp`,
`~ai*.tmp`, `.env*`, `push-to-github.bat`.

## Two run modes (core.js auto-detects)

- **Server mode** (local `node server.js` AND on Vercel — Vercel runs `server.js` as a serverless
  function). `/api/svgs`, `/api/library`, `/api/download` all work. This is the normal experience.
- **Static mode** (only if `/api/svgs` fails). Falls back to `public/templates/manifest.json`; proposals
  save to browser `localStorage`; brochure/name-card library is empty. Rarely hit now that Vercel runs
  the server.

## server.js API

| Route | Purpose |
|-------|---------|
| `GET /api/svgs` | Recursively lists editable SVGs (skips `node_modules,.git,.gemini,public,_Archive,Brochure`). Name Card SVGs ARE included (editable). Each: `{name,path,category,folder,size,mtime}` |
| `GET /api/svgs/content?path=` | Returns one SVG's text (path must end `.svg`, inside workspace) |
| `POST /api/svgs/save` | Save SVG. **Blocks overwriting** paths under `2-templates/` or `name card/` (masters protected) |
| `GET /api/library` | Quét các folder trong `LIBRARY_SECTIONS` (server.js): `brochure` → `Brochure/`, `soSanh` → `Bang so sanh quyen loi cac hang/`. Thêm mục thư viện mới = thêm 1 dòng vào đây; `/api/download` tự whitelist theo đó. **Đổi server.js phải RESTART server.** Trả `{carrier: [{name,path,size,ext,mtime}]}`; đuôi cho tải: pdf/png/jpg/jpeg/gif/webp/svg/ai/eps/zip |
| `POST /api/svgs/clone` | Clone a template → `4-Clients/<name> - <base>.svg` (the "Tạo bản cho khách" / create-my-own flow) |
| `POST /api/svgs/delete` | Delete a draft. HARD-RESTRICTED: only `.svg` files whose path starts with `4-Clients/` (masters can never be deleted) |
| `GET /api/download?path=&inline=` | Streams a Brochure file (attachment, or `inline=1` for preview). Restricted to library folders |
| `POST /api/admin/create-user` | **(23/07) Admin only.** Tạo tài khoản Supabase (role=user, phòng ban=Sale, status=active, mật khẩu `body.password` hoặc mặc định `Drt$2022`). Trả `{email, password}` |
| `POST /api/admin/reset-password` | **(23/07) Admin only.** Đổi mật khẩu 1 user (`body.userId`, `body.password` tuỳ ý, tối thiểu 6, mặc định `Drt$2022`). Trả `{password}` |

**🔑 ADMIN API (23/07/2026) — service_role, server-side.** 2 route trên dùng khoá `service_role` (BỎ QUA
RLS) đọc từ **env** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`): local file `.env` (gitignore), live
Vercel Production env. Chưa set → `supabaseAdmin=null` → route trả **503** (phần còn lại của tool vẫn chạy).
Middleware **`requireAdmin`**: lấy `Authorization: Bearer <access_token>` → `supabaseAdmin.auth.getUser(token)`
→ tra `profiles` → chỉ `admin`/`super_admin` + active mới qua (chủ tool 23/07: admin làm được đầy đủ, kể cả
đổi pass super_admin). Client gọi kèm token: `(await TSTAuth.getSession()).access_token`.
⚠️ TUYỆT ĐỐI không nhúng service_role vào client (config.js chỉ có anon key công khai). Deps: `@supabase/supabase-js`, `dotenv`.
⚠️ **Đổi server.js phải RESTART server** (`taskkill //PID <pid> //F` cho PID nghe cổng 8000 rồi chạy lại).

## Frontend modules (`public/js/`, vanilla JS, plain globals — no bundler)

All functions are global; scripts share one namespace and load in order: ui-dialog → core → proposal →
brochure → namecard → sosanh → main.

**Thêm một công cụ mới** (4 bước, đã làm đúng quy trình này với `sosanh.js` ngày 21/07):
1. File mới `public/js/<tool>.js` với hàm `render<Tool>NavSection(container, q)` của riêng nó.
2. Gọi hàm đó trong `renderFileTree()` (`main.js`) và cộng vào biến `total`.
3. Thêm `<script src="js/<tool>.js?v=1">` vào **`tool.html`** (KHÔNG phải index.html) — sau `core.js`.
4. Cần icon nav thì thêm khoá vào `NAV_ICONS` (`core.js`); cần đọc file trong một folder thì thêm
   dòng vào `LIBRARY_SECTIONS` (`server.js`) rồi **restart server**.

⚠️ **PENDING -3 nhắc trước:** các công cụ sắp tới (Tính tuổi bảo hiểm, Run quotes) **KHÔNG mở file
SVG** nên khung 3 cột (cây file · canvas · editor) không hợp. `sosanh.js` đã đi đường vòng: vẽ HTML
thẳng vào `#library-view` (không dùng canvas SVG, không hiện panel editor) — dùng lại cách đó, hoặc
tính layout riêng. ĐỪNG hardcode giả định "mọi mục trong Công cụ đều là file SVG".

> ### ⚠️ HAI CÂY DOM — bẫy đắt nhất của tool này
> Một bản vẽ đang mở tồn tại **hai bản song song**:
> 1. `appState.activeSvgDoc` — bản **dữ liệu**, do `DOMParser` dựng. Đây là bản đem đi **lưu và xuất
>    JPEG/PDF gửi khách**.
> 2. `dom.canvasWrapper.querySelector('svg')` — bản **clone** (`cloneNode(true)` trong
>    `renderSvgOnCanvas`), chỉ để **hiển thị**.
>
> `applyTextValue(el, editorId, newValue)` ghi vào cả hai (dò bản clone qua `[data-editor-id]`).
> **Mọi đoạn code sửa SVG mà KHÔNG đi qua `applyTextValue` đều phải tự ghi cả hai** — quên bản clone
> thì gõ mà canvas đứng im; quên bản dữ liệu thì canvas đúng nhưng file gửi khách sai (nguy hiểm hơn
> nhiều vì không ai thấy). Đã dính lỗi này 21/07 với ô "Thời gian nhận dòng tiền"; mẫu xử lý đúng:
> `ghiCumDongTien()` và `xepLaiHauTo()` trong `proposal.js`.

**core.js** (shared engine):
- `appState`, `dom` cache, `isMasterFile()`, `isNameCardFile()`, text helpers (`applyTextValue`,
  `getLineTextContent`, `clearSiblingTspans`, `formatCurrencyValue`), `escapeHtml`, `formatBytes`.
- `boQuenKerning(el)` / `chuanHoaKerningDongDaGop(svgEl)` — gỡ `letter-spacing` thừa mà Illustrator
  gắn cho từng mảnh tspan; bắt buộc sau mỗi lần dồn cả dòng vào một mảnh (xem changelog 21/07).
- `fetchSvgsList()` → `/api/svgs` (server) or `fetchStaticList()` (manifest + localStorage proposals).
- `loadSvgContent(fileInfo)` — fetch + parse SVG, strip stale `data-editor-id`s, assign fresh ones per
  LINE (first tspan of each y-group), render, show right editor (`setEditorVisible`).
- `saveSvgToServer()`, `createNewProposal()` (shared clone flow: proposal copies AND name-card copies).
- Nav building blocks: `NAV_ICONS`, `carrierOf/carrierSort`, `makeCollapsibleFolder`, `makeProposalItem`.
- Canvas: `renderSvgOnCanvas`, `zoomToFit` (cap `MAX_ZOOM`), `handleZoom`, `applyTransform`.
- `populateTextsEditor()` — **dispatcher**: shared shell (clear panel, master warning, collect
  `[data-editor-id]`), then routes to `populateNameCardTextsEditor` or `populateProposalTextsEditor`.
- Colors panel, inspector, `optimizeSvgTexts`, font embedding (`getEmbeddedFontCSS`),
  `renderSvgToCanvas` (async, 2x + base64 @font-face), `exportToJpeg`/`exportToPdf`, `updateStatus`.

**proposal.js** (Proposal / Báo giá):
- `GENDERS`/`RATE_CLASSES`/`US_STATES` dropdown data.
- `renderProposalNavSection(container, proposals, q)` — carrier-grouped nav section.
- `populateProposalTextsEditor(svgEl, textElements)` — 3 groups (client Y<450 / plan $-values
  450≤Y<1100 / agent Y≥1100) with all the position+content heuristics, `tagClientInfoElements`
  (+`reclaimTag`), paragraph-line + phone detection.
- Agent preset: `collectAgentFields`, `saveAgentPreset`, `applyAgentPreset` (localStorage).

**sosanh.js** (So sánh quyền lợi các hãng — thêm 21/07/2026):
- `SS_DATA` — 16 hãng × 4 nhóm Living Benefits (Terminal/Chronic/Critical Illness, Critical Injury),
  mỗi ô `{s:'ok'|'no'|'wr', d:'chi tiết'}`. Nguồn: `Bang so sanh quyen loi cac hang/Compare.html`
  do chủ tool đưa. ⚠️ Chữ này đội sale ĐỌC CHO KHÁCH — sửa phải có nguồn từ chủ tool, đừng tự
  "chuẩn hoá" con số/điều khoản.
- `renderCompareNavSection()` — mục nav "So sánh quyền lợi / Compare" (gọi từ `renderFileTree`).
- `openCompareTable()` — vẽ bảng vào `#library-view`, dùng chung vòng đời với brochure preview
  (`hideLibraryPreview()` tự dọn khi mở file khác). Mỗi hãng = một THẺ BO TRÒN; CSS ở mục 22b
  `style.css`. Logo 16 PNG cùng folder, tải qua `/api/download`.
- Folder `Bang so sanh quyen loi cac hang/` **ĐÃ commit vào repo** (khác `Brochure/` bị gitignore)
  → mục này chạy cả trên Vercel. Nằm ở gốc repo, KHÔNG trong `public/` nên không bị serve ra domain.

**brochure.js** (Brochure library):
- `fetchLibrary()` → `/api/library`; `preprocessLibraryItems()` (≥2 same-base JPGs → one multi-page item).
- `renderLibrarySection()`, `makeDownloadItem()`, `openLibraryGroup/Item()`,
  `showLibraryPreview/MultiPagePreview/GroupPreview()`, `hideLibraryPreview()`.

**namecard.js** (Name Card):
- `renderNameCardNavSection(container, nameCards, q)` — masters direct + "Của tôi" copies.
- `populateNameCardTextsEditor(svgEl, textElements)` — `data-nc` tagged → exactly 5 fields;
  else generic per-line classifier (`classifyLine`/`getLines`).

**main.js** (bootstrap):
- `renderFileTree()` — composes the 3 tool nav sections + file count.
- `showErrorState()`, `initEventListeners()` (zoom/pan/keyboard/save/export/new-proposal wiring),
  `DOMContentLoaded` init.

See `references/tools.md` for tool-level behavior and `references/conventions.md` for how to change things safely.

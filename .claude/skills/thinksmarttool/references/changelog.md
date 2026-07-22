# Changelog & current state

**This is the freshest source of truth.** Read it first every session; update it last every session.
Newest entries on top. Keep it concrete (versions, files, commands).

## ⚠️ BA NHÁNH (cập nhật 2026-07-21) — ĐỌC TRƯỚC KHI ĐỘNG VÀO GIT

| | `main` | `feat/login` | `feat/mainV1.1` |
|---|---|---|---|
| Vai trò | **BẢN LIVE cho đội sale** | Portal (đã gộp vào V1.1) | **NHÁNH ĐANG LÀM** = main + portal |
| Ở đâu | Đã push, Vercel auto-deploy | Đã push GitHub 20/07 | **LOCAL — CHƯA PUSH** |
| Version | v1.11 · `proposal.js?v=11` | v1.12 | **v1.13** (xem "Version hiện tại" bên dưới) |
| `config.js` | Khoá Supabase **TRỐNG** → chế độ mở | CÓ khoá thật | **CÓ khoá thật** → bắt đăng nhập |
| Nội dung | Chỉ Tool. `/`,`/login`,`/videos` → **302 về `/tool`** | Portal | Portal + Tool, **đã GỠ redirect** |

**✅ 21/07/2026 — CHỦ TOOL CHỐT: merge lên `main` và cho LIVE, chấp nhận bắt đăng nhập.**
Cảnh báo bên dưới giữ lại để hiểu bối cảnh, nhưng quyết định đã thay đổi.

~~🚨 TUYỆT ĐỐI KHÔNG merge `feat/login` vào `main` khi chưa duyệt xong tài khoản cho đội sale.~~
Lý do: `config.js` trên feat/login có khoá Supabase → live sẽ bắt đăng nhập, cả đội sale bị chặn
khỏi Tool ngay lập tức (họ chưa có tài khoản; ai đăng ký cũng kẹt ở "chờ admin duyệt").
Muốn đưa lên live phải: (1) duyệt sẵn tài khoản cho toàn đội, HOẶC (2) tạm để `config.js` trống.

Khi cần sửa cho bản live: `git checkout main` → sửa → push (đừng mang theo thay đổi của feat/login).
Redirect tạm ở `server.js` (main) dùng **302 chứ không 301** — 301 bị trình duyệt cache cứng, sau này
portal xong muốn trả lại trang chủ sẽ rất cực để gỡ.

## Version hiện tại (2026-07-21 cuối ngày — ĐÃ PUSH cả `main` lẫn `feat/mainV1.1`)

Hai nhánh **cùng ở commit `c91d04b`**, cây làm việc sạch. `main` = bản LIVE
(tool.thinksmartinsurance.com), đang **BẮT ĐĂNG NHẬP** (config.js có khoá Supabase thật —
chủ tool chốt 21/07, xem ghi chú ở đầu file).

Badge UI **v1.17** (5 chỗ — `grep -rn "version-badge" public/*.html`). Cache-version của asset:

| File | Version | File | Version |
|---|---|---|---|
| `style.css` | `?v=57` | `portal.css` | `?v=32` |
| `dialog.css` | `?v=3` | `js/ui-dialog.js` | `?v=2` |
| `js/core.js` | `?v=24` | `js/proposal.js` | `?v=21` |
| `js/brochure.js` | `?v=9` | `js/sosanh.js` | `?v=2` |
| `js/main.js` | `?v=6` | `js/namecard.js` | `?v=5` |
| `js/animations.js` | `?v=4` | `js/portal/auth.js` | `?v=3` |
| `js/portal/config.js` | `?v=8` | `js/portal/members.js` | `?v=10` |
| `js/portal/videos.js` | `?v=2` | | |

**Quy tắc bump (đã dính lỗi vì quên):** sửa file nào bump `?v=` file đó — **kể cả khi chỉ
sửa TẠM rồi hoàn lại** (đục `config.js` để test xong khôi phục vẫn phải bump, không thì
trình duyệt chủ tool giữ bản tạm trong cache). Cùng một file mà mỗi trang HTML khai một số
version khác nhau là bug thầm lặng — dò bằng script quét cả 5 file HTML, đừng sửa tay từng trang.

**⚠️ HAI FILE CSS LÀ BẢN SAO CỦA NHAU** — `portal.css` (portal) và `style.css` (Tool) chép tay lẫn
nhau phần rail, nút, token. **Đây là nguồn lỗi lặp đi lặp lại** (logo rail sai 2 lần, nút lệch cỡ
giữa 2 trang). Sửa bất kỳ thứ gì thuộc rail / hệ nút / token → PHẢI sửa CẢ HAI. Gộp phần dùng chung
ra một file là việc đáng làm khi có thời gian (xem PENDING I).

## Current state (as of 2026-07-17)
- **Frontend is modular**: `public/app.js` is GONE, replaced by `public/js/`
  (`core.js` / `proposal.js` / `brochure.js` / `namecard.js` / `main.js`); versions: `core.js?v=12`,
  `proposal.js?v=10`, `main.js?v=5`, `brochure.js?v=4`, `namecard.js?v=5`, `style.css?v=20`, `core.js?v=14`. UI hiển thị **v1.02** ở chân sidebar trái
  (`sidebar-version-footer` trong index.html — cập nhật tay khi deploy).
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
- Live at **`tool.thinksmartinsurance.com`** (custom domain, verified 2026-07-17) + `thinksmarttool-gy6f.vercel.app`.
- All 3 tools working: Proposal (AIG/NLG + Bản nháp), Brochure (multi-page grouping, minimal preview),
  Name Card (5 tagged fields, editable, fit-to-viewport zoom, master-protected + copy flow).
- Font embedding on export is live. Design system + light/dark theme live.

## PENDING / open tasks

> **BẮT ĐẦU PHIÊN MỚI ĐỌC 4 DÒNG NÀY:** hai nhánh `main` và `feat/mainV1.1` cùng ở `c91d04b`,
> cây làm việc sạch, đã push. Live `tool.thinksmartinsurance.com` **BẮT ĐĂNG NHẬP** (chủ tool
> chốt 21/07) — ai chưa có tài khoản đã duyệt là không vào được. Việc nên hỏi ngay: **A1** và **A2**.
> Muốn kiểm chứng trên máy: tạm để trống `config.js` → test → khôi phục → **bump `config.js?v=`**
> (quên bump là chủ tool dính bản trống trong cache, đã xảy ra rồi).

**Việc gấp — mở đầu phiên nên hỏi chủ tool:**
- **A1. Bảng So sánh: 16 PNG trong folder chỉ là LOGO hãng**, không phải nội dung so sánh. Bảng vẫn
  DÙNG ĐƯỢC vì dữ liệu 16 hãng × 4 quyền lợi đã lấy đủ từ `Compare.html`; logo chỉ là ảnh minh hoạ
  trong mỗi thẻ. Nếu chủ tool muốn nhúng thêm bảng so sánh dạng ảnh/PDF → thả vào folder, giữ kiểu
  tên `NN_Ten_Hang.png`.
- **A2. Đội sale có vào được live không?** Chủ tool nói KHÔNG cần tài khoản admin1/admin2 nữa, nhưng
  CHƯA xác nhận cả đội đã đăng ký + được duyệt. Nếu bị chặn: để trống `config.js` + bump version +
  push là mở lại trong ~1 phút.
- **A3. `3-Export-PDF/` chưa gitignore** → PDF chủ tool xuất ra hiện lên mỗi lần commit. Hỏi có ignore
  không (file gửi khách không nên nằm trên repo công khai).

-3. **CÔNG CỤ SẮP THÊM (chủ tool báo 21/07/2026)** — mục "Công cụ" sẽ KHÔNG chỉ có
   Proposal/Brochure/Name Card nữa:
   - **Tính tuổi bảo hiểm** cho khách (insurance age — nhiều hãng tính theo ngày sinh
     gần nhất, không phải tuổi thật; hỏi rõ quy tắc từng hãng trước khi code).
   - **Run quotes** (báo giá nhanh nhiều hãng).
   Hệ quả cần nhớ khi thiết kế: 2 công cụ này **không mở file SVG** như 3 mục hiện có,
   nên khung 3 cột (cây file · canvas · editor) không hợp. Nhiều khả năng cần layout
   riêng cho từng công cụ trong cùng `tool.html`, hoặc route riêng. ĐỪNG hardcode
   giả định "mọi mục trong Công cụ đều là file SVG" khi sửa `renderFileTree`.

**Mở từ 2026-07-20 (cập nhật 21/07 sau khi merge thành `feat/mainV1.1`):**
- **Z. BADGE NỀN NHẠT KHÔNG ĐẠT AA TRÊN TOÀN APP** (phát hiện 21/07 khi làm bảng So sánh):
  cặp `--success`/`--success-soft` = 2.97 và `--warning`/`--warning-soft` = 3.24 ở theme sáng.
  Badge trạng thái + quyền ở trang Thành viên (`.badge.st-active`, `.role-admin`…) dùng cùng
  mẫu này. Đã vá RIÊNG cho `.ss-*`; cần rà và vá chung (đo bằng luminance CÓ trộn alpha nền).
- **A. Danh sách xếp hạng Allianz đang là TẠM** — owner sẽ gửi bản chính thức sau. Sửa ở
  `RATE_CLASSES_BY_CARRIER.Allianz` trong `public/js/proposal.js` (nhớ bump `proposal.js?v=`).
- **B. ~~`feat/login` chưa push~~ XONG 21/07**: đã push `feat/login` (v1.12) rồi merge `--no-ff`
  vào nhánh mới **`feat/mainV1.1`** (v1.13). Nhánh này CHƯA push, CHƯA deploy — `main` vẫn
  nguyên và live vẫn chỉ phục vụ Tool. Khi merge đã **GỠ khối redirect `/`,`/login`,`/videos`
  → `/tool`** trong `server.js` (nếu cần giấu portal lần nữa thì đặt lại TRƯỚC `express.static`).
- **B2. E2E luồng tài khoản VẪN CHƯA CHẠY** — cần tài khoản thật: đăng ký → chờ duyệt → duyệt →
  đăng nhập → xem video → **tạm khoá lúc người đó đang mở web rồi chuyển trang** (ca vừa vá
  21/07) → nhân viên vào `/members` phải bị từ chối.
- **C. ~~Danh sách phòng ban cố định~~ XONG 21/07** — chủ tool chốt **Sale · MKT · CS · Admin**
  (mảng `PHONG_BAN` đầu `members.js` — thêm/bớt sửa đúng chỗ đó). `window.prompt` đã thay bằng
  hộp thoại chọn trong trang, dùng chung cho sửa 1 người lẫn đổi hàng loạt.
- **D. Video học "mồ côi"** — `videos.html` tự hiện mục của nó nhưng sidebar trang chủ/members/tool
  KHÔNG có link `/videos` → không có đường vào. Quyết: mở lại mục Video học trong nav, hay bỏ hẳn?
- **E. Ô tìm kiếm mẫu trong Tool đã bị xoá** khỏi `tool.html` (bản update của owner) → không tìm mẫu
  theo tên được nữa; `main.js` còn handler chết trỏ tới `#search-input`. Khôi phục hay bỏ hẳn?
- **F. JS chết trong core.js/main.js** — handler cho UI đã gỡ từ lâu (`#text-search-input`, meta
  inspector, tab màu, preset nền). Null-guard nên không lỗi, chỉ là code không bao giờ chạy.
- **G. 2 tài khoản test trong DB** (`mkt@gmail.com`, `test1@gmail.com`) — dọn khi không cần nữa.
- **H. Nhân viên thường không tự sửa được tên/phòng ban** — policy UPDATE trên `profiles` đòi
  `is_admin()`. Muốn cho phép: thêm policy update `id = auth.uid()` (trigger `enforce_member_update`
  đã cấm đổi role/status nên vẫn an toàn). Chờ owner quyết.
- **I. GỘP 2 FILE CSS** — `portal.css` và `style.css` đang chép tay lẫn nhau (rail, hệ nút, token).
  Đã gây lỗi lặp: logo rail sai 2 lần (sửa file này quên file kia), nút lệch cỡ giữa 2 trang.
  Nên tách phần dùng chung ra `shared.css` rồi cả hai cùng nạp. Việc trung bình, đáng làm sớm.
- **J. Logo Name Card — ĐỠ 21/07, chưa xong hẳn.** Đã thay bitmap 472×179 bằng
  `Logo Thinksmart White.png` 2370×896 (nét gấp 5, hết nhoè khi xuất 2x). Khung vẽ vẫn giữ
  `width="472" height="179"` nên không xê dịch gì. **Vẫn là raster** — muốn sắc nét vô hạn thì
  cần file gốc vector (.ai/.svg) từ chủ tool.
- **K. Portal vẫn dùng `confirm()`/`alert()` mặc định trình duyệt** cho các bước xác nhận
  (`members.js`). Tool đã có hộp thoại riêng theo design system từ 17/07 (`showAppDialog` trong
  core.js) — nên làm tương tự cho portal để đồng bộ.
- **L. Mẫu Allianz: nhánh `isAllianz` mới phủ Section 2.** Các phần khác của mẫu (Tính năng khoá lãi
  suất, Phí chấm dứt hợp đồng sớm) chưa có ô chỉnh sửa riêng. Chờ chủ tool xác nhận có cần không.

-1. ~~Verify save/clone/delete on the LIVE site~~ **RESOLVED 2026-07-17 (v1.02)**: live site giờ chạy
   **draftsMode 'browser'** — nháp lưu localStorage máy sale (xem log). Server ghi file chỉ còn cho local.
0. ~~`TERMLIFE - NLG` master polluted with test data~~ **RESOLVED 2026-07-17** — toàn bộ 5 master
   đã chuẩn hoá placeholder (xem log "placeholder chuẩn cho mẫu gốc"), không cần bản restore nữa.
1. **Name Card icons are low-res raster** → look rough / "mất góc" when zoomed/exported. Confirmed a
   source-asset issue, not a tool bug. Awaiting the owner's choice: re-export from Illustrator with vector
   icons (preferred) OR replace icons with vectors in code. See `tools.md` → "Known limitation".
2. ~~SF Pro italics + Bodoni Moda not truly bundled~~ **FIXED 2026-07-17** — all 11 fonts are now
   real files (see log). Rebuild script: `build-fonts.py` (repo root; fontTools subset from
   `C:\Windows\Fonts` OTFs).
2b. ~~Custom domain chờ DNS~~ **LIVE 2026-07-17**: `tool.thinksmartinsurance.com` verified & serving
   (CNAME `tool` → 538e043f27a6d167.vercel-dns-017.com + TXT `_vercel` vc-domain-verify; TXT có thể
   xoá sau khi verify nhưng GIỮ LẠI thì an toàn cho lần re-verify). Gỡ bằng saga: record từng bị gõ
   thiếu chữ ('_verce'), rồi nhiều lần edit không bấm 'Save All Records' (zone editor dạng staged —
   check bằng SOA serial: không nhảy = chưa lưu thật).

3. **Two Vercel URLs** (gy6f vs editor-proposesalsale) — consider consolidating/removing one in the dashboard.
5. ~~Audit design 2026-07-17 — 4 lỗi nhỏ~~ **FIXED cùng ngày** (xem log "tối ưu mobile"); riêng
   phát hiện "tên file hiện đuôi" là FALSE POSITIVE — text hiển thị đã sạch, đuôi chỉ nằm trong
   tooltip `title` (giữ nguyên, hữu ích).
4. Future tools the owner may add (platform vision): more sales tools beyond proposals (video, training docs,
   FB post templates, client management…). Keep the structure modular.

## Log

> **Ghi chú merge 21/07/2026:** `main` và `feat/login` chạy song song ngày 20/07 nên có HAI mục
> cùng ngày — mục của `main` là việc trên bản live (redirect + xếp hạng sức khoẻ), mục của
> `feat/login` là việc trên portal. Giữ cả hai, đừng gộp.

### 2026-07-21 (later 16 — bảng So sánh dựng lại theo ngôn ngữ thẻ bo tròn, v1.17)

Chủ tool: *"Creative hơn — anh muốn nó là một dạng bảng có góc bo tròn như thiết kế của
mình vậy đó"*. Bản later 15 là bảng kẻ ô dính liền → nhìn generic, lạc với phần còn lại
của tool (chỗ nào cũng là thẻ bo tròn).

**Cách dựng lại:** bỏ khung bảng liền khối. Mỗi hãng = MỘT THẺ BO TRÒN riêng
(`--r-lg` 14px), cách nhau 9px; hàng tiêu đề cũng là một thẻ bo tròn dính đầu khi cuộn.
Thêm: dải màu 4px bên trái mỗi thẻ mã hoá mức độ bao phủ (4/4 xanh, 3 tím brand, 1–2
vàng, 0 xám) — cùng dữ liệu với thanh x/4, chỉ là mã hoá thị giác; hover nâng thẻ lên
(`translateY(-1px)` + shadow-md); mở ra thì viền brand + chi tiết bung NGAY TRONG thẻ
(giữ ẩn dụ thẻ); mũi tên thành nút tròn xoay 90°. Toàn token, không hardcode màu.

**⚠️ CĂN CỘT KHÔNG DÙNG SUBGRID ĐƯỢC** (thẻ có bo góc + padding riêng — đúng cái đánh
đổi ghi ở bài học subgrid). Giải: khai báo `--ss-cols` MỘT chỗ trên `.ss-wrap`, header
và mọi hàng cùng đọc; bắt buộc `min-width:0` trên mọi ô để nội dung không đẩy phình cột.
Đo lại: header và cả 16 hàng ra ĐÚNG một bộ toạ độ (431|278, 709|132, 842|132, 974|132,
1106|132) — không lệch 1px nào.

**🔴 PHÁT HIỆN LỚN — BADGE NỀN NHẠT KHÔNG ĐẠT AA, CẢ HAI THEME.**
Đo thật (luminance + TRỘN alpha của nền) cặp token mặc định:

| Badge | Sáng (trước) | Tối (trước) | Sau khi vá |
|---|---|---|---|
| Có — `--success` / `--success-soft` | **2.97** ✗ | 4.60 ✓ | 4.90 / 4.60 |
| Không — `--text-3` / `--surface-3` | **4.45** ✗ | 5.09 ✓ | 5.81 / 5.09 |
| Chưa rõ — `--warning` / `--warning-soft` | **3.24** ✗ | **4.12** ✗ | 5.04 / 6.89 |

Vá bằng màu chữ riêng cho badge (`#0F7A38` xanh đậm, `--text-2`, `#96590A` amber đậm;
theme tối giữ token + `#E9A23B`). **KHÔNG sửa token toàn cục** vì `--success`/`--warning`
còn dùng chỗ khác đã kiểm. Đã đo lại toàn bộ 8 cặp chữ/nền ở CẢ HAI theme → thấp nhất
4.56, không còn chỗ nào dưới 4.5.
➡️ **Đây là vấn đề CHUNG của mẫu "badge nền nhạt" trong app** (badge trạng thái/quyền ở
trang Thành viên dùng cùng cặp token) — thêm vào PENDING, cần rà riêng.

**⚠️ HAI LẦN SUÝT SỬA NHẦM — cả hai đều do CÔNG CỤ ĐO, không phải code:**
1. Sau khi bấm mở hàng, `getComputedStyle` trả về giá trị CŨ (viền/nền/transform không
   đổi) dù rule khớp và không có gì đè. Đúng bài học 13: pane trình duyệt đơ style-recalc.
   **Tải lại trang rồi đo mới ra đúng.** Suýt đi "sửa" đoạn CSS vốn đã chạy đúng.
2. Hàm đo tương phản tự viết trả `null`/`1` vô lý: (a) quên trộn alpha nền badge →
   ra tỉ lệ 1; (b) truyền chuỗi màu vào tham số cần object → NaN → JSON hoá thành null.
   **Số đo bất thường thì nghi công cụ đo trước.**

Kiểm chứng: 16 thẻ, cột thẳng tuyệt đối, mở/đóng + mở rộng/thu gọn tất cả chạy,
`<button>` Tab được + `aria-expanded` đổi đúng, mobile bỏ header và mỗi ô tự hiện nhãn
quyền lợi (không tràn ngang), 16/16 logo. `style.css?v=57`, `sosanh.js?v=2`,
`config.js?v=8`, badge **v1.17**.

### 2026-07-21 (later 15 — bảng So sánh Living Benefits hoàn chỉnh, v1.16)

Chủ tool đưa `Bang so sanh quyen loi cac hang/Compare.html` (dữ liệu 16 hãng × 4 quyền
lợi + chi tiết + lưu ý pháp lý) với chỉ đạo: **chỉ lấy THÔNG TIN, không lấy style; thiết
kế theo design system của mình; dạng bảng 5 cột** (1 hãng + 4 quyền lợi).

- **Module mới `public/js/sosanh.js`** (một file một công cụ, đúng convention): dữ liệu
  `SS_DATA` chép NGUYÊN VĂN từ Compare.html (⚠️ chữ đội sale đọc cho khách — đừng tự
  "chuẩn hoá" con số/điều khoản), nav section + `openCompareTable()` vẽ bảng vào
  `#library-view` → dùng chung vòng đời với brochure (hideLibraryPreview tự dọn).
- Nav gọn lại: MỘT mục "Living Benefits — 16 hãng" (bỏ 16 mục logo của later 14;
  hàm cũ trong brochure.js đã gỡ, để lại comment trỏ sang sosanh.js).
- Bảng: 5 cột đúng yêu cầu, hàng = <button> mở 4 thẻ chi tiết; logo hãng (16 PNG cùng
  folder, qua /api/download) nằm trong chip nền TRẮNG cố ý (nhiều logo nền đặc);
  thanh mức độ x/4; badge Có/Không/Chưa rõ dùng token success/danger/warning;
  chú thích + 2 đoạn lưu ý pháp lý giữ nguyên văn. CSS mục 22b trong style.css,
  toàn token → theme tối tự đúng (đã đo computed style cả 2 theme).
- ⚠️ **BẪY: KHÔNG dùng `loading="lazy"` cho ảnh chèn vào #library-view** — pane
  trình duyệt phiên nay không chạy khung hình nên lazy-load không bao giờ kích hoạt
  (0/16 logo hiện). Bỏ lazy → 16/16. 16 logo ~200 KB, eager là hợp lý.
- Kiểm: 16 hàng, 5 cột, 64 badge (31 Có / 30 Không / 3 Chưa rõ — khớp dữ liệu nguồn
  từng con số), mở/đóng chi tiết + mở rộng/thu gọn tất cả chạy, logo 16/16.
- Versions: sosanh.js v1, brochure v9, style v54, config v7, badge **v1.16**.

### 2026-07-21 (later 14 — mục mới "So sánh quyền lợi / Compare" trên cây công cụ, v1.15)

Chủ tool yêu cầu thêm công cụ "so sánh quyền lợi các hãng". Đã nối vào KHUNG THƯ VIỆN có
sẵn thay vì xây mới:

- `server.js`: thêm `soSanh: 'Bang so sanh quyen loi cac hang'` vào `LIBRARY_SECTIONS`
  → /api/library tự quét, /api/download tự cho tải (whitelist theo LIBRARY_SECTIONS).
  **Đổi server.js = phải restart server** (đã restart preview).
- `brochure.js`: `renderCompareNavSection()` — mục nav riêng, item hiện tên hãng sạch
  ("01_National_Life_Group.png" → "National Life Group", số đầu tên = thứ tự).
  ⚠️ KHÔNG dùng makeDownloadItem cho kiểu tên này — tachTenMau sẽ băm nát.
  Xem/tải tái dùng openLibraryItem. `main.js`: gọi sau mục Name Card.
- `core.js`: NAV_ICONS.compare (cái cân). Versions: core v24, brochure v8, main v6,
  config v6, badge **v1.15**.
- Kiểm trên app: mục hiện đúng vị trí, đủ 16 hãng đúng thứ tự, bấm vào xem ảnh + nút
  Tải về đúng đường /api/download.

**⚠️ PHÁT HIỆN QUAN TRỌNG: 16 PNG trong folder chỉ là LOGO các hãng (~280×80),
KHÔNG phải bảng so sánh quyền lợi.** Khung công cụ chạy đúng nhưng nội dung bấm vào
mới là logo. Đã hỏi chủ tool cung cấp nội dung so sánh thật (họ có Google Sheet
"Bảng So Sánh" — xuất ảnh/PDF thả vào folder là hiện ngay, giữ nguyên kiểu tên
"01_TenHang.png"). ĐỪNG tự bịa dữ liệu quyền lợi — chữ in lên tài liệu gửi khách.

### 2026-07-21 (later 13 — cập nhật brochure AIG IUL từ 2 PDF export mới)

Chủ tool xuất 2 file `3-Export-PDF/Brochue - 01/02.pdf` (vector, 1 trang/file) và nhờ thay
bộ brochure AIG IUL. Cấu trúc brochure: `Brochure/AIG/AIG IUL.jpg` (trang 1) +
`AIG IUL (2).jpg` (trang 2) để xem, `AIG IUL.pdf` để nút Tải về. **Quy trình đã dùng,
tái dùng cho lần sau:**

1. **Sao lưu bản cũ trước** (Brochure/ nằm NGOÀI git — không có lưới an toàn).
2. **PDF tải về**: ghép 2 PDF vector bằng `pdf-lib` (npm cài vào scratchpad, KHÔNG đụng
   package.json dự án) → giữ nguyên vector như bản cũ, 249 KB / 2 trang.
3. **JPG xem trước**: PDF là vector thuần (0 ảnh nhúng) nên phải RENDER: trang tạm
   `public/tmp-render/render.html` + pdf.js CDN, render 1600×2263 (khớp chuẩn cũ),
   toDataURL JPEG 0.92, kéo base64 về qua javascript_tool (kết quả lớn tự lưu file
   tool-results → decode bằng Node). Xoá tmp-render ngay sau khi xong.
   ⚠️ **BẪY: pane trình duyệt phiên này không chạy khung hình** → pdf.js `page.render()`
   treo vĩnh viễn vì chờ requestAnimationFrame. Vá: `window.requestAnimationFrame =
   cb => setTimeout(cb, 0)` TRƯỚC khi render. Cùng gốc với vụ screenshot treo + dialog
   kẹt opacity (later 2, later 8).
4. Kiểm: đọc ảnh bằng mắt (đúng thiết kế mới), `/api/download` trả byte khớp 100%
   file trên đĩa cho cả 3 file.

**Lưu ý phạm vi:** `Brochure/` bị gitignore → bản cập nhật này chỉ nằm trên máy chủ tool
(localhost) — giống mọi brochure từ trước tới nay, KHÔNG lên live domain.
Đã đưa vào git theo lệnh chủ tool: thư mục `Bang so sanh quyen loi cac hang/` (16 PNG,
nằm ở gốc repo nên KHÔNG được serve lên domain) + 2 PDF nguồn trong 3-Export-PDF.

### 2026-07-21 (later 12 — bỏ đuôi .jpg trên tiêu đề brochure + dịch tiêu đề IUL thêm 5)

- **Bỏ đuôi file trên tiêu đề brochure** (chủ tool gạch đỏ .jpg 21/07): openLibraryItem
  (brochure.js) hiển thị tên đã strip .jpg/.jpeg/.png/.pdf/.svg/.webp ở CẢ header lẫn
  thanh trạng thái — đội sale đọc "NLG IUL", không cần biết định dạng. Tên file thật
  giữ nguyên (tải về vẫn đúng đuôi). Kiểm trên app: tiêu đề "NLG IUL" sạch. brochure.js?v=7.
- **Dịch tiêu đề INDEXED UNIVERSAL LIFE thêm 5 trái** theo mắt chủ tool (lần 2, tổng 10):
  x -116.65 → -121.65, lề giờ 53.3 / 76.1. 2 mẫu IUL × 2 bản, đo cả hai ra cùng số.
- config.js?v=5 (pha cache sau lượt tạm mở chế độ mở để kiểm chứng brochure).

### 2026-07-21 (later 11 — dịch tiêu đề IUL sang trái 5 theo mắt chủ tool)

Chủ tool nhìn bản in thấy dòng INDEXED UNIVERSAL LIFE vẫn lệch phải, yêu cầu dịch trái
5px — quyết định THẨM MỸ của chủ tool, làm theo. x mảnh đầu dòng 2: -111.65 → -116.65
(2 mẫu IUL × 2 bản). Lề sau khi dịch: trái 58.3 / phải 71.1 (trước: 63.3 / 66.1).
Cỡ chữ giữ 38.09px. Lưu ý ngữ cảnh: screenshot chủ tool gửi lúc yêu cầu vẫn còn vệt đen
đã xoá ở later 10 → màn hình họ là bản cache cũ; đã dịch theo yêu cầu và gửi hình cắt
từ file thật để đối chiếu. Nếu sau khi refresh chủ tool thấy lệch trái quá thì chỉ cần
trả x về -111.65.

### 2026-07-21 (later 10 — xoá vệt đen mép trái mẫu NLG IUL)

Chủ tool báo vệt đen dọc mép trái trang, khoảng ngang thẻ khách hàng, nhờ "đắp màu
xanh + trắng lên". Soi ra nguyên nhân KHÔNG cần đắp: một thẻ `<image>` 662×601
(76 KB) bị designer **kéo ra ngoài mép trái thay vì xoá** — nằm ở
`translate(-118.74 218.51) scale(.2)`, tức gần hết ngoài canvas nhưng **thò vào
trang 13.7 đơn vị** (x −118.7 → 13.7, y 218.5 → 338.7), và mép phải của ảnh đó màu
đen. Không id, không `<use>` nào trỏ tới → xoá thẳng thẻ, nền xanh/trắng thật lộ ra
đúng như chủ tool muốn, file nhẹ thêm 102 KB (2360 → 2258 KB).

**Cách dò ra (tái dùng được):** quét mọi `rect/path/image/polygon` có bbox chạm dải
mép trang (x < 25 hoặc > W−25), lọc phần tử tối màu (`fill` R+G+B < 150) hoặc là
`image`, bỏ qua nền to (rộng > 560). Đã quét đủ 4 mẫu proposal: chỉ NLG IUL dính;
các vệt ở mẫu khác đều là LOGO ở đầu trang (đúng thiết kế, không đụng).

**Bài học:** mẫu xuất từ Illustrator có thể chứa **phần tử bỏ quên ngoài canvas** —
không thấy trên artboard của designer nhưng SVG không cắt gì cả, thò vào trang là
hiện. Cùng họ với bẫy "ảnh Link chưa Embed" (later 3). Khi nhận mẫu mới: chạy quét
mép trang như trên, và để ý cả phần tử nằm HẲN ngoài canvas (chiếm dung lượng vô ích).

### 2026-07-21 (later 9 — tiêu đề IUL: thu nhỏ 40px → 38.09px, trả lại đúng lề gốc)

Chủ tool báo tiếp sau "later 8": dịch trái xong dòng "INDEXED UNIVERSAL LIFE" vẫn
**sát mép hai bên** — vì dịch chỉ đổi VỊ TRÍ, còn dòng đã DÀI THÊM 23 đơn vị (489.2 so
với 465.9 gốc) thì vẫn dài. Căn giữa một dòng bị phình chỉ chia đều phần phình sang
hai bên, không trả lại khoảng thở.

**Vá đúng:** thu nhỏ dòng đó `40px → 38.09px` (tỉ lệ 465.9/489.2 = 0.9523) và trả
`x` về `-111.65` gốc. Kết quả đo được: rộng 465.9, lề trái/phải **63.3 / 66.1** —
Y HỆT hình học trước khi sửa chính tả. Cách gắn: `style="font-size:38.09px"` vào thẻ
tspan BAO của dòng 2 (class `.cls-51`/`.cls-100` đặt 40px cũng trên chính thẻ đó,
inline thắng class cùng phần tử; các mảnh con chỉ có class letter-spacing nên thừa
hưởng trọn). CHỈ 2 mẫu IUL (AIG IUL + IUL–NLG, mỗi mẫu 2 bản); 2 mẫu Term Life tiêu
đề "TERM LIFE" không đổi chữ nên KHÔNG đụng.

**Bài học chuỗi 3 bản vá (later 7→8→9), ghi để không lặp:** đổi ĐỘ DÀI chữ trên bản
vẽ thì phải khôi phục CẢ vị trí LẪN bề rộng chiếm chỗ. Sửa chính tả (7) → lệch; dịch
tâm (8) → hết lệch nhưng sát mép; phải bù cỡ chữ (9) mới về đúng thiết kế. Lẽ ra làm
một lần: đo hình học gốc TRƯỚC khi đổi chữ, đổi xong khôi phục đủ cả tâm + bề rộng.

Lưu ý ngữ cảnh: khi chủ tool báo "vẫn lệch", màn hình của họ đang xem BẢN CŨ trong
cache (bản 38.09px chưa push lúc đó) — đối chiếu số đo trên đĩa trước khi kết luận
vá tiếp, kẻo vá chồng lên vá.

### 2026-07-21 (later 8 — canh giữa lại dòng tiêu đề sau khi sửa chính tả)

Chủ tool báo ngay sau bản vá chính tả: thêm chữ "E" vào INDEXD làm dòng
"INDEXED UNIVERSAL LIFE" **dài ra và lệch sang phải** (nó neo TRÁI nên chỉ nở về bên
phải). **Bài học: sửa chữ trên bản vẽ thì phải kiểm lại bố cục ngay, đừng chỉ kiểm
"chữ đã đúng chưa".**

- Vá: `x="-111.65"` → `x="-123.33"` ở mảnh `INDEXED UNIVER` (dịch trái 11.68), trả về
  đúng tâm thiết kế **296.24**. Lề hai bên sau khi sửa: 51.6 / 54.4 — cân mắt.
  Áp cho AIG IUL + IUL–NLG, mỗi mẫu 2 bản = 4 file. Hai mẫu ra CÙNG con số.

**⚠️ BẪY ĐO ĐẠC — ĐỌC KỸ, ĐÃ MẤT MẤY LƯỢT VÌ NÓ:**
Khi mở file SVG THẲNG trên trình duyệt (không qua tool), **KHÔNG được quy đổi toạ độ
bằng `svg.getBoundingClientRect().width / viewBox.width`**. Trang báo giá rất cao
(595×1341) nên trình duyệt canh theo CHIỀU CAO và chừa lề trắng hai bên ngang → tỉ lệ
ngang tính kiểu đó **sai hoàn toàn**. Triệu chứng đã gặp: đổi `x` đi 4.32 mà đo ra chỉ
dịch 1.6, và bề rộng chữ đo ra 180 trong khi thực tế là 489.

Cách đúng: `const M = svg.getScreenCTM().inverse()` rồi
`svg.createSVGPoint()` + `.matrixTransform(M)`. Nó tự xử lý viewBox,
preserveAspectRatio và lề trắng. **Mọi phép đo toạ độ trên SVG từ nay dùng cách này.**
(Trong tool thì cách cũ tình cờ đúng vì canvas khớp bề ngang — nên bẫy chỉ lộ ra khi
mở file trực tiếp.)

Thêm một điểm: `getBoundingClientRect()` trên thẻ `<tspan>` BAO NGOÀI cho số không tin
được; phải lấy **hợp bao của các mảnh tspan con** (bỏ mảnh rỗng) mới ra đúng biên chữ.

### 2026-07-21 (later 7 — sửa lỗi chính tả trong bản vẽ)

Chủ tool báo nhãn ghi **"Xếp hạng ức khoẻ"**, thiếu chữ "s".

**⚠️ BẪY QUAN TRỌNG — VÌ SAO GREP THƯỜNG KHÔNG TÌM RA LỖI CHÍNH TẢ TRONG SVG:**
Illustrator cắt một dòng chữ thành nhiều `<tspan>` để chỉnh kerning từng chữ cái, nên
chuỗi liền mạch KHÔNG tồn tại trong file. Ví dụ thật:

```
<tspan class="cls-139" x="0" y="0">X</tspan>
<tspan class="cls-178" y="0">ếp hạng </tspan>
<tspan class="cls-137" y="0">ứ</tspan>
<tspan y="0">c khoẻ / </tspan>
```

`grep "Xếp hạng"` → **0 kết quả**, dù chữ đó hiện rành rành trên màn hình. Đây là lý do
lỗi này sống sót lâu. **Cách soát đúng: ghép nội dung mọi tspan trong từng `<text>` lại
rồi mới đối chiếu** (script mẫu ở scratchpad phiên này, ~30 dòng).

**Đã sửa (8 file = 4 mẫu × 2 bản):**
- `Xếp hạng ức khoẻ` → `Xếp hạng sức khoẻ` — AIG IUL, AIG Termlife, IUL–NLG, TERMLIFE–NLG.
  Chèn "s" vào cuối mảnh `"ếp hạng "` (mảnh chữ thường), KHÔNG chèn vào mảnh kerning
  riêng của chữ "ứ". Các mảnh không có thuộc tính `x` riêng nên chữ tự chạy tiếp,
  thêm ký tự không vỡ bố cục.
- `INDEXD UNIVERSAL LIFE` → `INDEXED` (thiếu chữ E) — AIG IUL, IUL–NLG. Lỗi này chủ tool
  chưa thấy, em quét ra khi soát toàn bộ; chủ tool duyệt sửa 21/07.

**Một trường hợp trông như lỗi nhưng KHÔNG phải:** `"Tổng sốtiền đóng"` — thực ra là
HAI DÒNG riêng ("Tổng số" y=0 / "tiền đóng" y=13.2), dính vào nhau chỉ vì script ghép.
Bài học: ghép tspan để soát thì phải **nhóm theo y**, và luôn soi lại cấu trúc trước khi
kết luận là lỗi.

**Kiểm chứng:** quét lại cả 6 mẫu → 0 lỗi còn lại. Đo trên trình duyệt: nhãn dài thêm
1 ký tự vẫn nằm gọn trong thẻ nền ở cả 4 mẫu (AIG IUL 269.2/280, IUL–NLG 270.7/281.5,
AIG Term 267.2/278.8, TERMLIFE–NLG 267.3/278.9). 2 bản mỗi mẫu giống hệt nhau.

**Chốt cách viết:** giữ **"khoẻ"** (dấu hỏi trên chữ e) cho đồng bộ với mẫu Allianz
("Sức khoẻ") và nhãn trong bảng sửa chữ của tool. Chỉ thêm chữ "s" bị thiếu.

### 2026-07-21 (later 6 — chặn tràn chữ ở ô Thông tin khách hàng)

Chủ tool báo: hạng sức khoẻ dài chạy lố ra khỏi thẻ nền / bị cắt cụt
("Express Standard Non-Tobacco 2" 30 ký tự, "Preferred Plus Nontobacco" 25 ký tự).

**Sót của phiên trước:** `thuNhoChoVua()` mới chỉ áp cho phần **Kế hoạch & Quyền lợi**,
quên hẳn phần **Thông tin khách hàng**. Bài học: làm tính năng chống tràn thì phải rà
HẾT các nhóm ô, đừng chỉ làm nhóm đang gặp lỗi.

- Thêm `vuaKhungOKhach(neo, dsCungPhan)` + `mepPhaiChoPhep()` trong `proposal.js`.
  Ô khách hàng neo TRÁI theo đúng bản vẽ nên **KHÔNG** đổi sang căn giữa như phần Kế
  hoạch — chỉ thu nhỏ cỡ chữ khi tràn.
- Mép phải cho phép = chặt nhất trong hai nguồn: (1) chữ khác **cùng hàng bên phải**,
  (2) thẻ `<rect>` nền hẹp nhất **bao quanh** chữ. Áp cho cả 3 ô: tên khách, hạng sức
  khoẻ, tiểu bang.
- ⚠️ **BẪY đã dính khi tự test:** điều kiện tìm khung bao ban đầu chỉ kiểm
  `b.left <= r.left`, thiếu `b.right > r.left` → ô "Tiểu bang" nhận nhầm khung của ô
  "Sức khoẻ" nằm BÊN TRÁI nó (khung đó kết thúc trước cả chỗ chữ bắt đầu) → mép phải
  tính ra nhỏ hơn mép trái. Khung bao phải **thực sự trùm qua** điểm chữ bắt đầu.

**⚠️ BẪY KHI VIẾT TEST (quan trọng hơn cả bản vá):** lần đo đầu dò phần tử bằng
`#client-rate`. Id `client-*` do `tagClientInfoElements()` gắn vào **activeSvgDoc**,
mà `renderSvgOnCanvas()` clone canvas TRƯỚC đó → **bản canvas không có id này** (trừ
mẫu đã lưu sẵn id trong file). Kết quả: mẫu nào thiếu id thì hàm kiểm trả null, test
báo "0 lỗi" một cách GIẢ TẠO. Sửa: lấy `data-editor-id` **thẳng từ ô nhập trong bảng
bên phải** rồi mới dò sang canvas — id đó chắc chắn có ở cả hai bên. Đã thêm biến đếm
`boQua` vào test để lộ ngay nếu có trường hợp bị bỏ sót thay vì lặng lẽ pass.

**Kiểm chứng (đo lại bằng cách tin cậy): 65 trường hợp, 0 bỏ qua, 0 tràn.**

| Mẫu | Số ca thử | Cỡ chữ nhỏ nhất |
|---|---|---|
| AIG IUL / Term Life | 12 + 12 | không phải thu nhỏ |
| NLG IUL / Term Life | 15 + 15 | 10.7px (gốc 14.3px = 75%) |
| Allianz Max-Funded | 11 | 12.9px |

Cỡ chữ ghi vào **cả hai cây DOM** nên bản xuất PDF/JPEG cũng đúng (đã đối chiếu).
`proposal.js?v=21`, `config.js?v=4`.

### 2026-07-21 (later 5 — nén 2 mẫu NLG, 8.5 MB → 2.3 MB mỗi file)

**Cách làm, để lần sau lặp lại được cho mẫu khác:**

1. Soi xem dung lượng nằm ở đâu: 99% là ảnh nhúng base64, riêng ảnh nền
   **5802×3749 nặng 6.2 MB**. AIG dùng 2781×1408, Allianz 1507×838 — NLG là ngoại lệ.
2. Tính mức thật sự cần: ảnh được **vẽ ra ở 929 đơn vị SVG**, mà `renderSvgToCanvas`
   xuất ở **`scaleFactor = 2`** (core.js) → chỉ dùng tới 1858px. Thừa hơn 3 lần.
   Chọn **2400px** (dư 1.3 lần so với 2x; đủ cả nếu sau này nâng lên 3x = 2787px).
3. Kiểm kênh alpha TRƯỚC khi định chuyển JPEG: RGBA **không** có nghĩa là có trong suốt.
   Ở đây quét thật thì **14.6% điểm ảnh không đặc, alpha thấp nhất = 0** → trong suốt
   THẬT → **bắt buộc giữ PNG**, không được chuyển JPEG.
4. Máy không có sharp/Pillow/ImageMagick. Dùng **System.Drawing của Windows** qua
   PowerShell để thu nhỏ (HighQualityBicubic).
   ⚠️ **Bộ mã hoá PNG của System.Drawing nén cực kém** — xuất ra 4 MB cho ảnh
   2800×1809, gần như không nén. Đừng dùng nó để ghi PNG cuối.
5. **Tự viết bộ mã hoá PNG bằng `zlib` có sẵn của Node** (lọc thích nghi 5 kiểu theo
   heuristic của libpng + deflate level 9 + `Z_FILTERED`) → 1560 KB thay vì 4026 KB.
   Script để ở scratchpad phiên này; nếu cần dùng lại thì viết lại theo mô tả trên.
6. Nhúng lại **GIỮ NGUYÊN `width/height/transform`** của thẻ `<image>` → khung vẽ y hệt,
   chỉ đổi bitmap bên trong. Không xê dịch một chút nào.

**Kết quả:**

| Mẫu | Trước | Sau |
|---|---|---|
| `IUL - NLG.svg` | 8603 KB | **2360 KB** (−73%) |
| `TERMLIFE - NLG.svg` | 8492 KB | **2251 KB** (−73%) |
| Tổng cả 6 mẫu | 24008 KB | **11524 KB** (−52%) |

Đã sửa cả `public/templates/` lẫn `2-Templates/NLG/`, so lại 2 bản giống hệt nhau.
Kiểm chứng: mở thẳng SVG qua server → 3 ảnh đều giải mã được, **84 thẻ `<text>` còn nguyên**,
`viewBox` không đổi, khung vẽ ảnh nền vẫn đúng 5807×3756. Alpha sau khi nén: 14.8% / 14.61%
(gốc 14.6%) — khớp trong sai số lấy mẫu.

### 2026-07-21 (later 4 — tốc độ vào trang Công cụ, v1.14 đã LIVE)

Chủ tool báo: vào `/tool` trên live phải chờ spinner "Đang quét thư mục" một lúc mới có dữ liệu.
**Đo thật trên production TRƯỚC khi sửa** (đừng đoán nguyên nhân):

| Bước | Thời gian | Ghi chú |
|---|---|---|
| HTML `/tool` | 531ms | |
| Google Fonts CSS | 205ms | chặn |
| supabase-js (CDN) | 218ms · 203 KB | cần cho đăng nhập |
| jsPDF (CDN) | 293ms · 356 KB | **chỉ cần khi bấm Xuất PDF** |
| JS nội bộ | ~250 KB | |
| rồi mới gọi `/api/svgs` | 550ms | |

**KHÔNG phải do quét thư mục.** `getSvgFiles()` chỉ `readdir`+`stat` (~6 file trên Vercel vì
`2-Templates/` bị gitignore), `/api/svgs` trả về đúng 1 KB trong 550ms — toàn bộ là độ trễ mạng
tới Vercel chứ không phải xử lý. Lỗi thật là **CHUỖI KHỞI ĐỘNG NỐI ĐUÔI NHAU**.

- **Bắn sớm `/api/svgs` bằng inline script trong `<head>` tool.html** (`window.__svgsSom`);
  `fetchSvgsList()` dùng lại cho lần gọi ĐẦU TIÊN, các lần sau (lưu/xoá nháp) vẫn fetch mới.
  → 550ms chờ mạng chạy song song với lúc tải script thay vì cộng vào cuối.
  ⚠️ **Đoạn này PHẢI đặt TRÊN mọi `<link rel="stylesheet">`** — CSS chặn việc CHẠY inline script
  đứng sau nó, để dưới là phải chờ cả Google Fonts (~205ms) mới bắn được, mất sạch ý nghĩa.
- **Gỡ thẻ `<script>` jsPDF khỏi tool.html**, thay bằng `napThuVienPdf()` trong core.js, nạp
  đúng lúc bấm Xuất PDF. Tiết kiệm 356 KB + 293ms chặn trên MỌI lượt vào trang (kể cả người chỉ
  vào xem rồi đi ra). Có chống bấm 2 lần (`dangNapPdf`) và báo lỗi tử tế khi mất mạng.
- Đổi chữ trạng thái "Đang quét thư mục chứa file thiết kế…" → "Đang tải danh sách mẫu…"
  (đội sale đọc câu này, không phải lập trình viên đọc).
- Đồng bộ `portal.css?v=32` cho cả 4 trang — index/login còn kẹt `v=31` nên ăn CSS cũ trong cache.
  **Bài học: cùng một file mà mỗi trang khai một số version khác nhau là bug thầm lặng.** Kiểm bằng
  script dò trùng version qua cả 5 file HTML, đừng sửa tay từng trang rồi tin là đã đủ.
- `core.js?v=23`, `config.js?v=3`.
- Đã đo lại toàn bộ 5 trang: 39 file CSS/JS đều trả 200, không có 404. Trang nặng nhất 274 KB.
- ~~⚠️ Còn tồn: 2 mẫu NLG nặng 8.5 MB mỗi file~~ **XONG 21/07 (xem "later 5")**. Cũ: (các mẫu khác ~2.2 MB). Trên 4G của sale ngoài
  đường là chờ lâu. Nghi ảnh nền nhúng ở độ phân giải thừa. Chờ chủ tool duyệt việc nén.

### 2026-07-21 (later 3 — logo vỡ ở Allianz + logo nét hơn cho Name Card, CHƯA PUSH)

- **🚨 BẪY MỚI, PHẢI NHỚ: mẫu SVG mới xuất từ Illustrator có thể còn TRỎ RA FILE NGOÀI REPO.**
  `Max-Funded Allianz.svg` có
  `xlink:href="../../../../../../2024/Video/Asset/Logo/Thinksmart Insurance/Logo Thinksmart White.png"`
  → trên web thành **icon ảnh vỡ** ở góc phải đầu trang (chủ tool báo 21/07). Illustrator chỉ nhúng
  ảnh khi chọn "Embed"; ảnh nào để "Link" thì xuất ra vẫn là đường dẫn tương đối trên máy designer.
  **Mỗi lần nhận mẫu mới BẮT BUỘC chạy kiểm:**
  `grep -o 'xlink:href="[^"#][^"]*"' <file>.svg | grep -v '^xlink:href="data:'`
  → phải KHÔNG ra kết quả nào (chỉ được còn `data:` và `#id` nội bộ).
- Đã nhúng thẳng logo thành base64 cho **cả 2 bản** (`public/templates/` + `2-Templates/Allianz/`),
  giữ nguyên `width/height/transform` nên vị trí không đổi. File: 2315 KB → 2384 KB.
- **Name Card**: `image-3` chính là logo Thinksmart trắng nhưng chỉ 472×179 → thay bitmap bằng bản
  2370×896, GIỮ NGUYÊN `width="472" height="179"` của thẻ `<image>` nên bố cục không xê dịch, chỉ
  nét hơn khi xuất 2x. File: 55 KB → 155 KB. Sửa cả `public/templates/` lẫn `Name Card/Chung/`.
  Đóng một phần PENDING J.
- Nguồn logo: `E:/2024/Video/Asset/Logo/Thinksmart Insurance/Logo Thinksmart White.png` (2370×896,
  92 KB). Đã đối chiếu byte-for-byte: payload trong cả 2 mẫu khớp đúng file này.
- Kiểm chứng: mở thẳng 2 file SVG qua server → không còn tham chiếu ngoài, ảnh giải mã được
  (`new Image()` → 2370×896), và gọi `/api/svgs/content` (đường đi thật của Tool) cũng trả về đúng.
- **`config.js?v=1` → `?v=2` ở cả 5 trang.** Phiên này để trống khoá Supabase để vào kiểm chứng rồi
  khôi phục file, NHƯNG quên bump version → trình duyệt chủ tool giữ bản trống trong cache, chạy
  "chế độ mở" và trang chủ trắng trơn. **Quy tắc: sửa file nào thì bump version file đó, kể cả sửa
  tạm rồi hoàn lại.** Ghi chú thêm: `index.html` cố ý `return` sớm khi chưa cấu hình Supabase nên
  chế độ mở = trang chủ trắng, chỉ còn banner — chưa sửa, chờ chủ tool quyết.

### 2026-07-21 (later 2 — 3 lỗi mẫu Allianz do chính phiên trước gây ra, CHƯA PUSH)

Chủ tool báo 3 lỗi trên `Max-Funded Allianz.svg`, cả 3 đều là hệ quả của code viết ở phiên
"later" ngay bên dưới mà **không mở app kiểm chứng**. `core.js?v=20`, `proposal.js?v=16`.

- **1. Chữ tiểu bang dính vào nhau ("Texas").** Illustrator cắt một dòng thành nhiều tspan, mỗi
  mảnh mang một class kerning riêng **chỉ đúng cho đúng chữ cái gốc của nó** — ở đây
  `.cls-178 { letter-spacing: -.09em }` vốn dành cho chữ "T". `applyTextValue` dồn CẢ dòng vào
  mảnh đầu → kerning đó áp cho toàn bộ chữ. Mẫu AIG/NLG không lỗi vì mảnh đầu của chúng không có
  class kerning âm — **may chứ không phải đúng**.
  Vá: thêm `boQuenKerning(el)` (core.js) đặt `style.letter-spacing = 'inherit'` cho mảnh vừa ghi
  — dùng `inherit` chứ KHÔNG dùng `normal`, để tracking cố ý ở cấp `<text>` vẫn giữ nguyên.
  Thêm `chuanHoaKerningDongDaGop(svgEl)` chạy lúc `loadSvgContent` cho các dòng ĐÃ bị gộp từ lần
  lưu trước (dấu hiệu: có mảnh em cùng dòng và tất cả đều rỗng) — nếu không thì mở file ra đã sai
  sẵn, chưa cần gõ gì.
- **2. Số thu nhập hưu trí đè lên chữ "/năm".** Hai thẻ `<text>` RIÊNG, mỗi thẻ một `translate()`
  cứng; số dài ra là tràn sang. Vá: `xepLaiHauTo(neo)` trong `proposal.js` — đo `getBBox().width`
  thật trên canvas rồi đặt lại toạ độ cho CẢ HAI thẻ, giữ **tâm cụm** cố định (`neo.tam` đo một
  lần theo bản vẽ gốc) nên số dài/ngắn thế nào khối chữ vẫn cân giữa thẻ nền. Khe hở
  `KHE_TIEN_HAUTO = 6`. Gọi lúc gõ, lúc blur (auto-format tiền) và một lần lúc mở file trong
  `document.fonts.ready` (chưa có font thì đo sai bề rộng).
- **3. "Thời gian nhận dòng tiền" gõ mà canvas đứng im.** ⚠️ **BẪY GỐC RỄ, ĐỌC KỸ:** tool giữ
  **HAI cây DOM** — `appState.activeSvgDoc` (bản dữ liệu, đem đi lưu/xuất) và bản **clone** trong
  `dom.canvasWrapper` (bản hiển thị). `applyTextValue` ghi cả hai. Ô này không dùng được
  `applyTextValue` (nó ghi vào mảnh mang `data-editor-id` = chữ "Tổng", sẽ đè mất cả câu) nên tôi
  tự ghi tay — và **chỉ ghi vào cây dữ liệu, quên bản clone**. Vá: `ghiCumDongTien(x, cum)` ghi cả
  hai, dò bản clone qua `[data-editor-id]` rồi ánh xạ theo **chỉ số mảnh** (`viTriManhChinh`,
  `tongSoManh`) — có đối chiếu `tongSoManh` trước khi ghi để không ghi bậy khi cấu trúc lệch.
- Ghi chú: comment cũ ("mỗi tspan có x cố định nên phải dồn cả cụm") **SAI** —
  `optimizeSvgTexts()` đã gỡ hết `x` của các mảnh cùng dòng ngay lúc load. Đã sửa lại comment cho
  đúng lý do thật (tránh ghi đè phần "Tổng dòng tiền dự kiến").
- **`.claude/launch.json`: bỏ `env.PORT` cứng, thêm `"autoPort": true`** → nhiều phiên Claude chạy
  song song không giành cổng 8000 nữa (server tự lấy cổng trống, `server.js` đọc `process.env.PORT`).
- Kiểm chứng THẬT trên app (không chỉ `node --check`): đổi tiểu bang → `Massachusetts`,
  `letter-spacing` computed = `normal`, bề rộng 100.7px (đúng giãn tự nhiên); nhập `$1,250,968` →
  tiền `translate(302.61 510.9)` rộng 200.1, `/năm` `translate(508.72 510.9)` ⇒ khe hở đúng 6.01,
  tâm cụm 423.3 y hệt bản gốc; gõ "trọn đời" → canvas hiện "…dự kiến nhận trọn đời". Đã đối chiếu
  **cả `activeSvgDoc`** để chắc bản lưu/xuất cũng đúng, không chỉ bản hiển thị.
- ⚠️ Ảnh chụp màn hình của Browser pane **treo 100%** với file SVG 2.3 MB (`computer screenshot`
  và `zoom` đều timeout 30s). Cách thay thế đã dùng được: `javascript_tool` đọc thẳng
  `getBBox()` / `getComputedStyle()` / `getAttribute('transform')`, và clone SVG + đổi `viewBox`
  để cắt vùng cần xem ra file gửi chủ tool.
- ⚠️ Tool trên nhánh này **bắt đăng nhập** (config.js có khoá thật) nên không tự vào kiểm chứng
  được. Đã tạm để trống `config.js` → test → **khôi phục nguyên trạng** (`git status` sạch).
  Lần sau muốn test nhanh thì làm đúng trình tự đó, và kiểm `git diff` trước khi commit.

### 2026-07-21 (later — nhánh `feat/mainV1.1`, phiên dài nhất từ trước tới nay, CHƯA PUSH)

**Merge 2 nhánh thành `feat/mainV1.1`** (`main` → nhánh mới → `merge --no-ff feat/login`):
- **BẪY LỚN: `server.js` TỰ MERGE TRÓT LỌT, KHÔNG BÁO XUNG ĐỘT — nhưng khối redirect
  `/`,`/login`,`/videos` → 302 `/tool` của main vẫn còn.** Giữ nguyên là portal chết ngay (vào
  trang chủ bị đá sang Tool). Đã gỡ + ghi chú cách đặt lại nếu cần giấu portal lần nữa.
  → Merge xong PHẢI đọc lại file "tự merge được", đừng chỉ xử lý file báo xung đột.
- Xung đột `changelog.md`: hai nhánh cùng làm 20/07 → giữ CẢ HAI mục cùng ngày (xem ghi chú đầu Log).
- `main` KHÔNG bị đụng (vẫn `fff501d`), live nguyên vẹn.

**Rail / menu trái:**
- Rail cao đúng nội dung + căn giữa dọc (trước kéo full màn, dài và trống).
- **Logo rail bị ẩn — LỖI LẶP LẠI 2 LẦN**: `.sidebar-brand > span` quét trúng cả
  `<span class="logo-icon">`. Sửa `portal.css` hôm 20/07 nhưng **quên `style.css`** (trang Tool
  dùng bản sao riêng) → 21/07 chủ tool báo lại. Giờ cả hai đều `> span:not(.logo-icon)`.
- Hover rail → **tối nền** (`body::after` + `:has()` — không phải thêm thẻ vào 5 file HTML).
- Vào trang → rail lộ dần bằng **`clip-path`**. TRƯỚC dùng `scaleY` → **bóp méo icon/chữ**, chủ tool
  thấy "giật". clip-path không biến dạng nội dung.
- Hover → vệt sáng chạy quanh viền (`@property --rail-angle` + conic-gradient + mask). Chạy sát mép
  TRONG vì rail có `overflow:hidden` (muốn bọc ngoài phải thêm lớp bọc ở cả 5 HTML).

**Chuyển trang — YÊU CẦU THƯỜNG TRỰC của chủ tool (đã lưu vào memory):**
- `@view-transition { navigation: auto }` khai ở CẢ `portal.css` lẫn `style.css` (thiếu một bên là
  không chạy — hiệu ứng đòi cả trang đi lẫn trang đến cùng khai báo).
- **Khai báo CSS thôi CHƯA ĐỦ**: hiệu ứng chụp KHUNG HÌNH ĐẦU của trang đích, mà portal giấu nội
  dung chờ auth → người dùng thấy chớp trắng, tưởng không có animation. Phải cho nội dung trang
  đích có nhịp hiện vào (`animations.js` nay phủ cả `.member-stats`, `.seg`, `.video-grid`).

**Tool — layout & hệ nút:**
- 4 vùng (header + 3 cột) thành **thẻ nổi bo 20px**, khe 8px; token `--tool-gap/--tool-radius/--tool-shadow`.
  `.app-body` bỏ `calc(100vh - header)` → dùng flex, vì header giờ là thẻ RỜI có khe.
- **Gỡ `.viewport-toolbar`** (thanh 46px chỉ để chứa cụm zoom) → zoom dời xuống `.canvas-status-bar`,
  canvas cao thêm 46px. `--status-bar-height` 34→40px; 2 dải đáy dùng chung token nên tự khớp nhau.
- Thông báo trạng thái thành **tạm thời** (tự mờ sau 4s) thay vì nằm lì "Đã tải N thiết kế".
- **Đồng bộ nút giữa 2 file CSS**: `.btn` Tool 37px vs Portal 44px; `.btn-sm` 29/36; `.icon-btn` 38/40.
  Chốt desktop 38/32/38 + override mobile 44 — quy tắc 44px là cho NGÓN TAY, desktop được nhỏ hơn.
- **Class chết dọn sạch**: `.btn-lg` (chưa từng định nghĩa — nút màn chào giả cỡ bằng style inline),
  `.glass-btn`, `.glass-btn-primary`, và khối `#btn-new-proposal` **15 dòng `!important`** ép nút
  thành 149×48 trong khi nút cạnh nó 121×38.

**Cây thư mục Tool:**
- `tachTenMau()` (core.js) chuẩn hoá tên hiển thị: trong cây BỎ tên hãng (nhóm đã ghi rồi), thanh
  tiêu đề hiện "Hãng — Chương trình". Bản nháp mang tên khách thì giữ nguyên. Áp cho cả Brochure.
- Hãng to/đậm hơn chương trình (14px/800 vs 12.5px/500) — **đảo ngược quyết định hôm trước**; lý do
  chủ tool đưa ra: sale nghĩ theo HÃNG trước rồi mới tới sản phẩm.
- Gỡ tiêu đề "CÔNG CỤ" + số đếm (giữ `#file-count` ẩn vì `main.js` vẫn ghi vào đó — xoá hẳn là vỡ).

**Mẫu Allianz (Max-Funded IUL) — nhận file từ chủ tool:**
- **Tên file sai chính tả `Max-Funded Aliianz.svg` (2 chữ i) là LỖI CHỨC NĂNG**, không chỉ thẩm mỹ:
  live nhận diện hãng bằng TÊN FILE (`server.js:104`) → "aliianz" không khớp "allianz" → rơi vào
  nhóm "Khác" + đổ nhầm danh sách xếp hạng của AIG. Đã đổi tên + chép sang `public/templates/`.
- Chuẩn hoá dữ liệu mẫu: `Chau Dang Khoa`→`Nguyen Van An`; `Standard Non-Tobacco`→`Standard Nontobacco`
  (chính tả riêng của Allianz); `Washington DC`→`Texas` (DC KHÔNG phải bang — danh sách 50 bang đã
  kiểm đủ, không thiếu không thừa); `Female`→`Male` (khớp tên nam); footer `TONY PHU`/`Jason Huynh`
  + SĐT thật → `Ten Tro Ly`/`Ten Agent` + `(000) 000-0000`. CEO + SĐT công ty GIỮ (mẫu sạch cũng có).
- **Nhánh sắp xếp riêng `isAllianz`**: ghép nhãn↔giá trị theo **NEO CHỮ** (nhãn tiếng Việt đứng ngay
  TRÊN giá trị) thay vì ngưỡng toạ độ của IUL. Trước đó dán nhãn sai hết ("Giá trị tích luỹ — Cột 2"
  thực ra là Tổng dòng tiền dự kiến). Ghép đúng 7/7. Thêm ô mới chỉ cần thêm 1 dòng vào bảng `NHAN`.
- Ô **"Thời gian nhận dòng tiền"** nhập được CHỮ ("trọn đời") lẫn số ("trong 25 năm"). Câu này gồm
  5 tspan ANH EM có `x` CỐ ĐỊNH → phải **dồn cả cụm vào 1 tspan rồi làm rỗng các tspan sau**;
  `applyTextValue` dùng không được ở đây.
- Căn giữa số La Mã I/II/III; khe "THU NHẬP HƯU TRÍ ↔ MIỄN THUẾ" 1px → 17px (quá tay) → **9px**.

**Term Life:** mỗi cột = 1 hàng gộp **[số năm | phí mỗi tháng]**, ghép theo X GẦN NHẤT (không theo
thứ tự mảng — thiếu một ô là lệch cả loạt). Ô số năm KHÔNG chạy định dạng tiền tệ (nếu không "10 năm"
biến thành "$10").

**Name Card:** 4 icon raster (globe 23×22, phone 24×16, YouTube 21×35…) tỉ lệ 1:1 mà app xuất 2x nên
nhoè → **thay bằng vector viết trong code**. Icon nằm trong `<defs>`, gọi qua `<use>` (mỗi cái 2 lần)
nên chỉ cần thay ruột trong `<defs>`, không phải sửa 8 chỗ gọi. File 58.278 → 55.512 bytes.
Logo Thinksmart vẫn raster 1:1 — cần file gốc của chủ tool.

**Trang Quản lý thành viên:**
- Bảng 7 cột bằng **`subgrid`** — mỗi hàng tự dựng lưới thì cột "Thao tác" (số nút đổi theo quyền)
  kéo các cột khác lệch tới 70px. Hệ quả: KHÔNG được thêm padding/border trái-phải cho phần tử subgrid.
- Chọn nhiều + thao tác hàng loạt; chỉ tick được người mình THỰC SỰ quản lý được; lọc trước khi gọi
  DB để không gửi lệnh chắc chắn bị trigger từ chối.
- Phòng ban CỐ ĐỊNH **Sale · MKT · CS · Admin** (`PHONG_BAN` đầu `members.js`) + hộp thoại chọn,
  bỏ hẳn `window.prompt`.
- Bố cục **2 cột**: trái = 3 danh sách; phải (312px, sticky) = khối "Tổng quan" GỘP 1 ô + đếm theo
  phòng ban **bấm để lọc nhanh** + nút "Thêm thành viên". Số đếm phòng ban luôn tính trên TOÀN BỘ,
  không theo bộ lọc (nếu không, bấm lọc xong mọi phòng khác tụt về 0).
- Hàng thao tác: **1 hành động chính + menu "⋯"** (trước bày 4 nút trộn 3 kiểu, cột bị kéo rộng).
- **"Thêm thành viên" KHÔNG tạo tài khoản trực tiếp được**: cần khoá `service_role` của Supabase,
  tuyệt đối không nhúng vào web (ai xem mã nguồn cũng có toàn quyền DB). Luồng đúng: gửi link đăng ký
  → họ tự tạo → admin duyệt.
- Trạng thái tải: nút đổi nhãn + bảng mờ, **không chen banner** (banner làm xê dịch bố cục); khung
  xương lần tải đầu cao ĐÚNG 66px = bằng hàng thật nên thay dữ liệu vào không nhảy.
- **Bẫy đã dính**: gỡ thẻ "Tạm khoá" khỏi HTML mà `members.js` vẫn ghi số vào đó → `.textContent`
  trên `null` làm CHẾT cả hàm tải, trang trắng. Đã bọc null-safe.

**Trang chủ:** gỡ thẻ "Mẫu thiết kế"; hàng "Thành viên mới" thành thẻ `<a>` bấm được sang `/members`.

**Đồng bộ `2-Templates/` (thư mục BỊ GITIGNORE):**
- Cả 4 master ở máy này còn dữ liệu test cũ (`Trương thị thanh hảo`, SĐT thật) trong khi
  `public/templates/` đã sạch từ 17/07. Lý do: **`2-Templates/` bị gitignore nên bản dọn làm ở máy
  khác không bao giờ về được qua git**, mà server local lại quét thư mục này TRƯỚC.
  → Live vẫn sạch, chỉ máy local bẩn. Đã chép đè; bản cũ ở `_Archive/2026-07-21_2-Templates-truoc-dong-bo/`.

**BÀI HỌC ĐO ĐẠC — sai 4 lần trong một phiên, đều CÙNG MỘT KIỂU: đo trên phần tử TỰ DỰNG thay vì
phần tử THẬT trên trang:**
1. Dựng nút bằng class mà **quên `id`** → không thấy khối `#btn-new-proposal !important` → báo sai
   "hai nút giống hệt nhau" (thực tế 149×48 vs 121×38). Chủ tool phải mở DevTools chỉ ra.
2. Đo `.member-list` ĐẦU TIÊN — nó nằm trong khối "Chờ duyệt" `display:none` → mọi số đo ra 0.
3. Đo bố cục SVG khi **chưa nạp `style.css`** nên trang chạy bằng font thay thế → số đo lệch hoàn
   toàn (số La Mã "lệch 0.7px" thực tế là 4.2px).
4. Vá toạ độ SVG bằng **pixel màn hình mà quên chia hệ số thu phóng** (1.5119) → vá quá tay, phải sửa lại.
→ QUY TẮC: ưu tiên đo phần tử thật trên trang. Nếu buộc phải dựng thì kèm ĐỦ id + class + ngữ cảnh
  cha, nạp đúng CSS/font, và luôn kiểm `innerWidth` + `display` trước khi tin con số.

### 2026-07-21 (nhánh `feat/login` — v1.13, vá lỗ hổng guard trạng thái tài khoản)
- **LỖ HỔNG THẬT: trạng thái tài khoản chỉ kiểm lúc ĐĂNG NHẬP, không kiểm lại khi vào trang.**
  `requireLogin()` cũ chỉ hỏi "có session không". Chỉ `tool.html` + `members.js` tự kiểm thêm;
  `/` và `/videos` KHÔNG. Hậu quả thật: admin bấm "Tạm khoá" nhưng phiên cũ của người đó còn hạn
  → họ vẫn đi lại trong portal tới khi phiên hết. (RLS vẫn chặn dữ liệu — `is_approved()` đòi
  status='active' — nên không rò nội dung, nhưng sai về mặt kiểm soát truy cập.)
- **Lỗi thứ 2 — guard FAIL-OPEN**: `if (p && p.status !== 'active')` — p null (lỗi mạng/RLS) thì
  bỏ qua cả điều kiện → CHO VÀO. Guard hỏng phải ĐÓNG.
- **Sửa: dồn về `requireLogin()` trong `auth.js`** (chỗ duy nhất mọi trang đều đi qua):
  status ≠ 'active' → `signOut('/login?state=' + pending|blocked)`; profile null → `blockPage()`
  phủ toàn trang + nút Thử lại, **KHÔNG đăng xuất** (lỗi mạng mà đá người ta ra là quá tay).
  `signOut(to)` nhận đích tuỳ chọn, chỉ chấp nhận đường dẫn nội bộ `^\/(?!\/)`.
- **BẪY suýt dính**: `signOut` được gắn thẳng làm event listener (`addEventListener('click',
  TSTAuth.signOut)`) → tham số `to` nhận Event object. Phải kiểm `typeof to === 'string'`,
  không thì nút Đăng xuất chuyển hướng bậy.
- `login.html`: `#pending-state` giờ dùng cho CẢ 2 trạng thái (pending ⏳ / blocked 🔒) qua
  `showAccountState()`; `afterLogin()` đọc `status` thay vì cột `approved` cũ (cần phân biệt
  "chờ duyệt" với "bị khoá" — cả hai đều approved=false) + fail-closed khi profile null.
- Verified không cần tài khoản: `?state=blocked/pending/rác` đúng 3 kiểu; `/videos`,`/members`
  chưa login → redirect kèm `?next=`; open-redirect `//evil.com` + `https://evil.com` → `/login`;
  Event object → `/login`. `auth.js?v=3`, `portal.css?v=24`, badge v1.13.
- **CHƯA test được (cần tài khoản thật — chủ tool chạy)**: đăng ký → chờ duyệt → duyệt → đăng nhập
  → xem video → **tạm khoá lúc đang mở web rồi chuyển trang** (chính là ca vừa vá) → nhân viên vào
  `/members` phải bị từ chối.
- **Điểm chờ chủ tool quyết**: policy UPDATE trên `profiles` đòi `is_admin()` ⇒ **nhân viên thường
  KHÔNG tự sửa được tên/phòng ban của mình**. Muốn cho phép: thêm policy update `id = auth.uid()`
  (trigger sẵn có đã cấm đổi role/status nên vẫn an toàn).

### 2026-07-20 (nhánh `feat/login` — v1.12, PUSH GIT KHÔNG DEPLOY)
- **Bối cảnh:** chủ tool làm tiếp Portal trên nhánh `feat/login` (local:8000, Supabase ĐÃ bật thật —
  key nằm trong `public/js/portal/config.js`). Push lên GitHub để về nhà làm tiếp; **`main` giữ
  nguyên**, `tool.thinksmartinsurance.com` không đổi.
- **BÀI HỌC LỚN NHẤT PHIÊN NÀY — Windows tắt Animation effects làm mọi animation vô hiệu.**
  Chủ tool "sửa hoài không thấy khác gì": registry `HKCU\Control Panel\Desktop\WindowMetrics\MinAnimate = 0`
  → Chrome báo `prefers-reduced-motion: reduce` → block ở `portal.css` ép mọi transition xuống
  `0.01ms` và `animations.js` return ngay. Đo được: `.sidebar` transition-duration `1e-05s` thay vì
  `0.34s`. Bật lại: `ms-settings:easeofaccess-visualeffects` → Animation effects On → **khởi động lại
  Chrome** (đọc thiết lập lúc khởi động, reload không đủ).
- **Logo rail bị ẩn mất** (đầu rail trống hoác): `.sidebar-brand > span` quét trúng cả
  `<span class="logo-icon">`. Sửa: `> span:not(.logo-icon)` ở 3 rule (2 desktop + 1 mobile override).
- **`clearProps: 'all'` của GSAP XOÁ SẠCH thuộc tính `style`** — kể cả `display:none` do phân quyền
  đặt. Hậu quả thật: Super Admin thấy thẻ "Tạo báo giá"; Nhân viên thường thấy thẻ số liệu +
  panel dành riêng Admin sau khi entrance chạy xong. Đo bằng thí nghiệm: style `display:none` → `""`.
  Sửa: `clearProps: 'transform,opacity'` (đã kiểm chứng giữ nguyên display), và phần tử bị ẩn thì
  KHÔNG tween.
- **`gsap.from()` lộ 1 khung hình ở trạng thái CUỐI** rồi mới kéo về đầu → giật một cái lúc hiện.
  Sửa: `gsap.set()` đặt trạng thái đầu ngay khi script chạy (shell còn `display:none`, chưa vẽ),
  rồi `gsap.to()` tới trạng thái cuối.
- **CSS transition đánh nhau với GSAP**: `.stat-card` có `transition: transform .25s`, GSAP ghi
  transform mỗi khung hình → mỗi lần ghi lại bị nội suy → trễ + snap. Sửa: `body.is-entering`
  tắt transition vùng đang tween (portal.css), animations.js bật/tắt class.
- **Animation rút gọn theo yêu cầu chủ tool**: bỏ 3 nhóm lệch nhịp, còn 1 nhịp — opacity + y 10px,
  0.32s, stagger 0.04s (tổng ~480ms).
- **Bảng thành viên chia 6 cột** (chủ tool: "một hàng ngang khó nhìn"): Thành viên · Phòng ban ·
  Quyền · Trạng thái · Tham gia · Thao tác, có hàng tiêu đề. **BẮT BUỘC dùng `subgrid`** —
  mỗi hàng tự dựng lưới riêng thì cột "Thao tác" (số nút đổi theo trạng thái+quyền) kéo co các cột
  còn lại lệch tới 70px (đã đo). `.member-table` là nơi DUY NHẤT định nghĩa chiều rộng cột;
  `.member-head`/`.member-list`/`.member-row` đều `grid-template-columns: subgrid`.
  Hệ quả: **đừng thêm padding/border trái-phải** cho 3 cái đó — subgrid thụt vào là lệch lại.
  ≤900px: bỏ subgrid, thành thẻ xếp dọc có nhãn `data-label`; nút thao tác nâng lên 44px.
- **Bỏ banner "Đang tải danh sách…"** (chủ tool chê): banner chen vào giữa trang, đẩy nội dung rồi
  biến mất → giật bố cục mỗi lần bấm Tải lại. Thay bằng `setLoading()`: nút đổi nhãn + khoá, bảng
  mờ 0.5 + `pointer-events:none`. Đo: chiều cao bảng 224px không đổi trước/trong khi tải.
  Lần tải ĐẦU dùng khung xương `.sk` cao đúng 66px = bằng hàng thật nên thay vào không nhảy.
  `#load-msg` giờ CHỈ dùng báo lỗi.
- **Super Admin dùng được MỌI công cụ** (chủ tool quyết): gỡ **5 chỗ** chặn —
  `tool.html` (đá về `/members`, nặng nhất), `index.html` ×2 (ẩn nav + ẩn hero, ép lưới 1 cột),
  `videos.html`, `members.js`. Gỡ thiếu chỗ tool.html thì bấm "Công cụ" vẫn bị văng ra.
- Versions: `portal.css?v=23`, `animations.js?v=3`, `members.js?v=6`, badge **v1.12** (5 chỗ).
- **GOTCHA công cụ đo**: (1) `resize_window` preset "desktop" báo thành công nhưng viewport VẪN 375px
  → luôn kiểm `innerWidth` trước khi tin số đo; (2) browser pane không chạy rAF khi ở nền → tween
  GSAP không bao giờ complete, phải `tl.progress(1, false)` để tua đồng bộ; (3) đo CSS mới phải
  `link.disabled = true` rồi mới inject — không thì rule CŨ vẫn thắng và đo ra kết quả sai.

### 2026-07-20 (owner quay lại tự làm; tách 2 nhánh: main cho sale, feat/login local)

**ĐÃ PUSH LÊN LIVE (main) — 2 lần, đều tách riêng, không dính feat/login:**
1. `ddd1944` — **Bản live tạm thời chỉ phục vụ Tool**: `/`, `/login`, `/videos` → 302 `/tool`.
   Owner thấy portal chưa hoàn thiện (Video học/Forum trống) lộ ra cho sale nên muốn dọn.
   Đặt redirect TRƯỚC `express.static` vì static tự trả `public/index.html` cho `/`.
2. `7f49f77` — **Xếp hạng sức khoẻ theo từng hãng (v1.11)**, `proposal.js?v=11`:
   - AIG 6 mục (giữ nguyên) · NLG 9 mục · Allianz 5 mục. Dùng chung cho IUL + Term Life.
   - **Allianz viết `Nontobacco` LIỀN**, khác `Non-Tobacco` của AIG/NLG — chính tả của hãng,
     đừng "sửa cho đồng bộ". Owner nói danh sách Allianz là **tạm**, sẽ gửi bản chính thức sau.
   - `rateCarrierOf()` mới: `carrierOf()` trả `'Bản nháp'` cho file trong `4-Clients` nên MẤT dấu
     hãng → bản nháp "Vu Nguyen - AIG IUL.svg" sẽ ra danh sách sai. Hàm mới soi tên/đường dẫn file.
   - `ALL_RATE_CLASSES` (gộp mọi hãng, loại trùng) dùng cho việc TỰ NHẬN DIỆN ô xếp hạng trong bản
     vẽ chưa gắn id — nhận diện xảy ra TRƯỚC khi biết hãng nên không được dùng list của một hãng.

**LÀM Ở LOCAL (feat/login, CHƯA push)** — 2 commit `38ad6c9` + `f0bf673`:
- Supabase bật thật: dán khoá, tắt "Confirm email", bật Email provider. Owner = `super_admin`.
- **Quản lý thành viên `/members`**: 3 role `super_admin > admin > user`, 4 trạng thái
  `pending/active/suspended/deleted`, cột `department`. Nút: Duyệt · Phòng ban · Đặt/Bỏ quyền Admin ·
  Tạm khoá · Mở khoá · Xoá (xoá = mềm, ẩn khỏi danh sách, tài khoản vẫn còn để khôi phục).
- **Bảo mật ở DB chứ không chỉ ẩn nút**: trigger `enforce_member_update()` + RLS. Đã test bằng cách
  gọi thẳng API (bỏ qua giao diện): super_admin tự đổi quyền mình → BỊ CHẶN. Admin chỉ đụng được
  `user`, không đổi được role, không xoá được.
- Cột `approved` cũ được trigger `sync_profile_flags()` tự đồng bộ `= (status='active')` → mọi guard
  cũ đọc `approved` vẫn đúng, không phải sửa.
- Super Admin **bị chặn vào Tool** (vào `/tool` → đá về `/members`), ẩn luôn mục Công cụ khỏi nav.
  → Muốn tự test Tool phải tạm đổi role mình về `admin`.
- UI: Tool thành mục con dùng CHUNG sidebar với portal (bỏ rail riêng); hover mềm toàn cục bằng
  `:where(...)` (specificity 0 nên không đè transition riêng của component); nội dung chia thẻ bo góc;
  topbar thành thẻ nổi bo 20px khớp rail; bỏ `max-width:1200px` của `.dash` để header và nội dung
  chung một cột; rail/topbar/nội dung cùng thụt vào 8px; `--r-xl` 18px→20px ở CẢ 2 file CSS.
- `.gitignore`: bỏ qua `.agents/`, `skills-lock.json`, `.claude/skills/supabase*`, `.codex/`
  (skill bên thứ 3 cài bằng `npx skills add` — cài lại được, ~240 KB không cần vào repo).

**BẪY GẶP PHẢI HÔM NAY (đọc kỹ, đều tốn thời gian):**
- **PowerShell `Get-Content`/`Set-Content` PHÁ tiếng Việt**: dùng để bump `?v=` hàng loạt → 5 file HTML
  vỡ hết dấu (`Trang nội bộ` → `Trang ná»™i bá»™`). Phát hiện nhờ tiêu đề tab. Khôi phục bằng
  `git checkout -- <file>` rồi bump lại bằng công cụ sửa file. **Trên Windows đừng sửa hàng loạt file
  có tiếng Việt bằng PowerShell.**
- **`git commit -m` với here-string chứa dấu nháy kép bị vỡ** thành nhiều pathspec → dùng
  `git commit -F <file>` (ghi message ra file trước) cho message dài/có tiếng Việt.
- **`node --check` KHÔNG bắt được `ReferenceError`**: đổi tên `RATE_CLASSES` xong vẫn còn 2 chỗ gọi
  tên cũ, cú pháp vẫn "OK" nhưng chạy sẽ vỡ panel sửa chữ. **Đổi tên biến xong phải `grep` tên cũ.**
- **Rule chung `aside { overflow: hidden }`** cắt mất phần bung của sidebar dạng `<aside>` — phải
  `overflow: visible` cho riêng nó.
- **Breakpoint phải TRÙNG giữa các hệ layout**: sidebar ẩn ở 820px nhưng layout mobile của tool bật ở
  900px → dải 821–900px hiện CẢ hai hệ nav. Đã đưa về cùng 900px.

### 2026-07-19 (BÀN GIAO — owner chuyển Portal cho team PD, push v1.10)
- **Owner quyết định dừng vai trò ở đây, bàn giao phần Portal cho team PD làm tiếp.**
  Push v1.10 lên main (+ 4 branch feat/* để team thấy cấu trúc từng phần).
- **Trạng thái bàn giao cho team PD:**
  - Portal Đợt 1 chạy LOCAL đầy đủ ở chế độ mở (chưa bật Supabase). Live site sau deploy
    cũng chạy chế độ mở — Tool hoạt động như cũ, trang chủ mới có notice "chưa bật tài khoản".
  - Việc kế tiếp theo thứ tự: (1) tạo Supabase project + chạy `supabase/schema.sql` + dán key
    vào `public/js/portal/config.js` (làm theo `SETUP-SUPABASE.md`, 10 phút);
    (2) test e2e đăng ký → duyệt → đăng nhập → video → guard /tool; (3) Forum Đợt 2 +
    trang quản lý thành viên (mỗi phần 1 branch `feat/*` theo conventions.md).
  - Google Sheet Product Hub: owner đã chia 4 tab, quyền "anyone with link = writer".
    Nội dung cập nhật CHƯA vào Sheet (bị dừng giữa chừng) — toàn bộ nội dung chuẩn đã nằm
    trong `product/PRODUCT-HUB.md` + `build-product-hub.py` (nguồn sự thật), chép sang Sheet
    theo đó. Kỹ thuật điều khiển Sheet không cần login đã thử OK: name box + synthetic Enter,
    paste bằng ClipboardEvent+DataTransfer, verify bằng gviz CSV (`&range=`).

### 2026-07-19 (PORTAL Đợt 1 — biến tool thành trang nội bộ công ty, v1.10)
- **Chuyển hướng lớn (owner quyết):** web trở thành portal nội bộ Thinksmart Insurance:
  (1) Video học cho sale, (2) Forum (Đợt 2), (3) Tool thành mục con, (4) Login + phân quyền
  admin/user. Stack chọn: **Supabase** (Postgres+Auth, free tier) + video **YouTube unlisted
  hoặc Google Drive** + đăng nhập email/mật khẩu + lộ trình MVP.
- **Cấu trúc mới:** `/` = trang chủ portal (index.html MỚI) · `/login` · `/videos` ·
  `/tool` = editor cũ (`git mv index.html → tool.html`, KHÔNG đổi đường dẫn tương đối —
  route không có "/" cuối nên asset vẫn resolve về gốc; server tự redirect `/tool/` → `/tool`).
  Route khai báo trong `PORTAL_PAGES` cuối server.js. Gotcha: Express non-strict routing —
  `app.get('/tool')` match luôn `/tool/`, phải check `req.path` để redirect.
- **File mới:** `public/portal.css` (token COPY từ style.css §1 — đổi token phải sửa cả 2),
  `public/login.html`, `public/videos.html`, `public/js/portal/{config,auth,videos}.js`,
  `supabase/schema.sql` (profiles + videos + RLS + trigger + is_admin()/is_approved()),
  `SETUP-SUPABASE.md` (hướng dẫn owner 10 phút).
- **Chế độ mở:** khi `config.js` chưa có key Supabase → không bắt đăng nhập, tool chạy như cũ,
  các trang hiện notice "chưa bật hệ thống tài khoản". Dán key vào là toàn bộ guard bật.
- **Version badge giờ ở 4 chỗ** (tool.html sidebar + footer của index/login/videos) —
  khi bump: `grep -rn "version-badge" public/*.html`. Đã bump **v1.10 · 19/07/2026**.
- Đã verify local (port 8000): 4 trang 200, `/tool/`→301, tool load đủ 12 file SVG,
  0 lỗi console. CHƯA test được flow đăng nhập thật — chờ owner tạo Supabase project
  (PENDING: verify e2e sau khi dán key rồi mới push/deploy).
- Gotcha máy D:\ hôm nay: Browser pane tab cũ báo viewport 0×0 (probe fixed inset:0 width=0)
  — mở TAB MỚI (tabs_create) là có viewport thật 1280×720; đừng tin số đo tab cũ.
- **Workflow branch mới (owner mandate):** Đợt 1 được tách thành 4 branch merge --no-ff lần lượt
  (`feat/tool-route` → `feat/portal-shell` → `feat/auth-login` → `feat/videos-page`), mỗi trạng thái
  sau merge đều chạy được (redirect tạm `/`→`/tool` ở branch 1). Từ nay MỌI phần mới làm branch
  riêng như vậy — xem conventions.md "Branch theo từng phần". Gotcha verify: server test nền có thể
  thành zombie giữ port 8000 → node mới EADDRINUSE và curl trúng server CŨ (kết quả sai);
  trước mỗi vòng test: `netstat -ano | grep :8000` + taskkill PID cũ.

### 2026-07-17 (v1.03 — Product Hub: sheet + repo, docs-only push)
- **Owner lập Product Hub** (hỏi "trong ngành product gọi là gì" → Product Docs/Hub): thư mục mới
  `product/` trong repo — `build-product-hub.py` (NGUỒN SỰ THẬT: sửa DATA rồi chạy lại),
  sinh `PRODUCT-HUB.md` + `Thinksmart-Product-Hub.xlsx` (4 tab: Vision & Nguyên tắc / Roadmap /
  Release Notes / Bài học).
- **Google Sheet** (bản nhìn-cho-người, tài khoản Drive xuanthuongqtkd@gmail.com):
  folder "Thinksmart Tool — Product" → sheet "Thinksmart Product Hub"
  (id `1Y8kpimASEXucj8a5Mio2BNVabfwaX2ERZBKJ7cPUClQ` — link trong PRODUCT-HUB.md).
  Upload qua Drive connector dạng CSV textContent (base64 chép tay 18k ký tự bị lỗi — bài học:
  binary qua connector dễ hỏng, text thì an toàn).
- **Roadmap trong hub = kết quả phân tích 6 lăng kính** (workflow sale / trải nghiệm khách /
  proposal / compliance / khảo sát thị trường / vận hành đội — ~75 ý tưởng lọc còn ~25, nhóm
  NOW/NEXT/LATER/LẰN RANH). Ưu tiên NOW: Gửi 1 chạm, Presentation mode, Backup nháp JSON,
  Disclaimer tự động, QR vCard, tin nhắn mẫu.
- Docs-only push, app KHÔNG đổi — badge vẫn bump v1.03 theo mandate (quy tắc đơn giản hơn ngoại lệ).

### 2026-07-17 (v1.02 — nháp trình duyệt cho site live: 100 sale dùng đồng thời)
- **Owner hỏi "100 sale vào cùng lúc thì sao?" → chốt mô hình 4 bước: Truy cập → Sửa → Lưu nháp
  (~10 bản, tạm trên web) → Download.** Giải pháp: nháp lưu localStorage TRÌNH DUYỆT từng sale —
  không server ghi file (Vercel read-only + lộ data giữa các sale), không cần đăng nhập/DB.
- Implementation: server.js `/api/svgs` trả `draftsMode: process.env.VERCEL ? 'browser' : 'server'`;
  core.js: `appState.draftsMode` + `usesBrowserDrafts()` + `MAX_LOCAL_DRAFTS = 10` +
  `appendLocalDraftsToList()` (dùng chung static + server-browser); save/create/delete-refresh
  mode-aware; nháp local: mở qua `/api/svgs/content` khi có server (templatePath dạng workspace
  không fetch thẳng được). Máy local (không VERCEL env) giữ nguyên ghi `4-Clients/`.
- **BUG NẶNG tóm được nhờ test round-trip**: nháp lưu "$999.99" mở lại thành "$999.99.70" — re-apply
  fields thiếu `clearSiblingTspans` (đuôi ".70" của giá trị gốc nằm ở tspan em). Fix kép:
  `collectEditedFields` lưu CẢ DÒNG (`getLineTextContent`) thay vì mảnh tspan đầu, và re-apply chỉ
  đụng dòng thực-sự-khác + clear siblings (guard tương thích record cũ). KHÔNG được xoá mù siblings —
  sẽ phá dòng nhiều tspan chưa sửa.
- Verified (server riêng `VERCEL=1 PORT=8100`): draftsMode browser, tạo nháp vào localStorage +
  điền tên, sửa + Lưu Nháp, reload → nháp trong nhóm "Bản nháp" mở đúng ($999.99 sạch, các dòng
  chưa sửa nguyên vẹn), cap 10 hiện dialog "Kho nháp đã đầy", xoá nháp OK; port 8000 (server cũ
  chưa restart, không trả draftsMode) → default 'server', ghi file như cũ; 0 lỗi console.
- `core.js?v=14`, badge v1.02. LƯU Ý: server local của owner cần restart mới trả draftsMode
  (không bắt buộc — thiếu flag thì frontend tự về 'server').

### 2026-07-17 (sau push v1.01 — app dialog + auto điền tên khách, CHƯA PUSH)
- **Modal dialog theo design system thay alert()/prompt() hệ thống** (owner chê alert xấu):
  `showAppDialog/showAppAlert/showAppPrompt` (core.js, trước collectEditedFields) + CSS section 22
  (`.app-dialog-*`: surface card, icon bubble theo tone info/warning/danger, scrim 50%, Enter/Esc,
  focus restore, aria dialog). ĐÃ THAY 13 alert() + 1 prompt() trong core.js — 2 confirm() sync
  (rời trang chưa lưu, xoá nháp) GIỮ nguyên vì đổi sẽ phải async-hoá cả chuỗi caller (việc sau).
- **"Tạo bản cho khách" giờ điền luôn tên khách vào bản vẽ** (owner yêu cầu "nhớ thay đổi ở ô tên"):
  `applyClientNameToDoc(name)` — ghi vào dòng `#client-name` (proposal) hoặc `text[data-nc="name"]`
  (name card) TRƯỚC khi serialize/clone → file mới sinh ra đã mang tên; ô editor + canvas hiển thị
  đúng ngay khi bản mới mở.
- **GOTCHA mới: đừng mở dialog bằng requestAnimationFrame** — tab nền/pane throttle không chạy rAF
  → dialog kẹt opacity 0. Dùng force reflow (`void el.offsetWidth`) rồi add class `.open` đồng bộ.
- Verified server mode: dialog "Chưa chọn mẫu" đẹp (mở tức thì, focus OK, Esc đóng), flow tạo bản
  "Test Khach A" → file + ô tên + canvas đều đúng, xoá nháp test sạch, master không đổi, 0 lỗi
  console. `core.js?v=13`, `style.css?v=20`. Push sau (nhớ bump badge → v1.02 khi push).

### 2026-07-17 (EOD push từ máy D: — badge v1.01)
- Push cả ngày làm việc: badge version, font thật (từ máy E: chưa push? — không, đã push 16/07;
  hôm nay là phần máy D:), audit fixes + mobile (style.css v19), placeholder 5 master
  (public/templates cập nhật cả 5), skill files.
- **Owner mandate mới, đã ghi vào SKILL.md + conventions.md "Pre-push checklist"**: MỖI lần push
  phải (1) bump version badge index.html (lần này v1.00→v1.01), (2) update & học skill files trước
  khi commit. Nhớ làm mãi mãi về sau.

### 2026-07-17 (placeholder chuẩn cho 5 mẫu gốc — owner chốt 3 phương án recommended)
- **Đổi data giả lộn xộn trong MỌI master thành bộ placeholder thống nhất** (owner yêu cầu
  "Place Holder chuẩn chỉnh", chốt qua 3 câu hỏi):
  - Khách hàng (4 proposal): **Nguyen Van An · 43 · Male · Standard Non-Tobacco · Texas**
    (tên ASCII không dấu — khớp regex detect client-name; 43 khớp fallback literal; Texas ∈ US_STATES).
  - Đại lý (4 proposal): **Ten Tro Ly / Ten Agent · (000) 000-0000** — hết lộ SĐT thật Tony/Jason;
    "(000..." khớp isPhone `^\(\d{3}\)`; số bắt đầu 0 nên formatPhoneValue không đụng.
  - Số liệu kế hoạch GIỮ nguyên bộ nhất quán ($152.70×12×20=$36,648); riêng TERMLIFE - NLG
    (bản bẩn: Trương thị thanh hảo/Sài gòn bình thạnh/VN phones/$1000.99) đưa về bộ term chuẩn
    $300,000 · $77.00/$120.00/$180.00 → **đóng luôn PENDING #0**.
  - Name Card: Nguyen Van An / (000) 000-0000 ×2 / email@thinksmartinsurance.com (hết lộ aileen@).
- **Cách làm đáng tái dùng** (file 2.2–8.8MB không kéo qua eval được): dùng chính engine app —
  `loadSvgContent(svgsList[i])` → set value ô input + dispatch `input`/`change` (đi qua
  `applyTextValue` nên multi-tspan sạch, id client-* được giữ) → serialize + POST
  `/api/svgs/save` vào file tạm `4-Clients/_ph_N.svg` (route hợp lệ) → cp đè
  `2-Templates/**` + `public/templates/**` → rm tạm → `clearDirty()` trước khi load file kế.
- Verified sau reload: cả 5 master đủ field (16/13/16/13/5), giá trị placeholder đúng 100%,
  dropdown hợp lệ, 0 lỗi console. Backup 5 bản gốc cũ ở scratchpad phiên này (mất khi dọn máy —
  nếu cần giữ lâu, copy vào _Archive).

### 2026-07-17 (tối ưu mobile + đóng 4 lỗi audit — /ui-ux-pro-max)
- **Đóng cả 4 lỗi audit** (PENDING 5a–5d cũ):
  - `.header-right .btn` mobile: padding 9px 11px → **12px** ⇒ 44×44px (18 icon + 24 pad + 2 border).
  - Dark theme: `.file-count-badge`/`.version-badge` color → `--brand-hover` (4.38 → **5.71:1**).
  - `.nav-count` color `--text-3` → `--text-2` (4.45 → **5.81:1** trên surface-3, cả 2 theme đạt).
  - Copy bước 3 màn chào: "Lưu nháp" → "Lưu Nháp" (khớp nút header). Phần "đuôi file trong cây"
    là false positive — a11y tree đọc attribute `title` (có đuôi), text hiển thị vốn đã sạch.
- **Safe-area cho iPhone tai thỏ** (meta có `viewport-fit=cover` nhưng CSS chưa từng dùng env()):
  mobile block thêm `env(safe-area-inset-*)` cho `.app-header` (trái/phải, landscape),
  `.canvas-status-bar` (height + padding-bottom), `.sidebar-actions-footer` (nút Xuất trong
  bottom-sheet không đè thanh home), `.sidebar-version-footer` (chân drawer). Fallback 0px — desktop
  và Android không đổi.
- **Chống pull-to-refresh Android**: `overscroll-behavior: none` trên body;
  `overscroll-behavior: contain` cho `.tree-container` + `.inspector-content` (scroll trong
  drawer/sheet không lan ra body).
- **Tap feedback**: `.tree-file-item:active` nền surface-3 (mobile không có hover).
- Verified localhost 375px + 1280px: nút header 44×44 mobile / 75×38 desktop (đo bằng phần tử tạo
  mới — số đo phần tử cũ sau resize pane bị đơ, CSSOM xác nhận rule nằm đúng trong @media),
  contrast đo lại 5.71/5.81, copy đúng, 0 lỗi console, không tràn ngang. `style.css?v=19`.

### 2026-07-17 (máy phụ D:\ — học project + audit design bằng /frontend-design)
- **Máy phụ mới** (user `hadan`): repo clone tại `D:\AI-Production-Engineer\Proposal2026\Proposal2026`,
  remote `hadangtien0702-dot/Thinksmarttool`, local ngang origin/main. Skill user-level đã cài
  (frontend-design, ui-ux-pro-max, design-lessons stub — bản gốc ở máy chính E:\, cần merge).
- **GOTCHA máy này: Browser pane timeout HẲN khi screenshot** — audit UI hoàn toàn bằng
  `javascript_tool` sync eval (rect, token qua phần tử tạo mới, contrast tự tính). Hoạt động tốt.
- **Audit toàn tool trên localhost:8000** (light+dark, desktop+375px): nền tảng vững — a11y đạt
  (nút có tên 100%, input đủ aria-label, keyboard OK, heading đúng bậc), contrast chính đạt AA cả
  2 theme, mobile không tràn ngang. Tìm thấy 4 lỗi nhỏ → ghi vào PENDING 5a–5d bên trên.
- Docs pruned: conventions.md mục Fonts (đã hết "italics chưa bundle" — fix 17/07), deployment.md
  thêm custom domain `tool.thinksmartinsurance.com`.

### 2026-07-17 (badge phiên bản app ở chân sidebar trái)
- Owner yêu cầu hiển thị số version trong UI để phân biệt bản đang chạy (local vs live).
- Thêm `.sidebar-version-footer` (badge `v1.00` + ngày `17/07/2026`) vào cuối `sidebar-left`
  trong `index.html`; CSS mới ngay sau `.tree-container` trong `style.css` (dùng `--brand-soft`,
  `--divider`, `--fs-2xs` — tự tương thích light/dark). `style.css` bump → `?v=18`.
- **Convention mới: mỗi lần deploy, cập nhật tay số version + ngày trong `sidebar-version-footer`
  (index.html)** — đây là chỗ duy nhất giữ version hiển thị.

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

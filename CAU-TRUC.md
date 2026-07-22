# Cấu trúc dự án Thinksmart Tool

Đọc file này **trước khi đổi tên hay di chuyển bất kỳ thư mục nào**. Cập nhật lần cuối 22/07/2026.

Lý do file này tồn tại: `server.js` **khoá cứng tên một số thư mục**. Đổi tên chúng là công cụ
hỏng ngay trên bản live, mà không có thông báo lỗi nào rõ ràng.

---

## 🔴 KHOÁ — đổi tên là hỏng tool

`server.js` gọi thẳng tên bốn thư mục này. Muốn đổi thì phải sửa `server.js` **và** kiểm chứng lại
cả ba công cụ trước khi push.

| Thư mục | Ai đọc | Nội dung |
|---|---|---|
| `2-Templates/` | `PROPOSAL_SCAN_DIRS` (server.js:39) | Mẫu gốc SVG (AIG, NLG, Allianz). 12MB, ngoài git — bản phục vụ nằm ở `public/templates/`. |
| `4-Clients/` | `PROPOSAL_SCAN_DIRS` + `/api/svgs/save` | **Báo giá khách thật.** Ngoài git, KHÔNG BAO GIỜ đẩy lên repo public. |
| `Name Card/` | `PROPOSAL_SCAN_DIRS` | `Chung/Sale Name Card.svg`. **TRONG git** — live cần file này. |
| `Brochure/` | `LIBRARY_SECTIONS.brochure` (server.js:264) | 6 file AIG/NLG. **TRONG git** — live cần. |
| `Bang so sanh quyen loi cac hang/` | `LIBRARY_SECTIONS.soSanh` | 16 logo hãng + `Compare.html`. **TRONG git**. |

> ⚠️ **`Brochure/` và `Name Card/` PHẢI nằm trong git.** Chúng từng bị liệt kê trong `.gitignore`
> kèm chú thích "local-server only, not used by the static Vercel build" — **chú thích đó sai**.
> Bản live chạy `server.js` thật và đang phục vụ 7 file trong hai thư mục này. May là chúng được
> commit *trước* khi luật ignore được thêm nên live không hỏng, nhưng luật đó là cái bẫy: thêm
> brochure MỚI thì git lặng lẽ bỏ qua → chạy ở máy, mất trên live. Đã gỡ luật 22/07/2026.
>
> Kiểm bất cứ lúc nào:
> ```
> curl -s "https://tool.thinksmartinsurance.com/api/library?type=brochure"
> ```

---

## 🟢 Mã nguồn

| Đường dẫn | Nội dung |
|---|---|
| `server.js` | Express: phục vụ `public/`, API quét file, lưu, thư viện tải về. |
| `public/` | **Toàn bộ frontend.** 5 trang HTML + `js/` (mỗi công cụ một file) + `style.css` / `portal.css` + `fonts/` + `templates/` (bản mẫu phục vụ cho web). |
| `public/js/` | `core.js` · `proposal.js` · `brochure.js` · `namecard.js` · `sosanh.js` · `main.js` · `animations.js` · `ui-dialog.js` · `portal/` (auth, config, members, videos). |
| `supabase/` | Lược đồ DB + policy. |
| `product/` | Tài liệu sản phẩm (roadmap, release notes) — không phải code. |
| `.claude/skills/thinksmarttool/` | Kho kiến thức dự án. **`references/changelog.md` là nguồn sự thật mới nhất.** |

---

## ⚪ Cục bộ — không lên repo

| Thư mục | Vì sao ngoài git |
|---|---|
| `Account/` | Họ tên, email, **mật khẩu** đội sale. Tuyệt đối không public. |
| `3-Export-PDF/` | Nơi tool ghi file xuất ra. Gỡ khỏi git 22/07 — lần tới xuất cho khách thật mà còn tracked thì `git add -A` là lộ hồ sơ khách. |
| `5-Design-Sections/` | Bản nháp thiết kế các section (Allianz…). |
| `2-Templates/`, `4-Clients/` | Xem bảng đỏ ở trên. |
| `node_modules/` | Cài lại bằng `npm install`. |

---

## 📦 Đã chuyển ra ngoài dự án (22/07/2026)

Nằm ở **`E:\2026\Thinksmart\Design\Proposal2026 - File nguon\`** — *không xoá, chỉ dời*:

- `1-Design/` — `Proposal NLG AIG.ai` (34MB) + `Name Card.ai`. File nguồn Illustrator của bộ mẫu.
- `_Archive/` — script cũ, bản sao lưu `2-Templates` trước đồng bộ, log.

Lý do: không code nào đọc hai thư mục này (đã kiểm `server.js` + `public/js/`), mà
`Proposal NLG AIG.ai` bị commit lại **5 lần** nên chiếm ~186MB trong lịch sử git.

> ℹ️ **Lịch sử git vẫn nặng 207MB** dù file đã dời — git giữ vĩnh viễn mọi phiên bản đã commit.
> Dọn được, nhưng phải viết lại lịch sử + `--force` push và mọi bản clone khác phải clone lại.
> **Chưa làm, chờ chủ tool quyết.** Từ nay không phình thêm vì `1-Design/` đã vào `.gitignore`.

---

## Chạy và triển khai

```bash
npm install
node server.js          # http://localhost:8000
```

Push lên `main` → Vercel tự deploy → `tool.thinksmartinsurance.com`.
**Chỉ có MỘT nhánh `main`.** Đừng tạo nhánh để giấu tính năng chưa xong — cách đó đã hỏng một lần
(xem đầu `changelog.md`); muốn ẩn theo nơi chạy thì dùng `location.hostname`.

**Trước mỗi lần push, bắt buộc:** bump badge phiên bản (5 file HTML) + bump `?v=` của file đã sửa +
cập nhật `changelog.md`. Chi tiết ở `.claude/skills/thinksmarttool/references/conventions.md`.

---

## Còn lộn xộn — đợt 2, chờ duyệt

Tên thư mục hiện không theo quy tắc nào: nhóm có đánh số (`2-Templates`, `3-Export-PDF`,
`4-Clients`, `5-Design-Sections` — và số 1 giờ đã trống) trộn với nhóm không đánh số (`Account`,
`Brochure`, `Name Card`, `Bang so sanh quyen loi cac hang`), lẫn tiếng Việt không dấu với tiếng Anh,
có tên chứa khoảng trắng.

Muốn thống nhất thì **phải sửa `server.js` kèm theo** (4 thư mục ở bảng đỏ) và kiểm chứng lại cả ba
công cụ. Chưa làm — cần chủ tool duyệt sơ đồ tên mới trước.

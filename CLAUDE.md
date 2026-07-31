# Thinksmart Tool — đọc gì trước khi làm

> File này nạp TỰ ĐỘNG mỗi phiên trong thư mục dự án. Nó **cố ý ngắn**: kiến thức
> thật nằm ở project skill bên dưới, đây chỉ là biển chỉ đường.
> Lập 2026-07-27.

## 1. Nạp project skill TRƯỚC KHI làm bất cứ việc gì

```
.claude/skills/thinksmarttool/SKILL.md
```

Đó là **nguồn sự thật** của dự án, kèm 6 file tham chiếu:

| File | Khi nào đọc |
|---|---|
| `references/changelog.md` | **ĐỌC MỖI PHIÊN, đọc SAU CÙNG** — trạng thái mới nhất + danh sách việc CÒN TREO. Mâu thuẫn với bất cứ chỗ nào khác thì **file này thắng** (245 KB, luôn được cập nhật) |
| `references/architecture.md` | Cấu trúc thư mục, API `server.js`, luồng dữ liệu |
| `references/tools.md` | Từng công cụ: Proposal · Brochure · Name Card · So sánh quyền lợi |
| `references/conventions.md` | Bump cache-version, quy tắc git, workflow local-first, cách kiểm chứng |
| `references/deployment.md` | GitHub + Vercel, hai URL, các bước publish |
| `references/design-lessons.md` | **Đọc TRƯỚC mọi việc UI**, ghi bài học mới vào SAU |

**Và cập nhật lại chúng cuối phiên** — skill có hẳn mục "Keep this skill current".

## 2. Luật TUYỆT ĐỐI về nội dung — không có trong skill, nhớ kỹ

**Số liệu bảo hiểm KHÔNG được tự sửa, tự làm tròn, tự suy ra.** Chép nguyên văn từ
nguồn anh Tiến đưa. Thiếu thì **hỏi**, không đoán.

Sai một con số trong bảng minh hoạ quyền lợi là **sai với khách hàng thật** của một
công ty bảo hiểm nhân thọ. Đây là loại lỗi không có "sửa sau cũng được".

## 2b. LUẬT VỀ 4 MẪU PROPOSAL — đọc TRƯỚC khi thay file mẫu

Đưa lên đây (thay vì để trong changelog 245 KB) vì **31/07/2026 tôi đã vấp đúng chỗ này**:
luật dưới có sẵn trong changelog từ 15/07 mà tôi không tra, thay mẫu mới xong làm vỡ.
Anh Tiến: *"anh nhớ cái này đã note lại rồi mà em, em không kiểm tra hả em?"*

**① Mục "3. Thông tin đại lý" CHỈ ĐƯỢC CÓ ĐÚNG 4 Ô:**
Tên Agent Assistant · SĐT Agent Assistant · Tên Licensed Agent · SĐT Licensed Agent.
CEO **không** được sửa. Thừa ô nào cũng là lỗi — sale gõ nhầm vào tiêu đề là phá bản vẽ.

**② Bộ dò trường neo theo NHÃN, không theo toạ độ.** Vùng đại lý = mọi dòng nằm DƯỚI chữ
`PRESENTED BY` (`yPresentedBy` trong `js/proposal.js`). Ngưỡng cứng `Y >= 1100` cũ **đã vỡ**
khi chủ tool xuất lại mẫu với bố cục dịch xuống. Đừng quay về ngưỡng cứng.

**③ Thay file mẫu — 5 bước, thiếu bước nào cũng có lỗi thật đã xảy ra:**
1. **Sao lưu** bản đang chạy trước khi ghi đè.
2. Thay vào **CẢ HAI** nơi: `2-Templates/<hãng>/` **và** `public/templates/`. Đối chiếu mã băm.
   `2-Templates/` bị gitignore → thứ chạy trên live là `public/templates/`.
3. ☠️ **Sao lưu KHÔNG được để trong `2-Templates/`** — thư mục đó bị `PROPOSAL_SCAN_DIRS`
   quét, cây thư mục lập tức thành 9 mẫu (4 bản cũ hiện trùng tên). Để ở `_Archive/`.
4. **Nén ảnh nền nếu > 2800px.** File xuất ra chỉ 1190px bề ngang. Đo 31/07: NLG
   5802px → 2800px = **8,18 → 2,60 MB (−68%)**. **GIỮ PNG** — ảnh có vùng trong suốt
   (alpha 0..255), chuyển JPEG nhẹ hơn 6 lần nhưng **hỏng nền**.
5. **Kiểm bằng chính hàm thật của tool** (`loadSvgContent` + `populateProposalTextsEditor`
   chạy trong một trang đo tạm), và **IN RA ĐỌC TỪNG Ô** — đếm số ô rồi báo xong là cách
   tôi để lọt 7 ô rác ngày 31/07.

**④ Số La Mã trong huy hiệu mục có thể là `<text>` HOẶC `<path>`** (chủ tool create outlines).
Đừng grep `<text>` rồi kết luận "mất chữ" — phải render và **đếm phần tử nằm trong ô huy hiệu**.

## 3. Chạy thử ở máy

```bash
PORT=8000 node server.js
```

Trong ngày **chỉ làm ở máy**, KHÔNG push từng thay đổi. Cuối ngày mới một lần
commit + push (Vercel deploy lúc đó). Chi tiết ở `references/conventions.md`.

## 4. Ngăn nhớ riêng của dự án

`~/.claude/projects/E--2026-Thinksmart-Sale-Proposal2026/memory/` — nay chỉ giữ vài
ghi chú KHÔNG có trong skill. Có gì mâu thuẫn thì **skill thắng**, và sửa lại ghi
chú cho khớp.

> Bối cảnh con người (anh Tiến là ai, cách làm việc, góc nhìn sản phẩm) nằm ở
> `~/.claude/CLAUDE.md` — tự nạp ở mọi dự án, không lặp lại ở đây.

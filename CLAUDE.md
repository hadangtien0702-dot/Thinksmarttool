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

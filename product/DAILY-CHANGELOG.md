# Thinksmart Tool — Daily Changelog

Nhật ký kiểm tra thư mục và tình trạng sản phẩm theo ngày. File này là **append-only**:
mỗi ngày thêm một mục mới ở đầu phần `Nhật ký`, không sửa lại lịch sử cũ trừ khi cần đính chính
và phải ghi rõ lý do.

## Quy trình hằng ngày

1. Đọc trạng thái Git (`branch`, `HEAD`, `status`, commit mới) và các tài liệu sản phẩm hiện tại.
2. Đối chiếu version badge, asset version, module/API/schema có thay đổi.
3. Ghi mục mới vào file này, kể cả ngày không có thay đổi.
4. Thêm một dòng cùng ngày vào tab `DAILY LOG` của
   `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx`.
5. Cập nhật trạng thái vòng lặp hằng ngày trong tab `PIPELINE`; chỉ thêm dòng vào
   `VERSION TRACKING` khi có chức năng hoặc release mới. Dòng mới được chèn tại hàng 5 để mục mới nhất luôn ở trên.
6. Kiểm tra công thức và render trực quan các tab workbook vừa thay đổi.
7. Không sửa code ứng dụng, không commit, không push và không deploy trong lượt kiểm tra hằng ngày.

## Phạm vi an toàn

- Chỉ ghi metadata kỹ thuật và mô tả chức năng.
- Không đọc hoặc đưa dữ liệu từ `.env`, `Account/`, `4-Clients/`, `2-Templates/`,
  `3-Export-PDF/` hay dữ liệu khách hàng vào nhật ký/workbook.
- Nếu worktree có thay đổi chưa commit của người dùng, chỉ ghi nhận; không ghi đè hoặc hoàn tác.

## Nhật ký

### 2026-07-23 — Khởi tạo theo dõi hằng ngày

| Trường | Giá trị |
|---|---|
| Trạng thái | Đã kiểm tra cuối ngày; `v1.27` đã phát hành; có WIP mới — chỉ ghi nhận, không sửa |
| Branch | `main` |
| HEAD | `89bc051` — `feat(bao-gia): mau Allianz them duong line + go muc trung (v1.27)` |
| UI version | `v1.27` — 5 trang đã đồng bộ |
| Release kế tiếp | `v1.28` đang có WIP “xem tải gì”, chưa phát hành |
| File thay đổi trong release gần nhất | `v1.27`: 8 file; 382 dòng thêm, 309 dòng xoá |
| WIP trong worktree lần đọc gần nhất | 11 file code; 147 dòng thêm, 26 dòng xoá |
| Workbook | 271 dòng thay đổi trong `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx` |

Thay đổi/chức năng đã đối chiếu:

- Đổi `VERSION TRACKING` sang thứ tự mới nhất ở trên: giữ đủ 271 dòng, mục mới chèn tại hàng 5 và lịch sử cũ tự đẩy xuống.
- Hai automation 07:30 và 15:30 đã cùng áp dụng quy tắc này; không append mục mới xuống cuối bảng.
- Sửa nhãn KPI trên `PIPELINE` thành `TÍNH NĂNG ĐÃ SỬA VÀ THÊM`; ô số giữ công thức tự đếm từ `VERSION TRACKING`.
- Thêm quyền `Nhân viên`/`Admin` khi Super Admin tạo tài khoản; server kiểm tra whitelist role.
- Thêm bảng Supabase `usage_events` dạng append-only để ghi `login` và `open_tool`.
- Thêm tab `Đo lường` chỉ dành cho Super Admin tại `/members`.
- Thêm bộ chọn khoảng ngày và preset Hôm nay/7/14/30 ngày; dữ liệu 90 ngày được lọc phía client.
- Giữ nguyên ba thẻ số nhanh; khoảng ngày chỉ điều khiển biểu đồ và bảng chi tiết.
- Mở rộng `VERSION TRACKING` từ 31 thành 239 dòng; mỗi dòng chỉ giữ một thay đổi chính.
- Sáu dòng cuối ghi rõ WIP: tăng tốc canvas và đo lượt tải; `Done=No`.
- Làm lại 5 tab còn lại cho người mới: thêm dải `CÁCH ĐỌC`, đổi nhãn sang tiếng Việt dễ hiểu và
  làm mờ các cột kỹ thuật; giữ nguyên dữ liệu, công thức và tab `VERSION TRACKING`.
- Phát hành `v1.26`: đổi mẫu mượt hơn, giữ bản cũ mờ khi tải, hiệu ứng pop và cache mẫu; ghi lượt
  xuất JPEG/PDF/tải brochure; tab Đo lường có số tải theo ngày, khoảng và thành viên.
- Phát hành `v1.27`: mẫu Max-Funded Allianz có line mới trên `PRESENTED BY`, logo được nhúng lại,
  Tiểu bang về Texas và gỡ mục trùng do file `.svg.svg`.
- Thiết lập hai lượt tự động: 07:30 kiểm tra đầu ngày và 15:30 rà soát cuối ngày; dùng chung một
  mục changelog và một dòng sheet, không tạo trùng.

WIP cuối ngày của chủ tool (chỉ đọc và ghi nhận, không sửa/hoàn tác):

- `supabase/schema.sql`: thêm `usage_events.label` để lưu nội dung đã tải; SQL này chưa được xác nhận chạy.
- `public/js/portal/auth.js`: `logUsage(kind, label)` và fallback ghi lại không có label nếu DB chưa cập nhật.
- `public/js/core.js`, `public/js/main.js`: gắn tên báo giá cho JPEG/PDF và tên brochure cho sự kiện tải.
- `public/members.html`, `public/js/portal/members.js`, `public/portal.css`: dòng “Tải về” mở popup
  chi tiết gồm thành viên, nội dung tải và thời gian; có bố cục mobile.
- Asset WIP đã đồng bộ cho lần test kế tiếp: `core.js?v=28`, `main.js?v=9`, `auth.js?v=6`,
  `members.js?v=24`, `portal.css?v=50`; badge vẫn `v1.27`, chưa phát hành `v1.28`.

Evidence đã có trong changelog dự án:

- SQL `kind=download` đã chạy trên production; cột `label` mới vẫn là WIP.
- `node --check` đạt cho `core.js`, `main.js`, `portal/auth.js`, `portal/members.js`; `git diff --check`
  không có lỗi whitespace, chỉ có cảnh báo LF→CRLF của Windows.
- Harness đo lường đã kiểm tra preset ngày, số thẻ, biểu đồ và bảng; file test tạm đã xoá.
- Release `v1.26` (`d1cd4c0`) và `v1.27` (`89bc051`) đã push; `origin/main = HEAD = 89bc051`.

Việc tiếp theo:

- Ngày mai hoàn tất và kiểm tra popup “xem tải gì”, chạy SQL thêm `usage_events.label`, đồng bộ
  asset version/badge rồi mới mở và phát hành `v1.28`.
- Automation 07:30 tạo/cập nhật trạng thái đầu ngày; automation 15:30 cập nhật lại cùng mục để chốt ngày.

## Mẫu mục mới

```markdown
### YYYY-MM-DD — <Tóm tắt ngắn>

| Trường | Giá trị |
|---|---|
| Trạng thái | Đã đọc / Không thay đổi / Có thay đổi |
| Branch | `main` |
| HEAD | `<short SHA>` — `<subject>` |
| UI version | `vX.XX` |
| File thay đổi từ lần kiểm tra trước | `<số lượng hoặc không có>` |

Thay đổi/chức năng đã đối chiếu:

- ...

Evidence:

- ...

Việc tiếp theo:

- ...
```

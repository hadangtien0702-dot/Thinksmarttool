# Bật hệ thống tài khoản (Supabase) — hướng dẫn cho admin

Làm 1 lần, khoảng 10 phút. Xong thì trang web có: **Đăng nhập / Đăng ký**, phân quyền
**Admin / Nhân viên**, và thư viện **Video học** hoạt động thật.

> Chưa làm bước này thì trang vẫn chạy "chế độ mở": Tool dùng bình thường,
> nhưng Video học và đăng nhập chưa hoạt động.

## Bước 1 — Tạo project Supabase (miễn phí)

1. Vào **https://supabase.com** → Sign up (dùng email hoặc GitHub của anh).
2. Bấm **New project**:
   - Name: `thinksmart-portal`
   - Database password: đặt mật khẩu mạnh, **lưu lại** (ít khi cần dùng nhưng đừng mất).
   - Region: **East US (North Virginia)** (gần team ở Mỹ).
3. Chờ ~2 phút cho project khởi tạo xong.

## Bước 2 — Chạy schema (tạo bảng + phân quyền)

1. Trong project → menu trái **SQL Editor** → **New query**.
2. Mở file **`supabase/schema.sql`** trong repo, copy TOÀN BỘ, dán vào, bấm **Run**.
3. Thấy "Success. No rows returned" là xong.

## Bước 3 — Tắt xác nhận email (khuyên dùng cho nội bộ)

Mặc định Supabase bắt người đăng ký bấm link xác nhận trong email — với team nội bộ
nên tắt cho nhanh (admin duyệt tay là đủ):

1. Menu trái **Authentication** → **Sign In / Up** (hoặc **Providers**) → **Email**.
2. Tắt **Confirm email** → Save.

## Bước 4 — Dán key vào web

1. Menu trái **Settings** (bánh răng) → **API**.
2. Copy 2 giá trị:
   - **Project URL** (dạng `https://xxxx.supabase.co`)
   - **anon / public key** (chuỗi dài `eyJ...`) — đây là khoá công khai, commit được.
3. Mở file **`public/js/portal/config.js`**, dán vào:

```js
window.TST_CONFIG = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

4. Chạy local kiểm tra (hoặc nhờ Claude làm): mở trang chủ — giờ sẽ đòi đăng nhập.

## Bước 5 — Tạo tài khoản admin

> ⚠️ **Cập nhật 21/07/2026:** bảng `profiles` KHÔNG còn cột `approved`. Giờ dùng:
> - `role` — `'user'` (nhân viên) · `'admin'` · `'super_admin'` (quyền cao nhất)
> - `status` — `'pending'` (chờ duyệt) · `'active'` · `'suspended'` · `'deleted'`
>
> Hướng dẫn cũ ghi `approved = true` là SAI, chạy sẽ báo lỗi không có cột.

**Cách tạo tài khoản (kể cả admin) — làm trong Supabase, không làm qua web được:**

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
   Nhập email + mật khẩu, bật **Auto Confirm User** (không thì phải xác nhận email).
2. Supabase → **SQL Editor**, chạy (thay email cho đúng):

```sql
update public.profiles
set role = 'super_admin', status = 'active', full_name = 'Tên hiển thị'
where id = (select id from auth.users where email = 'EMAIL_CAN_NANG_QUYEN');
```

3. Đăng nhập lại trên web → chip góc phải hiện **Super Admin**, sidebar có
   **Quản lý thành viên**.

**Vì sao phải chạy SQL mà không sửa trên trang Quản lý thành viên:** trigger
`enforce_member_update` cố ý CHẶN việc đổi `role`/`status` từ phía ứng dụng, để
người dùng web không tự nâng quyền cho mình. Nâng quyền chỉ làm được từ SQL Editor.

## Tạo NHIỀU tài khoản một lúc (22/07/2026)

Tạo tay từng người trong Dashboard thì 48 người là 48 lần bấm. Thay vào đó:

1. Danh sách người dùng để ở `Account/` (Excel: tên gọi · họ tên · email).
2. Nhờ Claude sinh file `Account/tao-<n>-tai-khoan.sql` — nó tự sinh mật khẩu ngẫu
   nhiên riêng cho từng người và xuất kèm `Account/mat-khau-<n>-sale.csv`.
3. Supabase → **SQL Editor** → dán → **Run**. Tài khoản tạo ra ở `status='active'`,
   `role='user'`, `department='Sale'` → đăng nhập là dùng được ngay.
4. Gửi mật khẩu **riêng cho từng người** (tin nhắn 1-1), rồi **XOÁ** cả 2 file.

> 🔒 `Account/` và `*.sql` đã nằm trong `.gitignore` — họ tên, email, mật khẩu của
> đội sale KHÔNG được lên repo public. Kiểm lại bằng `git status` trước khi push.

**Chạy thử 1 dòng trước khi chạy cả 48.** `auth.users` là bảng nội bộ của Supabase,
cấu trúc có thể đổi giữa các phiên bản GoTrue. Hỏng 1 dòng dễ sửa hơn hỏng 48.

File SQL chạy lại an toàn: email nào đã tồn tại thì bỏ qua, không ghi đè mật khẩu
người đang dùng.

## Đổi mật khẩu (22/07/2026)

Nút **Đổi mật khẩu** ở chân thanh bên trái, có trên cả 4 trang (trang chủ, Công cụ,
Video học, Quản lý thành viên). Người dùng nhập mật khẩu hiện tại + mật khẩu mới 2 lần.

Vì sao bắt nhập lại mật khẩu hiện tại: Supabase **không** tự kiểm tra việc đó trong
`updateUser` — chỉ cần còn phiên đăng nhập là đổi được. Không có bước xác minh thì ai
mượn được máy lúc màn hình đang mở là chiếm luôn tài khoản.

## Duyệt nhân viên mới (việc thường ngày)

Nhân viên tự **Đăng ký** trên web → thấy màn "chờ admin duyệt".
Giờ đã có trang **Quản lý thành viên** (`/members`) để duyệt 1 chạm — vào đó bấm
**Duyệt**, không phải mở Supabase nữa. (Cách cũ qua Table Editor: sửa cột `status`
thành `active`.)

## Thêm video học

Đăng nhập bằng admin → **Video học** → **+ Thêm video** → dán link:
- **YouTube**: video nên để chế độ **Unlisted** (Không công khai) — ai có link mới xem.
- **Google Drive**: file video bấm **Share → Anyone with the link → Viewer**
  (trong Drive `vickytrieu2017@gmail.com` folder video đào tạo).

## Lưu ý bảo mật (MVP)

- Dữ liệu (danh sách video, hồ sơ) được bảo vệ THẬT bằng Row Level Security phía
  Supabase — không đăng nhập thì không đọc được, kể cả gọi API trực tiếp.
- Riêng giao diện Tool (/tool) mới chặn ở mức chuyển hướng trên trình duyệt;
  file tĩnh (template SVG, ảnh brochure) vẫn tải được nếu ai đó có link trực tiếp.
  Đợt 2 nếu cần khoá chặt sẽ chuyển kiểm tra vào server.

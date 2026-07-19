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

## Bước 5 — Tạo tài khoản admin đầu tiên (của anh)

1. Mở trang web → **Đăng ký** với email của anh.
2. Quay lại Supabase **SQL Editor**, chạy (thay email):

```sql
update public.profiles set role = 'admin', approved = true
where id = (select id from auth.users where email = 'EMAIL_CUA_ANH');
```

3. Đăng nhập lại trên web → chip tài khoản góc phải hiện **Admin**,
   trang **Video học** có nút **+ Thêm video**.

## Duyệt nhân viên mới (việc thường ngày)

Nhân viên tự **Đăng ký** trên web → thấy màn "chờ admin duyệt". Anh duyệt bằng cách:

1. Supabase → **Table Editor** → bảng `profiles`.
2. Tìm dòng của nhân viên (xem `full_name`), sửa cột `approved` thành `true` → Save.

(Đợt 2 sẽ làm trang "Quản lý thành viên" ngay trong web để duyệt 1 chạm,
không phải vào Supabase nữa.)

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

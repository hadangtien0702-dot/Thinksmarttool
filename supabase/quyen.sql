-- ============================================================================
-- THINKSMART PORTAL — QUYỀN TRUY CẬP (RLS)
--
-- File này CHỈ chứa phần PHÂN QUYỀN — thứ hay phải chỉnh nhất. Tách khỏi
-- `schema.sql` (436 dòng) vì hai lý do thật:
--   1. Supabase SQL Editor chạy CẢ FILE trong MỘT giao dịch. Lỗi một chỗ là huỷ
--      sạch phần sau — đã dính ngày 27/07 (lỗi 23514 làm mất luôn cột `anh` và
--      bucket ảnh dù chúng chẳng liên quan).
--   2. Đổi quyền thì không cần đụng tới bảng. Chạy file ngắn, ít chỗ hỏng hơn.
--
-- CHẠY LẠI AN TOÀN (idempotent): toàn bộ là drop-then-create.
-- Không tạo bảng — bảng nằm ở `schema.sql`. Dựng mới từ đầu thì chạy schema.sql trước.
--
-- Lập 2026-07-31.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. HAI HÀM KIỂM QUYỀN (chạy lại cho chắc — schema.sql cũng có)
--    is_super_admin() : đúng 1 người — chủ tool
--    is_admin()       : admin HOẶC super_admin, đang active (11 + 1 người)
-- ----------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public stable
as $$ select exists (
  select 1 from public.profiles where id = auth.uid() and role = 'super_admin' and status = 'active'
); $$;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable
as $$ select exists (
  select 1 from public.profiles
  where id = auth.uid() and role in ('admin', 'super_admin') and status = 'active'
); $$;


-- ----------------------------------------------------------------------------
-- 1. PRESENCE — ai đang online
--
-- ☠️ BẪY ĐÃ VẤP (31/07, mất 2 vòng đo mới ra): tính năng này CHẾT CÂM từ 23/07,
-- bảng chỉ có đúng 1 dòng của super_admin trong khi 4 người đang dùng tool.
-- Client ghi heartbeat bằng `upsert`, mà PostgREST dịch upsert thành
-- `INSERT ... ON CONFLICT DO UPDATE` — lệnh này phải ĐỌC hàng để dò trùng khoá.
-- Không có quyền SELECT thì Postgres trả 42501 và client nuốt lỗi im lặng.
-- → Phải có ĐỦ CẢ BA policy dưới đây. Thiếu cái "tự đọc dòng của mình" là hỏng.
-- ----------------------------------------------------------------------------
drop policy if exists "presence: tự ghi của mình" on public.presence;
create policy "presence: tự ghi của mình"
  on public.presence for insert
  with check (user_id = auth.uid());

drop policy if exists "presence: tự cập nhật của mình" on public.presence;
create policy "presence: tự cập nhật của mình"
  on public.presence for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- BẮT BUỘC — xem ghi chú ở trên. Không lộ ai cho ai: mỗi người chỉ thấy dòng của mình.
drop policy if exists "presence: tự đọc dòng của mình" on public.presence;
create policy "presence: tự đọc dòng của mình"
  on public.presence for select
  using (user_id = auth.uid());

-- Admin + Super Admin đọc được TẤT CẢ → tab "Đo lường" thấy ai đang online.
drop policy if exists "presence: chỉ super admin đọc" on public.presence;   -- tên cũ
drop policy if exists "presence: admin doc" on public.presence;
create policy "presence: admin doc"
  on public.presence for select
  using (public.is_admin());


-- ----------------------------------------------------------------------------
-- 2. USAGE_EVENTS — nhật ký sử dụng (đăng nhập · mở tool · tải · xem)
--
-- ⚠️ NỚI 31/07/2026 — ĐẢO NGƯỢC quyết định 27/07 ("chỉ super_admin đọc").
-- Chủ tool chốt: cho 11 Admin (leader/manager) theo dõi được đội của họ.
-- HỆ QUẢ ĐÃ BÁO VÀ ĐƯỢC CHẤP NHẬN: Admin đọc được cột `detail` — tên, tuổi,
-- tiểu bang, số tiền của khách hàng thật mà sale đã điền.
-- SIẾT LẠI: đổi `is_admin()` thành `is_super_admin()` ở đây VÀ ở mục 4.
-- ----------------------------------------------------------------------------
drop policy if exists "usage: tự ghi sự kiện của mình" on public.usage_events;
create policy "usage: tự ghi sự kiện của mình"
  on public.usage_events for insert
  with check (user_id = auth.uid());

drop policy if exists "usage: chỉ super admin đọc" on public.usage_events;   -- tên cũ
drop policy if exists "usage: admin doc" on public.usage_events;
create policy "usage: admin doc"
  on public.usage_events for select
  using (public.is_admin());


-- ----------------------------------------------------------------------------
-- 3. KHOA_MUC — Super Admin / Admin tự khoá từng phần của Tool khi đang cập nhật
--
-- Ai cũng ĐỌC được (bắt buộc: Tool phải biết mục nào đang khoá thì mới ẩn được;
-- ở đây không có gì bí mật, chỉ là trạng thái bật/tắt).
-- Admin + Super Admin SỬA được (chủ tool chốt 31/07: leader tự khoá phần của mình).
-- ----------------------------------------------------------------------------
drop policy if exists "khoa_muc: ai dang nhap cung doc" on public.khoa_muc;
create policy "khoa_muc: ai dang nhap cung doc"
  on public.khoa_muc for select
  using (auth.uid() is not null);

drop policy if exists "khoa_muc: chi super admin sua" on public.khoa_muc;   -- tên cũ
drop policy if exists "khoa_muc: admin sua" on public.khoa_muc;
create policy "khoa_muc: admin sua"
  on public.khoa_muc for update
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------------------------
-- 4. STORAGE `proposal-snapshots` — ẢNH BẢN BÁO GIÁ ĐÃ GỬI KHÁCH
--
-- ☠️ ĐÂY LÀ DỮ LIỆU KHÁCH HÀNG THẬT: ảnh có tên, tuổi, tiểu bang, số tiền của
-- từng khách. Bucket để PRIVATE, mở ảnh phải xin link có hạn 60 giây.
-- ⚠️ NỚI 31/07/2026 cho Admin đọc (cùng đợt với usage_events). KHÔNG BAO GIỜ
-- nới thêm cho role 'user'.
-- ----------------------------------------------------------------------------
drop policy if exists "snapshot: tự tải lên thư mục của mình" on storage.objects;
create policy "snapshot: tự tải lên thư mục của mình"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'proposal-snapshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "snapshot: chỉ super admin đọc" on storage.objects;   -- tên cũ
drop policy if exists "snapshot: admin doc" on storage.objects;
create policy "snapshot: admin doc"
  on storage.objects for select to authenticated
  using (bucket_id = 'proposal-snapshots' and public.is_admin());


-- ============================================================================
-- KIỂM SAU KHI CHẠY — dán riêng câu này để xem policy đã vào đủ chưa.
-- Đúng phải ra 10 dòng (3 presence tự + 1 presence admin + 2 usage + 2 khoa_muc
-- + 2 storage).
-- ============================================================================
-- select schemaname, tablename, policyname, cmd
-- from pg_policies
-- where tablename in ('presence','usage_events','khoa_muc')
--    or (schemaname = 'storage' and policyname like 'snapshot%')
-- order by tablename, policyname;

-- ============================================================================
-- THINKSMART PORTAL — SCHEMA MVP (Đợt 1: auth + phân quyền + video học)
-- Chạy TOÀN BỘ file này trong Supabase Dashboard → SQL Editor → Run.
-- Chạy lại an toàn (idempotent): dùng if not exists / create or replace.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES — hồ sơ người dùng, gắn 1-1 với auth.users
--    role: 'admin' | 'user' · approved: admin duyệt mới được xem nội dung
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  role       text not null default 'user' check (role in ('admin', 'user')),
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tự tạo profile khi có người đăng ký (full_name lấy từ metadata lúc signUp)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: người gọi hiện tại có phải admin đã duyệt không
-- (security definer để policy trên profiles không tự tham chiếu đệ quy)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and approved = true
  );
$$;

-- Helper: người gọi đã được duyệt chưa (dùng cho policy xem nội dung)
create or replace function public.is_approved()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and approved = true
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles: xem của mình hoặc admin xem hết" on public.profiles;
create policy "profiles: xem của mình hoặc admin xem hết"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: admin cập nhật (duyệt, đổi role)" on public.profiles;
create policy "profiles: admin cập nhật (duyệt, đổi role)"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. VIDEOS — thư viện video học cho sale (link YouTube hoặc Google Drive)
-- ----------------------------------------------------------------------------
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  source      text not null check (source in ('youtube', 'drive')),
  url         text not null,
  category    text not null default 'Chung',
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.videos enable row level security;

drop policy if exists "videos: nhân viên đã duyệt được xem" on public.videos;
create policy "videos: nhân viên đã duyệt được xem"
  on public.videos for select
  using (public.is_approved());

drop policy if exists "videos: admin thêm" on public.videos;
create policy "videos: admin thêm"
  on public.videos for insert
  with check (public.is_admin());

drop policy if exists "videos: admin sửa" on public.videos;
create policy "videos: admin sửa"
  on public.videos for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "videos: admin xoá" on public.videos;
create policy "videos: admin xoá"
  on public.videos for delete
  using (public.is_admin());

create index if not exists videos_category_sort_idx
  on public.videos (category, sort_order, created_at desc);

-- ============================================================================
-- SAU KHI CHẠY XONG — tạo ADMIN ĐẦU TIÊN (làm 1 lần):
-- 1. Vào trang web → Đăng ký tài khoản bằng email của anh.
-- 2. Quay lại SQL Editor, chạy (thay email cho đúng):
--
--    update public.profiles set role = 'admin', approved = true
--    where id = (select id from auth.users where email = 'EMAIL_CUA_ANH');
--
-- Từ đó về sau: admin duyệt nhân viên mới bằng cách set approved = true
-- (Đợt 2 sẽ có trang quản lý thành viên ngay trong web).
-- ============================================================================

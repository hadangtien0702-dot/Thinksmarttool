-- ============================================================================
-- THINKSMART PORTAL — SCHEMA MVP
--   Đợt 1: auth + phân quyền + video học
--   Đợt "Quản lý thành viên nâng cao": 3 role + trạng thái + phòng ban
-- Chạy TOÀN BỘ file này trong Supabase Dashboard → SQL Editor → Run.
-- Chạy lại an toàn (idempotent): dùng if not exists / create or replace / drop-then-create.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES — hồ sơ người dùng, gắn 1-1 với auth.users
--    role   : 'super_admin' | 'admin' | 'user'
--    status : 'pending' (chờ duyệt) | 'active' (đang dùng) | 'suspended' (tạm khoá) | 'deleted' (đã xoá — ẩn)
--    approved: cột CŨ, giữ để không phá guard/RLS hiện có — được TRIGGER tự đồng bộ = (status='active')
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  email      text not null default '',
  department text not null default '',
  role       text not null default 'user',
  status     text not null default 'pending',
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Nâng cấp DB tạo trước các đợt sau (idempotent): thêm cột còn thiếu
alter table public.profiles add column if not exists email      text not null default '';
alter table public.profiles add column if not exists department text not null default '';
alter table public.profiles add column if not exists status     text not null default 'pending';

-- Ràng buộc role/status (drop-then-add để nâng cấp được giá trị cho phép)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add  constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'user'));
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add  constraint profiles_status_check
  check (status in ('pending', 'active', 'suspended', 'deleted'));

-- Backfill status từ cột approved cũ.
-- Khi ALTER thêm cột status, mọi dòng cũ nhận default 'pending' → phải nâng
-- những ai đã duyệt (approved=true) lên 'active'. Idempotent: chạy lại vô hại
-- (sau khi có trigger đồng bộ, approved=true luôn đi kèm status='active').
update public.profiles set status = 'active' where approved = true and status <> 'active';

-- Tự tạo profile khi có người đăng ký (full_name + email lấy lúc signUp; status mặc định 'pending')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill email cho các tài khoản đã đăng ký trước khi có cột email
update public.profiles p set email = u.email
from auth.users u
where u.id = p.id and coalesce(p.email, '') = '' and u.email is not null;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Đồng bộ cột approved (cũ) theo status: approved = (status = 'active').
-- Nhờ vậy mọi guard/RLS đang đọc `approved` vẫn đúng mà không cần sửa.
create or replace function public.sync_profile_flags()
returns trigger
language plpgsql
as $$
begin
  new.approved := (new.status = 'active');
  return new;
end;
$$;
drop trigger if exists trg_sync_profile_flags on public.profiles;
create trigger trg_sync_profile_flags
  before insert or update on public.profiles
  for each row execute function public.sync_profile_flags();

-- ----------------------------------------------------------------------------
-- HELPERS (security definer → không đệ quy RLS)
-- ----------------------------------------------------------------------------
create or replace function public.my_role()
returns text language sql security definer set search_path = public stable
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public stable
as $$ select exists (
  select 1 from public.profiles where id = auth.uid() and role = 'super_admin' and status = 'active'
); $$;

-- "staff admin": admin HOẶC super_admin đang hoạt động — dùng cho quản lý thành viên + video
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable
as $$ select exists (
  select 1 from public.profiles
  where id = auth.uid() and role in ('admin', 'super_admin') and status = 'active'
); $$;

-- Đã được duyệt (đang hoạt động) — dùng cho policy xem nội dung (video)
create or replace function public.is_approved()
returns boolean language sql security definer set search_path = public stable
as $$ select exists (
  select 1 from public.profiles where id = auth.uid() and status = 'active'
); $$;

-- ----------------------------------------------------------------------------
-- PHÂN QUYỀN CHI TIẾT (trigger) — chặn thật ở DB, không chỉ ẩn nút trên web:
--   • Không ai tự đổi quyền/trạng thái của CHÍNH MÌNH (chống tự khoá).
--   • super_admin: toàn quyền trên người khác.
--   • admin: chỉ thao tác trên 'user'; KHÔNG đổi role; KHÔNG xoá (status='deleted').
--   • còn lại: chặn.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_member_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare crole text;
begin
  -- Ngữ cảnh không phải người dùng đăng nhập (SQL Editor / service_role / server)
  -- → tin cậy, cho qua. Nhờ vậy lệnh promote Super Admin trong SQL Editor không bị chặn.
  if auth.uid() is null then
    return new;
  end if;

  select role into crole from public.profiles where id = auth.uid();
  if crole is null then
    raise exception 'Không có quyền.';
  end if;

  -- Tự sửa hồ sơ mình: cho đổi tên/phòng ban, CẤM đổi role/status
  if old.id = auth.uid() then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'Không thể tự đổi quyền hoặc trạng thái của chính mình.';
    end if;
    return new;
  end if;

  if crole = 'super_admin' then
    return new;
  end if;

  if crole = 'admin' then
    if old.role <> 'user' then
      raise exception 'Admin chỉ quản lý được Nhân viên.';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Chỉ Super Admin mới đổi được quyền.';
    end if;
    if new.status = 'deleted' then
      raise exception 'Chỉ Super Admin mới xoá được thành viên.';
    end if;
    return new;
  end if;

  raise exception 'Không có quyền.';
end;
$$;
drop trigger if exists trg_enforce_member_update on public.profiles;
create trigger trg_enforce_member_update
  before update on public.profiles
  for each row execute function public.enforce_member_update();

-- ----------------------------------------------------------------------------
-- RLS trên profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles: xem của mình hoặc admin xem hết" on public.profiles;
create policy "profiles: xem của mình hoặc admin xem hết"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Ai được PHÉP thử update = staff admin; đổi được GÌ thì trigger ở trên quyết
drop policy if exists "profiles: admin cập nhật (duyệt, đổi role)" on public.profiles;
drop policy if exists "profiles: staff admin cập nhật" on public.profiles;
create policy "profiles: staff admin cập nhật"
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
  on public.videos for select using (public.is_approved());

drop policy if exists "videos: admin thêm" on public.videos;
create policy "videos: admin thêm"
  on public.videos for insert with check (public.is_admin());

drop policy if exists "videos: admin sửa" on public.videos;
create policy "videos: admin sửa"
  on public.videos for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "videos: admin xoá" on public.videos;
create policy "videos: admin xoá"
  on public.videos for delete using (public.is_admin());

create index if not exists videos_category_sort_idx
  on public.videos (category, sort_order, created_at desc);

-- ----------------------------------------------------------------------------
-- 3. USAGE_EVENTS — ĐO LƯỜNG SỬ DỤNG (N1, 2026-07-23). APPEND-ONLY.
--    Mục đích: biết mỗi ngày bao nhiêu người thật sự đăng nhập / mở Công cụ
--    ("build cho có hay dùng thật?"). Thu dữ liệu thô, KHÔNG lưu-đè-1-mốc, để
--    sau này còn dựng lại được lịch sử theo ngày.
--    kind: 'login' (đăng nhập) | 'open_tool' (mở Công cụ) | 'download' (xuất JPEG/PDF
--          hoặc tải brochure — chủ tool 23/07: "download mới biết sale dùng THẬT")
--    Chạy hoàn toàn bằng ANON KEY + RLS (KHÔNG cần service_role):
--      • INSERT: mỗi người chỉ ghi được sự kiện của CHÍNH MÌNH (user_id = auth.uid()).
--      • SELECT: CHỈ super_admin đọc (chủ tool chốt 23/07).
--      • KHÔNG có policy UPDATE/DELETE → không ai sửa/xoá được qua web = giữ lịch sử.
-- ----------------------------------------------------------------------------
create table if not exists public.usage_events (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind    text not null check (kind in ('login', 'open_tool', 'download')),
  label   text,   -- CHI TIẾT (chỉ với 'download'): tải gì — "Proposal - <khách> · PDF" / "Tài liệu: ..."
  at      timestamptz not null default now()
);

-- Nâng cấp bảng đã tạo trước đó (idempotent): nới ràng buộc kind để nhận thêm 'download'.
alter table public.usage_events drop constraint if exists usage_events_kind_check;
alter table public.usage_events add  constraint usage_events_kind_check
  check (kind in ('login', 'open_tool', 'download'));
-- (23/07 nâng cấp) cột label: xem "tải CÁI GÌ" trong popup chi tiết ở tab Đo lường.
alter table public.usage_events add column if not exists label text;
-- (23/07 nâng cấp - Cách A) cột detail: giá trị sale ĐÃ ĐIỀN lúc xuất (Khách/Tuổi/Bang/số tiền…)
-- → super_admin bấm 👁 xem "điền đủ thông tin khách chưa". Chỉ super_admin đọc (RLS như trên).
alter table public.usage_events add column if not exists detail jsonb;

alter table public.usage_events enable row level security;

drop policy if exists "usage: tự ghi sự kiện của mình" on public.usage_events;
create policy "usage: tự ghi sự kiện của mình"
  on public.usage_events for insert
  with check (user_id = auth.uid());

drop policy if exists "usage: chỉ super admin đọc" on public.usage_events;
create policy "usage: chỉ super admin đọc"
  on public.usage_events for select
  using (public.is_super_admin());

create index if not exists usage_events_at_idx      on public.usage_events (at desc);
create index if not exists usage_events_user_at_idx on public.usage_events (user_id, at desc);

-- ============================================================================
-- SAU KHI CHẠY XONG — tạo SUPER ADMIN ĐẦU TIÊN (làm 1 lần):
-- 1. Vào trang web → Đăng ký tài khoản bằng email của anh (nếu chưa có).
-- 2. Quay lại SQL Editor, chạy (thay email cho đúng):
--
--    update public.profiles set role = 'super_admin', status = 'active'
--    where id = (select id from auth.users where email = 'EMAIL_CUA_ANH');
--
-- Từ đó về sau, quản lý mọi thứ ngay trong web tại /members:
--   • Super Admin: duyệt, đổi phòng ban, cấp/gỡ quyền Admin, tạm khoá, xoá.
--   • Admin (sale manager): duyệt + tạm khoá + đổi phòng ban cho Nhân viên.
-- Ghi chú: Super Admin KHÔNG được vào Tool sửa file (chặn ở web). Muốn tự test
-- Tool, tạm đổi role của mình về 'admin'.
-- ============================================================================

-- HouseEats security hardening.
-- Run this in the Supabase SQL Editor after the base schema and
-- houseeats_seed_and_chef_policies.sql. The script is idempotent and skips
-- tables that do not exist yet.
--
-- What it enforces:
--   1. Row Level Security is enabled on every application table.
--   2. Members can only read/write their own rows; chef/moderator/admin get the
--      wider access the kitchen screens need.
--   3. Only admins can change profiles.role (blocks self privilege escalation
--      from the client, which can call profiles.update directly).
--   4. Value constraints on data written straight from the browser
--      (rating range, late-plate status, text lengths).
--   5. send_member_announcement runs as SECURITY DEFINER with a staff check,
--      a pinned search_path and input validation.

-- Role lookup helpers. SECURITY DEFINER so policies on public.profiles can call
-- them without recursing into those same policies.
create or replace function public.houseeats_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(coalesce(p.role, 'member')) from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.houseeats_role() in ('chef', 'moderator', 'admin')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.houseeats_role() = 'admin'
$$;

revoke all on function public.houseeats_role() from public, anon;
grant execute on function public.houseeats_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- 1 + 2. Row Level Security and per-table policies.
do $$
begin
  if to_regclass('public.profiles') is not null then
    -- Not FORCE: the signup trigger that seeds a profile runs as the table
    -- owner and must keep bypassing these policies.
    alter table public.profiles enable row level security;

    drop policy if exists "profiles readable by self and staff" on public.profiles;
    create policy "profiles readable by self and staff"
      on public.profiles for select to authenticated
      using (id = auth.uid() or public.is_staff());

    drop policy if exists "profiles updatable by self" on public.profiles;
    create policy "profiles updatable by self"
      on public.profiles for update to authenticated
      using (id = auth.uid() or public.is_admin())
      with check (id = auth.uid() or public.is_admin());

    drop policy if exists "profiles insert self" on public.profiles;
    create policy "profiles insert self"
      on public.profiles for insert to authenticated
      with check (id = auth.uid());
  end if;

  if to_regclass('public.menus') is not null then
    alter table public.menus enable row level security;
    drop policy if exists "menus readable by members" on public.menus;
    create policy "menus readable by members"
      on public.menus for select to authenticated using (true);
  end if;

  if to_regclass('public.meals') is not null then
    alter table public.meals enable row level security;
    drop policy if exists "meals readable by members" on public.meals;
    create policy "meals readable by members"
      on public.meals for select to authenticated using (true);
  end if;

  if to_regclass('public.rsvps') is not null then
    alter table public.rsvps enable row level security;
    drop policy if exists "rsvps writable by owner" on public.rsvps;
    create policy "rsvps writable by owner"
      on public.rsvps for insert to authenticated with check (user_id = auth.uid());
    drop policy if exists "rsvps updatable by owner" on public.rsvps;
    create policy "rsvps updatable by owner"
      on public.rsvps for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    drop policy if exists "rsvps deletable by owner" on public.rsvps;
    create policy "rsvps deletable by owner"
      on public.rsvps for delete to authenticated using (user_id = auth.uid());
  end if;

  if to_regclass('public.member_allergies') is not null then
    alter table public.member_allergies enable row level security;
    drop policy if exists "allergies readable by owner and staff" on public.member_allergies;
    create policy "allergies readable by owner and staff"
      on public.member_allergies for select to authenticated
      using (user_id = auth.uid() or public.is_staff());
    drop policy if exists "allergies writable by owner" on public.member_allergies;
    create policy "allergies writable by owner"
      on public.member_allergies for insert to authenticated with check (user_id = auth.uid());
    drop policy if exists "allergies deletable by owner" on public.member_allergies;
    create policy "allergies deletable by owner"
      on public.member_allergies for delete to authenticated using (user_id = auth.uid());
  end if;

  if to_regclass('public.late_plates') is not null then
    alter table public.late_plates enable row level security;
    drop policy if exists "late plates writable by owner" on public.late_plates;
    create policy "late plates writable by owner"
      on public.late_plates for insert to authenticated with check (user_id = auth.uid());
    -- Members may only cancel their own request; staff drive the kitchen statuses.
    drop policy if exists "late plates updatable by owner or staff" on public.late_plates;
    create policy "late plates updatable by owner or staff"
      on public.late_plates for update to authenticated
      using (public.is_staff() or user_id = auth.uid())
      with check (public.is_staff() or (user_id = auth.uid() and status = 'cancelled'));
  end if;

  if to_regclass('public.notifications') is not null then
    alter table public.notifications enable row level security;
    drop policy if exists "notifications readable by owner" on public.notifications;
    create policy "notifications readable by owner"
      on public.notifications for select to authenticated using (user_id = auth.uid());
    drop policy if exists "notifications updatable by owner" on public.notifications;
    create policy "notifications updatable by owner"
      on public.notifications for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    -- Inserts happen through send_member_announcement (SECURITY DEFINER) only.
    drop policy if exists "notifications insert by staff" on public.notifications;
    create policy "notifications insert by staff"
      on public.notifications for insert to authenticated with check (public.is_staff());
  end if;

  if to_regclass('public.meal_reviews') is not null then
    alter table public.meal_reviews enable row level security;
    drop policy if exists "reviews readable by owner and staff" on public.meal_reviews;
    create policy "reviews readable by owner and staff"
      on public.meal_reviews for select to authenticated
      using (user_id = auth.uid() or public.is_staff());
    drop policy if exists "reviews writable by owner" on public.meal_reviews;
    create policy "reviews writable by owner"
      on public.meal_reviews for insert to authenticated with check (user_id = auth.uid());
    drop policy if exists "reviews updatable by owner" on public.meal_reviews;
    create policy "reviews updatable by owner"
      on public.meal_reviews for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- 3. Only admins may change a role, even though every member can update their
-- own profile row.
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- auth.uid() is null for the service role and the SQL editor, which stay able
  -- to administer roles out of band.
  if auth.uid() is not null and new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change a member role';
  end if;
  return new;
end $$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    drop trigger if exists guard_profile_role_change on public.profiles;
    create trigger guard_profile_role_change
      before update on public.profiles
      for each row execute function public.guard_profile_role_change();
  end if;
end $$;

-- 4. Constraints on values written directly by the browser.
do $$
begin
  if to_regclass('public.meal_reviews') is not null then
    alter table public.meal_reviews drop constraint if exists meal_reviews_rating_range;
    alter table public.meal_reviews add constraint meal_reviews_rating_range
      check (rating between 1 and 5);
    alter table public.meal_reviews drop constraint if exists meal_reviews_comment_length;
    alter table public.meal_reviews add constraint meal_reviews_comment_length
      check (comment is null or char_length(comment) <= 1000);
  end if;

  if to_regclass('public.late_plates') is not null then
    alter table public.late_plates drop constraint if exists late_plates_status_values;
    alter table public.late_plates add constraint late_plates_status_values
      check (status in ('requested', 'preparing', 'ready', 'picked_up', 'cancelled'));
  end if;

  if to_regclass('public.profiles') is not null then
    alter table public.profiles drop constraint if exists profiles_role_values;
    alter table public.profiles add constraint profiles_role_values
      check (role in ('member', 'chef', 'moderator', 'admin'));
  end if;

  if to_regclass('public.meals') is not null then
    alter table public.meals drop constraint if exists meals_text_length;
    alter table public.meals add constraint meals_text_length
      check (char_length(name) <= 200 and char_length(coalesce(description, '')) <= 1000);
  end if;
end $$;

-- 5. Announcements: staff only, validated, no dynamic SQL.
create or replace function public.send_member_announcement(
  p_title text,
  p_message text,
  p_type text default 'announcement'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sent integer;
  title text := btrim(p_title);
  body text := btrim(p_message);
  kind text := coalesce(nullif(btrim(p_type), ''), 'announcement');
begin
  if not public.is_staff() then
    raise exception 'Only chef, moderator or admin accounts can send announcements';
  end if;
  if title = '' or body = '' then
    raise exception 'Announcement title and message are required';
  end if;
  if char_length(title) > 120 or char_length(body) > 2000 then
    raise exception 'Announcement title or message is too long';
  end if;
  if kind not in ('announcement', 'menu', 'late_plate', 'allergy') then
    raise exception 'Unsupported notification type';
  end if;

  insert into public.notifications (user_id, type, title, message, read)
  select p.id, kind, title, body, false from public.profiles p;

  select count(*) into sent from public.profiles;
  return sent;
end $$;

revoke all on function public.send_member_announcement(text, text, text) from public, anon;
grant execute on function public.send_member_announcement(text, text, text) to authenticated;

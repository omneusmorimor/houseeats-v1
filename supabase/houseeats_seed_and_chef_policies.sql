-- Run this in Supabase SQL Editor after the base schema.
-- Creates one active 4-week menu and 56 meal slots for the current 4-week period.

-- Chef/moderator/admin can manage menus.
create policy "staff can insert menus"
on public.menus for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')));

create policy "staff can update menus"
on public.menus for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')));

create policy "staff can insert meals"
on public.meals for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')));

create policy "staff can update meals"
on public.meals for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')));

create policy "staff can delete meals"
on public.meals for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')));

-- Staff can see RSVP and late-plate totals for kitchen operations.
create policy "staff can view all rsvps"
on public.rsvps for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')) or auth.uid() = user_id);

create policy "staff can view all late plates"
on public.late_plates for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('chef','moderator','admin')) or auth.uid() = user_id);

-- Create the current active menu if one does not exist.
do $$
declare
  menu_id uuid;
  start_date date := date_trunc('week', current_date)::date;
  d integer;
  w integer;
  t text;
begin
  select id into menu_id from public.menus where active = true order by created_at desc limit 1;
  if menu_id is null then
    insert into public.menus (name, start_date, active)
    values ('HouseEats 4-Week Menu', start_date, true)
    returning id into menu_id;
  end if;

  for w in 0..3 loop
    for d in 0..6 loop
      foreach t in array array['lunch','dinner'] loop
        insert into public.meals
          (menu_id, week_number, day_of_week, meal_date, meal_type, name, description, allergens)
        values
          (menu_id, w + 1, d + 1, start_date + (w * 7 + d), t, 'No meal posted', 'Chef has not posted this meal yet.', '{}')
        on conflict (menu_id, meal_date, meal_type) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- After your own account exists, make that account a chef/admin by replacing the email below.
-- update public.profiles set role = 'admin' where email = 'YOUR_EMAIL_HERE';

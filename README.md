# HouseEats V1

Mobile-first PWA for fraternity meal management.

### Roles
Member · Chef · Chapter Admin

### Flows
Member: Login → Dashboard → Menu → RSVP → Allergy Profile → Late Plate → Notifications
Kitchen: Dashboard → Headcount → Allergy Alerts → Late Plates → Menu Management

### Production
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Run `supabase/houseeats_seed_and_chef_policies.sql`, then `supabase/security_hardening.sql`.
4. Enable email/password authentication.
5. Copy `.env.example` to `.env` and add Supabase credentials. Never commit `.env`; only the anon key belongs in the client, never the service-role key.
6. `npm ci && npm run build`.
7. Deploy `dist/` to your preferred static host.

### Security model
The browser talks to Supabase directly with the anon key, so Row Level Security is the only authorization boundary — the role routing in `src/roleRouter.tsx` is presentation only. `supabase/security_hardening.sql` enables RLS on every table, restricts members to their own rows, gives chef/moderator/admin the wider kitchen access, blocks self service role escalation on `profiles.role`, and makes `send_member_announcement` a staff-only `SECURITY DEFINER` function. Allergy data stays readable only by the owning member and kitchen/admin roles.

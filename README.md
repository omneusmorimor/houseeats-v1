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
3. Enable email/password authentication.
4. Copy `.env.example` to `.env` and add Supabase credentials.
5. `npm install && npm run build`.
6. Deploy `dist/` to your preferred static host.

Allergy data is protected with separate RLS policies so members can access only their own profile while kitchen/admin roles can access allergy alerts.

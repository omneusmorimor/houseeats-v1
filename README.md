# Tasteful Traditions V2

Mobile-first PWA for fraternity meal management.

## Roles

- Member
- Chef / Kitchen
- Chapter Admin
- Super Admin preview

## Member experience

- Rolling 2-week meal menu
- Allergy profile and alerts
- Late Plate requests
- Notifications
- Profile and account settings
- Meal feedback

## Chef / Kitchen experience

- Full monthly menu calendar
- Headcount and meal information
- Allergy alerts
- Late Plate management
- Menu management
- Kitchen operations

## Chapter Admin

- Chapter-level management and oversight
- Menu and kitchen visibility
- Member and operational controls

## Super Admin

Super Admin can preview the actual active V2 Member, Chef, and Chapter Admin experiences rather than a separate mock workspace.

## Production setup

1. Create a Supabase project.
2. Run the SQL files in `supabase/` required by the current schema and policies.
3. Enable email/password authentication.
4. Copy `.env.example` to `.env` and add Supabase credentials. Never commit `.env`; only the anon key belongs in the client, never the service-role key.
5. Run `npm ci && npm run build`.
6. Deploy the generated `dist/` directory to your preferred static host, or connect the repository to Vercel.

## Security model

The browser talks to Supabase directly with the anon key, so Row Level Security remains the authorization boundary. Client-side role routing in `src/roleRouter.tsx` controls presentation only; it is not a substitute for Supabase RLS. Staff roles receive the broader operational access defined by the database policies, while members remain restricted to the data permitted by those policies.

## V2 architecture

The active application entry path is:

`src/main.tsx` → `src/App.tsx` → `src/roleRouter.tsx`

The role router loads the active V2 workspaces for Member, Chef/Kitchen, Chapter Admin, and Super Admin preview. Legacy V1 workspace implementations and obsolete V2 wrapper styles are no longer part of the active frontend path.

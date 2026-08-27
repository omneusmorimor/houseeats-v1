# HouseEats V1 Finalization Plan

## Product target
HouseEats is a mobile-first meal-management app for Members, Chefs, and Chapter Admins under the Tasteful Traditions brand.

## Release gates
- Authentication: login, sign-up, password reset/recovery, session refresh, role routing.
- Member: current/weekly menu, RSVP, allergy profile, late plate, notifications, profile, meal feedback.
- Chef: today dashboard, integrated monthly menu/calendar, saved meal editing, headcounts, allergy conflicts, late plates, announcements, feedback summary, printing.
- Admin: role-aware workspace, member/chapter administration, announcements, safe permission boundaries.
- Security: RLS for member-specific data; allergy data visible only to authorized kitchen/admin roles; server-side/RPC validation for broadcasts and privileged actions.
- UX: one consistent mobile-first design system, accessible controls, clear loading/error/empty states, no destructive surprise actions.
- QA: production build, authentication paths, all three roles, mobile viewport behavior, database failure states, and deployment smoke test.

## Implementation rule
Preserve working functionality from `main`; make changes in focused commits; verify each release gate before merging. Do not introduce a second design language or duplicate business logic.

## Final polish priorities
1. Shared visual language and responsive layout.
2. Member rolling calendar/menu behavior.
3. Chef calendar + menu editing and service operations.
4. Admin separation and privileged actions.
5. Feedback/rating presentation and privacy.
6. Notifications and actionable status feedback.
7. Production QA and launch checklist.

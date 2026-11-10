# MAP.md

Architecture map of `src/`. Update it when you add, move or remove a screen or shared file. If it disagrees with the file system, trust the file system.

Documentation library: [documentation index](./README.md), [setup](./SETUP.md), [architecture](./ARCHITECTURE.md), [data model](./DATA-MODEL.md), [application reference](./API.md), [operations](./OPERATIONS.md), [frontend conventions](./FRONTEND.md), and [contributing](./CONTRIBUTING.md).

## Conventions

- Route groups in parentheses are not in URLs. `(auth)` is public. `(main)` is protected and wrapped in the dashboard shell.
- Screen folder: `page.tsx` (server), `*-client.tsx` (client), `actions.ts` (server actions). Exceptions are listed below.
- Role guards are in `layout.tsx` via `requireRole()`. Layouts do **not** guard `route.ts` handlers, so export routes check the role themselves.
- Next.js 16 uses `src/proxy.ts` (session refresh and login redirect), not `middleware.ts`.

## Screens

| Screen              | URL                                   | Folder (under `src/app/`)                             | Data                                                |
| ------------------- | ------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Login               | /login                                | `(auth)/login`, `(auth)/_components`                  | Auth, tautan galeri publik                          |
| Admin dashboard     | /admin                                | `(main)/admin` (`page.tsx`, `dashboard-client.tsx`, `dashboard-countdown.tsx`) | counts, deadline, submissions, judging, ranking, audit |
| Accounts            | /admin/akun                           | `(main)/admin/akun`                                   | `profiles` + Auth (service role)                    |
| Audit               | /admin/audit                          | `(main)/admin/audit/page.tsx`                        | `audit_logs` + `profiles`                           |
| Finalists           | /admin/finalis                        | `(main)/admin/finalis`                                | `teams.is_finalist`, ranking views                  |
| Settings            | /admin/pengaturan                     | `(main)/admin/pengaturan`                             | `competition_settings`                              |
| Ranking and CSV     | /admin/peringkat                      | `(main)/admin/peringkat` (+ `export/route.ts`)        | `preliminary_ranking`, `final_ranking`, scores, `judge_recusals` |
| Submissions and CSV | /admin/submission                     | `(main)/admin/submission` (+ `export/route.ts`)       | `submissions`                                       |
| Teams               | /admin/tim                            | `(main)/admin/tim`                                    | `teams`                                             |
| Judge queue         | /judge                                | `(main)/judge/page.tsx`, `judge-dashboard-client.tsx`, `queries.ts` | `submissions`, own scores, `judge_recusals`        |
| Judge scoring       | /judge/nilai/[tahap]/[teamId]         | `(main)/judge/nilai/[tahap]/[teamId]`                 | `preliminary_scores`, `final_scores`, `judge_recusals` |
| Team portal         | /team                                 | `(main)/team` (files beside `page.tsx`)               | `submissions`, own `teams` row                      |
| Team showcase editor | /team/karya                           | `(main)/team/karya`                                   | own `teams`, own `submissions`, `competition_settings` |
| Public showcase      | /karya                                | `karya` (`page.tsx`, `karya-client.tsx`, `karya-logo.tsx`) | `get_public_showcase()`, `get_public_showcase_winners()` |
| Case study          | /judge/studi-kasus, /team/studi-kasus | `(main)/<role>/studi-kasus`                           | `competition_settings` (markdown)                   |
| Team results        | /team/hasil                           | `(main)/team/hasil`                                   | `get_my_results()` (RPC)                            |
| Change password     | /<role>/kata-sandi                    | `(main)/<role>/kata-sandi`                            | Auth (shared `components/change-password-form.tsx`) |
| Unauthorized        | /unauthorized                         | `(main)/unauthorized`                                 | none                                                |

Admin dashboard parts: `dashboard-client.tsx` (metric cards, progress ring, phase timeline, chase/judging/ranking panels, release controls, exports, health, activity) and `dashboard-countdown.tsx` (server-synced WITA countdown). Team portal parts: `submission-client.tsx` (form), `submission-checklist.tsx`, `submission-receipt.tsx`, `finalist-banner.tsx`. Team results page: `(main)/team/hasil` (`page.tsx`, `results-client.tsx`, `loading.tsx`).

Public gallery access: `/login` shows a secondary "Lihat Karya Peserta" button; admin and judges get a **Karya** sidebar item (`/karya`); teams keep their **Tampilan Karya** editor (`/team/karya`) and reach the gallery from the portal and showcase editor.

## Shared code

```
src/proxy.ts                         session refresh, login redirect
src/lib/auth.ts                      getCurrentProfile, requireRole, getDashboardPath
src/lib/auth-actions.ts              signIn, signOut, changePassword
src/lib/deadline.ts                  WITA conversion, exclusive-bound handling, +1 minute rule
src/lib/audit.ts                     server-only audit event writer for sensitive mutations
src/lib/rubric.ts                    rubric weights, calcWeightedTotal (must match DB)
src/lib/csv.ts                       CSV building and escaping
src/lib/link-check.ts                server-side URL validation, SSRF guard (DNS, private IP blocking)
src/lib/identity.ts                  judge username <-> internal email (@juri.mitweek.invalid)
src/lib/contact.ts                   WhatsApp number normalization
src/lib/user-display.ts              names, initials, role labels
src/lib/data-table-features.ts       TanStack Table v9 helpers
src/lib/supabase/client.ts           browser client
src/lib/supabase/server.ts           cookie-based server client (RLS applies)
src/lib/supabase/admin.ts            service role client, server-only, bypasses RLS
src/navigation/sidebar/sidebar-items.ts   getSidebarItems(role, juknisUrl, resultsReleased)
src/app/(main)/dashboard/_components      shell: dashboard-shell, header, sidebar (app-sidebar, nav-main, nav-user)
src/app/(main)/admin/akun                  account types, filters, clipboard control, and account utilities
src/components/                      shared UI (change-password-form, markdown-content, logout-button, rubric-bars); ui/ is shadcn, do not edit
src/components/showcase-card.tsx      shared public/team showcase card
src/components/showcase-gallery.tsx   public showcase gallery, vault, and timeline
src/types/database.ts                generated Supabase types
src/scripts/seed.mjs                 npm run seed / seed:clear
```

UI preferences and theming (`lib/preferences`, `stores/preferences`, `server/server-actions.ts`, `styles/presets`, `scripts/theme-boot.tsx`, `generate-theme-presets.ts`) are unrelated to feature work. Do not touch them.

Possibly unused starter code (verify imports before relying on or deleting): `data/users.ts`, `components/calendar`, `components/date-range-picker.tsx`, `components/simple-icon.tsx`, `lib/highlighter.tsx`, `hooks/use-highlighted-code.ts`.

## Database

- Tables: `profiles`, `teams`, `competition_settings` (single row), `submissions`, `preliminary_scores`, `final_scores`, `judge_recusals`.
- Views: `preliminary_ranking`, `final_ranking` (`security_invoker`).
- Helper functions (`SECURITY DEFINER`, empty `search_path`): `current_user_role`, `current_user_judge_stage`, `submission_open`, `team_can_submit`, `judge_can_view_team`, `judge_can_score_preliminary`, `judge_can_score_final`.

## If you change X, also check Y

| Change                 | Also touch                                                             |
| ---------------------- | ---------------------------------------------------------------------- |
| Rubric weights         | `src/lib/rubric.ts` and a migration (ask first)                        |
| Deadline logic         | `src/lib/deadline.ts`, `admin/pengaturan`, team portal countdown       |
| New screen             | page, client, actions, `sidebar-items.ts`, this file                   |
| New CSV export         | role check inside the route (401/403), `src/lib/csv.ts`, no emails     |
| Submission URL rules   | `src/lib/link-check.ts`, `team/actions.ts`, DB constraints (ask first) |
| Team-facing score data | `SECURITY DEFINER` function only, never a SELECT policy                |
| Table or column change | migration (ask first), regenerate `src/types/database.ts` (UTF-8)      |

# MAP.md

Architecture map of `src/`. Update it when you add, move or remove a screen or shared file. If it disagrees with the file system, trust the file system.

Documentation library: [index](./README.md), [setup](./SETUP.md), [architecture](./ARCHITECTURE.md), [data model](./DATA-MODEL.md), [application reference](./API.md), [competition phases](./COMPETITION-PHASES.md), [admin settings](./ADMIN-SETTINGS.md), [design system](./DESIGN-SYSTEM.md), [frontend conventions](./FRONTEND.md), [operations](./OPERATIONS.md), [contributing](./CONTRIBUTING.md).

## Conventions

- Route groups in parentheses are not in URLs. `(auth)` is public. `(main)` is protected and wrapped in the dashboard shell.
- Screen folder: `page.tsx` (server, fetches), `*-client.tsx` (client), `actions.ts` (server actions). Exceptions are listed below.
- Role guards are in `layout.tsx` via `requireRole()`. Layouts do **not** guard `route.ts` handlers, so export routes check the role themselves.
- Next.js 16 uses `src/proxy.ts` (session refresh and login redirect), not `middleware.ts`. `/login` and `/karya` are the only paths reachable without a session.
- `src/app/page.tsx` only redirects: to `/login`, or to the role's dashboard.

## Screens

| Screen | URL | Folder (under `src/app/`) | Data |
| --- | --- | --- | --- |
| Login | /login | `(auth)/login`, `(auth)/_components` | Auth, `get_public_contact_whatsapp()`, link to gallery |
| Public gallery | /karya | `karya` (`page.tsx`, `karya-client.tsx`, `karya-hero.tsx`, `karya-logo.tsx`, `karya-constants.ts`) | `get_public_showcase()`, `get_public_showcase_winners()` (anon RPCs) |
| Admin dashboard | /admin | `(main)/admin` (`page.tsx`, `dashboard-client.tsx`, `dashboard-countdown.tsx`) | counts, deadline, submissions, judging, ranking, audit |
| Accounts | /admin/akun | `(main)/admin/akun` | `profiles` + Auth (service role) |
| Audit | /admin/audit | `(main)/admin/audit/page.tsx` | `audit_logs` + `profiles` |
| Finalists | /admin/finalis | `(main)/admin/finalis` | `teams.is_finalist`, ranking views, `finalist_notice` |
| Settings | /admin/pengaturan/… | `(main)/admin/pengaturan` (see [Admin settings](./ADMIN-SETTINGS.md)) | `competition_settings`, `case_study`, scores (progress) |
| Ranking and CSV | /admin/peringkat | `(main)/admin/peringkat` (+ `export/route.ts`) | `preliminary_ranking`, `final_ranking`, scores, `judge_recusals` |
| Submissions and CSV | /admin/submission | `(main)/admin/submission` (+ `export/route.ts`) | `submissions` |
| Teams | /admin/tim | `(main)/admin/tim` | `teams` |
| Judge queue | /judge | `(main)/judge/page.tsx`, `judge-dashboard-client.tsx`, `queries.ts` | `submissions`, own scores, `judge_recusals` |
| Judge scoring | /judge/nilai/[tahap]/[teamId] | `(main)/judge/nilai/[tahap]/[teamId]` | `preliminary_scores`, `final_scores`, `judge_recusals` |
| Team dashboard | /team | `(main)/team` (files beside `page.tsx`, see below) | own `teams`, own `submissions`, `competition_settings`, `get_my_finalist_notice()` |
| Team showcase editor | /team/karya | `(main)/team/karya` | own `teams`, own `submissions`, `save_showcase_details()`, storage bucket `web-showcase` |
| Team results | /team/hasil | `(main)/team/hasil` (`page.tsx`, `results-client.tsx`, `loading.tsx`) | `get_my_results()` (RPC) |
| Case study | /judge/studi-kasus, /team/studi-kasus | `(main)/<role>/studi-kasus` (view lives in `team/studi-kasus`) | `case_study`; team page also reads own `submissions` |
| Change password | `/<role>/kata-sandi` | `(main)/<role>/kata-sandi` | Auth (shared `components/change-password-form.tsx`) |
| Unauthorized | /unauthorized | `(main)/unauthorized` | none |

## Team dashboard (`(main)/team`)

See [Competition phases](./COMPETITION-PHASES.md) for behavior.

| File | Role |
| --- | --- |
| `page.tsx` | Loads team, submission, settings (deadline, contact, showcase, release flags), finalist notice |
| `layout.tsx` | `requireRole("team")`, results-released flag, team code for the sidebar user chip |
| `submission-client.tsx` | Orchestrates the page: phase, form state, open vs closed (bento) layout, showcase card, help strip |
| `team-phase.ts` | `resolveTeamPhase()`: pure phase resolver, plus the `FinalistNoticeData` type |
| `team-schedule.ts` | Hardcoded `TEAM_SCHEDULE`, `FINAL_PRESENTATION`, `toWitaDateKey()`, `daysBetweenDateKeys()` |
| `team-hero.tsx` | Phase-aware hero (countdown + live checklist, milestone tile, finalist/final/results states) |
| `journey-track.tsx` | Hex-node timeline; horizontal on `md+`, vertical on mobile |
| `guardian-id-card.tsx` | Team code access pass with members; hover tilt (off under reduced motion) |
| `submission-receipt.tsx` | Ticket-style receipt with stamp and morphing copy buttons; printing shows only the receipt |
| `submission-checklist.tsx` | Manual pre-submit checklist (local state only) |
| `actions.ts` | `saveSubmission`, `checkMyLinks` |
| `studi-kasus/case-study-view.tsx` | Case study view shared with judges: 01/02/03 tiles, deliverables checklist (team only) |
| `studi-kasus/case-study-toc.tsx` | Table of contents with reading progress and active heading |
| `studi-kasus/case-study-countdown.tsx` | Deadline countdown on the case study page |
| `karya/karya-client.tsx` | Showcase editor: consent toggle, drag-and-drop 16:10 image, sticky preview |

## Sidebar and shell (`(main)/dashboard/_components`)

| File | Role |
| --- | --- |
| `dashboard-shell.tsx` | Server shell for every role: sidebar, header, `ThemeToggle`; computes gallery badge state from `showcase_published_at` |
| `sidebar/app-sidebar.tsx` | Hex logo header with mono sub-label |
| `sidebar/nav-main.tsx` | Guardian nav rows (icon tiles, ink active state + mint hex marker, press effect), mono section labels, badges |
| `sidebar/nav-user.tsx` | Guardian user chip: hex avatar, name, team code (teams) or role chip (admin/judge) |
| `header/search-dialog.tsx` | Admin command search over sidebar items |

Menu structure comes from `src/navigation/sidebar/sidebar-items.ts`:

- **Team**: PESERTA (Dasbor, Hasil Penilaian when released) · KARYA SAYA (Atur Tampilan) · JELAJAH (Galeri, Studi Kasus, Juknis)
- **Judge**: JURI (Dasbor) · JELAJAH (Galeri, Studi Kasus, Juknis)
- **Admin**: ADMIN (Dasbor) · KOMPETISI (Akun, Tim, Submission, Peringkat, Finalis, Galeri) · SISTEM (Audit, Pengaturan)

Galeri shows a lock + "18 NOV" badge until the gallery is published, then "Baru" for 7 days. Items with `matchPrefix: true` stay active on sub-pages.

## Shared code

```
src/proxy.ts                         session refresh, login redirect; /login and /karya are public
src/lib/auth.ts                      getCurrentProfile, requireRole, getDashboardPath
src/lib/auth-actions.ts              signIn, signOut, changePassword
src/lib/deadline.ts                  WITA conversion, exclusive-bound handling, +1 minute rule
src/lib/audit.ts                     server-only audit event writer (logAuditEvent)
src/lib/rubric.ts                    rubric weights, calcWeightedTotal (must match DB)
src/lib/csv.ts                       CSV building and escaping
src/lib/link-check.ts                server-side URL validation, SSRF guard (DNS, private IP blocking)
src/lib/identity.ts                  judge username <-> internal email (@juri.mitweek.invalid)
src/lib/contact.ts                   WhatsApp number normalization and wa.me URLs
src/lib/user-display.ts              names, initials, role labels
src/lib/data-table-features.ts       TanStack Table v9 helpers
src/lib/supabase/client.ts           browser client
src/lib/supabase/server.ts           cookie-based server client (RLS applies)
src/lib/supabase/admin.ts            service role client, server-only, bypasses RLS
src/navigation/sidebar/sidebar-items.ts   getSidebarItems(role, juknisUrl, resultsReleased, galleryState)
src/components/theme-toggle.tsx      shared two-state light/dark toggle (header; floating on /karya)
src/components/showcase-card.tsx     shared public/team showcase card
src/components/showcase-gallery.tsx  public showcase gallery, vault, and timeline
src/components/                      also change-password-form, markdown-content, logout-button, rubric-bars
src/components/ui/                   shadcn/ui, generated: do not edit
src/app/globals.css                  theme tokens, Guardian tokens and utilities (see DESIGN-SYSTEM.md)
src/types/database.ts                generated Supabase types (UTF-8)
src/scripts/seed.mjs                 npm run seed / seed:clear (never against production)
scripts/                             backup, restore, seed-showcase, import-registrations, whatsapp-links
```

UI preferences and theming internals (`lib/preferences`, `stores/preferences`, `server/server-actions.ts`, `styles/presets`, `scripts/theme-boot.tsx`, `generate-theme-presets.ts`) are unrelated to feature work. Do not touch them. The only consumer-facing piece is `ThemeToggle`.

Possibly unused starter code (verify imports before relying on or deleting): `data/users.ts`, `components/calendar`, `components/date-range-picker.tsx`, `components/simple-icon.tsx`, `lib/highlighter.tsx`, `hooks/use-highlighted-code.ts`.

## Database

Full reference: [Data model](./DATA-MODEL.md).

- Tables: `profiles`, `teams`, `competition_settings` (single row), `submissions`, `submission_history`, `preliminary_scores`, `final_scores`, `judge_recusals`, `case_study` (single row), `finalist_notice` (single row), `audit_logs`.
- Pending (migration written, not applied): `competition_stages`, `final_presentation`, plus new `competition_settings` columns.
- Views: `preliminary_ranking`, `final_ranking` (`security_invoker`).
- Storage: bucket `web-showcase` (team showcase images).

## If you change X, also check Y

| Change | Also touch |
| --- | --- |
| Rubric weights | `src/lib/rubric.ts` and a migration (ask first) |
| Deadline logic | `src/lib/deadline.ts`, `admin/pengaturan/pengumpulan`, team hero countdown, `team-phase.ts` |
| A competition date | all five places in [Competition phases](./COMPETITION-PHASES.md#where-the-schedule-is-hardcoded-until-the-stages-migration-is-live) |
| Team phase rules | `team-phase.ts`, `team-hero.tsx`, the phase table in COMPETITION-PHASES.md |
| New settings section | `settings-sections.ts`, overview `statusByHref`, [Admin settings](./ADMIN-SETTINGS.md) |
| New screen | page, client, actions, `sidebar-items.ts`, this file |
| Colors / visual tokens | `globals.css` (light and dark values), [Design system](./DESIGN-SYSTEM.md) |
| New CSV export | role check inside the route (401/403), `src/lib/csv.ts`, no emails |
| Submission URL rules | `src/lib/link-check.ts`, `team/actions.ts`, DB constraints (ask first) |
| Team-facing score data | `SECURITY DEFINER` function only, never a SELECT policy |
| Data for the public gallery | anon-callable `SECURITY DEFINER` RPC returning public fields only, never a table grant to `anon` |
| Table or column change | migration (ask first), regenerate `src/types/database.ts` (UTF-8) |

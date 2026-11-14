# Application reference

## API boundary

This project does not currently expose a public REST or GraphQL API. Browser interactions use Next.js Server Actions and page loaders. Supabase Auth and the database RPC function are the external service interfaces.

When documenting a new public API, include authentication, input validation, response shape, status codes, and a runnable example. Do not describe internal actions as stable public endpoints without an explicit decision to make them public.

## Pages and role access

| Area | Routes | Role |
| --- | --- | --- |
| Public | `/login`, `/karya` (gallery, data only via anon RPCs) | Anyone |
| Admin | `/admin`, `/admin/akun`, `/admin/audit`, `/admin/finalis`, `/admin/peringkat`, `/admin/submission`, `/admin/tim` | `admin` |
| Admin settings | `/admin/pengaturan` (overview), `/pengumpulan`, `/hasil`, `/galeri`, `/studi-kasus`, `/tautan` | `admin` |
| Judge | `/judge`, `/judge/nilai/[tahap]/[teamId]`, `/judge/studi-kasus` | `judge` |
| Team | `/team`, `/team/karya`, `/team/hasil` (only once results are released), `/team/studi-kasus` | `team` |
| Shared | `/` (redirect), `/<role>/kata-sandi`, `/unauthorized` | Authenticated / role-aware |

The authoritative screen-to-source map is [MAP.md](./MAP.md).

## CSV routes

### `GET /admin/submission/export`

Exports submission records for administrators. The route checks authentication and the `admin` role itself because layouts do not guard route handlers. The response is a UTF-8 BOM CSV with `Content-Disposition`, `Cache-Control: no-store`, normal CSV quoting, and formula-injection neutralization. It contains submission data, not scores or personal data beyond the export's approved operational fields.

### `GET /admin/peringkat/export`

Exports administrator-only preliminary/final ranking data. It has the same authentication, no-store, BOM, quoting, and formula-neutralization requirements. Keep judge identity and unapproved personal data out of ranking exports.

## Server-side data interfaces

| Interface | Location | Behavior |
| --- | --- | --- |
| Authentication/profile | `src/lib/auth.ts` | `getCurrentProfile()` uses `getUser()` and `profiles`; `requireRole()` redirects unauthorized page requests. |
| Team mutations | `src/app/(main)/team/actions.ts` | Validates submission input and relies on session ownership, RLS, deadline helpers, and database constraints. |
| Judge mutations | `src/app/(main)/judge/nilai/actions.ts` | Saves drafts or locked scores for the authenticated judge and permitted stage. |
| Admin mutations | `src/app/(main)/admin/*/actions.ts` | Performs admin-only account, team, finalist, settings, and submission operations. Settings actions live in `admin/pengaturan/actions.ts` (see [Admin settings](./ADMIN-SETTINGS.md)). |
| Team showcase | `src/app/(main)/team/karya/actions.ts` | Saves consent, title, description and image path through `save_showcase_details()`; images upload to the `web-showcase` bucket from the browser. |
| Team results | `get_my_results()` in `20261026000000_team_results.sql` | Authenticated RPC that derives the caller's team and returns only released, anonymized results. |
| Finalist notice | `get_my_finalist_notice()` | Authenticated RPC returning the caller's published finalist/non-finalist message. |
| Public data | `get_public_showcase()`, `get_public_showcase_winners()`, `get_public_contact_whatsapp()` | Anon-callable RPCs returning public fields only. |

The full function catalog, including the pending stage and final-presentation functions, is in [Data model](./DATA-MODEL.md#database-functions).

## Error behavior

User-facing errors should be generic and actionable. Never return raw Supabase errors, SQL, table names, stack traces, service-role values, or internal identifiers. Server actions must validate with Zod and surface failure through the repository's existing notification/form patterns.

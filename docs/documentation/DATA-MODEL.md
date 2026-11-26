# Data model and security

`supabase/migrations/` is the source of truth. Applied migrations are never edited; schema changes go in a new migration, written only with the owner's approval. After applying, regenerate `src/types/database.ts` (UTF-8; on PowerShell 5.1 use `| Out-File -Encoding utf8`, never `>`).

## Entity relationship overview

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : identifies
    PROFILES ||--o| TEAMS : owns
    TEAMS ||--o| SUBMISSIONS : submits
    SUBMISSIONS ||--o{ SUBMISSION_HISTORY : logs
    PROFILES ||--o{ PRELIMINARY_SCORES : gives
    TEAMS ||--o{ PRELIMINARY_SCORES : receives
    PROFILES ||--o{ FINAL_SCORES : gives
    TEAMS ||--o{ FINAL_SCORES : receives
    PROFILES ||--o{ JUDGE_RECUSALS : records
    TEAMS ||--o{ JUDGE_RECUSALS : concerns
    PROFILES ||--o{ AUDIT_LOGS : acts
```

Single-row tables (`id BOOLEAN PRIMARY KEY CHECK (id)`): `competition_settings`, `case_study`, `finalist_notice` and, once applied, `final_presentation`.

## Tables

| Table/view | Purpose |
| --- | --- |
| `profiles` | Role (`admin`/`judge`/`team`), judge stage (`preliminary`/`final`/`both`), `is_active`, linked to `auth.users`. The only source of roles. |
| `teams` | Team code, name, institution, leader, members, `is_finalist`, `is_disqualified`, showcase consent/title/description/image path, `showcase_is_finalist` snapshot. |
| `competition_settings` | Deadline (`submission_closes_at`, exclusive), `juknis_url`, `contact_whatsapp`, result-release flags, `ranking_published`, showcase/winners publication timestamps, `showcase_consent_locked_at`. |
| `submissions` | One draft or submitted set of GitHub, live-demo and video links per team, notes for judges, link-check result, `first_submitted_at`. |
| `submission_history` | Trigger-written history of submission changes (`log_submission_change`). |
| `case_study` | Markdown case study, optional `release_at`, last updater. |
| `finalist_notice` | Finalist and non-finalist messages, `is_published`, `published_at`. Admin-only; teams read via `get_my_finalist_notice()`. |
| `preliminary_scores`, `final_scores` | One score per judge/team pair, generated weighted total, feedback, draft/final status. |
| `judge_recusals` | Judge/team/stage conflicts excluded from assignments and progress. |
| `score_sanctions` | Admin sanctions: points deducted from one criterion of a team's stage average, with a reason shown to the team. Admin-only RLS (select/insert/delete, no update). Pending migration `20261122000000`. |
| `audit_logs` | Sensitive admin/judging actions, written server-side by `logAuditEvent()` with the service role; admin-only SELECT. |
| `preliminary_ranking`, `final_ranking` | Aggregate ranking views (`security_invoker`). |

Storage: bucket `web-showcase` holds team showcase images (`showcase/<profile_id>/<uuid>.<ext>`), cropped to 16:10 client-side before upload.

## Database functions

All are `SECURITY DEFINER` with an empty `search_path` unless noted, and check authorization inside the body.

| Function | Callable by | Purpose |
| --- | --- | --- |
| `current_user_role()`, `current_user_judge_stage()` | internal / policies | Role and stage of the caller's **active** profile |
| `submission_open()`, `team_can_submit()` | internal / policies | Deadline and ownership checks for submissions |
| `judge_can_view_team()`, `judge_can_score_preliminary()`, `judge_can_score_final()` | internal / policies | Judge assignment and stage checks |
| `get_my_results()` | authenticated (team) | Released, anonymized aggregates and feedback for the caller's own team |
| `get_public_ranking()` | authenticated (team, judge, admin) | Only when `ranking_published`: every submitted, non-disqualified team's rank, name, institution, aggregate score and its stage, plus `is_own_team`. Finalists first by final average, then the rest by preliminary average. Committee-approved exception to the no-rank rule |
| `get_preliminary_scores_for_final(p_team_id)` | authenticated (final/`both` judge) | Only after `preliminary_results_released`, for a non-disqualified submitted finalist the caller is not recused from: final-status preliminary scores (criteria, weighted total, `feedback`) with judges anonymized as a per-team label. Never judge ids, names, timestamps, `private_note` or drafts |
| `get_my_finalist_notice()` | authenticated (team) | Finalist or non-finalist message once published; nothing for disqualified teams |
| `set_showcase_consent()`, `save_showcase_details()` | authenticated (team) | Team edits its own showcase while unlocked |
| `publish_showcase_phase_one()`, `publish_showcase_phase_two()`, `publish_showcase_winners()` | authenticated (admin check inside) | Gallery publication stages |
| `get_public_showcase()`, `get_public_showcase_winners()` | **anon** | Public gallery data (consenting teams only) |
| `get_public_contact_whatsapp()` | **anon** | Committee WhatsApp number for the login page |
| Trigger functions (`touch_updated_at`, `lock_score_keys`, `check_*`, `log_submission_change`, `set_submission_*`) | not client-callable | Timestamps, score locks after release, recusal checks, history |

Anon access is only ever granted on functions that return public fields. `anon` has no privileges on any table, view or sequence.

## Pending migrations

Written, **not applied** at the time of writing. Check `src/types/database.ts` for `competition_stages`: if it is missing, they have not been applied.

### `20261127000000_site_content.sql`

Apply after `20261126000000`. Adds `site_content (key, value, updated_at, updated_by)` for admin-edited page copy (Pengaturan → Konten). Keys match `^[a-z0-9_.]+$` (≤ 80 chars), values ≤ 5000 chars; a missing row means the app uses its built-in default. RLS: admin-only SELECT/INSERT/UPDATE/DELETE, no `anon` privileges. `get_site_content()` (SECURITY DEFINER, anon + authenticated) returns only `key, value`. **Everything in this table is public by design**: never store private data there. Regenerate types after applying.

### `20261126000000_judges_view_public_ranking.sql`

Apply after `20261122000000`. Redefines `get_public_ranking()` with the body unchanged except the role check: active judges may now call it too (for `/judge/peringkat`). Same `ranking_published` gate and columns; `is_own_team` is always false for judges. No type changes.

### `20261122000000_score_sanctions.sql`

Apply after `20261121000000` (it redefines `get_public_ranking()`). App code tolerates it being missing (sanction controls disabled, exports omit sanctions). Adds `score_sanctions` and `score_sanction_deduction()`, redefines `preliminary_ranking`/`final_ranking` (two columns appended), `get_my_results()` and `get_public_ranking()`; see **Scoring**. Also makes `get_my_results()` count only final-status scores (it previously included drafts). Types were added to `src/types/database.ts` by hand; regenerating replaces them with the same shape.

### `20261121010000_final_judges_view_preliminary.sql`

Independent of the others; app code is merged and tolerates the migration being missing (the panel stays hidden). Adds `get_preliminary_scores_for_final(p_team_id)` (see the functions table). Shown on `/judge/nilai/final/[teamId]` as "Nilai Babak Awal". Types for it were added to `src/types/database.ts` by hand; regenerating after applying replaces them with the same shape.

### `20261121000000_public_ranking.sql`

Independent of the others; app code is merged and tolerates the migration being missing (toggle disabled, no ranking shown). Adds `competition_settings.ranking_published` and `get_public_ranking()` (see the functions table).

### `20261114000000_competition_stages.sql`

- `competition_stages`: one row per milestone (`key`, `title`, `description`, `starts_on`/`ends_on` as WITA `DATE`, `time_label`, `sort_order`, `show_on_track`, `status_override` (`NULL`/`upcoming`/`current`/`done`), `is_system`, `updated_at`, `updated_by`).
- Seeded system stages: `review`, `top5`, `gallery` (hidden from the track), `final`, `winners`. The submission deadline stays in `competition_settings`.
- Trigger `guard_competition_stage` blocks changing a system key or `is_system` and stamps `updated_by`. RLS: any active role reads; admin writes; system rows cannot be deleted; admins cannot create system rows.
- `get_public_competition_schedule()`: anon + authenticated, schedule fields only.

### `20261114010000_event_identity_and_final_details.sql`

- `competition_settings` gains `event_name`, `event_track`, `finalist_count` (1–20, display only; finalists are still picked manually) and `gallery_new_badge_days` (0–60).
- `get_public_event_info()`: anon + authenticated, identity fields only.
- `final_presentation` (single row, admin-only RLS): `presentation_minutes`, `qa_minutes`, `venue`, `meeting_url` (https), `note`, `logistics_published`. It is a separate table because every signed-in role can read `competition_settings`.
- `get_my_final_presentation()`: returns data only to admins, judges with stage `final`/`both`, and non-disqualified finalist teams after the finalist notice is published. Venue and link are `NULL` until `logistics_published`.

After applying: regenerate types, then switch the hardcoded schedule listed in [Competition phases](./COMPETITION-PHASES.md) to these tables.

### `20261117000000_showcase_finalists_shared_card.sql`

Independent of the two above; the app code for it is already merged and needs no type changes. **Apply before the finalist gallery is published**, otherwise finalists who did not consent are missing from `/karya` and the admin editor's images fail to upload.

- Finalists (`showcase_is_finalist`) are listed by `get_public_showcase()` even without `showcase_consent`, with their title, description and image. Repository/demo/video links still require consent. `get_public_showcase_winners()` uses the same card rule.
- Admin and team edit the same `showcase_title`/`showcase_description`/`showcase_image_path` columns; last save wins. Admin edits go through `saveFinalistShowcase` (Pengaturan → Galeri).
- `save_showcase_details()`: once the finalist notice is published, finalists stay editable until `showcase_finalists_published_at` (others still lock at `showcase_consent_locked_at`). Before the notice, finalists are treated like everyone else so the call never reveals finalist status. A team may keep an image the admin uploaded.
- Storage: admins may upload/delete under `web-showcase/showcase/admin/<team_id>/`.

## Scoring

The current rubric is defined in both the generated score columns and [rubric.ts](../../src/lib/rubric.ts):

| Criterion | Preliminary | Final |
| --- | ---: | ---: |
| Fungsionalitas | 35% | 25% |
| Kesesuaian dengan Studi Kasus | 25% | 20% |
| UI/UX | 20% | 15% |
| Kualitas Kode & Pemeliharaan | 10% | 10% |
| Dokumentasi | 10% | 10% |
| Presentasi dan Q&A | - | 20% |

Scores are bounded from 0 to 100. Totals are generated numeric values, displayed with two decimals.

**Sanctions** (`score_sanctions`, migration `20261122000000`): an admin deducts points from one criterion of a team's stage. They apply to the team's **criterion average over final-status judge scores**, never to individual judge scores: `adjusted = max(0, average − Σ points)`, so a criterion bottoms out at exactly 0 and the total cannot go below 0. `score_sanction_deduction(team, stage)` returns the weighted points removed; the ranking views (`avg_score`, `rank`, plus `raw_avg_score`, `sanction_deduction`), `get_my_results()` (adjusted `average`/`total` and the team's `sanctions` with criterion, the points as entered (even when larger than the criterion score) and reason; pre-sanction values and the effective, capped deduction are deliberately **not** returned to teams) and `get_public_ranking()` all use it. Teams without sanctions get identical numbers. Sanctions can be added or removed at any time (also after release); each change writes `score_sanction_added`/`score_sanction_removed` to `audit_logs`. The weights in the helper must match the generated columns and `rubric.ts`. Rubric weights are intentionally **not** editable from settings; changing them after scoring starts would change finished scores.

## Security invariants

- All application tables have RLS and explicit grants; `anon` receives no application-table privileges.
- Server actions authenticate with `getUser()` and verify the profile role before touching data.
- Team and judge identifiers come from the authenticated session, never from client-provided IDs.
- Teams receive results only through `get_my_results()`, which checks active ownership and release state inside the function.
- Results expose aggregates and anonymous comments, not judge IDs, names, timestamps, rank, or per-judge raw scores.
- Judge-to-judge exception (committee request): final judges see anonymized per-judge preliminary scores and comments through `get_preliminary_scores_for_final()` only, never `private_note` or identity.
- Release triggers block score inserts, updates, and deletes after a stage is released.
- Finalist-only data (final venue and meeting link) is not stored on tables every role can read.
- Admin CSV routes independently return 401 for unauthenticated requests and 403 for non-admin users; exports use BOM, formula-neutralized cells, and `no-store`.

Treat these as invariants when adding a route, action, table, function, or export.

### `20261118000000_judge_feedback_edit.sql`

Independent of the others; app code is merged. Apply before judges need to correct a comment after release.

- `update_my_score_feedback(p_stage, p_team_id, p_feedback)`: judge-only. Replaces `feedback` (max 2,000 chars) on the caller's own score with `status = 'final'`, even when `locked_at` is set or the stage results are released. Scores, lock and status never change. Writes `score_feedback_replaced` to `audit_logs` with the previous comment.
- The release-lock triggers (`check_*_scores_not_released`) allow that one write only: the function sets a transaction-local flag (`mitweek.feedback_only_edit`) and the trigger checks nothing but `feedback`/`updated_at` changed. Clients cannot set the flag; `is_feedback_only_edit()` is not client-callable.
- Teams see the new comment immediately through `get_my_results()` (still anonymous).

### `20261118010000_showcase_demo_status.sql`

Apply after `20261117000000`. The gallery code works without it (no "Demo aktif" marks until it is applied).

- Drops and recreates `get_public_showcase()` with an extra `live_demo_ok BOOLEAN` column: `TRUE` only when the team's demo link is shown (consent) and `submissions.link_check -> 'liveDemo' ->> 'status' = 'ok'`. Rows and visibility rules are the same as `20261117000000`.
- Freshness depends on the last link check; Admin → Submission → "Periksa ulang semua" re-checks every team.

### `20261118020000_showcase_finalist_links.sql`

Apply after `20261118010000`. Per the finalist announcement ("Galeri Karya (Wajib)"), finalists' links are public.

- `get_public_showcase()` and `get_public_showcase_winners()`: for finalists (`showcase_is_finalist`), `github_url`, `live_demo_url` and `video_url` are returned even without `showcase_consent`. `live_demo_ok` follows the same rule. Non-finalists are unchanged (every link needs consent).
- The team page hides the consent switch for announced finalists. Until applied, finalists without consent show disabled link buttons on `/karya` (the admin and team previews already assume the new rule).

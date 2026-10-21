# MIT-WEEK 2026 Portal: Phase 2B, Judging

You are continuing a project built in earlier sessions. Read this whole file first. **Do not rebuild anything that already exists.** Before writing code, inspect the repo and confirm the "Current state" section matches reality. If something differs, tell me before continuing.

Work in small steps. **Stop after each step** with a short report: what you changed, what I should test. Wait for my go-ahead before the next step. Edit existing files where possible instead of re-creating them. **Do not run git commands; I commit myself.** Do not run formatters across the whole project; check only the files you changed.

Time matters: prefer simple, working solutions.

---

## 1. What the app is

A portal for a web development competition ("MIT-WEEK 2026"). Roles: `admin` (organizer), `judge`, `team`. Judges have a `judge_stage`: `preliminary`, `final`, or `both`. Preliminary judges score all submitted teams; final judges score the finalists (the admin marks finalists in `/admin/tim`). Judges score independently and must never see each other's scores.

## 2. Tech stack and environment

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zod, React Hook Form, **TanStack Table v9** (API differs from v8; check installed types), Biome.
- Backend: Supabase (Postgres + Auth + RLS). Hosting later: Vercel (server time zone is UTC, so always pass `timeZone: "Asia/Makassar"` explicitly).
- npm; Windows PowerShell commands only. Next.js 16 uses `src/proxy.ts`.
- Env names (values in `.env.local`; never print or ask for values): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- Existing helpers: `src/lib/supabase/{client,server,admin}.ts`, `src/lib/auth.ts` (`getCurrentProfile()`, `requireRole()`), `src/lib/user-display.ts`, `src/lib/deadline.ts`, `src/types/database.ts`. The admin CSV export route for submissions exists at `src/app/(main)/admin/submission/export/route.ts`; if its CSV helper functions (escaping, BOM, formula-injection guard) are inline, extract them into `src/lib/csv.ts` and reuse them, without changing the submissions export's behavior.
- Pattern used by existing pages: folder with `page.tsx` (server component fetching data), `*-client.tsx`, `actions.ts`.

## 3. Database (already applied; do NOT modify)

Do not write migrations or touch `supabase/`. If you believe a schema change is needed, **stop and ask me**.

- `preliminary_scores` and `final_scores`: `judge_id`, `team_id`, UNIQUE `(judge_id, team_id)`; each criterion is `NUMERIC(5,2)` with CHECK 0..100; `total_weighted_score` is a **generated column** (the database computes it; never send it); `feedback` text; `created_at`, `updated_at` (a trigger locks `judge_id`, `team_id`, `created_at` on update and sets `updated_at`).
- Preliminary columns: `functionality_score`, `case_study_fit_score`, `ui_ux_score`, `code_quality_score`, `documentation_score`. Weights: 35 / 25 / 20 / 10 / 10 (%).
- Final columns: the same five plus `presentation_qa_score`. Weights: 25 / 20 / 15 / 10 / 10 / 20 (%).
- Views `preliminary_ranking` and `final_ranking` (`security_invoker`): `team_id`, `team_code`, `team_name`, `judges_count`, `avg_score`, `rank`. They average the judges' weighted totals and exclude disqualified teams (the final view also requires `is_finalist`). Admin sees everything; a judge would only see aggregates of their own scores.

RLS facts:

- A judge reads **only their own** scores. Admin reads all.
- A judge can insert/update a preliminary score only if their stage is `preliminary` or `both`, the team is not disqualified, and the team's submission has status `submitted`. For final scores: stage `final` or `both`, the team is a finalist and not disqualified, and the submission is `submitted`.
- Judges can read teams, and read submissions with status `submitted` (preliminary/`both` judges: all; final-only judges: finalists only).
- Teams have no access to score tables.
- When RLS blocks an **insert**, Postgres returns an error (code 42501). When it blocks an **update**, it returns **zero rows with no error**. Always request the saved row (`.select()`) and treat "no row" as a failure.

## 4. Hard rules

1. **UI language is Indonesian** (labels, buttons, messages, toasts, empty states, dialogs, headers). Code, identifiers, file names, comments stay in English. Dates: `Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", ... })` with the "WITA" label.
2. **RLS is the security boundary.** Route guards and hidden buttons are only UX.
3. **Judge actions use the normal session client only.** Never use the admin (service role) client for judge or admin read/write in this phase. The admin client must never be imported from a client component.
4. Every server action and route handler first verifies the caller with `getCurrentProfile()` (uses `getUser()`, never `getSession()`) and checks the role (and, for judges, the stage) before any database call.
5. **Never take `judge_id` from the browser**; use the authenticated user's id. `team_id` comes from the URL but must be validated (UUID) and is always re-checked by RLS.
6. Validate all input with Zod: each score is a number from 0 to 100 with at most 2 decimals; feedback is trimmed, max 2000 characters. Return plain objects with Indonesian messages. Never return or show raw database errors.
7. **Never show a judge another judge's scores** (not in the UI, not in any query). Judge pages must select only the judge's own rows (`judge_id = current user`), even though RLS also enforces it.
8. Keep rubric weights in one file, `src/lib/rubric.ts`, with a comment that they must match the database's generated columns. The UI may show a live weighted preview, but the stored/displayed saved total comes from the database.
9. Reuse template components; check that a UI component exists in `src/components/ui/` before importing it; add it with the shadcn CLI if missing.
10. After every step run `npm run lint` and `npm run build`, fix errors, and report. One Biome warning in `src/lib/highlighter.tsx` comes from the template and can be ignored.
11. Do not delete or modify anything under `supabase/`, or files unrelated to the current step. Do not print or commit `.env` / `.env.local`.
12. Out of scope: locking scores after judging closes (needs a schema change; ask me), Google Form fallback, deployment, email notifications, public leaderboards.

## 5. Current state (verify before continuing)

Phase 1 and Phase 2A are complete: login and role routing; admin accounts, teams (finalist and disqualified toggles), settings (deadline), submission monitoring, and CSV export of submissions; the team submission portal at `/team`. The `/judge` page is still a placeholder ("Halaman juri segera hadir."). In the admin sidebar, "Penilaian", "Peringkat", and "Ekspor Data" are disabled items marked "Segera".

---

## Step A: Rubric constants and judge dashboard (`/judge`)

1. Create `src/lib/rubric.ts` with, for each stage, the ordered criteria: database column name, Indonesian label, weight (%). Labels: Fungsionalitas; Kesesuaian studi kasus; UI/UX; Kualitas kode & maintainability; Dokumentasi; Presentasi & Tanya Jawab (final only). Export helper `calcWeightedTotal(stage, scores)`.
2. Replace the `/judge` placeholder. Using the judge's stage from their profile:
   - Stage `preliminary`: show the preliminary list only. Stage `final`: the final list only. Stage `both`: two tabs ("Babak Awal", "Final").
   - Each list shows the teams the judge can score, with: Kode Tim, Nama Tim, and the judge's own status: `Belum dinilai` or `Sudah dinilai` (with the judge's own total, 2 decimals, and last-saved time in WITA), plus a button "Nilai" / "Ubah nilai".
   - Preliminary list: teams with a `submitted` submission that are **not disqualified**. Final list: finalists that are not disqualified with a `submitted` submission.
   - Do not show institution, members, or emails to judges (reduces bias). Tell me if you think they should be shown.
3. A progress line per list: "X dari Y tim sudah dinilai".
4. Empty states in Indonesian (for example "Belum ada submission yang dapat dinilai.").
5. Judge sidebar: "Dasbor" only. Only the judge's own scores are queried.

## Step B: Scoring form

Route: `/judge/nilai/[tahap]/[teamId]` where `tahap` is `preliminary` or `final`.

1. Page guard: `requireRole("judge")`. Reject (redirect to `/judge` with a toast or notice) when the judge's stage does not allow that `tahap`, or when the team is not eligible (not found, disqualified, no submitted submission, or not a finalist for final). Do not reveal why in detail.
2. Page content:
   - Header: Kode Tim and Nama Tim, and the tahap.
   - **Submission links** (GitHub, Live Demo, Video) as safe links: open in a new tab with `rel="noopener noreferrer"`, render as links only if the URL starts with `http://` or `https://`.
   - **Rubric form** (React Hook Form + Zod): one numeric input per criterion (0–100, step 0.01) showing its label and weight, plus a feedback textarea. Prefill from the judge's existing score for this team (if any).
   - A live **"Total berbobot (pratinjau)"** computed with `calcWeightedTotal`. Label it as a preview; after saving, show the total returned by the database.
   - Buttons: "Simpan nilai" and "Kembali". After saving, show a toast "Nilai berhasil disimpan." and stay on the page.
3. Server action `saveScore` (in `src/app/(main)/judge/nilai/actions.ts`):
   - Verify an active judge whose stage allows the tahap. Validate with Zod (`tahap`, `team_id` UUID, scores, feedback).
   - Look up the existing row for `(judge_id = current user, team_id)`; insert if none, update if one exists. Never send `judge_id` for update; never send `total_weighted_score`.
   - Use `.select()` and treat an empty result (update) or error code 42501 (insert) as "not allowed": return "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini."
   - Handle a unique-violation race on insert by retrying once as an update.
   - `revalidatePath("/judge")`. Return `{ ok: true, total, updatedAt }` or `{ ok: false, message }`.

## Step C: Admin results (`/admin/peringkat`)

Enable the sidebar item "Peringkat" and remove the disabled items "Penilaian" and "Ekspor Data" (their functions live on this page and on the Submission page).

1. **Progress section:** for each active judge (name, stage) the number of preliminary and/or final scores they have entered vs the number of teams they are expected to score (submitted, non-disqualified teams; for final, finalists). Flag judges with incomplete scoring.
2. **Ranking tables** (two tabs: "Babak Awal", "Final") from the views `preliminary_ranking` and `final_ranking`: Peringkat, Kode Tim, Nama Tim, Jumlah Juri, Rata-rata Skor. Highlight the top 5 in the preliminary tab. Show a visible warning when `judges_count` differs between teams (averages over different numbers of judges are not comparable). Ties share a rank (the view already does this); show a note when ties exist near the cutoff of 5.
3. **Per-team breakdown** (row action "Lihat detail"): a dialog listing every judge's criterion scores, weighted total, and feedback for that team and tahap. Admin only.
4. A shortcut link from the preliminary tab to `/admin/tim` ("Tetapkan finalis"). Do not add bulk finalist assignment.
5. **Scores CSV export:** "Ekspor CSV" per tab → route handler `GET /admin/peringkat/export?tahap=preliminary|final`. Verify an active admin (401/403 otherwise); session client only. Columns: team_code, team_name, judge_name, one column per criterion, total_weighted_score, feedback, created_at, updated_at (WITA `YYYY-MM-DD HH:mm:ss`). **No emails.** Reuse the CSV helpers (UTF-8 BOM, escaping, formula-injection guard for every cell including feedback), `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="scores-<tahap>-YYYY-MM-DD.csv"`, `Cache-Control: no-store`. Use a plain `<a download>` for the button, not a Next `<Link>`.
6. All data is read with the session client (admin RLS allows it).

---

## 6. Indonesian terms

| English                        | Indonesian                      |
| ------------------------------ | ------------------------------- |
| Preliminary / Final round      | Babak Awal / Final              |
| Not yet scored / Scored        | Belum dinilai / Sudah dinilai   |
| Score (verb) / Edit score      | Nilai / Ubah nilai              |
| Save score                     | Simpan nilai                    |
| Weighted total                 | Total berbobot                  |
| Feedback                       | Masukan                         |
| Ranking / Rank                 | Peringkat                       |
| Average score                  | Rata-rata skor                  |
| Number of judges               | Jumlah juri                     |
| Progress                       | Progres                         |
| Details                        | Detail                          |
| Export CSV                     | Ekspor CSV                      |
| Functionality                  | Fungsionalitas                  |
| Case-study fit                 | Kesesuaian studi kasus          |
| Code quality & maintainability | Kualitas kode & maintainability |
| Documentation                  | Dokumentasi                     |
| Presentation & Q&A             | Presentasi & Tanya Jawab        |

## 7. Acceptance checklist (I will test these)

- [ ] A preliminary-stage judge sees only the preliminary list; a final-stage judge only the final list; a `both` judge sees two tabs.
- [ ] The preliminary list shows only submitted, non-disqualified teams. A team with a draft or no submission is not listed. The final list shows only finalists.
- [ ] Saving a score works, the saved total equals the hand calculation (see below), and editing the score keeps one row per (judge, team).
- [ ] Scores outside 0–100, or with more than 2 decimals, are rejected with a clear message.
- [ ] **Judge isolation:** with two judges scoring the same team, each sees only their own scores; neither can see the other's anywhere.
- [ ] A preliminary-only judge opening a final scoring URL directly is turned away; a final-only judge opening a preliminary URL is turned away.
- [ ] A disqualified team, a draft submission, or (for final) a non-finalist cannot be scored (rejected even from a stale form).
- [ ] The admin sees progress per judge, both ranking tables, the per-team breakdown, and the numbers match the database.
- [ ] The score CSVs download, open in Excel, contain no emails, and neutralize formula-like cells.
- [ ] The admin client is not imported by any client component. The service role key is not in the build output.
- [ ] `npm run lint` and `npm run build` pass.

**Hand calculation examples for verification:**

- Preliminary scores 80, 70, 90, 60, 100 (in rubric order) → 28 + 17.5 + 18 + 6 + 10 = **79.5**
- Final scores 80, 70, 90, 60, 100, 50 → 20 + 14 + 13.5 + 6 + 10 + 10 = **73.5**

## 8. After this phase

Google Form fallback procedure, deployment to Vercel, backups, and a full pass with every role. Do not start these. When the checklist passes, summarize what exists and wait for the next instruction file.

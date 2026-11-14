# AGENTS.md

Rules for AI agents. Project context is in `AI.md`. File locations are in `docs/documentation/MAP.md`.

## What to read

- `docs/documentation/MAP.md`: before searching the repo for where something lives.
- `AI.md`: before touching scoring, deadlines, submissions, results, roles or exports, and whenever a decision is unclear. It lists the open decisions. Ask about them, never decide them.
- `docs/documentation/*.md`: the current task. If it conflicts with these files, stop and ask.

## Workflow

- One step per message. Then run lint and build on changed files only, stop and report. Do not start the next step.
- Never run git. I review, test and commit.
- Run Biome only on files you changed, never `--write` elsewhere. No unrelated refactors.
- No new dependencies. No features, pages or columns that were not requested.
- If something is ambiguous or touches an open decision, ask instead of guessing.
- Report: files changed, what was done, deviations from the phase file, anything unsure, what I should test manually.
- Update `docs/MAP.md` when you add, move or remove a screen or shared file.

## Security (never break)

Application

- RLS is the security boundary. Route guards and hidden buttons are convenience only.
- The service role key is server-only (`src/lib/supabase/admin.ts`, uses `server-only`). Never import it in client code, put it in `NEXT_PUBLIC_*`, or log it.
- Every server action calls `getUser()` (never `getSession()`) and checks the role before touching data. `team_id` and `judge_id` come from the session, never from input.
- Validate all input with Zod. Never return raw database or auth errors.
- After UPDATE or DELETE use `.select()` and treat an empty result as failure. RLS blocks UPDATE silently with zero rows. A blocked INSERT raises 42501.
- Never mutate data in a GET handler. Do not bypass Next.js server action Origin checks with custom POST handlers. No custom rate limiting (Supabase Auth limits are the baseline).

Roles

- Roles are read only from `profiles` (via `current_user_role()` and similar helpers). Never from `user_metadata`, JWT claims or client input.
- The `profiles` UPDATE policy must not let users change their own `role`, `judge_stage`, `team_id` or `is_active`. Only admins can.
- Public sign-up stays disabled.

Team-facing results

- Expose team score and comment data only through `SECURITY DEFINER` functions with an empty `search_path`, deriving the team from `auth.uid()`. No team id parameter. No team SELECT policy on score tables.
- Return aggregates and anonymous comments only. Never `judge_id`, name, or anything that identifies a judge, including through ordering or timestamps.
- The function checks authorization in its own body (active team role, results released, caller owns the team).
- Never expose other teams' scores or comments, rank, or per-judge raw scores.

Grants and functions

- RLS and grants are separate. Every table has RLS enabled and explicit least-privilege grants.
- `anon` gets no privileges on application tables, views or sequences (`/login` is the only public page).
- Every `SECURITY DEFINER` function: empty `search_path`, schema-qualified references, authorization checks inside its body, `REVOKE EXECUTE ... FROM PUBLIC, anon`, then a narrow `GRANT` (usually `authenticated`). Helpers clients never call should not be callable by clients at all.

CSV exports

- Admin only: 401 if unauthenticated, 403 if not admin. Each export route checks this itself, since layouts do not guard route handlers.
- UTF-8 with BOM. Neutralize leading `=`, `+`, `-`, `@`, tab and CR in every cell, plus normal CSV quoting. No emails. `Cache-Control: no-store`, correct `Content-Type` and `Content-Disposition`. Submission exports contain no personal data or scores.

Secrets

- Never commit `.env` or `.env.local`. The service role key lives only in `.env.local` or Vercel env vars, never in `.env`. `SEED_PASSWORD` is for the seeder only.

## Database

- `supabase/migrations/20261020000000_init_schema.sql` is applied. Never edit it. Do not touch anything in `supabase/` without my permission. Schema changes go in a new migration, only with my permission.
- Rubric weights live in the database column and `src/lib/rubric.ts`. Change both or neither.
- Types are in `src/types/database.ts` and must be UTF-8. On PowerShell 5.1 generate with `| Out-File -Encoding utf8`, never `>`.
- Never run the seeder (`npm run seed`) against production data. Seed accounts use `@seed.mitweek.test`.

## UI

- All UI text is Indonesian, consistent with existing screens. Terms: Akun, Tim, Finalis, Pengaturan, Submission, Peringkat, Kata sandi, Studi kasus, Babak awal, Final, Nilai, Masukan, Draf, Terkirim.
- Dates: `id-ID` locale, `Asia/Makassar`, shown as WITA. Servers run in UTC. Never rely on server local time or the device clock for deadlines.
- Colors come from tokens in `src/app/globals.css`: shadcn semantic tokens plus the Guardian brand tokens (`--ink`, `--hero-*`, `--guardian-*`, `--shadow-hard*`) shared by `/karya` and the team portal. No raw hex, RGB, HSL or OKLCH in components; add a token with light and dark values instead. If a color is missing, use a named Tailwind default. Works in light and dark mode. Extend the Guardian palette only, do not invent another.
- Match nearby screens (density, spacing, radius). Mobile-friendly.
- Handle loading, empty, error, disabled and overflow states. Semantic HTML, labels, keyboard support, visible focus.
- Friendly generic errors. Never show raw errors, SQL, table names or stack traces.
- Never show judge identity, other teams' data, emails (outside admin) or internal ids.
- Scores show two decimals. Only `http`/`https` links render as links, with `target="_blank"` and `rel="noopener noreferrer"`.
- Do not modify `src/components/ui/`.

## Code

- Next.js 16 App Router, React 19, strict TypeScript (no `any`), Tailwind v4, shadcn/ui (radix-nova), Supabase, Zod, React Hook Form, TanStack Table **v9** (differs from v8), Biome, npm. Windows PowerShell.
- Next.js 16 uses `src/proxy.ts`, not `middleware.ts`. Check `node_modules/next/dist/docs/` before using a Next.js API from memory.
- Each screen: `page.tsx` (server component, fetches data), `*-client.tsx` (client), `actions.ts` (server actions), side by side. Keep a component in its route until a second route needs it.
- Add new screens to `src/navigation/sidebar/sidebar-items.ts`.
- Use `@/` aliases. Biome style: double quotes, semicolons, two-space indent, sorted imports, 120-character lines.

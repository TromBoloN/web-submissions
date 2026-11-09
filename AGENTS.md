# AGENTS.md

Rules for AI agents. Project context: `AI.md`. File locations: `docs/documentation/MAP.md`.

## Read first

- `MAP.md`: before searching the repo.
- `docs/documentation/*.md`: full docs.
- `AI.md`: before touching scoring, deadlines, submissions, results, roles, exports, or when a decision is unclear. Open decisions are listed there: ask, never decide.
- `docs/development/*.md`: current task. If it conflicts with these rules, stop and ask.

## Workflow

- One step per message. Lint and build changed files only, report, stop. Never start the next step.
- Never run git. End major changes with a recommended commit message; do not commit.
- Biome only on changed files, never `--write` elsewhere. No unrelated refactors, new dependencies, or unrequested features/pages/columns.
- Ambiguous or touches an open decision: ask.
- Report: files changed, what was done, deviations from phase file, uncertainties, what to test manually.
- Adding/moving/removing a screen or shared file: update `MAP.md`.

## Security (never break)

**App**

- RLS is the security boundary; guards and hidden buttons are convenience.
- Service role key: server-only (`src/lib/supabase/admin.ts`, `server-only`). Never in client code, `NEXT_PUBLIC_*`, or logs.
- Server actions: `getUser()` (never `getSession()`), check role before touching data, take `team_id`/`judge_id` from session never input.
- Validate input with Zod. Never return raw DB/auth errors.
- After UPDATE/DELETE use `.select()`; empty result = failure (RLS blocks silently). Blocked INSERT raises 42501.
- No mutations in GET. No custom POST handlers bypassing server action Origin checks. No custom rate limiting.

**Roles**

- Read only from `profiles` (`current_user_role()` etc.), never `user_metadata`, JWT claims, or client input.
- `profiles` UPDATE policy: users cannot change own `role`, `judge_stage`, `team_id`, `is_active`; admin only.
- Public sign-up stays disabled.

**Team-facing results**

- Expose via `SECURITY DEFINER` functions only: empty `search_path`, team derived from `auth.uid()`, no team id param, no team SELECT policy on score tables.
- Return aggregates and anonymous comments only. Nothing identifying a judge (id, name, ordering, timestamps).
- Function self-checks: active team role, results released, caller owns team.
- Never expose other teams' data, rank, or per-judge raw scores.

**Grants/functions**

- Every table: RLS on, explicit least-privilege grants. `anon` gets nothing on tables/views/sequences (`/login` is the only public page).
- Every `SECURITY DEFINER`: empty `search_path`, schema-qualified refs, internal auth checks, `REVOKE EXECUTE ... FROM PUBLIC, anon`, then narrow `GRANT` (usually `authenticated`). Client-uncalled helpers must not be client-callable.

**CSV exports**

- Admin only, checked in each route (layouts don't guard route handlers): 401 unauthenticated, 403 non-admin.
- UTF-8 BOM. Neutralize leading `=`, `+`, `-`, `@`, tab, CR in every cell, plus CSV quoting. No emails. `Cache-Control: no-store`, correct `Content-Type`/`Content-Disposition`. Submission exports: no personal data or scores.

**Secrets**

- Never commit `.env`/`.env.local`. Service role key only in `.env.local` or Vercel env, never `.env`. `SEED_PASSWORD` is for the seeder only.

## Database

- `supabase/migrations/20261020000000_init_schema.sql` is applied; never edit. Touch nothing in `supabase/` without permission. Schema changes: new migration, with permission only.
- Rubric weights: DB column and `src/lib/rubric.ts`. Change both or neither.
- `src/types/database.ts` must be UTF-8. PowerShell 5.1: generate with `| Out-File -Encoding utf8`, never `>`.
- Never run `npm run seed` against production. Seed accounts: `@seed.mitweek.test`.

## UI

- All text Indonesian. Terms: Akun, Tim, Finalis, Pengaturan, Submission, Peringkat, Kata sandi, Studi kasus, Babak awal, Final, Nilai, Masukan, Draf, Terkirim.
- Dates: `id-ID`, `Asia/Makassar`, shown as WITA. Servers run UTC; never use server local time or device clock for deadlines.
- Semantic theme tokens only (no hex/RGB/HSL/OKLCH); if missing, use a named Tailwind default. Light and dark mode. Don't invent a brand palette.
- Match nearby screens (density, spacing, radius). Mobile-friendly.
- Handle loading, empty, error, disabled, overflow. Semantic HTML, labels, keyboard support, visible focus.
- Generic friendly errors only: no raw errors, SQL, table names, stack traces.
- Never show judge identity, other teams' data, emails (outside admin), or internal ids.
- Scores: two decimals. Links: only `http`/`https`, with `target="_blank"` and `rel="noopener noreferrer"`.
- Do not modify `src/components/ui/`.

## Code

- Stack: Next.js 16 App Router, React 19, strict TS (no `any`), Tailwind v4, shadcn/ui (radix-nova), Supabase, Zod, React Hook Form, TanStack Table **v9** (differs from v8), Biome, npm. Windows PowerShell.
- Next.js 16 uses `src/proxy.ts`, not `middleware.ts`. Check `node_modules/next/dist/docs/` before using a Next.js API from memory.
- Per screen, side by side: `page.tsx` (server, fetches), `*-client.tsx`, `actions.ts`. Keep components in their route until a second route needs them.
- Register new screens in `src/navigation/sidebar/sidebar-items.ts`.
- Use `@/` aliases. Biome: double quotes, semicolons, 2-space indent, sorted imports, 120 cols.

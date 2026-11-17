# Local Docker stack

Run the app against a local Supabase (Postgres, Auth, Storage, Studio) in Docker, filled from a
`private-output/backup-*` folder. Nothing you do here reaches production.

## Requirements

- Docker Desktop running.
- Supabase CLI via `npx supabase` (no global install needed).

## Commands

| Command | What it does |
| --- | --- |
| `npm run local:up` | Start the containers, apply `supabase/migrations`, write local keys to `.env.docker.local` |
| `npm run local:restore` | Wipe the local DB, re-apply migrations, restore the backup set in `package.json` |
| `node scripts/local-stack.mjs restore private-output/<backup-folder>` | Same, from another backup |
| `npm run local:dev` | `next dev` on http://localhost:3000 against the local stack |
| `npm run local:down` | Stop the containers (data is kept until the next restore) |

First run: `npm run local:up`, then `npm run local:restore`, then `npm run local:dev`.

## Logging in

Every restored account gets the password `Mitweek2026!` (override with `RESTORE_PASSWORD`).
Usernames and emails are the same as in production.

## Local URLs

- App: http://localhost:3000
- Studio (browse tables): http://127.0.0.1:54323
- Mailpit (captured auth emails): http://127.0.0.1:54324

## How production is protected

- `scripts/local-stack.mjs` refuses to restore or run unless the Supabase URL is `127.0.0.1` or `localhost`.
- Local keys go in the process environment, which Next.js and `restore.mjs` use instead of `.env`. `.env` itself is never changed.
- `.env.docker.local` is gitignored and only holds the CLI's fixed local demo keys.

## Limits

- Backups hold no Storage files, so gallery screenshots uploaded in production show as missing. The `web-showcase` bucket itself is created from `supabase/config.toml` on restore.
- Schema comes from `supabase/migrations`, so it can be ahead of production if migrations are pending there.

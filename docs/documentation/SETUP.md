# Setup and development

## Prerequisites

- Node.js 20 or newer. The project is developed against current Node.js LTS releases.
- npm 10 or newer.
- A Supabase project with access to the SQL Editor or Supabase CLI.
- Windows PowerShell commands below assume the repository root is the current directory.

No Python, Docker, Redis, or separate API server is required.

## Install and configure

```powershell
git clone https://github.com/TromBoloN/web-submissions.git
Set-Location web-submissions
npm install
Copy-Item .env.example .env.local
```

Set these variables in `.env.local`:

| Variable | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | No | Supabase project URL used by browser, server, and proxy clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | No | Supabase publishable key used with RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for admin operations | **Yes** | Server-only key for account administration, scripts, backup, and restore. Never expose it to the browser. |
| `SEED_PASSWORD` | Only for seeding | **Yes** | Password used by the seed script for generated seed accounts. |
| `PORTAL_URL` | Only for WhatsApp links | No | Base portal URL used by `npm run whatsapp`. |
| `RESTORE_PASSWORD` | Optional for restore | **Yes** | Password fallback used by the restore script. Prefer setting it explicitly rather than relying on the script default. |

`.env.example` intentionally contains blank values. Never commit `.env`, `.env.local`, service-role keys, or real participant data.

## Database setup

**New project (e.g. the next edition):** run [`supabase/schema/full_schema.sql`](../../supabase/schema/full_schema.sql) once in the Supabase SQL Editor. It is the final state of every migration in one transaction, safe to run twice, and it never overwrites existing settings. Then create the public `web-showcase` storage bucket (2 MB, PNG/JPEG/WebP; same as `supabase/config.toml`). The file is generated: after adding a migration, run `node scripts/build-full-schema.mjs` against the fully migrated local stack (`npm run local:up`) and commit the result.

**Existing project:** keep applying the files in `supabase/migrations/` in filename order (SQL Editor or CLI). They remain the history the production database recorded; do not delete them.

Do not run the seed or restore commands against production unless the operation is explicitly approved and the target has been verified.

## Run locally

```powershell
npm run dev
```

Open <http://localhost:3000>. Authentication is handled by Supabase; the `/login` page is the public application page.

## Verification commands

```powershell
npm run lint
npm run check
npm run build
```

`lint` runs Biome linting. `check` checks formatting and lint rules. `build` creates the production Next.js build and catches TypeScript/build errors.

## Data and maintenance commands

| Command | Use |
| --- | --- |
| `npm run seed` | Create the documented seed data in the configured Supabase project. |
| `npm run seed:clear` | Remove seed data from the configured project. |
| `npm run backup` | Export configured Supabase data to JSON, and gallery images from storage, under `private-output/`. |
| `npm run restore` | Restore a JSON backup after verifying the target project and backup manifest. |
| `npm run onboard` | Convert registration input for account onboarding. |
| `npm run whatsapp` | Generate WhatsApp links using `PORTAL_URL`. |

## Common setup failures

| Symptom | Fix |
| --- | --- |
| Supabase client configuration error | Check both public Supabase variables in `.env.local`, then restart `npm run dev`. |
| Admin pages cannot manage accounts | Confirm the service-role key exists server-side and that the signed-in profile has the `admin` role. |
| Login succeeds but the user is redirected | Confirm the matching `profiles` row exists, `is_active` is true, and the role is valid. |
| Migrations fail on an existing database | Check that every earlier migration was applied in order; do not edit an applied migration. |
| Seed/backup/restore reports missing credentials | Set the service-role key and the command-specific variables, then verify the target project before retrying. |

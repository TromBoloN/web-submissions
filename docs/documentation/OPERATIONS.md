# Operations

## Environments

The repository defines the application and database integration but does not include a checked-in staging configuration, Docker image, or CI/CD workflow. Treat each Supabase project and hosting environment as a separately verified target:

- Development: local `npm run dev` with a non-production Supabase project.
- Production: deployed Next.js application with production Supabase credentials stored in the hosting provider's secret environment.

Never copy production data into a developer project without an approved, privacy-safe process.

## Deployment checklist

1. Apply approved Supabase migrations in order.
2. Configure public Supabase variables and the server-only service-role key in the hosting provider.
3. Run `npm run lint`, `npm run check`, and `npm run build`.
4. Verify `/login`, one admin page, one judge flow, one team flow, and both CSV routes with appropriate roles.
5. Confirm `SUPABASE_SERVICE_ROLE_KEY` is not present in client bundles or public environment variables.
6. Confirm deadlines, result-release flags, RLS policies, and score-lock triggers in the target database.

There is no repository-provided rollback command. Roll back the application deployment through the hosting provider, and handle database rollback with an approved forward migration or restoration plan; do not edit applied migration files.

## Backup and restore

`npm run backup` writes JSON output under `private-output/`. Protect that directory because backups can contain account and competition data. Review the generated manifest before storing or transferring a backup.

Before `npm run restore`:

- verify the Supabase URL and service-role key point to the intended target;
- verify the backup manifest and data scope;
- stop or coordinate concurrent writes;
- take a fresh backup of the target;
- record the operator and reason for the restore.

After restore, verify login, profiles, teams, submissions, settings, release flags, and ranking views.

## Secret rotation

Rotate Supabase keys through the Supabase dashboard and hosting-provider secret store, then redeploy. Do not put service-role keys in `.env`, `NEXT_PUBLIC_*`, logs, backups intended for public sharing, or client code. After rotation, verify admin account operations and server-side Supabase access.

## Incident runbook

### Users cannot log in

Check the Supabase Auth service, public URL/key configuration, the `profiles` row, `is_active`, and the `src/proxy.ts` session-refresh path. Do not disable RLS or bypass `getUser()` to restore access.

### Teams cannot submit

Check the competition deadline in WITA, `team_can_submit`, team disqualification, submission URL validation, and the browser/server clock display. Confirm the database setting rather than relying on a device clock.

### Scores or results look wrong

Check the stage release flags, `judge_can_score_*`, score-lock triggers, `src/lib/rubric.ts`, generated database totals, and ranking views. Do not expose raw judge scores or manually bypass the release boundary.

### Export is unavailable

Confirm the request is authenticated as an admin, then inspect the route's server-side error logs without displaying raw errors to users. Verify the target response has BOM, correct content headers, `no-store`, and sanitized cells.

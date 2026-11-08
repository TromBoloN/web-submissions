# Contributing

## Before changing code

1. Read [MAP.md](./MAP.md), [AI.md](../../AI.md), and any applicable file in `docs/development/`.
2. Identify the route, server action, shared helper, migration, and security surface affected.
3. Check whether the change touches an open decision; if it does, ask before implementing it.

## Implementation expectations

- Keep changes surgical and preserve existing behavior.
- Use strict TypeScript, `@/` aliases, double quotes, semicolons, two-space indentation, sorted imports, and 120-character lines.
- Do not add dependencies without an explicit need.
- Do not edit applied migrations or `src/components/ui/`.
- Update documentation and [MAP.md](./MAP.md) in the same change when routes or shared files change.
- Treat RLS as the security boundary and keep service-role use server-only.

## Verification

Run the smallest relevant checks, then the normal checks before review:

```powershell
npm run lint
npm run check
npm run build
```

Pull requests run the same validation automatically in GitHub Actions:

```text
npm ci
npm run lint
npm run check
npm run build
npm test
```

The build receives Supabase configuration from the repository secrets
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`. If those secrets are unavailable, CI uses non-functional
placeholders only to allow Next.js module evaluation; it does not connect to Supabase or
replace deployment environment variables.

For database or authorization changes, also verify the relevant role flows and release/deadline edge cases against a non-production Supabase project.

## Pull requests

Describe:

- the user or operator problem;
- the files and data/security surfaces changed;
- migrations and deployment steps, if any;
- tests/checks run and manual verification still needed;
- documentation updates and known limitations.

Keep unrelated refactors out of feature changes. Do not commit `.env`, `.env.local`, private backups, generated secrets, or production data.

## Documentation changes

Documentation should be task-oriented, concrete, and honest about gaps. Add a guide under this directory when a recurring task needs more detail; link it from [the documentation index](./README.md). Update the README for onboarding or high-level changes, and update the source map when routes or shared source files change.

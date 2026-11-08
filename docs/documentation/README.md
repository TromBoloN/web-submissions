# Documentation Library

This directory is the technical documentation hub for the MIT-WEEK 2026 Web Development Competition portal. Use the guide that matches the task you are doing:

| Need | Guide |
| --- | --- |
| Get a local environment running | [Setup and development](./SETUP.md) |
| Understand the system and request flow | [Architecture](./ARCHITECTURE.md) |
| Understand tables, roles, RLS, and results privacy | [Data model and security](./DATA-MODEL.md) |
| Find server actions, routes, and response behavior | [Application reference](./API.md) |
| Deploy, back up, restore, or respond to incidents | [Operations](./OPERATIONS.md) |
| Work on screens and shared UI | [Frontend conventions](./FRONTEND.md) |
| Open a pull request or improve these docs | [Contributing](./CONTRIBUTING.md) |

## Source of truth

- [README.md](../../README.md) is the project entry point and quick start.
- [MAP.md](./MAP.md) maps screens and source files.
- [AI.md](../../AI.md) contains repository security and workflow constraints.
- [docs/development/](../development/) contains phase-specific implementation instructions.
- `supabase/migrations/` is the database source of truth. Do not edit an applied migration; add a new migration only with approval.

## Scope and known boundaries

- The application is a Next.js 16 App Router monolith. It does not have a separately deployable backend.
- Supabase provides PostgreSQL, authentication, RLS, and server-side RPC functions.
- The application exposes Next.js pages, Server Actions, and two CSV download routes. It does not currently publish a REST or GraphQL API, so [Application reference](./API.md) documents those actual interfaces instead of inventing endpoint contracts.
- There is no checked-in Docker configuration, queue worker, cache service, Storybook setup, or CI workflow at the time of writing.
- Keep documentation in the same change as behavior changes, especially for roles, deadlines, scoring, results release, exports, and migrations.

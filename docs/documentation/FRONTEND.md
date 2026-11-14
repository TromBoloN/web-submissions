# Frontend conventions

## Screen structure

Use the existing route-local pattern: a server `page.tsx` loads protected data, a `*-client.tsx` owns browser interaction, and `actions.ts` contains mutations. Keep a component in its route until a second route needs it. Shared primitives belong in `src/components/`, while `src/components/ui/` is generated shadcn/ui code and must not be modified.

Add a new screen to `src/navigation/sidebar/sidebar-items.ts`, update [MAP.md](./MAP.md), and provide loading, empty, error, disabled, and overflow states.

## Data and forms

- Use the cookie-based server Supabase client for server reads and writes so RLS applies.
- Use the browser client only for browser-scoped behavior.
- Validate all mutation input with Zod and use React Hook Form where the surrounding screen does.
- Use Server Actions for mutations; do not create custom POST handlers to bypass Next.js origin checks.
- After `UPDATE` or `DELETE`, select the affected row and treat an empty result as failure.
- Keep team and judge IDs session-derived.

## UX and styling

- UI text is Indonesian and follows the project vocabulary: Akun, Tim, Finalis, Pengaturan, Submission, Peringkat, Nilai, Masukan, Draf, and Terkirim.
- Use `id-ID`, `Asia/Makassar`, and WITA for dates; do not use the device clock for deadline decisions.
- Use tokens, never literal colors: shadcn semantic tokens for forms/admin, Guardian brand tokens for brand surfaces. Follow the loud/calm rule. Full reference: [Design system](./DESIGN-SYSTEM.md).
- Design at 360px first: collapse columns, give wide sequences a mobile variant, never cause horizontal page scroll.
- Respect `prefers-reduced-motion` for every animation and hover effect.
- Restyle shadcn primitives from the outside with `className`; add `.press` to restyled buttons.
- Preserve nearby screens' density, spacing, radii, keyboard behavior, visible focus, and mobile layout.
- Only render `http` and `https` values as external links, with `target="_blank"` and `rel="noopener noreferrer"`.
- Display scores with two decimal places and never show judge identity or internal IDs to teams.

## State and theme

Theme switching for users is the shared two-state `ThemeToggle` (`src/components/theme-toggle.tsx`): light/dark only, flipping relative to the applied `.dark` class. Do not add another toggle.

Preferences and theme code lives under `src/lib/preferences`, `src/stores/preferences`, `src/server/server-actions.ts`, `src/styles/presets`, and theme boot/generation files. Reuse those mechanisms rather than introducing a second state or theme system.

The project does not currently use Storybook. Add component documentation only when a component is shared across routes and the change is explicitly in scope.

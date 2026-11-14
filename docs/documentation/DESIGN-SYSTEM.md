# Guardian design system

The team portal, the public gallery (`/karya`) and the shared dashboard shell use one visual language, "Guardians of the Digital Space": navy ink outlines, a neon-mint accent, hex shapes, and hard offset ("brutal") shadows. This guide is the reference for anyone, human or AI agent, styling a screen in this repository.

All tokens and utility classes live in [`src/app/globals.css`](../../src/app/globals.css). shadcn/ui primitives in `src/components/ui/` are never edited; restyle them from the outside with `className`.

## Color rule

From [AGENTS.md](../../AGENTS.md):

- Use tokens only. No raw hex/RGB/HSL/OKLCH in components. If a color is missing, add a token to `globals.css` with **both** a light value (`:root`) and a dark value (`.dark`).
- Two token families exist and may be mixed:
  - **shadcn semantic tokens**: `background`, `foreground`, `card`, `muted`, `primary`, `border`, `destructive`, … Use for forms, settings and admin screens.
  - **Guardian brand tokens**: listed below. Use for "loud" surfaces and brand moments.
- Named Tailwind defaults (`emerald-600`, `amber-500`, `white`) are allowed for status colors (success, warning) when no token fits.
- Extend the Guardian palette; never invent a second one.

> Known debt: `src/app/karya/*.tsx` and `src/components/showcase-card.tsx` still contain about 100 raw hex values from before this rule. Migrate them to tokens in a dedicated change; do not copy the pattern.

## Guardian tokens

| CSS variable | Tailwind utility | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--ink` | `border-ink`, `text-ink`, `bg-ink` | navy `#1d1a5c` | light blue `#8ba9ec` | Outlines, headings on loud surfaces, icon tiles |
| `--ink-foreground` | `text-ink-foreground` | white | near-black | Text placed **on** `bg-ink` or `bg-mint` (dark mode) |
| `--safe` | `bg-mint`, `text-mint`, `border-mint` | neon `#00e676` | `#2fbf71` | Small accents: dots, active markers, success chips, primary help button. Never as text on a light background. |
| `--guardian-accent` | `bg-guardian-accent`, `text-guardian-accent` | violet `#5b3fd6` | `#7d72eb` | Stamps, numbered tiles, hex avatar fill, title shadow |
| `--hero-fg`, `--hero-fg-muted` | `text-hero-fg`, `text-hero-fg-muted` | navy / muted navy | near-white / slate | Text on `guardian-hero-mesh` backgrounds |
| `--hero` | `bg-hero` | dark navy | dark navy | "Dark card" (showcase card on the team dashboard) with `text-white` |
| `--shadow-hard-sm/-/-lg` | `shadow-brutal-sm`, `shadow-brutal`, `shadow-brutal-lg` | 2/4/6px offset in ink | 2/4/6px offset in black | Hard offset shadows |

Text on mint: use `text-ink dark:text-ink-foreground` (navy in light mode, near-black in dark mode). Do **not** use `text-ink` alone on mint in dark mode, because dark `--ink` is light blue.

## Loud / calm rule

| | Loud | Calm |
| --- | --- | --- |
| Where | Team hero, Guardian ID card, receipt ticket, journey track, active nav row, finalist/brand moments | Forms, settings, admin tables, help strip, editors |
| Border | `border-2 border-ink` | `border` (`--border`) |
| Shadow | `shadow-brutal*` | none or soft |
| Type | `font-display`, big, uppercase allowed | regular sizes |
| Class | `.surface-loud` | `.surface-calm` |

Admin screens stay mostly calm. Use loud styling only for the active state of navigation or one focal element.

## Utility classes (`globals.css`)

| Class | Effect |
| --- | --- |
| `.surface-loud` | Card bg, 2px ink border, large radius, `--shadow-hard` |
| `.surface-calm` | Card bg, 1px border, medium radius, faint shadow |
| `.press` | Element sinks 2px and loses its shadow while `:active`. Add to every clickable button/link you restyle. |
| `.btn-loud` | 2px ink border + small hard shadow, growing on hover. Pair with `.press`. |
| `.hex` | Hexagon `clip-path`. Stack an outer `bg-ink` hex and an inner `inset-[2px]`/`inset-[3px]` hex to fake a border. |
| `.hex-pulse` | Pulsing ring for the current journey node |
| `.team-hero-title`, `.team-hero-title-outline` | Big display headline, optionally outlined in ink |
| `.team-stamp` | Rotated rubber stamp with a one-off "stamp-in" animation ("TERKIRIM" on the receipt) |
| `.team-scan` | Slow scanning shimmer bar ("Juri sedang menilai") |
| `.team-pop` | One-off pop-in for celebratory icons |
| `.guardian-hero-mesh`, `.guardian-card`, `.guardian-btn-*` | Older `/karya` classes; prefer the classes above for new work |
| `.receipt-print` | Marks the receipt; `@media print` hides everything else on the page |

Every animation is disabled under `prefers-reduced-motion: reduce` in `globals.css`. When you add an animation, add its class to a reduced-motion block. Hover tilt (Guardian ID card) checks `(prefers-reduced-motion: no-preference) and (hover: hover)` in JS.

## Typography

- `font-display`: headlines, big numbers (countdowns, "N hari lagi"), brand labels.
- `font-mono` + `uppercase` + `tracking-wider`: small labels ("KODE TIM", eyebrow pills, section labels). **Minimum 11px** (`text-[11px]` or `text-xs`) and darkened to `text-foreground/75` (or `text-ink`), not `text-muted-foreground`.
- Body copy uses the default sans font.

## Patterns and components

| Pattern | Where | Notes |
| --- | --- | --- |
| Eyebrow pill | `team-hero.tsx` `Eyebrow` | Mono label with a mint dot, `border-2 border-ink`, `shadow-brutal-sm` |
| Hex badge / avatar | `guardian-id-card.tsx`, `nav-user.tsx`, `app-sidebar.tsx`, `journey-track.tsx` | Outer `bg-ink` hex + inner fill hex |
| Icon tile | sidebar rows, receipt link rows, settings overview | `size-7`–`size-9`, `rounded-md/lg`, `border-2 border-ink` (inactive `border-ink/30`) |
| Ticket | `submission-receipt.tsx` | Dashed tear line + two `bg-background` notch circles clipped by `overflow-hidden` |
| Milestone tile | `team-hero.tsx` `MilestoneTile` | "N hari lagi" countdown in days between WITA dates |
| Morphing copy button | `submission-receipt.tsx` `MorphCopyIcon` | Copy icon cross-fades to ✓; transition off under reduced motion |
| Theme toggle | `src/components/theme-toggle.tsx` | Two-state light/dark only. `floating` prop for `/karya`. Flips relative to the applied `.dark` class. |

## Responsive rules

- Design at 360px first; no horizontal page scroll. Long values use `truncate`, `break-all` or `[overflow-wrap:anywhere]`.
- Multi-column layouts collapse: `md:` for two columns, `lg:` for bento/side rails, `xl:` for the hero + ID card row.
- Wide horizontal sequences get a mobile variant (journey track becomes a vertical list below `md`; settings nav becomes swipeable tabs below `lg`).
- Footer rows with text + button use `flex-col-reverse … sm:flex-row` so the button is never squeezed.

## Dark mode checklist

1. `--ink` flips to light blue: borders and `text-ink` stay readable, but anything sitting on mint needs `dark:text-ink-foreground`.
2. Hard shadows become black in dark mode and are subtle; rely on the ink border for definition.
3. Notches, cut-outs and overlays must use `bg-background` (not a fixed color) so they match the page.
4. Check the theme toggle on both the dashboard header and `/karya`.

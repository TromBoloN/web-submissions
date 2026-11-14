# Admin settings (`/admin/pengaturan`)

Pengaturan is split into sub-pages so each concern loads only its own data and stays usable on a phone.

## Structure

```text
src/app/(main)/admin/pengaturan/
  layout.tsx               page title + two-column grid (nav | content)
  settings-nav.tsx         section nav: swipeable tabs below lg, sticky vertical list from lg
  settings-sections.ts     SETTINGS_SECTIONS: href, title, description, icon (single source for nav + overview)
  page.tsx                 Ringkasan: status card per section, each linking to its sub-page
  actions.ts               all settings server actions (shared by every sub-page)
  settings-utils.ts        formatWitaTimestamp, hasLinkWarning, SETTINGS_LOAD_ERROR
  settings-load-error.tsx  generic load-error box
  pengumpulan/   page.tsx + deadline-client.tsx          submission deadline
  hasil/         page.tsx + results-release-client.tsx   results release + judging progress
  galeri/        page.tsx + showcase-client.tsx          gallery stage 1 / stage 2 publishing
  studi-kasus/   page.tsx + case-study-client.tsx        case study title, release time, Markdown
  tautan/        page.tsx + links-client.tsx             juknis URL + WhatsApp contact
```

The admin role is enforced by `src/app/(main)/admin/layout.tsx` (`requireRole("admin")`) for pages, and by every action in `actions.ts` independently (`getCurrentProfile()` then a role check). RLS is the real boundary.

## Sections

| Section | URL | Reads | Actions |
| --- | --- | --- | --- |
| Ringkasan | `/admin/pengaturan` | `competition_settings`, `case_study` | none |
| Pengumpulan | `/pengumpulan` | `submission_closes_at`, `updated_at` | `updateCompetitionDeadline` |
| Rilis Hasil | `/hasil` | release flags, judges, teams, submissions, scores, recusals | `updateResultsRelease` (confirmation dialog) |
| Galeri | `/galeri` | showcase timestamps, consenting teams, link checks | `publishShowcasePhase("gallery")`, `publishShowcaseWinners`, `unpublishShowcasePhase` |
| Studi Kasus | `/studi-kasus` | `case_study` | `updateCaseStudy` |
| Tautan & Kontak | `/tautan` | `juknis_url`, `contact_whatsapp` | `updateJuknisUrl`, `updateContactWhatsapp` |

**Audit coverage:** `updateResultsRelease` and the three gallery actions write audit events. `updateCompetitionDeadline`, `updateJuknisUrl`, `updateContactWhatsapp` and `updateCaseStudy` currently do **not**. This is a known gap; new actions should log.

Judging progress on Rilis Hasil uses the same eligibility rules as `/admin/peringkat`: active judges for the stage, non-disqualified teams with a submitted entry (finalists only for the final), counting locked scores plus recusals.

## Adding a section

1. Add an entry to `SETTINGS_SECTIONS` in `settings-sections.ts`. The nav and overview pick it up automatically.
2. Create `pengaturan/<slug>/page.tsx` (server: fetch only what the section needs; on error render `<SettingsLoadError />`) and `<slug>/<name>-client.tsx`.
3. Add actions to `actions.ts`: Zod-validate input, check the admin role, write through the cookie-based client (RLS applies), `.select()` after UPDATE and treat empty as failure, write an audit event with `logAuditEvent`, return `ActionResult` with a generic Indonesian message, and call `revalidatePath("/admin/pengaturan", "layout")` plus any affected team/judge/public paths.
4. Add a status entry for the section in the overview's `statusByHref` (`page.tsx`).
5. Update [MAP.md](./MAP.md).

Responsive conventions used throughout: inputs `w-full sm:max-w-md`, footers `flex-col-reverse … sm:flex-row`, stat grids `grid-cols-2 sm:grid-cols-4`, button rows `flex-wrap`, primary buttons `w-full sm:w-auto`. Form errors use `role="alert"`; hints are linked with `aria-describedby`.

## Planned sections

Blocked on the pending migrations ([Data model](./DATA-MODEL.md#pending-migrations)) being applied and types regenerated:

- **Jadwal**: edit `competition_stages` (dates, text, order, visibility, status override); add custom stages.
- **Final & Identitas**: event name and track, finalist count, gallery badge days, final presentation format, venue, meeting link and `logistics_published`.

Later candidates: a content store for checklist items, FAQ, rules and gallery copy, and a read-only phase preview ("what a team sees in each phase"). See the "Open decisions" section of [AI.md](../../AI.md).

## Links into settings from elsewhere

- Admin dashboard "Rilis hasil" card goes to `/admin/pengaturan/hasil`.
- Admin dashboard missing-deadline warning goes to `/admin/pengaturan/pengumpulan`.
- Judge recusal actions revalidate `/admin/pengaturan/hasil`.
- The sidebar "Pengaturan" item uses `matchPrefix: true` so it stays active on sub-pages.

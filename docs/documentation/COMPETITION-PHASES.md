# Competition phases and schedule

How the app decides which stage of the competition a team is in, where the schedule comes from, and how to test each state. Read this before touching deadlines, the team dashboard, the gallery badge or the admin timeline.

## Timeline

All dates are WITA calendar days. Times are WITA.

| Stage | Date | Source of truth today |
| --- | --- | --- |
| Submission deadline | set in admin (default 10 Nov 2026, 23.59) | `competition_settings.submission_closes_at` (database) |
| Penilaian Babak Awal | 11–17 Nov | hardcoded (see below) |
| Pengumuman Top 5 + gallery opens | 18 Nov | hardcoded |
| Babak Final | 21 Nov (10 min presentation + 10 min Q&A) | hardcoded |
| Pengumuman Juara | 25 Nov | hardcoded |

`submission_closes_at` is stored as an **exclusive** cutoff: the first instant that is no longer accepted. The UI shows the previous minute as the last accepted minute. See `src/lib/deadline.ts`.

## Where the schedule is hardcoded (until the stages migration is live)

Changing a date today means editing **all** of these:

| File | What it holds |
| --- | --- |
| `src/app/(main)/team/team-schedule.ts` | `TEAM_SCHEDULE` (team journey track and phases) and `FINAL_PRESENTATION` |
| `src/app/(main)/admin/page.tsx` (~line 365) | Admin dashboard phase timeline dates |
| `src/app/karya/karya-constants.ts` | `KARYA_DATES` for the public gallery |
| `src/app/karya/karya-client.tsx` (~lines 311–493) | Dates inside gallery sentences |
| `src/navigation/sidebar/sidebar-items.ts` | `GALLERY_OPENING_LABEL` ("18 Nov") on the locked Galeri badge |

The migrations `20261114000000_competition_stages.sql` and `20261114010000_event_identity_and_final_details.sql` replace these with the `competition_stages` and `final_presentation` tables. They are **written but not yet applied**; see [Data model](./DATA-MODEL.md#pending-migrations). After they are applied and `src/types/database.ts` is regenerated, the app must be switched to read them, and this table should shrink to nothing.

## Team phase resolver

`resolveTeamPhase()` in [`src/app/(main)/team/team-phase.ts`](<../../src/app/(main)/team/team-phase.ts>) is a pure function. It uses **server time from page load** (`serverNowIso`) and database data, never the device clock. Checks run in this order and the first match wins:

| # | Phase | Condition | Hero shown |
| --- | --- | --- | --- |
| 1 | `disqualified` | `teams.is_disqualified` | Calm, destructive |
| 2 | `open` | deadline not passed at page load | Loud: countdown, live link checklist, "Belum dikirim / Masih draf / Terkirim." |
| 3 | `missed` | closed and no submitted entry | Calm: "Tidak ada karya tercatat" |
| 4 | `not-finalist` | finalist notice published, team not a finalist | Calm: "Terima kasih sudah berkompetisi" + admin message |
| 5 | `results` | finalist and `final_results_released` | Loud: "Hasil final" + link to `/team/hasil` |
| 6 | `final` | finalist, today ≥ final date | Loud: "Babak Final" + presentation details |
| 7 | `finalist` | finalist, before the final date | Loud: "Finalis!" + Top 5 badge + final details with days remaining |
| 8 | `closed` | submitted, today < review start | Loud: outlined "TERKUNCI." + "Penilaian dimulai · N hari lagi" tile |
| 9 | `review` | submitted, review started, no notice yet | Loud, quiet mood: "Juri sedang menilai" + "Top 5 diumumkan · N hari lagi" tile (shows "Segera" once the date has passed without a notice) |

The finalist notice comes from `get_my_finalist_notice()`. It returns a row only once the admin publishes the notice, and never for disqualified teams.

## Team dashboard layouts

`src/app/(main)/team/submission-client.tsx` picks a layout from the phase:

- **`open`**: the submission form is the centrepiece (wide column), with the receipt above it once submitted. The right rail holds the Guardian ID card, manual checklist (before first submit), showcase card and help strip. The journey track sits at the bottom.
- **Any other phase (bento)**: hero + Guardian ID card (side by side on `xl`), then the journey track, then the receipt (7/12) next to a column with the showcase card and help strip stretched to the receipt's height. With no receipt, a draft-only team sees its read-only form; a team with nothing saved sees "Tidak ada bukti pengiriman".

## Journey track

`src/app/(main)/team/journey-track.tsx` renders `TEAM_SCHEDULE` as hex nodes:

- Each step is `past` (end < today), `current` (start ≤ today ≤ end) or `future`.
- "HARI INI" sits above the current node. If today falls between steps, a dated chip sits on the connector between them. Before the first step or after the last, the chip shows in the header.
- Horizontal from `md`, vertical list below.

## Gallery badge in the sidebar

Computed server-side in `dashboard-shell.tsx`:

- `showcase_published_at` is null: **locked**, with the planned date ("18 Nov").
- published less than 7 days ago: **"Baru"**.
- otherwise: no badge.

After the identity migration, the 7 days becomes `competition_settings.gallery_new_badge_days`.

## Testing each phase

There is no phase-preview page yet (planned under Pengaturan). Until then:

| To see | Do this on a **non-production** database |
| --- | --- |
| `open` | Set the deadline in the future (Pengaturan → Pengumpulan) |
| `closed` | Deadline past, team submitted, temporarily move the `review` start in `team-schedule.ts` after today |
| `review` | Deadline past, team submitted, finalist notice unpublished |
| `finalist` / `not-finalist` | Publish the finalist notice (admin Finalis); sign in as a finalist and a non-finalist team |
| `final` | Finalist + temporarily move the `final` date to today or earlier |
| `results` | Finalist + release final results (Pengaturan → Rilis Hasil) |
| `missed` | Deadline past with a team that never submitted |
| `disqualified` | Disqualify a test team (admin Tim) |

Revert any temporary edits to `team-schedule.ts` before committing.

# Competition phases and schedule

How the app decides which stage of the competition a team is in, where the schedule comes from, and how to test each state. Read this before touching deadlines, the team dashboard, the gallery badge or the admin timeline.

## Timeline

All dates are WITA calendar days. Times are WITA.

| Stage | Source of truth |
| --- | --- |
| Submission deadline | `competition_settings.submission_closes_at` (Pengaturan → Pengumpulan) |
| Penilaian Babak Awal, Pengumuman Top N, Galeri dibuka, Babak Final, Pengumuman Juara, plus any custom stages | `competition_stages` (Pengaturan → Jadwal) |
| Final format and logistics (minutes, venue, link, note) | `final_presentation` (Pengaturan → Identitas & Final) |

`submission_closes_at` is stored as an **exclusive** cutoff: the first instant that is no longer accepted. The UI shows the previous minute as the last accepted minute. See `src/lib/deadline.ts`.

## How the schedule reaches the pages

- The root layout loads `getSchedule()` (`get_public_competition_schedule()`, works for anon) and passes it to `EventInfoProvider`. Client code reads it with `useSchedule()`, server code calls `getSchedule()`. If the RPC fails, the 2026 rows in `SCHEDULE_FALLBACK` (`src/lib/competition-info.ts`) are used.
- System stages are looked up with `getStage(schedule, key)` (`review`, `top5`, `gallery`, `final`, `winners`). Their keys never change and they cannot be deleted.
- `stageState(stage, today)` decides past/current/future. A stage's `status_override` wins over its dates.
- Consumers: team phase resolver and hero, journey track, admin dashboard timeline, public gallery sentences and calendar reminder, and the sidebar's locked Galeri badge (gallery start date).
- Final logistics reach the team hero through `get_my_final_presentation()`. It returns nothing for non-finalists, and venue and link are withheld until logistics are published.

## Team phase resolver

`resolveTeamPhase()` in [`src/app/(main)/team/team-phase.ts`](<../../src/app/(main)/team/team-phase.ts>) is a pure function. It uses **server time from page load** (`serverNowIso`) and database data, never the device clock. Checks run in this order and the first match wins:

| # | Phase | Condition | Hero shown |
| --- | --- | --- | --- |
| 1 | `disqualified` | `teams.is_disqualified` | Calm, destructive |
| 2 | `open` | deadline not passed at page load | Loud: countdown, live link checklist, "Belum dikirim / Masih draf / Terkirim." |
| 3 | `missed` | closed and no submitted entry | Calm: "Tidak ada karya tercatat" |
| 4 | `not-finalist` | finalist notice published, team not a finalist | Calm: "Terima kasih sudah berkompetisi" + admin message |
| 5 | `results` | finalist and `final_results_released` | Loud: "Hasil final" + link to `/team/hasil` |
| 6 | `final` | finalist, `final` stage is current or past | Loud: "Babak Final" + presentation details |
| 7 | `finalist` | finalist, before the final date | Loud: "Finalis!" + Top 5 badge + final details with days remaining |
| 8 | `closed` | submitted, `review` stage still upcoming | Loud: outlined "TERKUNCI." + "Penilaian dimulai · N hari lagi" tile |
| 9 | `review` | submitted, review started, no notice yet | Loud, quiet mood: "Juri sedang menilai" + "Top 5 diumumkan · N hari lagi" tile (shows "Segera" once the date has passed without a notice) |

The finalist notice comes from `get_my_finalist_notice()`. It returns a row only once the admin publishes the notice, and never for disqualified teams.

## Team dashboard layouts

`src/app/(main)/team/submission-client.tsx` picks a layout from the phase:

- **`open`**: the submission form is the centrepiece (wide column), with the receipt above it once submitted. The right rail holds the Guardian ID card, manual checklist (before first submit), showcase card and help strip. The journey track sits at the bottom.
- **Any other phase (bento)**: hero + Guardian ID card (side by side on `xl`), then the journey track, then the receipt (7/12) next to a column with the showcase card and help strip stretched to the receipt's height. With no receipt, a draft-only team sees its read-only form; a team with nothing saved sees "Tidak ada bukti pengiriman".

## Journey track

`src/app/(main)/team/journey-track.tsx` renders the deadline plus every stage with `show_on_track` as hex nodes:

- Each step is `past` (end < today), `current` (start ≤ today ≤ end) or `future`, unless the admin set a status override.
- "HARI INI" sits above the current node. If today falls between steps, a dated chip sits on the connector between them. Before the first step or after the last, the chip shows in the header.
- Horizontal from `md`, vertical list below.

## Gallery badge in the sidebar

Computed server-side in `dashboard-shell.tsx`:

- `showcase_published_at` is null: **locked**, with the `gallery` stage date.
- published less than `gallery_new_badge_days` days ago (Pengaturan → Identitas, 0 disables it): **"Baru"**.
- otherwise: no badge.

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

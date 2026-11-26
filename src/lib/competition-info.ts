// Event identity and schedule: types, the 2026 fallbacks (used when the RPCs fail or return nothing)
// and pure label helpers. Server fetchers live in competition-info.server.ts.

export interface EventInfo {
  event_name: string;
  event_track: string;
  finalist_count: number;
}

export interface CompetitionStage {
  key: string;
  title: string;
  description: string;
  /** WITA calendar day, YYYY-MM-DD. */
  starts_on: string;
  ends_on: string;
  time_label: string;
  sort_order: number;
  show_on_track: boolean;
  status_override: string | null;
}

export const EVENT_INFO_FALLBACK: EventInfo = {
  event_name: "MIT-WEEK 2026",
  event_track: "Web Development",
  finalist_count: 5,
};

/** Same rows the competition_stages migration seeds. */
export const SCHEDULE_FALLBACK: readonly CompetitionStage[] = [
  {
    key: "review",
    title: "Penilaian Babak Awal",
    description: "Dewan juri mengevaluasi seluruh karya terkirim.",
    starts_on: "2026-11-11",
    ends_on: "2026-11-17",
    time_label: "",
    sort_order: 20,
    show_on_track: true,
    status_override: null,
  },
  {
    key: "top5",
    title: "Pengumuman Top 5",
    description: "Daftar finalis resmi diumumkan di portal & media.",
    starts_on: "2026-11-18",
    ends_on: "2026-11-18",
    time_label: "",
    sort_order: 30,
    show_on_track: true,
    status_override: null,
  },
  {
    key: "gallery",
    title: "Galeri Karya Dibuka",
    description: "Pembukaan galeri karya peserta untuk publik.",
    starts_on: "2026-11-18",
    ends_on: "2026-11-18",
    time_label: "",
    sort_order: 35,
    show_on_track: false,
    status_override: null,
  },
  {
    key: "final",
    title: "Babak Final",
    description: "Sesi presentasi karya dan tanya jawab tim finalis.",
    starts_on: "2026-11-21",
    ends_on: "2026-11-21",
    time_label: "",
    sort_order: 40,
    show_on_track: true,
    status_override: null,
  },
  {
    key: "winners",
    title: "Pengumuman Juara",
    description: "Penetapan dan selebrasi pemenang MIT-WEEK 2026.",
    starts_on: "2026-11-25",
    ends_on: "2026-11-25",
    time_label: "",
    sort_order: 50,
    show_on_track: true,
    status_override: null,
  },
];

/** Missing or empty data means the RPC is unavailable: keep the site working on the fallback. */
export function scheduleOrFallback(rows: CompetitionStage[] | null | undefined): readonly CompetitionStage[] {
  return rows && rows.length > 0 ? rows : SCHEDULE_FALLBACK;
}

export function getStage(schedule: readonly CompetitionStage[], key: string): CompetitionStage | undefined {
  return schedule.find((stage) => stage.key === key);
}

// DATE values carry no time zone: format them as UTC so the calendar day never shifts.
const dayMonth = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("id-ID", { day: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function asDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** "18 Nov", "11–17 Nov", or "30 Nov – 2 Des" across months. */
export function formatStageDates(stage: Pick<CompetitionStage, "starts_on" | "ends_on">): string {
  const start = asDate(stage.starts_on);
  const end = asDate(stage.ends_on);
  if (stage.starts_on === stage.ends_on) return dayMonth.format(start);
  if (stage.starts_on.slice(0, 7) === stage.ends_on.slice(0, 7)) {
    return `${dayOnly.format(start)}–${dayMonth.format(end)}`;
  }
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

/** "21 November 2026". */
export function formatStageDateLong(day: string): string {
  return fullDate.format(asDate(day));
}

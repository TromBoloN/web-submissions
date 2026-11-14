/**
 * Hardcoded competition schedule for the team portal.
 * Dates are WITA calendar days (YYYY-MM-DD). The submission deadline itself comes from
 * `competition_settings.submission_closes_at`; the entries below only drive labels and phases.
 * TODO: move to admin settings once the site gets comprehensive, dynamic settings.
 */
export const TEAM_SCHEDULE = [
  {
    id: "submit",
    start: "2026-11-10",
    end: "2026-11-10",
    dates: "10 Nov",
    title: "Batas pengumpulan karya",
    desc: "23.59 WITA",
  },
  {
    id: "review",
    start: "2026-11-11",
    end: "2026-11-17",
    dates: "11–17 Nov",
    title: "Penilaian Babak Awal",
    desc: "Dewan juri mengevaluasi seluruh karya terkirim.",
  },
  {
    id: "top5",
    start: "2026-11-18",
    end: "2026-11-18",
    dates: "18 Nov",
    title: "Pengumuman Top 5",
    desc: "Daftar finalis resmi diumumkan di portal & media.",
  },
  {
    id: "final",
    start: "2026-11-21",
    end: "2026-11-21",
    dates: "21 Nov",
    title: "Babak Final",
    desc: "Sesi presentasi karya (10m presentasi + 10m Q&A).",
  },
  {
    id: "winners",
    start: "2026-11-25",
    end: "2026-11-25",
    dates: "25 Nov",
    title: "Pengumuman Juara",
    desc: "Penetapan dan selebrasi pemenang MIT-WEEK 2026.",
  },
] as const;

export type ScheduleStepId = (typeof TEAM_SCHEDULE)[number]["id"];

export function getScheduleStep(id: ScheduleStepId) {
  const step = TEAM_SCHEDULE.find((item) => item.id === id);
  if (!step) throw new Error(`Unknown schedule step: ${id}`);
  return step;
}

/** Final presentation details. Hardcoded for now; see TODO above. */
export const FINAL_PRESENTATION = {
  dateLabel: "21 November 2026",
  details: [
    { label: "Presentasi", value: "10 menit" },
    { label: "Tanya jawab", value: "10 menit" },
  ],
  note: "Urutan tampil serta lokasi atau tautan sesi akan dikirim langsung oleh panitia.",
} as const;

/** Calendar day in WITA as YYYY-MM-DD, so string comparison matches date order. */
export function toWitaDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

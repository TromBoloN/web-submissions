/**
 * Team-portal date helpers. The schedule itself lives in competition_stages (Pengaturan → Jadwal) and
 * reaches client code through useSchedule(); final logistics come from get_my_final_presentation().
 */

/** Final format and logistics. venue/meeting_url stay null until the admin publishes logistics. */
export type FinalPresentation = {
  presentation_minutes: number;
  qa_minutes: number;
  venue: string | null;
  meeting_url: string | null;
  note: string;
};

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

/** Whole calendar days from one WITA date key to another (negative if `to` is earlier). */
export function daysBetweenDateKeys(from: string, to: string): number {
  const toUtcMs = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

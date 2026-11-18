// Pure helpers for the public gallery (safe on server and client).

/** URL slug for a project link, from the team name (team names are unique). */
export function karyaSlug(teamName: string): string {
  return (
    teamName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "karya"
  );
}

/** Calendar day in WITA as YYYY-MM-DD. */
export function witaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Picks `count` entries in a random order that is fixed for a given seed (e.g. the WITA date),
 * so everyone sees the same "Sorotan" on the same day and a new one tomorrow. Never score-based.
 */
export function pickDaily<T>(items: readonly T[], key: (item: T) => string, seed: string, count: number): T[] {
  return [...items]
    .map((item) => ({ item, rank: hashString(`${seed}:${key(item)}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, count)
    .map((entry) => entry.item);
}

/**
 * Utilities for formatting and parsing competition submission deadlines.
 * The database stores `submission_closes_at` as an exclusive cutoff.
 * The UI presents and accepts the "last accepted minute" in WITA (UTC+8).
 */

export function toLastAcceptedMoment(exclusiveCutoffIso: string | null): Date | null {
  if (!exclusiveCutoffIso) return null;
  const date = new Date(exclusiveCutoffIso);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() - 60 * 1000);
}

export function formatDeadlineWita(exclusiveCutoffIso: string | null): string {
  const lastAccepted = toLastAcceptedMoment(exclusiveCutoffIso);
  if (!lastAccepted) return "Belum diatur";

  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "short",
  }).format(lastAccepted)} WITA`;
}

export interface MultiZoneDeadline {
  wita: string;
  wib: string;
  wit: string;
  summary: string;
}

export function formatDeadlineMultiZone(exclusiveCutoffIso: string | null): MultiZoneDeadline | null {
  const lastAccepted = toLastAcceptedMoment(exclusiveCutoffIso);
  if (!lastAccepted) return null;

  const witaFull = `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "short",
  }).format(lastAccepted)} WITA`;

  const wibTime = `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    timeStyle: "short",
  }).format(lastAccepted)} WIB`;

  const witaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", day: "numeric" }).format(lastAccepted);
  const witParts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jayapura",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(lastAccepted);

  const witDay = witParts.find((p) => p.type === "day")?.value ?? "";
  const witMonth = witParts.find((p) => p.type === "month")?.value ?? "";
  const witHour = witParts.find((p) => p.type === "hour")?.value ?? "";
  const witMin = witParts.find((p) => p.type === "minute")?.value ?? "";
  const witTime = `${witHour}.${witMin}`;

  const isNextDay = witDay !== witaDay;
  const witFormatted = isNextDay ? `${witTime} WIT (${witDay} ${witMonth})` : `${witTime} WIT`;

  return {
    wita: witaFull,
    wib: wibTime,
    wit: witFormatted,
    summary: `${witaFull} · ${wibTime} · ${witFormatted}`,
  };
}

export function toWitaDateTimeLocalString(exclusiveCutoffIso: string | null): string {
  const lastAccepted = toLastAcceptedMoment(exclusiveCutoffIso);
  if (!lastAccepted) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(lastAccepted);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseWitaInputToExclusiveCutoff(witaLocalString: string): string | null {
  const match = witaLocalString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const submittedDate = new Date(`${witaLocalString}:00+08:00`);
  if (Number.isNaN(submittedDate.getTime())) return null;

  // Add 1 minute to store as exclusive cutoff
  const exclusiveDate = new Date(submittedDate.getTime() + 60 * 1000);
  return exclusiveDate.toISOString();
}

export function toWitaDateTimeLocalStringExact(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseWitaInputToUtcIso(witaLocalString: string): string | null {
  const match = witaLocalString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const date = new Date(`${witaLocalString}:00+08:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

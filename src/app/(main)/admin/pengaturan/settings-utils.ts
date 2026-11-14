import type { Json } from "@/types/database";

/** Timestamp in WITA, or null when missing/invalid. */
export function formatWitaTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "medium",
  }).format(date)} WITA`;
}

/** True when any link in a stored link-check result has a warning. */
export function hasLinkWarning(linkCheck: Json | null): boolean {
  if (!linkCheck || typeof linkCheck !== "object" || Array.isArray(linkCheck)) return false;
  return Object.values(linkCheck).some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item) &&
      "status" in item &&
      item.status === "warning",
  );
}

/** Shown by each sub-page when its data fails to load. */
export const SETTINGS_LOAD_ERROR = "Pengaturan tidak dapat dimuat. Silakan coba lagi.";

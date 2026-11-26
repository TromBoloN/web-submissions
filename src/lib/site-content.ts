// Admin-editable page copy (Pengaturan → Konten): the fixed list of allowed keys and their defaults.
// A key without a site_content row uses its default here. Everything is public (see the migration).

import type { EventInfo } from "@/lib/competition-info";

export type ContentGroup = "login" | "team" | "karya";

export interface ContentField {
  group: ContentGroup;
  label: string;
  hint: string;
  /** text: one line; textarea: a paragraph; list: one item per line. */
  kind: "text" | "textarea" | "list";
  max: number;
  /** Replaces {acara} and {bidang} with the event name and track. */
  placeholders?: boolean;
  default: string;
}

export const CONTENT_GROUPS: Record<ContentGroup, { title: string; description: string }> = {
  login: { title: "Halaman masuk", description: "Teks di halaman /login." },
  team: { title: "Portal tim", description: "Teks yang dilihat tim di dashboard." },
  karya: { title: "Galeri karya", description: "Teks di halaman publik /karya." },
};

export const CONTENT_FIELDS = {
  "login.help": {
    group: "login",
    label: "Petunjuk masuk",
    hint: "Tampil di bawah formulir, sebelum tautan bantuan WhatsApp.",
    kind: "textarea",
    max: 300,
    default: "Tim: gunakan email saat mendaftar. Juri: gunakan username dari panitia.",
  },
  "team.checklist": {
    group: "team",
    label: "Checklist sebelum mengirim",
    hint: "Satu butir per baris. Tampil sebelum tim mengirim karya pertama kali.",
    kind: "list",
    max: 2000,
    default: [
      "Repositori GitHub berstatus publik (coba buka lewat jendela penyamaran).",
      "README menjelaskan fitur utama dan cara menjalankan proyek.",
      "Live demo bisa dibuka tanpa login atau instalasi apa pun.",
      "Video demo bisa ditonton siapa saja yang memiliki tautan.",
      "Durasi dan isi video sudah sesuai juknis.",
      "Tautan sudah dicek ulang, tanpa typo atau spasi.",
    ].join("\n"),
  },
  "karya.tagline": {
    group: "karya",
    label: "Slogan galeri",
    hint: "Kalimat besar di bawah judul galeri.",
    kind: "text",
    max: 120,
    default: "Kenalan sama para penjaga digital.",
  },
  "karya.intro": {
    group: "karya",
    label: "Paragraf pembuka galeri",
    hint: "Tampil di hero galeri sebelum galeri dibuka.",
    kind: "textarea",
    max: 600,
    placeholders: true,
    default:
      "Ruang pameran karya peserta {bidang} Competition, salah satu kompetisi di {acara}. Jelajahi ide, eksperimen, dan solusi nyata dari teman-temanmu yang menjaga ruang digital kita tetap aman, inklusif, dan bersahabat.",
  },
} as const satisfies Record<string, ContentField>;

export type ContentKey = keyof typeof CONTENT_FIELDS;
export type SiteContent = Record<ContentKey, string>;

export const CONTENT_KEYS = Object.keys(CONTENT_FIELDS) as ContentKey[];

export function isContentKey(key: string): key is ContentKey {
  return Object.hasOwn(CONTENT_FIELDS, key);
}

/** Defaults overlaid with saved rows; unknown keys (e.g. removed from the registry) are ignored. */
export function resolveSiteContent(rows: readonly { key: string; value: string }[] | null | undefined): SiteContent {
  const content = Object.fromEntries(CONTENT_KEYS.map((key) => [key, CONTENT_FIELDS[key].default])) as SiteContent;
  for (const row of rows ?? []) {
    if (isContentKey(row.key)) content[row.key] = row.value;
  }
  return content;
}

/** A `list` value: one trimmed item per non-empty line. */
export function contentList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function fillPlaceholders(text: string, info: Pick<EventInfo, "event_name" | "event_track">): string {
  return text.replaceAll("{acara}", info.event_name).replaceAll("{bidang}", info.event_track);
}

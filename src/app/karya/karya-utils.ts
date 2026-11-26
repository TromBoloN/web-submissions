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

// ---------------------------------------------------------------------------
// Video: only YouTube videos and single Google Drive files can play inside the gallery.
// Drive folders, channels and other hosts keep the normal "open video" button.

export type VideoEmbed = { kind: "youtube" | "drive"; embedUrl: string; posterUrl: string | null };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function getVideoEmbed(rawUrl: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");

  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") youtubeId = url.searchParams.get("v");
    else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      youtubeId = match?.[1] ?? null;
    }
  }
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`,
      posterUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  if (host === "drive.google.com") {
    const fileId = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ?? url.searchParams.get("id");
    // open?id= can also point to a folder; only /file/d/ is known to be a single file.
    if (fileId && url.pathname.startsWith("/file/d/")) {
      return { kind: "drive", embedUrl: `https://drive.google.com/file/d/${fileId}/preview`, posterUrl: null };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// "Karya serupa": projects whose title + description share the most distinctive words.
// Words common to almost every project (the shared theme) weigh little; rare shared words weigh a lot.

const STOPWORDS = new Set(
  (
    "yang dan untuk dengan dari dalam pada atau sebagai secara lebih dapat bisa juga karena agar serta " +
    "melalui berbasis adalah membantu ini itu akan tidak sudah kami kita kamu anda mereka para setiap " +
    "oleh saat hingga antara tanpa bagi telah sangat semua sebuah seperti jika maka namun tetap ketika " +
    "aplikasi website situs web platform sistem solusi fitur pengguna digital karya tim proyek project " +
    "the and for with that this from your you are into using based app"
  ).split(" "),
);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !STOPWORDS.has(word)),
  );
}

export function findSimilar<T extends { teamName: string; title: string; description: string }>(
  items: readonly T[],
  target: T,
  count = 3,
): T[] {
  const docs = items.map((item) => ({ item, words: tokens(`${item.title} ${item.description}`) }));
  const df = new Map<string, number>();
  for (const doc of docs) for (const word of doc.words) df.set(word, (df.get(word) ?? 0) + 1);
  const n = docs.length;
  const targetWords = docs.find((doc) => doc.item.teamName === target.teamName)?.words ?? new Set<string>();

  return docs
    .filter((doc) => doc.item.teamName !== target.teamName)
    .map((doc) => {
      let score = 0;
      for (const word of doc.words) {
        if (targetWords.has(word)) score += Math.log(n / (df.get(word) ?? n));
      }
      return { item: doc.item, score };
    })
    .filter((entry) => entry.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.item);
}

// ---------------------------------------------------------------------------
// "Ingatkan saya": the winners announcement (Pengaturan → Jadwal) as an all-day calendar event.

export type WinnersEventInput = {
  /** WITA calendar days, YYYY-MM-DD. */
  startsOn: string;
  endsOn: string;
  eventName: string;
  eventTrack: string;
};

function winnersEvent(input: WinnersEventInput) {
  const compact = (day: string) => day.replaceAll("-", "");
  // All-day events end on the day after the last day (exclusive).
  const after = new Date(`${input.endsOn}T00:00:00Z`);
  after.setUTCDate(after.getUTCDate() + 1);
  const competition = `${input.eventTrack} Competition ${input.eventName}`;
  return {
    title: `Pengumuman Juara · ${competition}`,
    details: `Pengumuman juara 1, 2, dan 3 ${competition}. Lihat di galeri karya.`,
    start: compact(input.startsOn),
    endExclusive: compact(after.toISOString().slice(0, 10)),
  };
}

export function winnersCalendarIcs(galleryUrl: string, input: WinnersEventInput): string {
  const event = winnersEvent(input);
  const escapeIcs = (value: string) => value.replace(/[\\,;]/g, (c) => `\\${c}`);
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeIcs(input.eventName)}//Galeri Karya//ID`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:juara-${event.start}@galeri-karya`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${event.start}`,
    `DTEND;VALUE=DATE:${event.endExclusive}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(`${event.details} ${galleryUrl}`)}`,
    `URL:${galleryUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(event.title)}`,
    "TRIGGER:PT9H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function winnersGoogleCalendarUrl(galleryUrl: string, input: WinnersEventInput): string {
  const event = winnersEvent(input);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${event.start}/${event.endExclusive}`,
    details: `${event.details} ${galleryUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

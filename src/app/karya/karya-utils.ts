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
// "Ingatkan saya": the winners announcement on 25 Nov 2026 as an all-day calendar event.

const WINNERS_EVENT = {
  title: "Pengumuman Juara · Web Development Competition MIT-WEEK 2026",
  details: "Pengumuman juara 1, 2, dan 3 Web Development Competition MIT-WEEK 2026. Lihat di galeri karya.",
  start: "20261125",
  endExclusive: "20261126",
};

export function winnersCalendarIcs(galleryUrl: string): string {
  const escapeIcs = (value: string) => value.replace(/[\\,;]/g, (c) => `\\${c}`);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MIT-WEEK 2026//Galeri Karya//ID",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:mitweek2026-webdev-juara@mitweek",
    "DTSTAMP:20261118T000000Z",
    `DTSTART;VALUE=DATE:${WINNERS_EVENT.start}`,
    `DTEND;VALUE=DATE:${WINNERS_EVENT.endExclusive}`,
    `SUMMARY:${escapeIcs(WINNERS_EVENT.title)}`,
    `DESCRIPTION:${escapeIcs(`${WINNERS_EVENT.details} ${galleryUrl}`)}`,
    `URL:${galleryUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(WINNERS_EVENT.title)}`,
    "TRIGGER:PT9H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function winnersGoogleCalendarUrl(galleryUrl: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: WINNERS_EVENT.title,
    dates: `${WINNERS_EVENT.start}/${WINNERS_EVENT.endExclusive}`,
    details: `${WINNERS_EVENT.details} ${galleryUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

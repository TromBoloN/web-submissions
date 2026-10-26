import "server-only";

import dns from "node:dns/promises";
import { isIP } from "node:net";

export type LinkCheckStatus = "ok" | "warning" | "unknown";

export interface LinkCheckItem {
  status: LinkCheckStatus;
  message: string;
}

export interface LinkCheckResult {
  github?: LinkCheckItem;
  liveDemo?: LinkCheckItem;
  video?: LinkCheckItem;
}

function cleanIp(ip: string): string {
  let cleaned = ip.trim();
  if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed, reject
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 & 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true; // 198.18.0.0/15 & 198.51.100.0/24
  if (a === 203 && b === 0) return true; // 203.0.113.0/24
  if (a >= 224) return true; // 224.0.0.0/4 multicast & 240.0.0.0/4 reserved & 255.255.255.255 broadcast
  return false;
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // IPv4-mapped IPv6, e.g. ::ffff:192.168.1.1 or ::ffff:7f00:1
  if (lower.startsWith("::ffff:") || lower.includes(":ffff:")) {
    const lastPart = lower.split(":").pop();
    if (lastPart?.includes(".")) {
      return isPrivateOrReservedIpv4(lastPart);
    }
  }

  // Unspecified: ::
  if (lower === "::" || /^0(:0){1,7}$/.test(lower)) return true;
  // Loopback: ::1
  if (lower === "::1" || /^0(:0){0,6}:1$/.test(lower)) return true;

  // Unique local / private: fc00::/7 (fc00 - fdff)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  // Link-local: fe80::/10 (fe80 - febf)
  if (/^fe[89ab]/i.test(lower)) return true;

  // Multicast: ff00::/8
  if (lower.startsWith("ff")) return true;

  // Discard prefix: 100::/64
  if (lower.startsWith("100:")) return true;

  // Documentation prefix: 2001:db8::/32
  if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) return true;

  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = cleanIp(ip);
  if (cleaned.includes(":")) {
    return isPrivateOrReservedIpv6(cleaned);
  }
  return isPrivateOrReservedIpv4(cleaned);
}

async function validateUrlHost(urlString: string): Promise<{ valid: boolean; url?: URL; reason?: string }> {
  if (!urlString || urlString.length > 500) {
    return { valid: false, reason: "Panjang URL melebihi batas 500 karakter atau kosong." };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: "Format URL tidak valid." };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "Hanya protokol HTTPS yang diizinkan." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { valid: false, reason: "Hostname lokal atau internal tidak diizinkan." };
  }

  // Only treat the hostname as an IP if it IS an IP literal (e.g. 127.0.0.1 or [::1]).
  // Domain names are validated after DNS resolution below.
  if (isIP(cleanIp(hostname)) !== 0 && isPrivateOrReservedIp(hostname)) {
    return { valid: false, reason: "Alamat IP privat atau internal tidak diizinkan." };
  }
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { valid: false, reason: "Domain tidak dapat diselesaikan (DNS lookup gagal)." };
    }
    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        return { valid: false, reason: "Domain mengarah ke alamat IP privat atau internal." };
      }
    }
  } catch {
    return { valid: false, reason: "Domain tidak dapat ditemukan atau gagal resolusi DNS." };
  }

  return { valid: true, url: parsed };
}

interface SafeFetchResult {
  ok: boolean;
  finalStatus?: number;
  finalUrl?: string;
  finalHost?: string;
  errorReason?: string;
}

async function safeFetchWithRedirects(targetUrl: string, maxHops = 3): Promise<SafeFetchResult> {
  let currentUrl = targetUrl;
  let hops = 0;

  while (hops <= maxHops) {
    const check = await validateUrlHost(currentUrl);
    if (!check.valid || !check.url) {
      return { ok: false, errorReason: check.reason ?? "Tautan tidak valid atau dilarang." };
    }

    let res: Response;
    try {
      res = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MITWeekPortal/1.0; +https://mit-week.id)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
      });
    } catch {
      return { ok: false, errorReason: "Tidak dapat terhubung ke server atau waktu permintaan habis." };
    }

    try {
      await res.body?.cancel();
    } catch {
      // ignore body cancel error
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        return {
          ok: true,
          finalStatus: res.status,
          finalUrl: currentUrl,
          finalHost: check.url.hostname.toLowerCase(),
        };
      }
      hops++;
      if (hops > maxHops) {
        return {
          ok: true,
          finalStatus: res.status,
          finalUrl: currentUrl,
          finalHost: check.url.hostname.toLowerCase(),
        };
      }
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return { ok: false, errorReason: "Tautan redirect tidak valid." };
      }
      continue;
    }

    return {
      ok: true,
      finalStatus: res.status,
      finalUrl: currentUrl,
      finalHost: check.url.hostname.toLowerCase(),
    };
  }

  return { ok: false, errorReason: "Terlalu banyak pengalihan (redirect)." };
}

export async function checkGithubLink(rawUrl: string): Promise<LinkCheckItem> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { status: "warning", message: "URL repositori belum diisi." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { status: "warning", message: "Format URL repositori tidak valid." };
  }

  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
    return { status: "warning", message: "URL harus diawali dengan https://github.com/owner/repo" };
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    return {
      status: "warning",
      message: "URL harus menyertakan nama pemilik dan repositori (https://github.com/owner/repo).",
    };
  }

  const owner = parts[0];
  let repo = parts[1];
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }
  if (!owner || !repo) {
    return { status: "warning", message: "Nama pemilik atau repositori tidak valid." };
  }

  const canonicalUrl = `https://github.com/${owner}/${repo}`;
  const fetchRes = await safeFetchWithRedirects(canonicalUrl, 3);
  if (!fetchRes.ok) {
    return { status: "warning", message: fetchRes.errorReason ?? "Tidak dapat menghubungi GitHub." };
  }

  if (fetchRes.finalStatus === 200) {
    return { status: "ok", message: "Repositori publik dan dapat diakses." };
  }

  if (fetchRes.finalStatus === 404) {
    return { status: "warning", message: "Repositori tidak ditemukan atau masih privat." };
  }

  return {
    status: "unknown",
    message: `Status repositori belum dapat diverifikasi secara otomatis (HTTP ${fetchRes.finalStatus}).`,
  };
}

export async function checkLiveDemoLink(rawUrl: string): Promise<LinkCheckItem> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { status: "warning", message: "URL live demo belum diisi." };
  }

  const fetchRes = await safeFetchWithRedirects(trimmed, 3);
  if (!fetchRes.ok) {
    return { status: "warning", message: fetchRes.errorReason ?? "Tidak dapat dibuka atau tautan tidak valid." };
  }

  const status = fetchRes.finalStatus ?? 0;
  if (status >= 200 && status < 400) {
    return { status: "ok", message: "Tautan live demo dapat diakses." };
  }
  if (status === 401 || status === 403) {
    return { status: "warning", message: "Tampaknya memerlukan login." };
  }
  if (status === 404 || status >= 500) {
    return { status: "warning", message: `Tidak dapat dibuka (kode status HTTP ${status}).` };
  }

  return { status: "unknown", message: `Respons server: HTTP ${status}.` };
}

export async function checkVideoLink(rawUrl: string): Promise<LinkCheckItem> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { status: "warning", message: "URL video demo belum diisi." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { status: "warning", message: "Format URL video tidak valid." };
  }

  if (parsed.protocol !== "https:") {
    return { status: "warning", message: "Hanya URL HTTPS yang didukung." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // YouTube check via oEmbed
  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be") {
    const oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(trimmed)}`;
    try {
      const res = await fetch(oembedUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MITWeekPortal/1.0; +https://mit-week.id)",
        },
        signal: AbortSignal.timeout(6000),
      });

      try {
        await res.body?.cancel();
      } catch {
        // ignore cancel error
      }

      if (res.status === 200) {
        return { status: "ok", message: "Video publik dan dapat diakses." };
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return { status: "warning", message: "Video privat atau tidak ditemukan." };
      }
      return { status: "unknown", message: `Status video belum dapat dipastikan (HTTP ${res.status}).` };
    } catch {
      return { status: "unknown", message: "Gagal menghubungi layanan verifikasi video YouTube." };
    }
  }

  // Google Drive check
  if (hostname === "drive.google.com" || hostname.endsWith(".drive.google.com")) {
    const fetchRes = await safeFetchWithRedirects(trimmed, 3);
    if (!fetchRes.ok) {
      return { status: "warning", message: fetchRes.errorReason ?? "Tidak dapat dibuka." };
    }
    if (fetchRes.finalHost === "accounts.google.com") {
      return { status: "warning", message: "Akses belum publik (memerlukan login akun Google)." };
    }
    return {
      status: "unknown",
      message: "Tautan Google Drive terhubung. Pastikan akses disetel 'Siapa saja yang memiliki link'.",
    };
  }

  // Any other host: reachability check
  const fetchRes = await safeFetchWithRedirects(trimmed, 3);
  if (!fetchRes.ok) {
    return { status: "warning", message: fetchRes.errorReason ?? "Tidak dapat dibuka." };
  }
  const status = fetchRes.finalStatus ?? 0;
  if (status >= 200 && status < 400) {
    return { status: "ok", message: "Tautan video dapat diakses." };
  }
  if (status === 401 || status === 403) {
    return { status: "warning", message: "Tampaknya memerlukan login." };
  }
  if (status === 404 || status >= 500) {
    return { status: "warning", message: `Tidak dapat dibuka (kode status HTTP ${status}).` };
  }
  return { status: "unknown", message: `Status tautan: HTTP ${status}.` };
}

export async function checkLinks(links: {
  github?: string | null;
  liveDemo?: string | null;
  video?: string | null;
}): Promise<LinkCheckResult> {
  const tasks: Promise<[keyof LinkCheckResult, LinkCheckItem]>[] = [];

  if (links.github?.trim()) {
    tasks.push(
      checkGithubLink(links.github).then(
        (res) => ["github", res] as [keyof LinkCheckResult, LinkCheckItem],
        () =>
          ["github", { status: "unknown", message: "Pemeriksaan tautan GitHub gagal diproses." }] as [
            keyof LinkCheckResult,
            LinkCheckItem,
          ],
      ),
    );
  }

  if (links.liveDemo?.trim()) {
    tasks.push(
      checkLiveDemoLink(links.liveDemo).then(
        (res) => ["liveDemo", res] as [keyof LinkCheckResult, LinkCheckItem],
        () =>
          ["liveDemo", { status: "unknown", message: "Pemeriksaan live demo gagal diproses." }] as [
            keyof LinkCheckResult,
            LinkCheckItem,
          ],
      ),
    );
  }

  if (links.video?.trim()) {
    tasks.push(
      checkVideoLink(links.video).then(
        (res) => ["video", res] as [keyof LinkCheckResult, LinkCheckItem],
        () =>
          ["video", { status: "unknown", message: "Pemeriksaan video demo gagal diproses." }] as [
            keyof LinkCheckResult,
            LinkCheckItem,
          ],
      ),
    );
  }

  const results = await Promise.allSettled(tasks);
  const outcome: LinkCheckResult = {};

  for (const r of results) {
    if (r.status === "fulfilled") {
      const [key, item] = r.value;
      outcome[key] = item;
    }
  }

  return outcome;
}

import type { ShowcaseCardData } from "@/components/showcase-card";

export const GUARDIAN_CATEGORIES = [
  "Penjaga Identitas",
  "Penjaga Informasi",
  "Penjaga Transaksi",
  "Penjaga Privasi",
] as const;

const COMMITTEE_NOTES: Record<number, string> = {
  1: "Solusi pertahanan komprehensif dengan pendekatan edukasi human-centric yang memadukan perlindungan tangguh dan kemudahan penggunaan bagi masyarakat luas.",
  2: "Implementasi proteksi proaktif yang elegan dengan arsitektur pencegahan manipulasi digital yang presisi, ringan, dan efisien.",
  3: "Inovasi perlindungan berbasis komunitas yang berhasil memitigasi titik rawan penipuan digital dengan alur verifikasi yang sangat intuitif.",
};

/**
 * Enriches ShowcaseCardData with winner committee notes and presentation flags.
 * Does not fabricate fictitious team members or quotes.
 */
export function enrichGuardianCard(raw: ShowcaseCardData, index = 0): ShowcaseCardData {
  const committeeNote =
    raw.committeeNote ??
    (raw.winnerRank ? (COMMITTEE_NOTES[raw.winnerRank] ?? "Karya terpilih dewan juri.") : undefined);

  return {
    ...raw,
    committeeNote,
    isFeatured: index === 0 || index === 3,
  };
}

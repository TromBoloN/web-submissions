import type { ShowcaseCardData } from "@/components/showcase-card";

/**
 * Shared schedule constants for MIT-WEEK 2026: Web Development Competition.
 * Theme: Guardians of the Digital Space.
 * Stages based on official technical guidelines (Juknis).
 */
export const KARYA_DATES = {
  galleryReleaseDate: "18 Nov 2026",
  galleryReleaseDateFull: "18 November 2026",
  galleryPlannedText: "Segera Hadir · Direncanakan Dibuka 18 November 2026",

  // Stage 1: Galeri & Finalis
  stage1Date: "18 Nov 2026",
  stage1Label: "18 NOV · GALERI DIBUKA & TOP 5",
  stage1Desc: "Pembukaan galeri karya peserta dan pengumuman 5 finalis terbaik.",

  // Stage 2: Presentasi Final
  stage2Date: "21 Nov 2026",
  stage2Label: "21 NOV · PRESENTASI FINAL",
  stage2Desc: "Sesi presentasi karya dan tanya jawab tim finalis di hadapan dewan juri.",

  // Stage 3: Pengumuman Pemenang
  stage3Date: "25 Nov 2026",
  stage3Label: "25 NOV · PENGUMUMAN PEMENANG",
  stage3Desc: "Pengumuman juara 1, 2, dan 3 kompetisi Web Development MIT-WEEK 2026.",
} as const;

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

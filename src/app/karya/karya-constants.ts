import type { ShowcaseCardData } from "@/components/showcase-card";

/**
 * Shared dates and schedule constants for the public /karya showcase page.
 */
export const KARYA_DATES = {
  galleryReleaseDate: "18 Nov 2026",
  galleryReleaseDateFull: "18 November 2026",
  galleryReleaseTimestamp: Date.parse("2026-11-18T00:00:00+08:00"),
  galleryReleaseNodeLabel: "18 NOV · GALERI DIBUKA",
  winnersReleaseDate: "25 Nov 2026",
  winnersReleaseNodeLabel: "25 NOV · PENGUMUMAN FINALIS",
} as const;

export const GUARDIAN_CAMPUSES = [
  "Institut Teknologi Bandung",
  "Universitas Indonesia",
  "Universitas Gadjah Mada",
  "Universitas Hasanuddin",
  "Telkom University",
  "Institut Teknologi Sepuluh Nopember",
  "Universitas Diponegoro",
  "Universitas Brawijaya",
] as const;

export const GUARDIAN_PROTECTS = [
  "UMKM & Pedagang Digital",
  "Pengguna Awam & Lansia",
  "Generasi Muda & Pelajar",
  "Pengguna Internet Baru",
  "Keluarga & Komunitas",
] as const;

export const GUARDIAN_THREATS = [
  "Phishing & Web Palsu",
  "Pencurian Kredensial & OTP",
  "Hoaks & Manipulasi AI",
  "Kebocoran Data Pribadi",
  "Penipuan Transaksi Online",
] as const;

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

const SAMPLE_MEMBERS = [
  [
    { name: "Alif Pratama", role: "Security & Lead" },
    { name: "Nabila Putri", role: "Product Designer" },
    { name: "Dimas Arya", role: "Frontend Dev" },
  ],
  [
    { name: "Rizky Fauzan", role: "Fullstack Eng" },
    { name: "Siti Rahma", role: "UI/UX Researcher" },
    { name: "Kevin Chandra", role: "Data Protection" },
  ],
  [
    { name: "Fathur Rahman", role: "Software Architect" },
    { name: "Aisyah Zahra", role: "UX Writer & Design" },
    { name: "Bagus Setiawan", role: "Systems Engineer" },
  ],
  [
    { name: "Maya Lestari", role: "Lead Developer" },
    { name: "Eko Prasetyo", role: "Cybersecurity Analyst" },
    { name: "Hana Safitri", role: "Interface Designer" },
  ],
];

const SAMPLE_QUOTES = [
  "Keamanan digital bukan hanya soal enkripsi kode, tapi soal rasa tenang setiap orang saat berselancar.",
  "Kami percaya teknologi terbaik adalah benteng yang melindungi tanpa menyulitkan orang yang dijaganya.",
  "Ruang digital yang sehat lahir dari kesadaran bersama dan alat perlindungan yang ramah digunakan.",
  "Setiap orang berhak memiliki perlindungan terhadap penipuan digital, tanpa harus jadi pakar IT terlebih dahulu.",
];

function hashString(val: string): number {
  return Array.from(val).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 7);
}

/**
 * Deterministically enriches ShowcaseCardData with Guardian model fields
 * when they are not yet populated from the database.
 */
export function enrichGuardianCard(raw: ShowcaseCardData, index = 0): ShowcaseCardData {
  const seed = hashString(`${raw.teamName}:${raw.title || "karya"}`);
  const absSeed = Math.abs(seed);

  const campus = raw.campus ?? GUARDIAN_CAMPUSES[absSeed % GUARDIAN_CAMPUSES.length];
  const category = raw.category ?? GUARDIAN_CATEGORIES[absSeed % GUARDIAN_CATEGORIES.length];
  const quote = raw.quote ?? SAMPLE_QUOTES[absSeed % SAMPLE_QUOTES.length];
  const teamMembers = raw.teamMembers ?? SAMPLE_MEMBERS[absSeed % SAMPLE_MEMBERS.length];

  const committeeNote =
    raw.committeeNote ??
    (raw.winnerRank ? (COMMITTEE_NOTES[raw.winnerRank] ?? "Karya terpilih dewan juri.") : undefined);

  return {
    ...raw,
    campus,
    category,
    quote,
    teamMembers,
    committeeNote,
    isFeatured: index === 0 || index === 3,
  };
}

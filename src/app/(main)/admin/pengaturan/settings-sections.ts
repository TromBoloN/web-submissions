import type { LucideIcon } from "lucide-react";
import {
  Award,
  CalendarClock,
  CalendarDays,
  FileText,
  LayoutGrid,
  Link2,
  Megaphone,
  Sparkles,
  Type,
} from "lucide-react";

export type SettingsSection = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/** Sub-pages of /admin/pengaturan, in nav order. The first entry is the overview. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    href: "/admin/pengaturan",
    title: "Ringkasan",
    description: "Status semua pengaturan dalam satu layar.",
    icon: LayoutGrid,
  },
  {
    href: "/admin/pengaturan/identitas",
    title: "Identitas & Final",
    description: "Nama acara, jumlah finalis, dan logistik babak final.",
    icon: Sparkles,
  },
  {
    href: "/admin/pengaturan/jadwal",
    title: "Jadwal",
    description: "Tanggal setiap tahap kompetisi.",
    icon: CalendarDays,
  },
  {
    href: "/admin/pengaturan/konten",
    title: "Konten",
    description: "Teks halaman masuk, portal tim, dan galeri.",
    icon: Type,
  },
  {
    href: "/admin/pengaturan/pengumpulan",
    title: "Pengumpulan",
    description: "Batas akhir pengiriman submission.",
    icon: CalendarClock,
  },
  {
    href: "/admin/pengaturan/hasil",
    title: "Rilis Hasil",
    description: "Buka hasil penilaian babak awal dan final.",
    icon: Award,
  },
  {
    href: "/admin/pengaturan/galeri",
    title: "Galeri",
    description: "Tinjau dan terbitkan galeri karya serta pemenang.",
    icon: Megaphone,
  },
  {
    href: "/admin/pengaturan/studi-kasus",
    title: "Studi Kasus",
    description: "Judul, jadwal tampil, dan isi studi kasus.",
    icon: FileText,
  },
  {
    href: "/admin/pengaturan/tautan",
    title: "Tautan & Kontak",
    description: "Tautan juknis dan WhatsApp panitia.",
    icon: Link2,
  },
];

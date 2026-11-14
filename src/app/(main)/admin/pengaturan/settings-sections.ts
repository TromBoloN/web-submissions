import type { LucideIcon } from "lucide-react";
import { Award, CalendarClock, FileText, LayoutGrid, Link2, Megaphone } from "lucide-react";

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

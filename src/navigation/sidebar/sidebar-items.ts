import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  ClipboardList,
  FileText,
  History,
  Images,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

import type { CurrentUser } from "@/lib/user-display";

export type NavBadge = "locked" | "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export function getSidebarItems(
  role: CurrentUser["role"],
  juknisUrl?: string | null,
  resultsReleased?: boolean,
): NavGroup[] {
  if (role === "admin") {
    return [
      {
        id: 1,
        label: "Ringkasan",
        items: [{ id: "dashboard", title: "Dasbor", url: "/admin", icon: LayoutDashboard }],
      },
      {
        id: 2,
        label: "Kompetisi",
        items: [
          { id: "accounts", title: "Akun", url: "/admin/akun", icon: Users },
          { id: "teams", title: "Tim", url: "/admin/tim", icon: ClipboardList },
          { id: "submissions", title: "Submission", url: "/admin/submission", icon: FileText },
          { id: "ranking", title: "Peringkat", url: "/admin/peringkat", icon: Award },
          { id: "finalists", title: "Finalis", url: "/admin/finalis", icon: Trophy },
          { id: "karya", title: "Karya", url: "/karya", icon: Images },
        ],
      },
      {
        id: 3,
        label: "Sistem",
        items: [
          { id: "audit", title: "Audit", url: "/admin/audit", icon: History },
          { id: "settings", title: "Pengaturan", url: "/admin/pengaturan", icon: Settings },
        ],
      },
    ];
  }

  const isJudge = role === "judge";
  const basePath = isJudge ? "/judge" : "/team";

  const items: NavMainItem[] = [
    {
      id: "home",
      title: "Dasbor",
      url: basePath,
      icon: LayoutDashboard,
    },
  ];

  if (isJudge) {
    // Judges only visit the public gallery; they do not have a showcase editor.
    items.push({ id: "karya", title: "Karya", url: "/karya", icon: Images });
  } else {
    items.push({
      id: "showcase",
      title: "Tampilan Karya",
      url: "/team/karya",
      icon: Images,
    });
    // Public gallery, previously reached via a button on the team dashboard.
    items.push({ id: "karya", title: "Galeri Karya", url: "/karya", icon: LayoutGrid });
  }

  if (role === "team" && resultsReleased === true) {
    items.push({
      id: "results",
      title: "Hasil Penilaian",
      url: "/team/hasil",
      icon: Award,
    });
  }

  items.push({
    id: "case-study",
    title: "Studi Kasus",
    url: `${basePath}/studi-kasus`,
    icon: BookOpen,
  });

  if (juknisUrl?.startsWith("https://")) {
    items.push({
      id: "juknis",
      title: "Juknis",
      url: juknisUrl,
      icon: FileText,
      newTab: true,
    });
  }

  return [
    {
      id: 1,
      label: isJudge ? "Juri" : "Peserta",
      items,
    },
  ];
}

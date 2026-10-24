import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, ClipboardList, FileText, LayoutDashboard, Settings, Users } from "lucide-react";

import type { CurrentUser } from "@/lib/user-display";

export type NavBadge = "new" | "soon";

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

export function getSidebarItems(role: CurrentUser["role"], juknisUrl?: string | null): NavGroup[] {
  if (role === "admin") {
    return [
      {
        id: 1,
        label: "Administrasi",
        items: [
          { id: "dashboard", title: "Dasbor", url: "/admin", icon: LayoutDashboard },
          { id: "accounts", title: "Akun", url: "/admin/akun", icon: Users },
          { id: "teams", title: "Tim", url: "/admin/tim", icon: ClipboardList },
          { id: "submissions", title: "Submission", url: "/admin/submission", icon: FileText },
          { id: "ranking", title: "Peringkat", url: "/admin/peringkat", icon: Award },
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
    {
      id: "case-study",
      title: "Studi Kasus",
      url: `${basePath}/studi-kasus`,
      icon: BookOpen,
    },
  ];

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

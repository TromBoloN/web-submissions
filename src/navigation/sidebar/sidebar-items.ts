import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  ClipboardList,
  Compass,
  FileText,
  History,
  LayoutDashboard,
  Palette,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

import type { CurrentUser } from "@/lib/user-display";

export type NavBadge = "locked" | "new" | "soon";

/**
 * Public gallery state for the sidebar badge, decided on the server:
 * locked until `showcase_published_at`, "new" for a few days after, then plain.
 */
export type GalleryNavState = "locked" | "new" | "open";

/** Planned gallery opening, shown on the locked badge. TODO: move to admin settings. */
export const GALLERY_OPENING_LABEL = "18 Nov";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  badgeLabel?: string;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  /** Overrides the default badge text (e.g. a date on a locked item). */
  badgeLabel?: string;
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

function galleryItem(state: GalleryNavState): NavMainLinkItem {
  const item: NavMainLinkItem = { id: "karya", title: "Galeri", url: "/karya", icon: Compass };
  if (state === "locked") return { ...item, badge: "locked", badgeLabel: GALLERY_OPENING_LABEL };
  if (state === "new") return { ...item, badge: "new" };
  return item;
}

export function getSidebarItems(
  role: CurrentUser["role"],
  juknisUrl?: string | null,
  resultsReleased?: boolean,
  galleryState: GalleryNavState = "open",
): NavGroup[] {
  if (role === "admin") {
    return [
      {
        id: 1,
        label: "Admin",
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
          galleryItem(galleryState),
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

  const roleItems: NavMainItem[] = [{ id: "home", title: "Dasbor", url: basePath, icon: LayoutDashboard }];
  if (role === "team" && resultsReleased === true) {
    roleItems.push({ id: "results", title: "Hasil Penilaian", url: "/team/hasil", icon: Award });
  }

  const exploreItems: NavMainItem[] = [
    galleryItem(galleryState),
    { id: "case-study", title: "Studi Kasus", url: `${basePath}/studi-kasus`, icon: BookOpen },
  ];
  if (juknisUrl?.startsWith("https://")) {
    exploreItems.push({ id: "juknis", title: "Juknis", url: juknisUrl, icon: FileText, newTab: true });
  }

  const groups: NavGroup[] = [{ id: 1, label: isJudge ? "Juri" : "Peserta", items: roleItems }];
  if (!isJudge) {
    // Teams edit their own showcase; judges only browse the gallery.
    groups.push({
      id: 2,
      label: "Karya Saya",
      items: [{ id: "showcase", title: "Atur Tampilan", url: "/team/karya", icon: Palette }],
    });
  }
  groups.push({ id: 3, label: "Jelajah", items: exploreItems });

  return groups;
}

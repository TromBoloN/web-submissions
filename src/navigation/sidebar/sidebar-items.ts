import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileText,
  History,
  LayoutDashboard,
  ListOrdered,
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
  /** Also active on sub-pages (url + "/..."). Off by default so "/admin" doesn't match everything. */
  matchPrefix?: boolean;
  /** Team ranking item only: shimmer while the new ranking is unseen. */
  celebrate?: boolean;
  /** Team ranking item only: medal marker once the team has seen a medal/finalist result. */
  medal?: RankingMedal;
}

export type RankingMedal = "gold" | "silver" | "bronze" | "finalist";

/** Ranking nav decoration, decided on the server from presentation-only cookies (no DB). */
export interface RankingNavState {
  /** The current ranking release has not been opened yet in this browser. */
  fresh: boolean;
  medal: RankingMedal | null;
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
  rankingPublished?: boolean,
  rankingNav?: RankingNavState,
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
          { id: "settings", title: "Pengaturan", url: "/admin/pengaturan", icon: Settings, matchPrefix: true },
        ],
      },
    ];
  }

  const isJudge = role === "judge";
  const basePath = isJudge ? "/judge" : "/team";

  const roleItems: NavMainItem[] = [{ id: "home", title: "Dasbor", url: basePath, icon: LayoutDashboard }];
  if (isJudge) {
    roleItems.push({ id: "recap", title: "Rekap Penilaian", url: "/judge/rekap", icon: ClipboardCheck });
  }
  if (role === "team" && resultsReleased === true) {
    roleItems.push({ id: "results", title: "Hasil Penilaian", url: "/team/hasil", icon: Award });
  }
  if (rankingPublished === true) {
    // Teams and judges; the shimmer/medal decoration (rankingNav) is only passed for teams.
    roleItems.push({
      id: "ranking",
      title: "Peringkat",
      url: `${basePath}/peringkat`,
      icon: ListOrdered,
      ...(rankingNav?.fresh
        ? { celebrate: true, badge: "new" as const, badgeLabel: "Rilis" }
        : { medal: rankingNav?.medal ?? undefined }),
    });
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

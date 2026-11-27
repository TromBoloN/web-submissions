import { cache, type ReactNode } from "react";

import { cookies } from "next/headers";

import { cn } from "cn";

import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { type CurrentUser, getRoleLabel } from "@/lib/user-display";
import type { GalleryNavState, RankingNavState } from "@/navigation/sidebar/sidebar-items";
import { getPreference } from "@/server/server-actions";

import { SearchDialog } from "./header/search-dialog";
import { AppSidebar } from "./sidebar/app-sidebar";

/**
 * The competition_settings fields the shell and the role layouts need, in one query per request.
 * Layouts call it too; React cache() makes the shell reuse their result instead of querying again.
 */
export const getShellSettings = cache(async () => {
  const supabase = await createClient();
  return supabase
    .from("competition_settings")
    .select(
      "juknis_url, showcase_published_at, gallery_new_badge_days, ranking_published, preliminary_results_released, final_results_released",
    )
    .eq("id", true)
    .maybeSingle();
});

export async function DashboardShell({
  children,
  user,
  resultsReleased,
  rankingPublished,
  rankingNav,
  teamCode,
}: Readonly<{
  children: ReactNode;
  user: CurrentUser;
  resultsReleased?: boolean;
  /** Team and judge roles: shows the "Peringkat" sidebar item. */
  rankingPublished?: boolean;
  /** Team role only: shimmer/medal decoration for the "Peringkat" item. */
  rankingNav?: RankingNavState;
  /** Team role only: shown on the sidebar user chip. */
  teamCode?: string | null;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
  ]);

  const { data: settings } = await getShellSettings();
  const juknisUrl = user.role === "team" || user.role === "judge" ? (settings?.juknis_url ?? null) : null;

  // Gallery badge: locked until published, "Baru" for the first week, then nothing. Server time only.
  let galleryState: GalleryNavState = "locked";
  if (settings?.showcase_published_at) {
    const publishedMs = new Date(settings.showcase_published_at).getTime();
    // gallery_new_badge_days (Pengaturan → Identitas); 0 turns the "Baru" badge off.
    const newBadgeMs = settings.gallery_new_badge_days * 24 * 60 * 60 * 1000;
    galleryState = Date.now() - publishedMs < newBadgeMs ? "new" : "open";
  }

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "calc(var(--spacing) * 68)" } as React.CSSProperties}
    >
      <AppSidebar
        user={user}
        juknisUrl={juknisUrl}
        resultsReleased={resultsReleased}
        rankingPublished={rankingPublished}
        rankingNav={rankingNav}
        galleryState={galleryState}
        teamCode={teamCode}
        variant={variant}
        collapsible={collapsible}
      />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-clip",
        )}
      >
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              {user.role === "admin" && (
                <>
                  <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                  />
                  <SearchDialog role={user.role} />
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm sm:block">
                {user.full_name} <span className="text-muted-foreground">({getRoleLabel(user.role)})</span>
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

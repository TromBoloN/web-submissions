"use client";

import Image from "next/image";
import Link from "next/link";

import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import type { CurrentUser } from "@/lib/user-display";
import { type GalleryNavState, getSidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import logo from "@/styles/flag-icons/MIT-WEEK, WEB LOGO.png";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({
  user,
  juknisUrl,
  resultsReleased,
  galleryState,
  teamCode,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: CurrentUser;
  juknisUrl?: string | null;
  resultsReleased?: boolean;
  galleryState?: GalleryNavState;
  teamCode?: string | null;
}) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/" className="h-auto! gap-3 py-2">
                {/* The logo is already a hex with transparent padding; scale it up to fill its box. */}
                <Image
                  src={logo}
                  alt=""
                  width={96}
                  height={96}
                  className="size-10 shrink-0 scale-[1.3] object-contain group-data-[collapsible=icon]:size-5"
                  priority
                />
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-display font-extrabold text-base">{APP_CONFIG.name}</span>
                  <span className="truncate font-bold font-mono text-[11px] text-sidebar-foreground/70 uppercase tracking-wider">
                    Web Development
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getSidebarItems(user.role, juknisUrl, resultsReleased, galleryState)} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} teamCode={teamCode} />
      </SidebarFooter>
    </Sidebar>
  );
}

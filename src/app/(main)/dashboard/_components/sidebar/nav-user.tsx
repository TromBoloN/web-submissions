"use client";

import Link from "next/link";

import { EllipsisVertical, KeyRound, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-actions";
import { type CurrentUser, getRoleLabel, getUserDisplayEmail } from "@/lib/user-display";
import { getInitials } from "@/lib/utils";

/** Hex avatar with initials, matching the Guardian ID badge. */
function HexAvatar({ name }: { name: string }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center" aria-hidden="true">
      <span className="hex absolute inset-0 bg-ink" />
      <span className="hex absolute inset-[2px] grid place-items-center bg-guardian-accent font-bold font-mono text-[11px] text-white">
        {getInitials(name)}
      </span>
    </span>
  );
}

export function NavUser({ user, teamCode }: { readonly user: CurrentUser; readonly teamCode?: string | null }) {
  const { isMobile } = useSidebar();
  // Teams see their code; admin and judges get a role chip instead.
  const subLabel =
    user.role === "team" ? (
      <span className="truncate font-bold font-mono text-[11px] text-ink">{teamCode ?? getRoleLabel(user.role)}</span>
    ) : (
      <span className="w-fit rounded-full border-2 border-ink px-1.5 font-bold font-mono text-[11px] text-ink uppercase leading-4">
        {getRoleLabel(user.role)}
      </span>
    );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="press rounded-xl border-2 border-ink bg-card shadow-brutal-sm data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:shadow-none"
            >
              <HexAvatar name={user.full_name} />
              <div className="grid min-w-0 flex-1 gap-0.5 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.full_name}</span>
                {subLabel}
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <HexAvatar name={user.full_name} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.full_name}</span>
                  <span className="truncate text-muted-foreground text-xs">{getUserDisplayEmail(user.email)}</span>
                  <span className="truncate text-muted-foreground text-xs">{getRoleLabel(user.role)}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${user.role}/kata-sandi`}>
                <KeyRound className="size-4" />
                Ganti kata sandi
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOut />
                  Keluar
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

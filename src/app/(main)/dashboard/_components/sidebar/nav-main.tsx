"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";
import { ChevronRight, LockKeyhole } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type {
  NavBadge,
  NavGroup,
  NavMainItem,
  NavMainLinkItem,
  NavMainParentItem,
} from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}
interface NavItemProps {
  readonly item: NavMainItem;
  readonly isItemActive: (item: NavMainItem) => boolean;
  readonly isSubItemActive: (url: string) => boolean;
  readonly isSubmenuOpen: (item: NavMainParentItem) => boolean;
}

interface NavLinkItemProps {
  readonly item: NavMainLinkItem;
  readonly isActive: boolean;
  readonly showIconFallback: boolean;
}

interface NavLinkIconProps {
  readonly item: NavMainLinkItem;
  readonly showFallback: boolean;
}

interface NavDropdownItemProps {
  readonly item: NavMainParentItem;
  readonly isActive: boolean;
  readonly isSubItemActive: (url: string) => boolean;
}

interface NavCollapsibleItemProps {
  readonly item: NavMainParentItem;
  readonly isActive: boolean;
  readonly defaultOpen: boolean;
  readonly isSubItemActive: (url: string) => boolean;
}

function CollapsedIconFallback({ title }: { title: string }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-xs font-medium text-[10px] outline">
      {title.slice(0, 1)}
    </span>
  );
}

function hasSubItems(item: NavMainItem): item is NavMainParentItem {
  return Boolean(item.subItems?.length);
}

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();

  const isItemActive = (item: NavMainItem) => {
    if (hasSubItems(item)) {
      return item.subItems.some((sub) => path.startsWith(sub.url));
    }

    return path === item.url;
  };

  const isSubItemActive = (url: string) => {
    return path === url;
  };

  const isSubmenuOpen = (item: NavMainParentItem) => {
    return item.subItems.some((sub) => path.startsWith(sub.url));
  };

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && (
            <SidebarGroupLabel className="font-bold font-mono text-[11px] text-sidebar-foreground/70 uppercase tracking-[0.18em] group-data-[collapsible=icon]:pointer-events-none">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isItemActive={isItemActive}
                  isSubItemActive={isSubItemActive}
                  isSubmenuOpen={isSubmenuOpen}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function NavItem({ item, isItemActive, isSubItemActive, isSubmenuOpen }: NavItemProps) {
  const { state, isMobile } = useSidebar();
  const isCollapsedDesktop = state === "collapsed" && !isMobile;

  if (!hasSubItems(item)) {
    return <NavLinkItem item={item} isActive={isItemActive(item)} showIconFallback={isCollapsedDesktop} />;
  }

  if (isCollapsedDesktop) {
    return <NavDropdownItem item={item} isActive={isItemActive(item)} isSubItemActive={isSubItemActive} />;
  }

  return (
    <NavCollapsibleItem
      item={item}
      isActive={isItemActive(item)}
      defaultOpen={isSubmenuOpen(item)}
      isSubItemActive={isSubItemActive}
    />
  );
}

/**
 * Guardian nav row: outlined icon tile; the active row gets an ink border, hard shadow and mint hex marker.
 * Lifts on hover and sinks on press. In icon-collapsed mode the chrome falls away.
 */
const NAV_ROW_CLASS = cn(
  "h-10 gap-2.5 rounded-lg border-2 border-transparent transition-all duration-150 focus:outline-none focus-visible:outline-none focus-visible:ring-2",
  "hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0",
  "data-active:border-ink data-active:bg-card data-active:font-semibold data-active:shadow-brutal-sm data-active:hover:shadow-brutal",
  "group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:shadow-none",
);

function NavLinkItem({ item, isActive, showIconFallback }: NavLinkItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        aria-disabled={item.disabled}
        className={NAV_ROW_CLASS}
        tooltip={item.title}
        isActive={isActive}
      >
        <Link
          prefetch={false}
          href={item.url}
          target={item.newTab ? "_blank" : undefined}
          rel={item.newTab ? "noreferrer" : undefined}
          aria-current={isActive ? "page" : undefined}
        >
          <NavLinkIcon item={item} showFallback={showIconFallback} isActive={isActive} />
          <span className="truncate">{item.title}</span>
          {isActive && !item.badge && (
            <span
              className="hex ml-auto size-2.5 shrink-0 bg-mint group-data-[collapsible=icon]:hidden"
              aria-hidden="true"
            />
          )}
        </Link>
      </SidebarMenuButton>
      <NavItemBadge badge={item.badge} label={item.badgeLabel} />
    </SidebarMenuItem>
  );
}

function NavLinkIcon({ item, showFallback, isActive }: NavLinkIconProps & { isActive: boolean }) {
  const Icon = item.icon;

  if (Icon) {
    return (
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md border-2 bg-card text-ink",
          isActive ? "border-ink" : "border-ink/30",
          "group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
    );
  }

  if (showFallback) {
    return <CollapsedIconFallback title={item.title} />;
  }

  return null;
}

function NavDropdownItem({ item, isActive, isSubItemActive }: NavDropdownItemProps) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            className="focus:outline-none focus-visible:outline-none focus-visible:ring-2"
            tooltip={item.title}
            isActive={isActive}
            disabled={item.disabled}
          >
            {Icon ? <Icon /> : <CollapsedIconFallback title={item.title} />}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-48">
          <DropdownMenuGroup>
            {item.subItems.map((subItem) => {
              const SubIcon = subItem.icon;

              return (
                <DropdownMenuItem key={subItem.id} asChild disabled={subItem.disabled}>
                  <Link
                    prefetch={false}
                    href={subItem.url}
                    target={subItem.newTab ? "_blank" : undefined}
                    rel={subItem.newTab ? "noreferrer" : undefined}
                    aria-current={isSubItemActive(subItem.url) ? "page" : undefined}
                    className="flex items-center gap-2"
                  >
                    {SubIcon && <SubIcon />}
                    <span>{subItem.title}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function NavCollapsibleItem({ item, isActive, defaultOpen, isSubItemActive }: NavCollapsibleItemProps) {
  const Icon = item.icon;

  return (
    <Collapsible asChild defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="focus:outline-none focus-visible:outline-none focus-visible:ring-2"
            tooltip={item.title}
            isActive={isActive}
            disabled={item.disabled}
          >
            {Icon && <Icon />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <NavItemBadge badge={item.badge} label={item.badgeLabel} />

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems.map((subItem) => {
              const SubIcon = subItem.icon;

              return (
                <SidebarMenuSubItem key={subItem.id}>
                  <SidebarMenuSubButton
                    asChild
                    aria-disabled={subItem.disabled}
                    isActive={isSubItemActive(subItem.url)}
                  >
                    <Link
                      prefetch={false}
                      href={subItem.url}
                      target={subItem.newTab ? "_blank" : undefined}
                      rel={subItem.newTab ? "noreferrer" : undefined}
                    >
                      {SubIcon && <SubIcon />}
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavItemBadge({ badge, label }: { badge?: NavBadge; label?: string }) {
  if (!badge) {
    return null;
  }

  const badgeLabels: Record<NavBadge, string> = {
    locked: "Terkunci",
    new: "Baru",
    soon: "Segera",
  };

  return (
    <SidebarMenuBadge
      className={cn(
        "top-1/2! -translate-y-1/2 gap-1 rounded-full border-2 px-1.5 font-bold font-mono text-[11px] uppercase tracking-wide",
        badge === "locked" && "border-ink/40 text-sidebar-foreground/80",
        badge === "new" && "border-ink bg-mint text-ink dark:text-ink-foreground",
        badge === "soon" && "border-ink/40 text-sidebar-foreground/80",
      )}
    >
      {badge === "locked" && <LockKeyhole aria-hidden="true" className="size-3" />}
      {badge === "locked" && <span className="sr-only">Terkunci, dibuka </span>}
      {label ?? badgeLabels[badge] ?? badge}
    </SidebarMenuBadge>
  );
}

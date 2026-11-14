"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

import { SETTINGS_SECTIONS } from "./settings-sections";

/** Section nav: scrollable tabs on small screens, sticky vertical list from lg up. */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bagian pengaturan" className="lg:sticky lg:top-6 lg:self-start">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {SETTINGS_SECTIONS.map(({ href, title, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "press flex items-center gap-2 whitespace-nowrap rounded-lg border-2 px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-ink bg-card text-foreground shadow-brutal-sm"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";
import { Moon, Sun } from "lucide-react";
import { createPortal } from "react-dom";

import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

/**
 * Two-state light/dark toggle shared by the dashboard header and /karya.
 * Flips relative to what is on screen, so a stored "system" preference never makes a click look dead.
 */
export function ThemeToggle({ floating = false, className }: { floating?: boolean; className?: string }) {
  const resolvedThemeMode = usePreferencesStore((state) => state.resolvedThemeMode);
  const setPreference = usePreferencesStore((state) => state.setPreference);
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedThemeMode === "dark";

  useEffect(() => setMounted(true), []);

  const button = (
    <button
      type="button"
      onClick={() => {
        const currentlyDark = document.documentElement.classList.contains("dark");
        setPreference("theme_mode", currentlyDark ? "light" : "dark");
      }}
      aria-label={isDark ? "Gunakan mode terang" : "Gunakan mode gelap"}
      className={cn(
        "press btn-loud inline-flex items-center justify-center rounded-full bg-card text-ink focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        floating ? "fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 size-11" : "size-9",
        className,
      )}
    >
      {/* Icons follow the applied .dark class, so there is no flash before hydration. */}
      <Sun className="hidden size-5 text-mint dark:block" aria-hidden="true" />
      <Moon className="block size-5 dark:hidden" aria-hidden="true" />
    </button>
  );

  if (!floating) return button;
  // Floating variant renders into <body> so page transforms don't trap it.
  return mounted ? createPortal(button, document.body) : null;
}

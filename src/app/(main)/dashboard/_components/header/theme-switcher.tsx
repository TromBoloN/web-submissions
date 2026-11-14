"use client";

import { Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

export function ThemeSwitcher() {
  const { resolvedThemeMode, setPreference } = usePreferencesStore(
    useShallow((state) => ({
      resolvedThemeMode: state.resolvedThemeMode,
      setPreference: state.setPreference,
    })),
  );

  const isDark = resolvedThemeMode === "dark";

  const toggleTheme = () => {
    // Read the applied class so a stored "system" preference flips relative to what the user actually sees.
    const currentlyDark = document.documentElement.classList.contains("dark");
    setPreference("theme_mode", currentlyDark ? "light" : "dark");
  };

  return (
    <Button size="icon" onClick={toggleTheme} aria-label={isDark ? "Gunakan mode terang" : "Gunakan mode gelap"}>
      {/* Icons follow the applied .dark class to avoid a hydration flash. */}
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}

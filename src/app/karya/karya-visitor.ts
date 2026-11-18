"use client";

// Per-visitor gallery state kept only in this browser: saved projects ("Simpan"), projects
// already opened ("Dilihat"), and whether the intro animation has played. Nothing is sent
// to the server, and every access is guarded because storage can be blocked or unavailable.

import { useCallback, useEffect, useState } from "react";

const SAVED_KEY = "karya:saved:v1";
const SEEN_KEY = "karya:seen:v1";
const INTRO_KEY = "karya:intro-seen:v1";

function readList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, values: Iterable<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify([...values]));
  } catch {
    // Storage unavailable (private mode, blocked): keep working in memory only.
  }
}

export function hasSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberIntroSeen() {
  try {
    window.localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // ignore
  }
}

export function useKaryaVisitor() {
  const [saved, setSaved] = useState<ReadonlySet<string>>(() => new Set());
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  // False until storage is read after mount, so server and first client render match.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(new Set(readList(SAVED_KEY)));
    setSeen(new Set(readList(SEEN_KEY)));
    setReady(true);
  }, []);

  const toggleSaved = useCallback((slug: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      writeList(SAVED_KEY, next);
      return next;
    });
  }, []);

  const markSeen = useCallback((slug: string) => {
    setSeen((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      writeList(SEEN_KEY, next);
      return next;
    });
  }, []);

  return { saved, seen, ready, toggleSaved, markSeen };
}

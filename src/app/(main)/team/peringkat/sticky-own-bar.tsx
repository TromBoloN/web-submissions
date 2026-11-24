"use client";

import { useEffect, useState } from "react";

import { ArrowDown, ArrowUp } from "lucide-react";

import { formatScore, HERO_ID, jumpToMyRow, MY_ROW_ID, type RankingRow } from "./ranking-shared";

/**
 * Bottom bar with the team's own rank, shown only while both the hero and the team's own row/card are
 * off-screen. Tapping it jumps to the row. Nothing renders on the server or without JS.
 */
export function StickyOwnBar({ own }: { own: RankingRow }) {
  const [heroVisible, setHeroVisible] = useState(true);
  const [rowVisible, setRowVisible] = useState(true);
  const [rowAbove, setRowAbove] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const hero = document.getElementById(HERO_ID);
    const row = document.getElementById(MY_ROW_ID);
    const observers: IntersectionObserver[] = [];

    const watch = (
      el: HTMLElement | null,
      set: (visible: boolean) => void,
      onEntry?: (e: IntersectionObserverEntry) => void,
    ) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          set(entry.isIntersecting);
          onEntry?.(entry);
        },
        { threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    };
    watch(hero, setHeroVisible);
    watch(row, setRowVisible, (entry) => setRowAbove(entry.boundingClientRect.top < 0));

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  if (heroVisible || rowVisible) return null;

  const label = own.score === null ? "Finalis" : `#${own.rank}`;

  return (
    <div
      className="rank-sticky-in pointer-events-none fixed inset-x-4 z-40 flex justify-center"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={jumpToMyRow}
        className="btn-loud press pointer-events-auto inline-flex max-w-full items-center gap-3 rounded-full bg-card px-4 py-2 text-ink shadow-brutal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Posisi tim Anda: ${own.score === null ? "finalis" : `peringkat ${own.rank}`}. Lihat di daftar`}
      >
        <span className="rounded-full border-2 border-ink bg-mint px-2 py-0.5 font-bold font-mono text-[11px] text-ink uppercase tracking-wider dark:text-ink-foreground">
          Anda
        </span>
        <span className="font-display font-extrabold text-lg tabular-nums">{label}</span>
        {own.score !== null && (
          <span className="font-mono text-muted-foreground text-xs tabular-nums">{formatScore(own.score)}</span>
        )}
        <span className="inline-flex items-center gap-1 font-semibold text-sm">
          Lihat
          {rowAbove ? (
            <ArrowUp className="size-4" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-4" aria-hidden="true" />
          )}
        </span>
      </button>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { FlaskConical } from "lucide-react";

export type RankingRow = {
  rank: number;
  team_name: string;
  /** Every team's institution (null-tolerant in the UI in case it is ever empty). */
  institution: string | null;
  stage: string;
  score: number | null;
  is_own_team: boolean;
};

export const MY_ROW_ID = "peringkat-tim-saya";
export const HERO_ID = "peringkat-hero";

const scoreFormatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatScore(score: number | null): string {
  if (score === null || Number.isNaN(Number(score))) return "-";
  return scoreFormatter.format(Number(score));
}

/** A team without a score yet (finalist before final scores exist) has no meaningful position. */
export function rankLabel(row: RankingRow): string {
  return row.score === null ? "–" : String(row.rank);
}

export function stageLabel(stage: string): string {
  return stage === "final" ? "Babak final" : "Babak awal";
}

/** Teams strictly below this rank (ties do not count as beaten). */
export function rowsBehind(rank: number, total: number): number {
  return Math.max(0, total - rank);
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-card px-3 py-1 font-bold font-mono text-[11px] text-ink uppercase tracking-wider shadow-brutal-sm">
      <span className="size-2 rounded-full bg-mint" aria-hidden="true" />
      {children}
    </span>
  );
}

export function ProvisionalPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-amber-300 px-3 py-1 font-bold font-mono text-[11px] text-ink uppercase tracking-wider shadow-brutal-sm dark:bg-amber-400 dark:text-ink-foreground">
      <FlaskConical className="size-3" aria-hidden="true" />
      Sementara
    </span>
  );
}

export function OwnChip() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border-2 border-ink bg-mint px-2 py-0.5 font-bold font-mono text-[11px] text-ink uppercase tracking-wider dark:text-ink-foreground">
      Tim Anda
    </span>
  );
}

export type HexTone = "mint" | "accent" | "card" | "gold" | "silver" | "bronze";

export function RankHex({ label, tone, className }: { label: string; tone: HexTone; className?: string }) {
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} aria-hidden="true">
      <span className="hex absolute inset-0 bg-ink" />
      <span
        className={cn(
          "hex absolute inset-[3px] grid place-items-center font-display font-extrabold tabular-nums",
          tone === "mint" && "bg-mint text-ink dark:text-ink-foreground",
          tone === "accent" && "bg-guardian-accent text-white",
          tone === "card" && "bg-card text-ink",
          tone === "gold" && "bg-medal-gold text-ink dark:text-ink-foreground",
          tone === "silver" && "bg-medal-silver text-ink dark:text-ink-foreground",
          tone === "bronze" && "bg-medal-bronze text-ink dark:text-ink-foreground",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function ScoreBar({ score }: { score: number | null }) {
  const width = score === null ? 0 : Math.min(Math.max(Number(score), 0), 100);
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <span className="block h-full rounded-full bg-guardian-accent" style={{ width: `${width}%` }} />
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="shrink-0 font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
        {children}
      </h2>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

/** Scrolls to the team's own row/card, focuses it, and pulses a highlight ring around it. */
export function jumpToMyRow() {
  const el = document.getElementById(MY_ROW_ID);
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
  // Restart the pulse if it is already running; the class removes itself when the animation ends.
  el.classList.remove("highlight-pulse");
  void el.offsetWidth;
  el.classList.add("highlight-pulse");
  el.addEventListener("animationend", () => el.classList.remove("highlight-pulse"), { once: true });
}

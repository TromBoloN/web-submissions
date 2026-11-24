"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import { cn } from "cn";

import { formatScore, MY_ROW_ID, OwnChip, type RankingRow, rankLabel, ScoreBar, SectionLabel } from "./ranking-shared";

type RevealState = "idle" | "pending" | "shown";

/**
 * Rows fade in, staggered, the first time the list scrolls into view. Starts "idle" (visible), so
 * without JS or before mount nothing is hidden; only lists still below the fold go "pending".
 */
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setState("shown");
      return;
    }
    setState("pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, state };
}

function FinalistChip() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ink/40 px-2 py-0.5 font-bold font-mono text-[10px] text-ink uppercase tracking-wider">
      <span className="hex size-2 bg-mint" aria-hidden="true" />
      Finalis
    </span>
  );
}

export function RankingList({ title, rows }: { title: string; rows: RankingRow[] }) {
  const { ref, state } = useRevealOnScroll<HTMLOListElement>();
  if (rows.length === 0) return null;

  return (
    <section aria-label={title} className="space-y-3">
      <SectionLabel>{title}</SectionLabel>
      <ol ref={ref} className="stagger-list space-y-2" data-reveal={state === "idle" ? undefined : state}>
        {rows.map((row, index) => {
          const isFinalist = row.stage === "final";
          return (
            <li
              key={`${row.rank}-${row.team_name}`}
              id={row.is_own_team ? MY_ROW_ID : undefined}
              tabIndex={row.is_own_team ? -1 : undefined}
              aria-current={row.is_own_team ? "true" : undefined}
              style={{ "--i": index } as CSSProperties}
              className={cn(
                "relative flex items-center gap-3 rounded-xl border bg-card px-3 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:px-4",
                row.is_own_team ? "border-2 border-ink bg-mint/10 shadow-brutal-sm" : "hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg border-2 font-display font-bold tabular-nums",
                  "border-ink/30 text-ink",
                  isFinalist && "border-ink bg-mint/15",
                  row.is_own_team && "border-ink bg-mint dark:text-ink-foreground",
                )}
              >
                {rankLabel(row)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="min-w-0 break-words font-semibold text-sm">{row.team_name}</p>
                  {isFinalist && <FinalistChip />}
                  {row.is_own_team && <OwnChip />}
                </div>
                {row.institution && <p className="break-words text-muted-foreground text-xs">{row.institution}</p>}
              </div>
              <div className="w-20 shrink-0 space-y-1 text-right sm:w-32">
                <p className="font-display font-bold text-sm tabular-nums sm:text-base">{formatScore(row.score)}</p>
                <ScoreBar score={row.score} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

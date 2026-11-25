"use client";

import type { CSSProperties } from "react";

import { cn } from "cn";
import { Crown, Medal, Trophy } from "lucide-react";

import {
  formatScore,
  type HexTone,
  MY_ROW_ID,
  OwnChip,
  RankHex,
  type RankingRow,
  SectionLabel,
} from "./ranking-shared";
import { useCountUp } from "./use-count-up";

type MedalKind = "gold" | "silver" | "bronze";

const MEDAL_BY_RANK: Record<number, MedalKind> = { 1: "gold", 2: "silver", 3: "bronze" };

const MEDAL_STYLE: Record<
  MedalKind,
  { title: string; icon: typeof Trophy; step: string; stepHeight: string; bar: string }
> = {
  gold: {
    title: "Juara 1",
    icon: Trophy,
    step: "bg-medal-gold-soft",
    stepHeight: "h-28",
    bar: "bg-medal-gold",
  },
  silver: {
    title: "Juara 2",
    icon: Medal,
    step: "bg-medal-silver-soft",
    stepHeight: "h-20",
    bar: "bg-medal-silver",
  },
  bronze: {
    title: "Juara 3",
    icon: Medal,
    step: "bg-medal-bronze-soft",
    stepHeight: "h-14",
    bar: "bg-medal-bronze",
  },
};

/** Desktop order 2-1-3 and entrance order 3rd, 2nd, 1st. */
const LAYOUT: Record<MedalKind, { order: string; delayMs: number }> = {
  silver: { order: "sm:order-1", delayMs: 250 },
  gold: { order: "sm:order-2", delayMs: 500 },
  bronze: { order: "sm:order-3", delayMs: 0 },
};

/** Lead over the next scored team below in the same stage, e.g. "+0,51 dari #2". */
function leadLabel(row: RankingRow, all: RankingRow[]): string | null {
  if (row.score === null) return null;
  const below = all.find((r) => r.rank > row.rank && r.score !== null && r.stage === row.stage);
  if (!below || below.score === null) return null;
  return `+${formatScore(row.score - below.score)} dari #${below.rank}`;
}

function PodiumCard({ row, medal, lead }: { row: RankingRow; medal: MedalKind; lead: string | null }) {
  const style = MEDAL_STYLE[medal];
  const layout = LAYOUT[medal];
  const Icon = style.icon;
  // Scores count up after the card has risen.
  const scoreShown = useCountUp(row.score ?? 0, { durationMs: 1200, delayMs: layout.delayMs + 300 });

  return (
    <li
      className={cn("podium-rise flex min-w-0 flex-col", layout.order)}
      style={{ "--delay": `${layout.delayMs}ms` } as CSSProperties}
    >
      <article
        id={row.is_own_team ? MY_ROW_ID : undefined}
        tabIndex={row.is_own_team ? -1 : undefined}
        aria-current={row.is_own_team ? "true" : undefined}
        aria-label={`${style.title}: ${row.team_name}`}
        className={cn(
          "surface-loud relative flex flex-col items-center gap-2 overflow-hidden p-4 pt-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        // .surface-loud is unlayered CSS, so Tailwind border utilities cannot override it; inline style can.
        style={{ borderTopWidth: 8, borderTopColor: `var(--medal-${medal})` }}
      >
        {row.is_own_team && <span className="podium-spotlight" aria-hidden="true" />}

        {/* In normal flow (not absolute) so the card's rounded border never clips it. */}
        {medal === "gold" && (
          <Crown
            aria-hidden="true"
            className="team-pop relative -mb-1 size-7 shrink-0 fill-medal-gold text-ink"
            style={{ animationDelay: `${layout.delayMs + 500}ms` }}
          />
        )}
        <div className="relative mt-2 grid place-items-center">
          {/* The dashed ring extends 9px outside the hex; mt-2 keeps it clear of the crown/top border. */}
          <span
            className={cn("medal-ring", medal === "gold" && "medal-ring--spin")}
            style={{ "--ring": `var(--medal-${medal})` } as CSSProperties}
            aria-hidden="true"
          />
          <RankHex label={String(row.rank)} tone={medal as HexTone} className="size-14 text-xl" />
        </div>

        <span className="relative inline-flex items-center gap-1 font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
          <Icon className="size-3.5 text-ink" aria-hidden="true" />
          {style.title}
        </span>
        <p className="relative w-full break-words font-display font-bold text-base leading-tight">{row.team_name}</p>
        {row.institution && (
          <p className="relative w-full break-words text-muted-foreground text-xs">{row.institution}</p>
        )}

        <p className="relative font-display font-extrabold text-3xl text-ink tabular-nums">
          <span className="sr-only">{formatScore(row.score)}</span>
          <span aria-hidden="true">{row.score === null ? "-" : formatScore(scoreShown)}</span>
        </p>
        <span className="relative block h-2 w-full max-w-44 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span
            className={cn("rank-bar-fill rank-bar-grow block h-full rounded-full", style.bar)}
            style={
              {
                "--to": Math.min(Math.max(Number(row.score ?? 0), 0), 100) / 100,
                "--delay": `${layout.delayMs + 300}ms`,
              } as CSSProperties
            }
          />
        </span>

        <div className="relative flex min-h-6 flex-wrap items-center justify-center gap-1.5">
          {lead && (
            <span className="rounded-full border-2 border-ink bg-card px-2 py-0.5 font-bold font-mono text-[11px] text-ink tabular-nums">
              {lead}
            </span>
          )}
          {row.is_own_team && <OwnChip />}
        </div>
      </article>

      {/* Step block (desktop only): heights 1 > 2 > 3 so the cards stand on a podium. */}
      <div
        className={cn("podium-step mt-3 hidden items-center justify-center sm:flex", style.step, style.stepHeight)}
        aria-hidden="true"
      >
        <span className="podium-step-numeral text-5xl">{row.rank}</span>
      </div>
    </li>
  );
}

/**
 * Top 3 podium: cards on stepped bases (2-1-3 on desktop, stacked 1-2-3 on mobile), medal hex with a
 * dashed ring (spinning for #1), staggered 3rd → 2nd → 1st entrance, score count-up and lead chips.
 */
export function RankingPodium({ rows, all }: { rows: RankingRow[]; all: RankingRow[] }) {
  return (
    <section aria-label="Tiga besar" className="space-y-4">
      <SectionLabel>Tiga besar</SectionLabel>
      <ol className="grid gap-4 pt-6 sm:grid-cols-3 sm:items-end">
        {rows.map((row) => {
          const medal = MEDAL_BY_RANK[row.rank] ?? "bronze";
          return <PodiumCard key={`${row.rank}-${row.team_name}`} row={row} medal={medal} lead={leadLabel(row, all)} />;
        })}
      </ol>
    </section>
  );
}

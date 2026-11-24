"use client";

import type { CSSProperties } from "react";

import { cn } from "cn";
import { Crosshair, Crown } from "lucide-react";

import { CelebrationLayer } from "./celebration-layer";
import {
  Eyebrow,
  formatScore,
  jumpToMyRow,
  ProvisionalPill,
  type RankingRow,
  rowsBehind,
  stageLabel,
} from "./ranking-shared";
import { hasCeremony, type RankTier, rankTier, TIER_ACCENT, TIER_STAMP } from "./ranking-tier";
import { useCountUp } from "./use-count-up";

const TIER_MESSAGE: Record<RankTier, string> = {
  gold: "Selamat! Tim Anda meraih juara pertama.",
  silver: "Selamat! Tim Anda meraih juara kedua.",
  bronze: "Selamat! Tim Anda meraih juara ketiga.",
  finalist: "Selamat! Tim Anda termasuk finalis terbaik.",
  top10: "Luar biasa! Tim Anda masuk 10 besar.",
  top25: "Hebat! Tim Anda masuk 25% teratas.",
  base: "Terima kasih telah berjuang. Setiap karya adalah langkah untuk tumbuh.",
};

const BAR_FILL: Record<RankTier, string> = {
  gold: "bg-medal-gold",
  silver: "bg-medal-silver",
  bronze: "bg-medal-bronze",
  finalist: "bg-mint",
  top10: "bg-mint",
  top25: "bg-mint",
  base: "bg-mint",
};

/** Delay (ms) before stamps pop: after the rank/score count-up has mostly finished. */
const STAMP_DELAY_MS = 1300;

/**
 * Gap to the neighbour that matters, only within the same stage (final vs preliminary averages
 * are not comparable). #1 compares with the next place below; others with the nearest place above.
 */
function neighbourGap(own: RankingRow, rows: RankingRow[]): string | null {
  if (own.score === null) return null;
  const sameStage = rows.filter((r) => r.score !== null && r.stage === own.stage && !r.is_own_team);
  if (own.rank === 1) {
    const below = sameStage.find((r) => r.rank > own.rank);
    if (!below || below.score === null) return null;
    return `Unggul ${formatScore(own.score - below.score)} poin dari #${below.rank}`;
  }
  const above = sameStage.filter((r) => r.rank < own.rank).at(-1);
  if (!above || above.score === null) return null;
  return `Selisih ${formatScore(above.score - own.score)} poin dari #${above.rank}`;
}

function NoRankHero({ provisional }: { provisional: boolean }) {
  return (
    <section
      aria-label="Posisi tim"
      className="surface-loud guardian-hero-mesh rank-fade-in overflow-hidden p-5 sm:p-7"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>Peringkat akhir</Eyebrow>
          {provisional && <ProvisionalPill />}
        </div>
        <h1 className="team-hero-title">Peringkat</h1>
        <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
          Tim Anda tidak tercantum dalam peringkat karena belum mengirim submission atau tidak memenuhi syarat
          penilaian. Berikut urutan seluruh tim peserta.
        </p>
      </div>
    </section>
  );
}

function OwnHero({
  own,
  rows,
  total,
  provisional,
  revealDone,
}: {
  own: RankingRow;
  rows: RankingRow[];
  total: number;
  provisional: boolean;
  revealDone: boolean;
}) {
  const tier = rankTier(own, total);
  const ceremony = hasCeremony(tier);
  const accent = TIER_ACCENT[tier];
  const stamp = TIER_STAMP[tier];
  const hasScore = own.score !== null;

  const teamsBehind = hasScore ? rowsBehind(own.rank, total) : 0;
  const topPercent = hasScore ? Math.max(1, Math.ceil((own.rank / total) * 100)) : null;
  const beatRatio = total > 1 ? teamsBehind / (total - 1) : 1;
  const gap = ceremony ? neighbourGap(own, rows) : null;

  // The rank only "counts" for ceremony tiers, and only from 10 downwards: never from the total.
  const rankShown = useCountUp(own.rank, {
    from: Math.max(own.rank, Math.min(10, total)),
    durationMs: 1100,
    enabled: revealDone && ceremony && hasScore,
  });
  const scoreShown = useCountUp(own.score ?? 0, { durationMs: 1400, enabled: revealDone && hasScore });
  const behindShown = useCountUp(teamsBehind, { durationMs: 1400, enabled: revealDone && hasScore });

  return (
    <section
      aria-label="Posisi tim"
      className="surface-loud guardian-hero-mesh rank-fade-in relative overflow-hidden p-5 sm:p-7"
    >
      <CelebrationLayer tier={tier} active={revealDone} />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>Peringkat akhir</Eyebrow>
            {provisional && <ProvisionalPill />}
          </div>
          <p className="font-bold font-mono text-[11px] text-hero-fg uppercase tracking-wider">
            Tim Anda berada di peringkat
          </p>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="relative">
              {tier === "gold" && revealDone && (
                <Crown
                  aria-hidden="true"
                  className="team-pop absolute -top-7 left-1 size-8 fill-medal-gold text-ink sm:-top-8 sm:size-9"
                  style={{ animationDelay: `${STAMP_DELAY_MS - 200}ms` }}
                />
              )}
              <h1
                className={cn(
                  "font-display font-extrabold text-7xl text-hero-fg tabular-nums leading-none sm:text-8xl",
                  accent && `rank-number--${accent}`,
                )}
              >
                <span className="sr-only">{hasScore ? `Peringkat ${own.rank} dari ${total} tim` : "Finalis"}</span>
                <span aria-hidden="true">{hasScore ? `#${Math.round(rankShown)}` : "Finalis"}</span>
              </h1>
            </div>
            <span
              className="pb-1.5 font-display font-semibold text-hero-fg-muted text-lg sm:text-xl"
              aria-hidden="true"
            >
              dari {total} tim
            </span>
            {stamp && revealDone && (
              <span
                className={cn("team-stamp mb-2 ml-1 text-xs sm:text-sm", accent && `team-stamp--${accent}`)}
                style={{ animationDelay: `${ceremony ? STAMP_DELAY_MS : 500}ms` }}
              >
                {stamp}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="break-words font-display font-bold text-hero-fg text-lg sm:text-xl">{own.team_name}</p>
            {own.institution && <p className="break-words text-hero-fg-muted text-sm">{own.institution}</p>}
          </div>
          <p className="max-w-xl font-medium text-hero-fg text-sm">{TIER_MESSAGE[tier]}</p>

          <button
            type="button"
            onClick={jumpToMyRow}
            className="btn-loud press inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 font-semibold text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Crosshair className="size-4" aria-hidden="true" />
            Lihat posisi di daftar
          </button>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 lg:w-80 lg:shrink-0">
          <div
            className={cn(
              "rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm",
              tier === "base" && "col-span-2",
            )}
          >
            <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Nilai</p>
            <p className="font-display font-extrabold text-2xl text-ink tabular-nums">
              <span className="sr-only">{formatScore(own.score)}</span>
              <span aria-hidden="true">{hasScore ? formatScore(scoreShown) : "-"}</span>
            </p>
            <p className="text-muted-foreground text-xs">{stageLabel(own.stage)}</p>
          </div>

          {tier !== "base" && (
            <div className="rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
              <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Posisi</p>
              <p className="font-display font-extrabold text-2xl text-ink tabular-nums">
                {topPercent === null ? "-" : `Top ${topPercent}%`}
              </p>
              <p className="text-muted-foreground text-xs">dari seluruh tim</p>
            </div>
          )}

          {hasScore && teamsBehind > 0 && (
            <div className="col-span-2 rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
                  Unggul dari
                </p>
                <p className="font-display font-bold text-ink text-sm tabular-nums">
                  <span className="sr-only">{teamsBehind} tim</span>
                  <span aria-hidden="true">{Math.round(behindShown)} tim</span>
                </p>
              </div>
              <span className="block h-3 overflow-hidden rounded-full border-2 border-ink bg-muted" aria-hidden="true">
                <span
                  className={cn("rank-bar-fill block h-full", revealDone && "rank-bar-grow", BAR_FILL[tier])}
                  style={{ "--to": beatRatio } as CSSProperties}
                />
              </span>
            </div>
          )}

          {gap && (
            <p className="col-span-2 w-fit rounded-full border-2 border-ink bg-card px-3 py-1 font-bold font-mono text-[11px] text-ink tabular-nums shadow-brutal-sm">
              {gap}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Ranking hero, tiered by the team's place (see ranking-tier.ts). `revealDone` gates the count-ups,
 * stamps and particles so they start after the reveal intro (Step 6); without an intro it is true.
 */
export function RankingHero({
  own,
  rows,
  provisional,
  revealDone = true,
}: {
  own: RankingRow | undefined;
  rows: RankingRow[];
  provisional: boolean;
  revealDone?: boolean;
}) {
  if (!own) return <NoRankHero provisional={provisional} />;
  return <OwnHero own={own} rows={rows} total={rows.length} provisional={provisional} revealDone={revealDone} />;
}

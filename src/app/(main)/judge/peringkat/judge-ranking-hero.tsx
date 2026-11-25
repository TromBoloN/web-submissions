"use client";

import { Crown, Gavel } from "lucide-react";

import {
  Eyebrow,
  formatScore,
  HERO_ID,
  HERO_TITLE_ID,
  ProvisionalPill,
  RankHex,
  type RankingRow,
  stageLabel,
} from "@/app/(main)/_components/ranking/ranking-shared";
import { APP_CONFIG } from "@/config/app-config";
import type { Database } from "@/types/database";

type JudgeStage = Database["public"]["Enums"]["judge_stage_type"] | null;

const STAGE_TEXT: Record<NonNullable<JudgeStage>, string> = {
  preliminary: "Babak awal",
  final: "Babak final",
  both: "Babak awal & final",
};

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
      <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">{label}</p>
      <p className="break-words font-display font-extrabold text-2xl text-ink tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

/**
 * Judge-facing hero for the published ranking: a thank-you, the champion, and the judge's own
 * contribution (counts of their own submitted scores only; never other judges' data).
 */
export function JudgeRankingHero({
  rows,
  provisional,
  judgeName,
  judgeStage,
  scoredPreliminary,
  scoredFinal,
}: {
  rows: RankingRow[];
  provisional: boolean;
  judgeName: string;
  judgeStage: JudgeStage;
  scoredPreliminary: number | null;
  scoredFinal: number | null;
}) {
  const stage = judgeStage ?? "preliminary";
  const judgesPreliminary = stage === "preliminary" || stage === "both";
  const judgesFinal = stage === "final" || stage === "both";

  const countsKnown = (!judgesPreliminary || scoredPreliminary !== null) && (!judgesFinal || scoredFinal !== null);
  const scoredTotal = (judgesPreliminary ? (scoredPreliminary ?? 0) : 0) + (judgesFinal ? (scoredFinal ?? 0) : 0);
  const scoredHint =
    stage === "both" && countsKnown ? `Babak awal ${scoredPreliminary} · Final ${scoredFinal}` : STAGE_TEXT[stage];

  const champions = rows.filter((row) => row.rank === 1 && row.score !== null);
  const finalistCount = rows.filter((row) => row.stage === "final").length;

  return (
    <section
      aria-labelledby={HERO_TITLE_ID}
      id={HERO_ID}
      className="surface-loud guardian-hero-mesh rank-fade-in relative overflow-hidden p-5 sm:p-7"
    >
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>Peringkat akhir</Eyebrow>
            {provisional && <ProvisionalPill />}
          </div>
          <p className="inline-flex items-center gap-1.5 font-bold font-mono text-[11px] text-hero-fg uppercase tracking-wider">
            <Gavel className="size-3.5" aria-hidden="true" />
            Dewan juri {APP_CONFIG.name}
          </p>
          <h1 id={HERO_TITLE_ID} tabIndex={-1} className="team-hero-title break-words outline-none">
            Terima kasih, {judgeName}.
          </h1>
          <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
            Penilaian Anda ikut menentukan hasil kompetisi ini. Berikut peringkat akhir seluruh tim peserta.
          </p>

          {champions.length > 0 && (
            <div className="flex max-w-xl items-center gap-3 rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
              <RankHex label="1" tone="gold" className="size-12 text-lg" />
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
                  <Crown className="size-3.5 fill-medal-gold text-ink" aria-hidden="true" />
                  {champions.length > 1 ? "Juara bersama" : "Juara"}
                </p>
                {champions.map((row) => (
                  <div key={row.team_name} className="min-w-0">
                    <p className="break-words font-display font-bold text-ink text-lg">{row.team_name}</p>
                    {row.institution && <p className="break-words text-muted-foreground text-xs">{row.institution}</p>}
                  </div>
                ))}
                <p className="text-muted-foreground text-xs tabular-nums">
                  Nilai {formatScore(champions[0].score)} · {stageLabel(champions[0].stage)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-3 lg:w-80 lg:shrink-0">
          <div className="col-span-2">
            <StatTile label="Tim yang Anda nilai" value={countsKnown ? `${scoredTotal} tim` : "-"} hint={scoredHint} />
          </div>
          <StatTile label="Tim peserta" value={String(rows.length)} hint="dalam peringkat" />
          <StatTile label="Finalis" value={String(finalistCount)} hint="babak final" />
        </div>
      </div>
    </section>
  );
}

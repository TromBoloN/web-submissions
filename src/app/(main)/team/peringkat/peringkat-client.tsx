"use client";

import { cn } from "cn";
import { FlaskConical, Medal, Trophy } from "lucide-react";

import { RankingHero } from "./ranking-hero";
import {
  formatScore,
  MY_ROW_ID,
  OwnChip,
  RankHex,
  type RankingRow,
  rankLabel,
  ScoreBar,
  SectionLabel,
} from "./ranking-shared";

export type { RankingRow } from "./ranking-shared";

const PODIUM_STYLE = [
  { tone: "mint" as const, icon: Trophy, order: "sm:order-2", lift: "sm:pb-8 sm:pt-6", title: "Juara 1" },
  { tone: "accent" as const, icon: Medal, order: "sm:order-1", lift: "", title: "Juara 2" },
  { tone: "accent" as const, icon: Medal, order: "sm:order-3", lift: "", title: "Juara 3" },
];

function Podium({ rows }: { rows: RankingRow[] }) {
  return (
    <section aria-label="Tiga besar" className="space-y-3">
      <SectionLabel>Tiga besar</SectionLabel>
      <ol className="grid gap-4 sm:grid-cols-3 sm:items-end">
        {rows.map((row, index) => {
          const style = PODIUM_STYLE[index];
          const Icon = style.icon;
          return (
            <li
              key={`${row.rank}-${row.team_name}`}
              id={row.is_own_team ? MY_ROW_ID : undefined}
              tabIndex={row.is_own_team ? -1 : undefined}
              className={cn(
                "surface-loud flex flex-col items-center gap-2 p-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring",
                style.order,
                style.lift,
                row.is_own_team && "bg-mint/10",
              )}
            >
              <RankHex label={String(row.rank)} tone={style.tone} className="size-14 text-xl" />
              <span className="inline-flex items-center gap-1 font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
                <Icon className="size-3.5 text-guardian-accent" aria-hidden="true" />
                {style.title}
              </span>
              <p className="w-full break-words font-display font-bold text-base leading-tight">{row.team_name}</p>
              {row.institution && <p className="w-full break-words text-muted-foreground text-xs">{row.institution}</p>}
              <p className="font-display font-extrabold text-2xl text-ink tabular-nums">{formatScore(row.score)}</p>
              <div className="w-full max-w-40">
                <ScoreBar score={row.score} />
              </div>
              {row.is_own_team && <OwnChip />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RankList({ title, rows }: { title: string; rows: RankingRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <SectionLabel>{title}</SectionLabel>
      <ol className="space-y-2">
        {rows.map((row) => (
          <li
            key={`${row.rank}-${row.team_name}`}
            id={row.is_own_team ? MY_ROW_ID : undefined}
            tabIndex={row.is_own_team ? -1 : undefined}
            aria-current={row.is_own_team ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card px-3 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:px-4",
              row.is_own_team ? "border-2 border-ink bg-mint/10 shadow-brutal-sm" : "hover:bg-muted/40",
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg border-2 font-display font-bold tabular-nums",
                row.is_own_team ? "border-ink bg-mint text-ink dark:text-ink-foreground" : "border-ink/30 text-ink",
              )}
            >
              {rankLabel(row)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="min-w-0 break-words font-semibold text-sm">{row.team_name}</p>
                {row.is_own_team && <OwnChip />}
              </div>
              {row.institution && <p className="break-words text-muted-foreground text-xs">{row.institution}</p>}
            </div>
            <div className="w-20 shrink-0 space-y-1 text-right sm:w-32">
              <p className="font-display font-bold text-sm tabular-nums sm:text-base">{formatScore(row.score)}</p>
              <ScoreBar score={row.score} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PeringkatClient({ rows, provisional }: { rows: RankingRow[]; provisional: boolean }) {
  const own = rows.find((row) => row.is_own_team);
  const podium = rows.filter((row) => row.score !== null && row.rank <= 3).slice(0, 3);
  const podiumSet = new Set(podium);
  const rest = rows.filter((row) => !podiumSet.has(row));
  const finalists = rest.filter((row) => row.stage === "final");
  const others = rest.filter((row) => row.stage !== "final");

  return (
    <div className="space-y-8">
      <RankingHero own={own} rows={rows} provisional={provisional} />

      {provisional && (
        <p className="surface-calm flex items-start gap-2 p-3 text-muted-foreground text-xs">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Ini peringkat sementara: hasil babak final belum dirilis resmi, sehingga urutan dapat berubah.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="surface-calm p-6 text-center text-muted-foreground text-sm">Peringkat belum tersedia.</p>
      ) : (
        <>
          {podium.length > 0 && <Podium rows={podium} />}
          <RankList title="Finalis · nilai babak final" rows={finalists} />
          <RankList title="Babak awal · nilai babak awal" rows={others} />
          <p className="text-center text-muted-foreground text-xs italic">
            Nilai adalah rata-rata total berbobot dari dewan juri. Keputusan dewan juri bersifat mutlak sesuai Juknis.
          </p>
        </>
      )}
    </div>
  );
}

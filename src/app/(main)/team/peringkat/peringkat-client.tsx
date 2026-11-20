"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { Crosshair, FlaskConical, Medal, Trophy } from "lucide-react";

export type RankingRow = {
  rank: number;
  team_name: string;
  institution: string;
  stage: string;
  score: number | null;
  is_own_team: boolean;
};

const MY_ROW_ID = "peringkat-tim-saya";

const scoreFormatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatScore(score: number | null): string {
  if (score === null || Number.isNaN(Number(score))) return "-";
  return scoreFormatter.format(Number(score));
}

/** A team without a score yet (finalist before final scores exist) has no meaningful position. */
function rankLabel(row: RankingRow): string {
  return row.score === null ? "–" : String(row.rank);
}

function stageLabel(stage: string): string {
  return stage === "final" ? "Babak final" : "Babak awal";
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-card px-3 py-1 font-bold font-mono text-[11px] text-ink uppercase tracking-wider shadow-brutal-sm">
      <span className="size-2 rounded-full bg-mint" aria-hidden="true" />
      {children}
    </span>
  );
}

function ProvisionalPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-amber-300 px-3 py-1 font-bold font-mono text-[11px] text-ink uppercase tracking-wider shadow-brutal-sm dark:bg-amber-400 dark:text-ink-foreground">
      <FlaskConical className="size-3" aria-hidden="true" />
      Sementara
    </span>
  );
}

function OwnChip() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border-2 border-ink bg-mint px-2 py-0.5 font-bold font-mono text-[11px] text-ink uppercase tracking-wider dark:text-ink-foreground">
      Tim Anda
    </span>
  );
}

type HexTone = "mint" | "accent" | "card";

function RankHex({ label, tone, className }: { label: string; tone: HexTone; className?: string }) {
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} aria-hidden="true">
      <span className="hex absolute inset-0 bg-ink" />
      <span
        className={cn(
          "hex absolute inset-[3px] grid place-items-center font-display font-extrabold tabular-nums",
          tone === "mint" && "bg-mint text-ink dark:text-ink-foreground",
          tone === "accent" && "bg-guardian-accent text-white",
          tone === "card" && "bg-card text-ink",
        )}
      >
        {label}
      </span>
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  const width = score === null ? 0 : Math.min(Math.max(Number(score), 0), 100);
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <span className="block h-full rounded-full bg-guardian-accent" style={{ width: `${width}%` }} />
    </span>
  );
}

function jumpToMyRow() {
  const el = document.getElementById(MY_ROW_ID);
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

function Hero({ own, total, provisional }: { own: RankingRow | undefined; total: number; provisional: boolean }) {
  if (!own) {
    return (
      <section aria-label="Posisi tim" className="surface-loud guardian-hero-mesh overflow-hidden p-5 sm:p-7">
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

  const hasScore = own.score !== null;
  const teamsBehind = hasScore ? rowsBehind(own.rank, total) : 0;
  const topPercent = hasScore ? Math.max(1, Math.ceil((own.rank / total) * 100)) : null;
  const beatPercent = total > 1 ? (teamsBehind / (total - 1)) * 100 : 100;

  return (
    <section aria-label="Posisi tim" className="surface-loud guardian-hero-mesh overflow-hidden p-5 sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>Peringkat akhir</Eyebrow>
            {provisional && <ProvisionalPill />}
          </div>
          <p className="font-bold font-mono text-[11px] text-hero-fg uppercase tracking-wider">
            Tim Anda berada di peringkat
          </p>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <h1 className="team-pop font-display font-extrabold text-7xl text-hero-fg tabular-nums leading-none sm:text-8xl">
              <span className="sr-only">Peringkat </span>
              {hasScore ? `#${own.rank}` : "Finalis"}
            </h1>
            <span className="pb-1.5 font-display font-semibold text-hero-fg-muted text-lg sm:text-xl">
              dari {total} tim
            </span>
          </div>
          <div className="min-w-0">
            <p className="break-words font-display font-bold text-hero-fg text-lg sm:text-xl">{own.team_name}</p>
            <p className="break-words text-hero-fg-muted text-sm">{own.institution}</p>
          </div>
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
          <div className="rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
            <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Nilai</p>
            <p className="font-display font-extrabold text-2xl text-ink tabular-nums">{formatScore(own.score)}</p>
            <p className="text-muted-foreground text-xs">{stageLabel(own.stage)}</p>
          </div>
          <div className="rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
            <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Posisi</p>
            <p className="font-display font-extrabold text-2xl text-ink tabular-nums">
              {topPercent === null ? "-" : `Top ${topPercent}%`}
            </p>
            <p className="text-muted-foreground text-xs">dari seluruh tim</p>
          </div>
          {hasScore && total > 1 && (
            <div className="col-span-2 rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
                  Unggul dari
                </p>
                <p className="font-display font-bold text-ink text-sm tabular-nums">{teamsBehind} tim</p>
              </div>
              <span className="block h-3 overflow-hidden rounded-full border-2 border-ink bg-muted" aria-hidden="true">
                <span className="block h-full bg-mint" style={{ width: `${beatPercent}%` }} />
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Teams strictly below this rank (ties do not count as beaten). */
function rowsBehind(rank: number, total: number): number {
  return Math.max(0, total - rank);
}

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
              <p className="w-full break-words text-muted-foreground text-xs">{row.institution}</p>
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="shrink-0 font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
        {children}
      </h2>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
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
              <p className="break-words text-muted-foreground text-xs">{row.institution}</p>
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
      <Hero own={own} total={rows.length} provisional={provisional} />

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

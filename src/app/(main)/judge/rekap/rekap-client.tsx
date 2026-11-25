"use client";

import { useState } from "react";

import { Download, Lock, Printer, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatWitaDateOnly, formatWitaDateTime } from "@/lib/csv";
import { getRubricForStage, type ScoringStage } from "@/lib/rubric";
import { buildScoreMarkdown } from "@/lib/score-markdown";

export interface RecapScore {
  stage: ScoringStage;
  team_code: string;
  team_name: string;
  scores: Record<string, number | null>;
  total_weighted_score: number | null;
  feedback: string | null;
  private_note: string | null;
  status: "draft" | "final";
  locked_at: string | null;
  updated_at: string;
}

export interface RecapRecusal {
  stage: string;
  team_code: string;
  team_name: string;
  reason: string;
}

const STAGE_LABEL: Record<ScoringStage, string> = { preliminary: "Babak Awal", final: "Final" };

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  dateStyle: "medium",
  timeStyle: "short",
});

function formatWita(iso: string | null): string {
  return iso ? `${dateFormatter.format(new Date(iso))} WITA` : "-";
}

function formatScore(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : Number(value).toFixed(2);
}

function downloadMarkdown(stage: ScoringStage, judgeName: string, scores: RecapScore[]) {
  const markdown = buildScoreMarkdown({
    stage,
    generatedAt: formatWitaDateTime(new Date().toISOString()),
    formatDate: formatWitaDateTime,
    ownRecap: true,
    teams: scores
      .filter((s) => s.stage === stage && s.status === "final")
      .map((s) => ({
        rank: null,
        team_code: s.team_code,
        team_name: s.team_name,
        avg_score: null,
        judges: [
          {
            judge_name: judgeName,
            scores: s.scores,
            total_weighted_score: s.total_weighted_score,
            feedback: s.feedback,
            updated_at: s.updated_at,
          },
        ],
      })),
  });
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `rekap-penilaian-${stage}-${formatWitaDateOnly(new Date())}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

function ScoreCard({ item }: { item: RecapScore }) {
  const rubric = getRubricForStage(item.stage);
  return (
    <article className="surface-calm break-inside-avoid space-y-4 p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-muted-foreground text-xs">{item.team_code}</p>
          <h3 className="break-words font-display font-semibold text-lg">{item.team_name}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={item.status === "final" ? "default" : "secondary"}>
            {item.status === "final" ? "Terkirim" : "Draf"}
          </Badge>
          {item.locked_at && (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" aria-hidden="true" />
              Terkunci
            </Badge>
          )}
        </div>
      </header>

      <table className="w-full text-sm">
        <caption className="sr-only">Nilai per kriteria untuk {item.team_name}</caption>
        <tbody>
          {rubric.map((c) => (
            <tr key={c.column} className="border-border border-b">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal text-muted-foreground">
                {c.label} <span className="text-xs">({c.weight}%)</span>
              </th>
              <td className="py-1.5 text-right tabular-nums">{formatScore(item.scores[c.column])}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="pt-2 pr-3 text-left font-semibold">
              Total berbobot
            </th>
            <td className="pt-2 text-right font-semibold tabular-nums">{formatScore(item.total_weighted_score)}</td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-1">
        <p className="font-medium text-sm">Masukan untuk tim</p>
        <p className="whitespace-pre-wrap break-words text-muted-foreground text-sm">
          {item.feedback?.trim() || "Tidak ada masukan."}
        </p>
      </div>
      {item.private_note?.trim() && (
        <div className="space-y-1">
          <p className="font-medium text-sm">Catatan pribadi (tidak terlihat oleh tim)</p>
          <p className="whitespace-pre-wrap break-words text-muted-foreground text-sm">{item.private_note}</p>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Terakhir diperbarui {formatWita(item.updated_at)}
        {item.locked_at && ` · dikunci ${formatWita(item.locked_at)}`}
      </p>
    </article>
  );
}

function StageRecap({
  stage,
  scores,
  recusals,
}: {
  stage: ScoringStage;
  scores: RecapScore[];
  recusals: RecapRecusal[];
}) {
  const own = scores.filter((s) => s.stage === stage);
  const recused = recusals.filter((r) => r.stage === stage);

  return (
    <div className="space-y-4">
      {own.length === 0 ? (
        <p className="surface-calm p-6 text-center text-muted-foreground text-sm">
          Belum ada penilaian pada {STAGE_LABEL[stage].toLowerCase()}.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 print:block print:space-y-4">
          {own.map((item) => (
            <ScoreCard key={`${item.stage}-${item.team_code}`} item={item} />
          ))}
        </div>
      )}

      {recused.length > 0 && (
        <section className="surface-calm space-y-2 p-4" aria-label="Recusal">
          <h3 className="flex items-center gap-2 font-semibold text-sm">
            <UserX className="size-4" aria-hidden="true" />
            Tim yang tidak Anda nilai (recusal)
          </h3>
          <ul className="space-y-1 text-sm">
            {recused.map((r) => (
              <li key={r.team_code} className="break-words">
                <span className="font-mono text-muted-foreground text-xs">{r.team_code}</span> {r.team_name}
                <span className="text-muted-foreground"> · {r.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function RekapClient({
  judgeName,
  stages,
  scores,
  recusals,
}: {
  judgeName: string;
  stages: ScoringStage[];
  scores: RecapScore[];
  recusals: RecapRecusal[];
}) {
  const [active, setActive] = useState<ScoringStage>(stages[0]);
  const hasFinalScores = scores.some((s) => s.stage === active && s.status === "final");

  return (
    <div className="receipt-print space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-semibold text-2xl tracking-tight">Rekap Penilaian Saya</h1>
          <p className="text-muted-foreground text-sm">
            Arsip nilai dan masukan yang Anda berikan, {judgeName}. Hanya Anda yang dapat melihat halaman ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Cetak / PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasFinalScores}
            onClick={() => downloadMarkdown(active, judgeName, scores)}
          >
            <Download aria-hidden="true" />
            Unduh .md
          </Button>
        </div>
      </div>

      {stages.length > 1 ? (
        <Tabs value={active} onValueChange={(v) => setActive(v as ScoringStage)}>
          <TabsList className="print:hidden">
            {stages.map((s) => (
              <TabsTrigger key={s} value={s}>
                {STAGE_LABEL[s]}
              </TabsTrigger>
            ))}
          </TabsList>
          {stages.map((s) => (
            <TabsContent key={s} value={s} className="mt-4">
              <StageRecap stage={s} scores={scores} recusals={recusals} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <StageRecap stage={active} scores={scores} recusals={recusals} />
      )}
    </div>
  );
}

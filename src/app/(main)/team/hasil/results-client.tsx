"use client";

import { Award, Info, MessageSquareQuote, Sparkles } from "lucide-react";

import { type RubricBarItem, RubricBars } from "@/components/rubric-bars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FINAL_RUBRIC, PRELIMINARY_RUBRIC, type RubricCriterion } from "@/lib/rubric";

export type CriterionResult = {
  key: string;
  average: number | null;
};

export type StageResult = {
  judge_count: number;
  criteria: CriterionResult[];
  total: number | null;
  comments: string[];
};

export type TeamResultsData = {
  status: "ok" | "disqualified" | "no_submission";
  is_disqualified: boolean;
  is_finalist: boolean;
  preliminary: StageResult | null;
  final: StageResult | null;
};

export interface ResultsClientProps {
  results: TeamResultsData;
}

const idScoreFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatScore(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  return idScoreFormatter.format(val);
}

function ScoreGauge({ score }: { score: number | null }) {
  const value = score === null ? 0 : Math.min(Math.max(score, 0), 100);
  const circumference = 2 * Math.PI * 44;

  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg aria-hidden="true" className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle className="stroke-muted" cx="50" cy="50" fill="none" r="44" strokeWidth="7" />
        <circle
          className="stroke-primary"
          cx="50"
          cy="50"
          fill="none"
          r="44"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (value / 100) * circumference}
          strokeLinecap="round"
          strokeWidth="7"
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-bold font-display text-foreground text-xl tabular-nums">{formatScore(score)}</p>
        <p className="text-muted-foreground text-xs">dari 100</p>
      </div>
    </div>
  );
}

function getInsight(criteria: CriterionResult[], rubricMap: Map<string, RubricCriterion>) {
  const scoredCriteria = criteria.filter(
    (item): item is CriterionResult & { average: number } => item.average !== null,
  );
  if (scoredCriteria.length === 0) return null;

  const strongest = scoredCriteria.reduce((current, item) => (item.average > current.average ? item : current));
  const weakest = scoredCriteria.reduce((current, item) => (item.average < current.average ? item : current));

  return {
    strongest: rubricMap.get(strongest.key)?.label ?? strongest.key,
    strongestScore: formatScore(strongest.average),
    weakest: rubricMap.get(weakest.key)?.label ?? weakest.key,
    weakestScore: formatScore(weakest.average),
  };
}

function StageResultsView({
  stage,
  stageTitle,
  stageData,
}: {
  stage: "preliminary" | "final";
  stageTitle: string;
  stageData: StageResult;
}) {
  const rubricList: readonly RubricCriterion[] = stage === "preliminary" ? PRELIMINARY_RUBRIC : FINAL_RUBRIC;
  const rubricMap = new Map(rubricList.map((c) => [c.column, c]));
  const insight = getInsight(stageData.criteria, rubricMap);
  const rubricBars: RubricBarItem[] = stageData.criteria.map((item) => {
    const criterion = rubricMap.get(item.key);
    return {
      id: item.key,
      label: criterion?.label ?? item.key,
      score: item.average,
      weight: criterion?.weight,
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Hero Score Card */}
      <Card className="gap-0 border-primary/15 bg-primary/5">
        <CardHeader className="pb-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 font-medium text-primary text-xs">
              Nilai Akhir {stageTitle}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <ScoreGauge score={stageData.total} />
            <div className="min-w-0 space-y-3">
              <p className="text-muted-foreground text-sm">Rata-rata total berbobot dari seluruh dewan juri.</p>
              {insight && (
                <p className="rounded-lg bg-background/70 px-3 py-2 text-foreground text-sm">
                  <Sparkles aria-hidden="true" className="mr-1.5 inline size-4 text-primary" />
                  Paling kuat:{" "}
                  <strong>
                    {insight.strongest} {insight.strongestScore}
                  </strong>
                  <span className="text-muted-foreground"> · </span>
                  Perlu ditingkatkan:{" "}
                  <strong>
                    {insight.weakest} {insight.weakestScore}
                  </strong>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Criterion Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="size-4 text-primary" />
            Rincian Nilai per Kriteria
          </CardTitle>
          <CardDescription>Tabel penilaian kriteria berdasarkan rubrik evaluasi resmi MIT-WEEK 2026.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Kriteria</TableHead>
                  <TableHead className="min-w-[220px]">Indikator Penilaian</TableHead>
                  <TableHead className="text-right">Nilai Rata-rata</TableHead>
                  <TableHead className="text-right">Bobot</TableHead>
                  <TableHead className="text-right">Kontribusi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stageData.criteria.map((item) => {
                  const criterionMeta = rubricMap.get(item.key);
                  const label = criterionMeta?.label ?? item.key;
                  const indicator = criterionMeta?.indicator ?? "-";
                  const weight = criterionMeta?.weight ?? 0;
                  const contribution = item.average !== null ? (item.average * weight) / 100 : null;

                  return (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium text-foreground">{label}</TableCell>
                      <TableCell className="text-foreground/80 text-sm leading-relaxed">{indicator}</TableCell>
                      <TableCell className="min-w-32 text-right">
                        <div className="space-y-1.5">
                          <span className="block text-sm tabular-nums">{formatScore(item.average)}</span>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(Math.max(item.average ?? 0, 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{weight}%</TableCell>
                      <TableCell className="text-right font-semibold text-sm tabular-nums">
                        {formatScore(contribution)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold text-foreground">
                    Total Nilai Berbobot (Basis Data)
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs tabular-nums">-</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">100%</TableCell>
                  <TableCell className="text-right font-bold text-base text-primary tabular-nums">
                    {formatScore(stageData.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="md:hidden">
            <RubricBars items={rubricBars} />
          </div>

          <p className="text-muted-foreground text-xs italic leading-normal">
            * Kontribusi dihitung dari (Nilai Rata-rata × Bobot / 100). Total nilai yang ditampilkan berasal langsung
            dari agregat resmi skor berbobot juri pada basis data.
          </p>
        </CardContent>
      </Card>

      {/* 3. Comments List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareQuote className="size-4 text-primary" />
            Masukan & Catatan Juri
          </CardTitle>
          <CardDescription>
            Kompilasi umpan balik anonim dari dewan juri untuk perbaikan dan pengembangan karya Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageData.comments.length > 0 ? (
            <div className="space-y-3">
              {stageData.comments.map((comment, index) => (
                <div key={comment} className="space-y-1.5 rounded-lg border bg-muted/20 p-4">
                  <span className="font-medium text-[11px] text-muted-foreground">Catatan #{index + 1}</span>
                  <p className="whitespace-pre-wrap break-words text-foreground text-sm leading-relaxed">{comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <MessageSquareQuote aria-hidden="true" className="size-6 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                Belum ada masukan tertulis dari dewan juri untuk babak ini.
              </p>
            </div>
          )}

          <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-center text-muted-foreground text-xs italic">
            Keputusan dewan juri bersifat mutlak sesuai Juknis.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResultsClient({ results }: ResultsClientProps) {
  const showFinalTab = results.is_finalist && Boolean(results.final);
  const defaultTab = results.preliminary ? "preliminary" : "final";

  const renderContent = () => {
    if (showFinalTab && results.preliminary && results.final) {
      return (
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="preliminary">Babak Awal</TabsTrigger>
            <TabsTrigger value="final">Babak Final</TabsTrigger>
          </TabsList>
          <TabsContent value="preliminary">
            <StageResultsView stage="preliminary" stageTitle="Babak Awal" stageData={results.preliminary} />
          </TabsContent>
          <TabsContent value="final">
            <StageResultsView stage="final" stageTitle="Babak Final" stageData={results.final} />
          </TabsContent>
        </Tabs>
      );
    }

    if (results.preliminary) {
      return <StageResultsView stage="preliminary" stageTitle="Babak Awal" stageData={results.preliminary} />;
    }

    if (results.final) {
      return <StageResultsView stage="final" stageTitle="Babak Final" stageData={results.final} />;
    }

    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">Hasil penilaian belum tersedia.</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-2xl tracking-tight">Hasil Penilaian</h1>
        <p className="text-muted-foreground text-sm">
          Hasil evaluasi, rata-rata kriteria, dan masukan anonim dewan juri kompetisi MIT-WEEK 2026.
        </p>
      </div>

      <Card
        className={results.is_finalist ? "border-emerald-500/30 bg-emerald-500/10" : "gap-0 border-border bg-muted/50"}
      >
        <CardContent className="flex items-start gap-3 px-4 py-3">
          {results.is_finalist ? (
            <Award aria-hidden="true" className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-300" />
          ) : (
            <Info aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
          )}
          <div>
            <h2 className="font-semibold">{results.is_finalist ? "Lolos Top 5" : "Belum lolos"}</h2>
            <p className="mt-0.5 text-foreground/80 text-sm">
              {results.is_finalist
                ? "Selamat, tim Anda melanjutkan ke babak final."
                : "Terima kasih telah mengikuti babak awal MIT-WEEK 2026."}
            </p>
          </div>
        </CardContent>
      </Card>

      {renderContent()}
    </div>
  );
}

"use client";

import { Award, MessageSquareQuote } from "lucide-react";

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

  return (
    <div className="space-y-6">
      {/* 1. Hero Score Card */}
      <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 font-medium text-primary text-xs">
              Nilai Akhir {stageTitle}
            </Badge>
            <span className="text-muted-foreground text-xs">Dinilai oleh {stageData.judge_count} juri</span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold font-mono text-4xl text-primary tracking-tight sm:text-5xl">
                {stageData.total !== null ? stageData.total.toFixed(2) : "-"}
              </span>
              <span className="font-mono text-muted-foreground text-sm">/ 100</span>
            </div>
            <p className="text-muted-foreground text-xs">Rata-rata total berbobot dari seluruh dewan juri</p>
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
                    <TableCell className="text-muted-foreground text-xs leading-relaxed">{indicator}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.average !== null ? item.average.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{weight}%</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-sm">
                      {contribution !== null ? contribution.toFixed(2) : "-"}
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
                <TableCell className="text-right font-mono text-muted-foreground text-xs">-</TableCell>
                <TableCell className="text-right font-mono font-semibold">100%</TableCell>
                <TableCell className="text-right font-bold font-mono text-base text-primary">
                  {stageData.total !== null ? stageData.total.toFixed(2) : "-"}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          <p className="text-[11px] text-muted-foreground italic leading-normal">
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
            <p className="py-6 text-center text-muted-foreground text-sm italic">
              Belum ada masukan tertulis yang dicatat oleh dewan juri untuk babak ini.
            </p>
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
        <h1 className="font-semibold text-2xl tracking-tight">Hasil Penilaian</h1>
        <p className="text-muted-foreground text-sm">
          Hasil evaluasi, rata-rata kriteria, dan masukan anonim dewan juri kompetisi MIT-WEEK 2026.
        </p>
      </div>

      {renderContent()}
    </div>
  );
}

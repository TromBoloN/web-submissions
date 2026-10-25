"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { AlertTriangle, Award, CheckCircle2, Clock, Download, Eye, Info, Lock, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FINAL_RUBRIC, PRELIMINARY_RUBRIC } from "@/lib/rubric";

export interface JudgeProgress {
  judge_id: string;
  judge_name: string;
  judge_stage: "preliminary" | "final" | "both";
  prelim_completed: number;
  prelim_total: number;
  final_completed: number;
  final_total: number;
  is_incomplete: boolean;
}

export interface RankingRow {
  rank: number | null;
  team_id: string;
  team_code: string;
  team_name: string;
  judges_count: number;
  avg_score: number | null;
}

export interface JudgeScoreDetail {
  judge_id: string;
  judge_name: string;
  functionality_score: number;
  case_study_fit_score: number;
  ui_ux_score: number;
  code_quality_score: number;
  documentation_score: number;
  presentation_qa_score?: number;
  total_weighted_score: number | null;
  feedback: string | null;
  updated_at: string;
  locked_at: string | null;
}

interface RankingClientProps {
  judgesProgress: JudgeProgress[];
  prelimRanking: RankingRow[];
  finalRanking: RankingRow[];
  prelimBreakdown: Record<string, JudgeScoreDetail[]>;
  finalBreakdown: Record<string, JudgeScoreDetail[]>;
}

function formatWitaDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)} WITA`;
}

function getStageLabel(stage: JudgeProgress["judge_stage"]): string {
  if (stage === "both") return "Babak Awal & Final";
  if (stage === "final") return "Babak Final";
  return "Babak Awal";
}

function PrelimRankBadge({ rank, isTop5 }: { rank: number | null; isTop5: boolean }) {
  if (rank === 1) {
    return <Badge className="bg-amber-500 font-bold text-white hover:bg-amber-500">#1</Badge>;
  }
  if (rank === 2) {
    return <Badge className="bg-slate-400 font-bold text-white hover:bg-slate-400">#2</Badge>;
  }
  if (rank === 3) {
    return <Badge className="bg-amber-700 font-bold text-white hover:bg-amber-700">#3</Badge>;
  }
  if (isTop5 && rank !== null) {
    return (
      <Badge variant="outline" className="border-primary font-bold text-primary">
        #{rank}
      </Badge>
    );
  }
  return <span className="font-mono text-muted-foreground pl-2">{rank ?? "-"}</span>;
}

function FinalRankBadge({ rank }: { rank: number | null }) {
  if (rank === 1) {
    return <Badge className="bg-amber-500 font-bold text-white hover:bg-amber-500">Juara 1</Badge>;
  }
  if (rank === 2) {
    return <Badge className="bg-slate-400 font-bold text-white hover:bg-slate-400">Juara 2</Badge>;
  }
  if (rank === 3) {
    return <Badge className="bg-amber-700 font-bold text-white hover:bg-amber-700">Juara 3</Badge>;
  }
  return <span className="font-mono text-muted-foreground pl-2">#{rank ?? "-"}</span>;
}

export function RankingClient({
  judgesProgress,
  prelimRanking,
  finalRanking,
  prelimBreakdown,
  finalBreakdown,
}: RankingClientProps) {
  const [selectedTeam, setSelectedTeam] = useState<{
    team_id: string;
    team_code: string;
    team_name: string;
    tahap: "preliminary" | "final";
  } | null>(null);

  // Check if judges_count differs across teams
  const prelimJudgesCounts = useMemo(
    () => prelimRanking.map((r) => r.judges_count).filter((c) => c > 0),
    [prelimRanking],
  );
  const prelimHasJudgesDiscrepancy =
    prelimJudgesCounts.length > 0 && Math.min(...prelimJudgesCounts) !== Math.max(...prelimJudgesCounts);

  const finalJudgesCounts = useMemo(() => finalRanking.map((r) => r.judges_count).filter((c) => c > 0), [finalRanking]);
  const finalHasJudgesDiscrepancy =
    finalJudgesCounts.length > 0 && Math.min(...finalJudgesCounts) !== Math.max(...finalJudgesCounts);

  // Check if ties exist near the cutoff of 5 in preliminary round
  const prelimTiesNearCutoff = useMemo(() => {
    const top5 = prelimRanking.filter((r) => r.rank !== null && r.rank <= 5);
    const rank5Count = prelimRanking.filter((r) => r.rank === 5).length;
    if (rank5Count > 1 || top5.length > 5) return true;

    const teamAt5 = prelimRanking.find((r) => r.rank === 5);
    const teamAt6 = prelimRanking.find((r) => r.rank === 6);
    if (teamAt5 && teamAt6 && teamAt5.avg_score !== null && teamAt5.avg_score === teamAt6.avg_score) {
      return true;
    }
    return false;
  }, [prelimRanking]);

  // Breakdown data for the selected team
  const currentBreakdown = useMemo(() => {
    if (!selectedTeam) return [];
    const source = selectedTeam.tahap === "preliminary" ? prelimBreakdown : finalBreakdown;
    return source[selectedTeam.team_id] ?? [];
  }, [selectedTeam, prelimBreakdown, finalBreakdown]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Peringkat & Hasil Penilaian</h1>
        <p className="text-muted-foreground text-sm">
          Pantau progres penilaian juri, hasil pemeringkatan babak awal dan final, serta rincian nilai per tim.
        </p>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Progres Penilaian Juri</CardTitle>
              <CardDescription>
                Jumlah tim yang telah dinilai oleh masing-masing juri aktif dibandingkan target tim yang memenuhi
                syarat.
              </CardDescription>
            </div>
            {judgesProgress.some((j) => j.is_incomplete) ? (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 text-xs">
                <Clock className="mr-1.5 size-3.5" />
                Penilaian Belum Lengkap
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 text-xs">
                <CheckCircle2 className="mr-1.5 size-3.5" />
                Seluruh Juri Selesai
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {judgesProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada juri aktif yang terdaftar dalam sistem.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {judgesProgress.map((judge) => {
                const stageLabel = getStageLabel(judge.judge_stage);

                return (
                  <div key={judge.judge_id} className="space-y-3 rounded-lg border p-4 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm leading-tight">{judge.judge_name}</p>
                        <p className="text-muted-foreground text-xs">{stageLabel}</p>
                      </div>
                      {judge.is_incomplete ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[11px]">
                          Belum selesai
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[11px]">
                          Lengkap
                        </Badge>
                      )}
                    </div>

                    {(judge.judge_stage === "preliminary" || judge.judge_stage === "both") && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Babak Awal:</span>
                          <span className="font-medium font-mono">
                            {judge.prelim_completed} / {judge.prelim_total} tim
                          </span>
                        </div>
                        <Progress
                          value={
                            judge.prelim_total > 0 ? Math.round((judge.prelim_completed / judge.prelim_total) * 100) : 0
                          }
                          className="h-1.5"
                        />
                      </div>
                    )}

                    {(judge.judge_stage === "final" || judge.judge_stage === "both") && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Babak Final:</span>
                          <span className="font-medium font-mono">
                            {judge.final_completed} / {judge.final_total} tim
                          </span>
                        </div>
                        <Progress
                          value={
                            judge.final_total > 0 ? Math.round((judge.final_completed / judge.final_total) * 100) : 0
                          }
                          className="h-1.5"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking Tabs */}
      <Tabs defaultValue="preliminary" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="preliminary">Babak Awal ({prelimRanking.length})</TabsTrigger>
            <TabsTrigger value="final">Babak Final ({finalRanking.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Babak Awal */}
        <TabsContent value="preliminary" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground text-sm">
              Menampilkan rata-rata skor berbobot dari juri untuk babak penyisihan. 5 tim teratas ditandai.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/tim">
                  <Users className="mr-2 size-4" />
                  Tetapkan finalis
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/peringkat/export?tahap=preliminary" download>
                  <Download className="mr-2 size-4" />
                  Ekspor CSV Babak Awal
                </a>
              </Button>
            </div>
          </div>

          {prelimHasJudgesDiscrepancy && (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-semibold">Perhatian: Jumlah Juri Tidak Seragam</AlertTitle>
              <AlertDescription className="text-xs">
                Terdapat perbedaan jumlah juri yang menilai antar tim. Rata-rata skor mungkin belum sepenuhnya sebanding
                sebelum seluruh juri menyelesaikan penilaiannya.
              </AlertDescription>
            </Alert>
          )}

          {prelimTiesNearCutoff && (
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <Info className="size-4 text-primary" />
              <AlertTitle className="text-xs font-semibold">Catatan Batas Finalis</AlertTitle>
              <AlertDescription className="text-xs">
                Terdapat nilai seri (tie) di sekitar batas peringkat 5. Pertimbangkan penentuan finalis berdasarkan
                kriteria pemutus atau penilaian tambahan sebelum menetapkan finalis di halaman Tim.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Peringkat</TableHead>
                  <TableHead className="w-[120px]">Kode Tim</TableHead>
                  <TableHead>Nama Tim</TableHead>
                  <TableHead className="w-[120px] text-center">Jumlah Juri</TableHead>
                  <TableHead className="w-[140px] text-right">Rata-rata Skor</TableHead>
                  <TableHead className="w-[110px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prelimRanking.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-sm">
                      Belum ada nilai yang masuk untuk Babak Awal.
                    </TableCell>
                  </TableRow>
                ) : (
                  prelimRanking.map((row) => {
                    const isTop5 = row.rank !== null && row.rank <= 5;

                    return (
                      <TableRow key={row.team_id} className={isTop5 ? "bg-primary/[0.03] font-medium" : undefined}>
                        <TableCell>
                          <PrelimRankBadge rank={row.rank} isTop5={isTop5} />
                        </TableCell>
                        <TableCell className="font-mono font-medium">{row.team_code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{row.team_name}</span>
                            {isTop5 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                Top 5
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">{row.judges_count}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {row.avg_score !== null ? Number(row.avg_score).toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() =>
                              setSelectedTeam({
                                team_id: row.team_id,
                                team_code: row.team_code,
                                team_name: row.team_name,
                                tahap: "preliminary",
                              })
                            }
                          >
                            <Eye className="mr-1.5 size-3.5" />
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab Babak Final */}
        <TabsContent value="final" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground text-sm">
              Menampilkan rata-rata skor berbobot juri untuk babak final (hanya tim finalis).
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/peringkat/export?tahap=final" download>
                <Download className="mr-2 size-4" />
                Ekspor CSV Final
              </a>
            </Button>
          </div>

          {finalHasJudgesDiscrepancy && (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-semibold">Perhatian: Jumlah Juri Tidak Seragam</AlertTitle>
              <AlertDescription className="text-xs">
                Terdapat perbedaan jumlah juri yang menilai antar finalis. Rata-rata skor mungkin belum sepenuhnya
                sebanding sebelum seluruh juri menyelesaikan penilaiannya.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Peringkat</TableHead>
                  <TableHead className="w-[120px]">Kode Tim</TableHead>
                  <TableHead>Nama Tim</TableHead>
                  <TableHead className="w-[120px] text-center">Jumlah Juri</TableHead>
                  <TableHead className="w-[140px] text-right">Rata-rata Skor</TableHead>
                  <TableHead className="w-[110px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalRanking.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-sm">
                      Belum ada nilai yang masuk untuk Babak Final.
                    </TableCell>
                  </TableRow>
                ) : (
                  finalRanking.map((row) => (
                    <TableRow key={row.team_id}>
                      <TableCell>
                        <FinalRankBadge rank={row.rank} />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{row.team_code}</TableCell>
                      <TableCell className="font-medium">{row.team_name}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{row.judges_count}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {row.avg_score !== null ? Number(row.avg_score).toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() =>
                            setSelectedTeam({
                              team_id: row.team_id,
                              team_code: row.team_code,
                              team_name: row.team_name,
                              tahap: "final",
                            })
                          }
                        >
                          <Eye className="mr-1.5 size-3.5" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Per-team Breakdown Dialog */}
      <Dialog open={!!selectedTeam} onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="size-5 text-primary" />
              <span>Detail Penilaian:</span>
              <span className="font-mono text-primary">{selectedTeam?.team_code}</span>
              <span className="font-normal text-muted-foreground">- {selectedTeam?.team_name}</span>
            </DialogTitle>
            <DialogDescription>
              Rincian kriteria nilai dan masukan dari seluruh juri untuk tahap{" "}
              <strong>{selectedTeam?.tahap === "final" ? "Babak Final" : "Babak Awal"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {currentBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Belum ada juri yang memasukkan nilai untuk tim ini pada tahap ini.
              </p>
            ) : (
              currentBreakdown.map((score, idx) => {
                const rubric = selectedTeam?.tahap === "final" ? FINAL_RUBRIC : PRELIMINARY_RUBRIC;

                return (
                  <Card key={score.judge_id || idx} className="border shadow-none">
                    <CardHeader className="p-4 pb-2 bg-muted/30">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm">{score.judge_name}</p>
                            {score.locked_at && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300"
                              >
                                <Lock className="size-2.5" />
                                Terkunci
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Terakhir diubah: {formatWitaDateTime(score.updated_at)}
                          </p>
                          {score.locked_at && (
                            <p className="text-[11px] text-muted-foreground">
                              Dikunci: {formatWitaDateTime(score.locked_at)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Total Berbobot:</span>
                          <Badge variant="default" className="font-mono text-sm">
                            {score.total_weighted_score !== null ? Number(score.total_weighted_score).toFixed(2) : "-"}{" "}
                            / 100
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                        {rubric.map((crit) => {
                          let val: number | undefined;
                          if (crit.column === "functionality_score") val = score.functionality_score;
                          else if (crit.column === "case_study_fit_score") val = score.case_study_fit_score;
                          else if (crit.column === "ui_ux_score") val = score.ui_ux_score;
                          else if (crit.column === "code_quality_score") val = score.code_quality_score;
                          else if (crit.column === "documentation_score") val = score.documentation_score;
                          else if (crit.column === "presentation_qa_score") val = score.presentation_qa_score;

                          return (
                            <div key={crit.column} className="rounded border p-2 bg-background">
                              <p className="text-muted-foreground text-[11px] truncate" title={crit.label}>
                                {crit.label} ({crit.weight}%)
                              </p>
                              <p className="font-mono font-bold text-sm mt-0.5">
                                {val !== undefined ? Number(val).toFixed(2) : "-"}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Masukan Juri:</p>
                        <div className="rounded-md border bg-muted/40 p-2.5 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {score.feedback && score.feedback.trim() ? (
                            score.feedback
                          ) : (
                            <span className="text-muted-foreground italic">Tidak ada masukan tertulis dari juri.</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

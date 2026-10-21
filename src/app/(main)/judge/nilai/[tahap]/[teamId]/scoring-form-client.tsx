"use client";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";

import { ArrowLeft, Check, Code2, ExternalLink, Globe, Info, Save, Video } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calcWeightedTotal, getRubricForStage, type ScoringStage } from "@/lib/rubric";

import { saveScore } from "../../actions";

interface TeamData {
  id: string;
  team_code: string;
  team_name: string;
}

interface SubmissionData {
  github_url: string;
  live_demo_url: string;
  video_url: string;
}

interface ExistingScoreData {
  functionality_score: number;
  case_study_fit_score: number;
  ui_ux_score: number;
  code_quality_score: number;
  documentation_score: number;
  presentation_qa_score?: number;
  total_weighted_score: number;
  feedback: string | null;
  updated_at: string;
}

interface ScoringFormClientProps {
  tahap: ScoringStage;
  team: TeamData;
  submission: SubmissionData;
  initialScore: ExistingScoreData | null;
}

function formatTimestampWita(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)} WITA`;
}

function SafeExternalLink({ url, label, icon: Icon }: { url: string; label: string; icon: typeof Globe }) {
  const trimmed = url.trim();
  const isValidUrl = /^https?:\/\//i.test(trimmed);

  if (!trimmed) {
    return (
      <div className="flex items-center gap-2 rounded-md border p-3 text-muted-foreground text-sm">
        <Icon className="size-4 shrink-0 opacity-50" />
        <span className="font-medium text-xs text-muted-foreground">{label}:</span>
        <span className="text-xs">-</span>
      </div>
    );
  }

  if (!isValidUrl) {
    return (
      <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium text-xs">{label}:</span>
        <span className="truncate text-xs text-muted-foreground" title={trimmed}>
          {trimmed}
        </span>
      </div>
    );
  }

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-muted/50"
      title={trimmed}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="size-4 shrink-0 text-primary" />
        <span className="font-medium text-xs">{label}</span>
        <span className="truncate text-xs text-muted-foreground max-w-[200px] sm:max-w-xs">{trimmed}</span>
      </div>
      <ExternalLink className="size-3.5 shrink-0 opacity-70 ml-2" />
    </a>
  );
}

export function ScoringFormClient({ tahap, team, submission, initialScore }: ScoringFormClientProps) {
  const rubric = useMemo(() => getRubricForStage(tahap), [tahap]);

  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of rubric) {
      const existingVal = initialScore?.[c.column as keyof ExistingScoreData];
      initial[c.column] = existingVal !== undefined && existingVal !== null ? String(existingVal) : "";
    }
    return initial;
  });

  const [feedback, setFeedback] = useState(initialScore?.feedback ?? "");
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(
    initialScore ? Number(initialScore.total_weighted_score) : null,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialScore?.updated_at ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewTotal = useMemo(() => {
    return calcWeightedTotal(tahap, scores);
  }, [tahap, scores]);

  const handleScoreChange = (column: string, value: string) => {
    setScores((prev) => ({ ...prev, [column]: value }));
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate that every criterion is filled
    const numericScores: Record<string, number> = {};
    for (const c of rubric) {
      const valStr = scores[c.column]?.trim();
      if (!valStr) {
        setFormError(`Kriteria "${c.label}" wajib diisi.`);
        return;
      }
      const num = Number(valStr);
      if (Number.isNaN(num) || num < 0 || num > 100) {
        setFormError(`Nilai untuk "${c.label}" harus di antara 0 sampai 100.`);
        return;
      }
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(valStr)) {
        setFormError(`Nilai untuk "${c.label}" maksimal memiliki 2 angka di belakang koma.`);
        return;
      }
      numericScores[c.column] = num;
    }

    startTransition(async () => {
      const res = await saveScore({
        tahap,
        team_id: team.id,
        scores: numericScores,
        feedback: feedback.trim(),
      });

      if (!res.ok) {
        setFormError(res.message);
        toast.error(res.message);
        return;
      }

      setConfirmedTotal(res.total);
      setLastSavedAt(res.updatedAt);
      toast.success("Nilai berhasil disimpan.");
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" asChild className="size-8 -ml-2">
              <Link href="/judge">
                <ArrowLeft className="size-4" />
                <span className="sr-only">Kembali</span>
              </Link>
            </Button>
            <h1 className="font-semibold text-2xl font-mono">{team.team_code}</h1>
            <Badge variant={tahap === "final" ? "default" : "secondary"}>
              {tahap === "final" ? "Babak Final" : "Babak Awal"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm font-medium pl-6">{team.team_name}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild size="sm">
            <Link href="/judge">
              <ArrowLeft className="mr-1.5 size-3.5" />
              Kembali
            </Link>
          </Button>
        </div>
      </div>

      {/* Submission Links Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Berkas Submission Tim</CardTitle>
          <CardDescription>
            Buka dan pelajari tautan karya peserta di tab baru sebelum memberikan penilaian.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <SafeExternalLink url={submission.github_url} label="Repositori GitHub" icon={Code2} />
          <SafeExternalLink url={submission.live_demo_url} label="Live Demo" icon={Globe} />
          <SafeExternalLink url={submission.video_url} label="Video Demo" icon={Video} />
        </CardContent>
      </Card>

      {/* Scoring Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="text-lg">Formulir Penilaian Rubrik</CardTitle>
                <CardDescription>
                  Masukkan nilai skala 0–100 untuk setiap kriteria. Total berbobot akan dihitung secara otomatis.
                </CardDescription>
              </div>
              {lastSavedAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Tersimpan: {formatTimestampWita(lastSavedAt)}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {rubric.map((criterion) => {
                const val = scores[criterion.column] ?? "";
                return (
                  <div key={criterion.column} className="space-y-1.5 rounded-lg border p-3.5 bg-card">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`score-${criterion.column}`} className="font-medium text-sm">
                        {criterion.label}
                      </Label>
                      <Badge variant="outline" className="text-xs font-mono">
                        Bobot {criterion.weight}%
                      </Badge>
                    </div>
                    <Input
                      id={`score-${criterion.column}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      value={val}
                      onChange={(e) => handleScoreChange(criterion.column, e.target.value)}
                      className="font-mono text-base"
                      required
                    />
                  </div>
                );
              })}
            </div>

            {/* Feedback / Notes */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="judge-feedback" className="font-medium text-sm">
                  Masukan & Catatan Juri
                </Label>
                <span className="text-xs text-muted-foreground">{feedback.length} / 2000 karakter</span>
              </div>
              <Textarea
                id="judge-feedback"
                placeholder="Berikan masukan konstruktif untuk karya tim ini (opsional)..."
                rows={4}
                maxLength={2000}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {/* Total Weighted Preview */}
            <div className="rounded-lg border bg-muted/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-medium text-sm flex items-center gap-1.5">
                  <Info className="size-4 text-primary" />
                  Total Berbobot (Pratinjau)
                </p>
                <p className="text-xs text-muted-foreground">
                  Dihitung otomatis dari rubrik. Nilai resmi disimpan setelah Anda mengklik tombol simpan.
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-3xl font-mono text-primary">{previewTotal.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground font-mono">/ 100</span>
              </div>
            </div>

            {confirmedTotal !== null && (
              <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                <span>Nilai tersimpan di database:</span>
                <span className="font-bold font-mono text-sm">{confirmedTotal.toFixed(2)}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="outline" type="button" asChild>
              <Link href="/judge">Kembali</Link>
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              <Save className="size-4" />
              {isPending ? "Menyimpan..." : "Simpan nilai"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

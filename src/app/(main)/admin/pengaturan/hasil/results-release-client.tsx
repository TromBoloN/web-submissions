"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

import { updateResultsRelease } from "../actions";

export type StageJudgingProgress = {
  totalJudges: number;
  completedJudges: number;
  incompleteJudges: number;
  totalExpectedScores: number;
  completedScores: number;
  isAllCompleted: boolean;
  eligibleTeamsCount: number;
};

export type JudgingProgressStats = {
  preliminary: StageJudgingProgress;
  final: StageJudgingProgress;
};

type Stage = "preliminary" | "final";

const STAGE_COPY: Record<Stage, { label: string; description: string; criteria: string }> = {
  preliminary: {
    label: "Babak Awal",
    description: "Peserta dapat melihat rata-rata nilai kriteria, total nilai, dan masukan anonim babak awal.",
    criteria: "Fungsionalitas, Kesesuaian studi kasus, UI/UX, Kualitas kode, Dokumentasi",
  },
  final: {
    label: "Babak Final",
    description: "Finalis dapat melihat rata-rata nilai kriteria, total nilai, dan masukan anonim babak final.",
    criteria: "Fungsionalitas, Kesesuaian studi kasus, UI/UX, Kualitas kode, Dokumentasi, Presentasi & Tanya Jawab",
  },
};

function StageReleaseRow({
  stage,
  released,
  progress,
  disabled,
  onRequestToggle,
}: {
  stage: Stage;
  released: boolean;
  progress: StageJudgingProgress;
  disabled: boolean;
  onRequestToggle: (stage: Stage, target: boolean) => void;
}) {
  const copy = STAGE_COPY[stage];
  const switchId = `switch-${stage}-release`;
  const percent =
    progress.totalExpectedScores > 0 ? Math.round((progress.completedScores / progress.totalExpectedScores) * 100) : 0;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={switchId} className="cursor-pointer font-semibold text-base">
              {copy.label}
            </Label>
            {released ? (
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs">
                Dirilis
              </Badge>
            ) : (
              <Badge variant="outline" className="border-muted text-muted-foreground text-xs">
                Nonaktif
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{copy.description}</p>
        </div>
        <Switch
          id={switchId}
          checked={released}
          onCheckedChange={(checked) => onRequestToggle(stage, checked)}
          disabled={disabled}
          className="mt-1"
        />
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:justify-between sm:gap-3">
          <span className="text-muted-foreground">Progres penilaian juri</span>
          <span className="font-medium font-mono tabular-nums">
            {progress.completedScores} / {progress.totalExpectedScores} penilaian ({progress.completedJudges} dari{" "}
            {progress.totalJudges} juri selesai)
          </span>
        </div>
        <Progress value={percent} className="h-2" aria-label={`Progres penilaian ${copy.label}`} />
        {progress.incompleteJudges > 0 ? (
          <p className="flex items-start gap-1.5 text-amber-600 text-xs dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {progress.incompleteJudges} juri belum menyelesaikan penilaian {copy.label.toLowerCase()}. Hasil tetap
              dapat dirilis.
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-emerald-600 text-xs dark:text-emerald-400">
            <CheckCircle2 className="size-3.5 shrink-0" />
            Seluruh juri {copy.label.toLowerCase()} telah menyelesaikan penilaian.
          </p>
        )}
      </div>
    </div>
  );
}

export function ResultsReleaseClient({
  preliminaryResultsReleased,
  finalResultsReleased,
  judgingStats,
}: {
  preliminaryResultsReleased: boolean;
  finalResultsReleased: boolean;
  judgingStats: JudgingProgressStats;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ stage: Stage; targetState: boolean } | null>(null);

  const handleConfirm = () => {
    if (!confirm) return;
    const { stage, targetState } = confirm;
    setConfirm(null);

    startTransition(async () => {
      const result = await updateResultsRelease(stage, targetState);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const label = STAGE_COPY[stage].label;
      toast.success(
        targetState ? `Hasil penilaian ${label} berhasil dirilis.` : `Hasil penilaian ${label} berhasil dinonaktifkan.`,
      );
      router.refresh();
    });
  };

  const confirmCopy = confirm ? STAGE_COPY[confirm.stage] : null;
  const confirmProgress = confirm ? judgingStats[confirm.stage] : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="size-5 shrink-0 text-primary" />
            Rilis Hasil Penilaian
          </CardTitle>
          <CardDescription>
            Buka akses nilai, kriteria, dan masukan anonim juri kepada tim. Setiap perubahan melalui dialog konfirmasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StageReleaseRow
            stage="preliminary"
            released={preliminaryResultsReleased}
            progress={judgingStats.preliminary}
            disabled={isPending}
            onRequestToggle={(stage, targetState) => setConfirm({ stage, targetState })}
          />
          <StageReleaseRow
            stage="final"
            released={finalResultsReleased}
            progress={judgingStats.final}
            disabled={isPending}
            onRequestToggle={(stage, targetState) => setConfirm({ stage, targetState })}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.targetState
                ? `Rilis Hasil Penilaian ${confirmCopy?.label}?`
                : `Sembunyikan Hasil Penilaian ${confirmCopy?.label}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-muted-foreground text-sm">
                {confirm?.targetState ? (
                  <>
                    <p>
                      Hasil penilaian <strong className="text-foreground">{confirmCopy?.label}</strong> akan terlihat
                      oleh seluruh tim peserta{confirm.stage === "final" ? " (khusus finalis)" : ""}.
                    </p>
                    <div className="space-y-1.5 rounded-md border bg-muted/40 p-3 text-foreground text-xs">
                      <p className="font-semibold">Informasi yang akan dapat dilihat tim:</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                        <li>Nilai rata-rata kriteria ({confirmCopy?.criteria})</li>
                        <li>Total nilai akhir berbobot</li>
                        <li>Jumlah juri yang telah memberikan nilai</li>
                        <li>Masukan tertulis dari juri secara anonim tanpa identitas</li>
                      </ul>
                    </div>
                    {confirmProgress && confirmProgress.incompleteJudges > 0 && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 text-xs dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <strong>Peringatan progres juri:</strong> masih ada {confirmProgress.incompleteJudges} juri
                          yang belum selesai (baru {confirmProgress.completedScores} dari{" "}
                          {confirmProgress.totalExpectedScores} penilaian masuk). Tim akan melihat rata-rata dari nilai
                          yang sudah masuk.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p>
                    Hasil penilaian <strong className="text-foreground">{confirmCopy?.label}</strong> akan dinonaktifkan
                    kembali. Tim tidak dapat melihat nilai maupun masukan juri sampai hasil dirilis ulang.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className={
                confirm?.targetState ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {confirm?.targetState ? "Ya, rilis hasil" : "Ya, sembunyikan hasil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

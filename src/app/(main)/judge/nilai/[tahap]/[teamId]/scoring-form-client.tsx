"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Code2,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Lock,
  Save,
  StickyNote,
  Undo2,
  UserX,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calcWeightedTotal, getRubricForStage, type ScoringStage } from "@/lib/rubric";

import { cancelRecusal, createRecusal, lockScore, saveScore } from "../../actions";

interface TeamData {
  id: string;
  team_code: string;
  team_name: string;
}

interface SubmissionData {
  github_url: string;
  live_demo_url: string;
  video_url: string;
  notes_for_judges: string;
}

type ScoreStatus = "draft" | "final";

interface ExistingScoreData {
  functionality_score: number | null;
  case_study_fit_score: number | null;
  ui_ux_score: number | null;
  code_quality_score: number | null;
  documentation_score: number | null;
  presentation_qa_score?: number | null;
  total_weighted_score: number | null;
  feedback: string | null;
  private_note: string | null;
  status: ScoreStatus;
  updated_at: string;
  locked_at: string | null;
}

export interface JudgeScoringNavigation {
  currentPosition: number;
  totalTeams: number;
  prevTeamId: string | null;
  nextTeamId: string | null;
  nextUnscoredTeamId: string | null;
}

interface ScoringFormClientProps {
  tahap: ScoringStage;
  team: TeamData;
  submission: SubmissionData;
  initialScore: ExistingScoreData | null;
  initialRecusal?: { reason: string; created_at: string } | null;
  isStageReleased?: boolean;
  navigation?: JudgeScoringNavigation;
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

export function ScoringFormClient({
  tahap,
  team,
  submission,
  initialScore,
  initialRecusal = null,
  isStageReleased = false,
  navigation,
}: ScoringFormClientProps) {
  const rubric = useMemo(() => getRubricForStage(tahap), [tahap]);

  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of rubric) {
      const existingVal = initialScore?.[c.column as keyof ExistingScoreData];
      initial[c.column] = typeof existingVal === "number" && Number.isFinite(existingVal) ? String(existingVal) : "";
    }
    return initial;
  });

  const [feedback, setFeedback] = useState(initialScore?.feedback ?? "");
  const [privateNote, setPrivateNote] = useState(initialScore?.private_note ?? "");
  const [scoreStatus, setScoreStatus] = useState<ScoreStatus | null>(initialScore?.status ?? null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(
    initialScore?.total_weighted_score !== null && initialScore?.total_weighted_score !== undefined
      ? Number(initialScore.total_weighted_score)
      : null,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialScore?.updated_at ?? null);
  const [lockedAt, setLockedAt] = useState<string | null>(initialScore?.locked_at ?? null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => {
    const initial: Record<string, string> = {};
    for (const c of rubric) {
      const existingVal = initialScore?.[c.column as keyof ExistingScoreData];
      initial[c.column] = typeof existingVal === "number" && Number.isFinite(existingVal) ? String(existingVal) : "";
    }
    return {
      scores: initial,
      feedback: initialScore?.feedback ?? "",
      privateNote: initialScore?.private_note ?? "",
    };
  });
  const [isFinalConfirmOpen, setIsFinalConfirmOpen] = useState(false);
  const [validatedScoresData, setValidatedScoresData] = useState<Record<string, number> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [recusal, setRecusal] = useState(initialRecusal);
  const [isRecusalDialogOpen, setIsRecusalDialogOpen] = useState(false);
  const [isCancelRecusalOpen, setIsCancelRecusalOpen] = useState(false);
  const [recusalReason, setRecusalReason] = useState("");
  const [recusalError, setRecusalError] = useState<string | null>(null);

  const isRecused = recusal !== null;
  const isLocked = lockedAt !== null;
  const isReadOnly = isRecused || isLocked || isStageReleased;
  const isInputDisabled = isReadOnly ? true : isPending;

  const isDirty = useMemo(() => {
    if (isReadOnly) return false;
    if (feedback !== savedSnapshot.feedback) return true;
    if (privateNote !== savedSnapshot.privateNote) return true;
    for (const c of rubric) {
      if ((scores[c.column] ?? "") !== (savedSnapshot.scores[c.column] ?? "")) {
        return true;
      }
    }
    return false;
  }, [scores, feedback, privateNote, savedSnapshot, rubric, isReadOnly]);

  useEffect(() => {
    if (!isDirty || isReadOnly) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, isReadOnly]);

  const handleBackClick = (e: React.MouseEvent) => {
    if (isDirty) {
      const confirmLeave = window.confirm("Perubahan nilai belum disimpan. Yakin ingin meninggalkan halaman?");
      if (!confirmLeave) {
        e.preventDefault();
      }
    }
  };

  const previewTotal = useMemo(() => {
    return calcWeightedTotal(tahap, scores);
  }, [tahap, scores]);

  const handleScoreChange = (column: string, value: string) => {
    let cleaned = value.replace(/[^0-9.,]/g, "");
    const firstSepIndex = cleaned.search(/[.,]/);
    if (firstSepIndex !== -1) {
      const before = cleaned.slice(0, firstSepIndex);
      const sep = cleaned[firstSepIndex];
      const after = cleaned.slice(firstSepIndex + 1).replace(/[.,]/g, "");
      cleaned = `${before}${sep}${after.slice(0, 2)}`;
    }
    setScores((prev) => ({ ...prev, [column]: cleaned }));
    setFormError(null);
  };

  const collectScores = (requireAll: boolean): Record<string, number> | null => {
    const numericScores: Record<string, number> = {};
    for (const c of rubric) {
      const valStr = scores[c.column]?.trim();
      if (!valStr) {
        if (requireAll) {
          setFormError(`Kriteria "${c.label}" wajib diisi untuk menyimpan nilai final.`);
          return null;
        }
        continue;
      }
      const normalized = valStr.replace(",", ".");
      const num = Number(normalized);
      if (Number.isNaN(num) || num < 0 || num > 100) {
        setFormError(`Nilai untuk "${c.label}" harus di antara 0 sampai 100.`);
        return null;
      }
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) {
        setFormError(`Nilai untuk "${c.label}" maksimal memiliki 2 angka di belakang koma.`);
        return null;
      }
      numericScores[c.column] = num;
    }
    return numericScores;
  };

  // The server expects every rubric key; blanks are sent as "" and stored as NULL.
  const buildPayloadScores = (numericScores: Record<string, number>): Record<string, number | string> => {
    const payload: Record<string, number | string> = {};
    for (const c of rubric) {
      payload[c.column] = numericScores[c.column] ?? "";
    }
    return payload;
  };

  const hasLowScore = useMemo(() => {
    const active = validatedScoresData;
    if (!active) return false;
    return Object.values(active).some((val) => val < 10);
  }, [validatedScoresData]);

  const hasIdenticalScores = useMemo(() => {
    const active = validatedScoresData;
    if (!active) return false;
    const values = Object.values(active);
    return values.length > 1 && values.every((val) => val === values[0]);
  }, [validatedScoresData]);

  const handleSaveDraft = () => {
    if (isReadOnly || isPending) return;
    setFormError(null);

    const numericScores = collectScores(false);
    if (!numericScores) return;
    if (Object.keys(numericScores).length === 0) {
      setFormError("Isi minimal satu kriteria sebelum menyimpan draf.");
      return;
    }

    startTransition(async () => {
      const res = await saveScore({
        tahap,
        team_id: team.id,
        mode: "draft",
        scores: buildPayloadScores(numericScores),
        feedback: feedback.trim(),
        private_note: privateNote.trim(),
      });

      if (!res.ok) {
        setFormError(res.message);
        toast.error(res.message);
        return;
      }

      setScoreStatus(res.status);
      setConfirmedTotal(res.total);
      setLastSavedAt(res.updatedAt);
      setSavedSnapshot({ scores: { ...scores }, feedback, privateNote });
      toast.success("Draf berhasil disimpan.");
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setFormError(null);

    const numericScores = collectScores(true);
    if (!numericScores) return;

    setValidatedScoresData(numericScores);
    setIsFinalConfirmOpen(true);
  };

  const handleFinalConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isReadOnly || !validatedScoresData) return;
    setFormError(null);

    const numericScores = validatedScoresData;

    startTransition(async () => {
      const saveRes = await saveScore({
        tahap,
        team_id: team.id,
        mode: "final",
        scores: buildPayloadScores(numericScores),
        feedback: feedback.trim(),
        private_note: privateNote.trim(),
      });

      if (!saveRes.ok) {
        setFormError(saveRes.message);
        toast.error(saveRes.message);
        setIsFinalConfirmOpen(false);
        return;
      }

      const lockRes = await lockScore({ tahap, team_id: team.id });
      if (!lockRes.ok) {
        setScoreStatus(saveRes.status);
        setConfirmedTotal(saveRes.total);
        setLastSavedAt(saveRes.updatedAt);
        setSavedSnapshot({ scores: { ...scores }, feedback, privateNote });
        setFormError(lockRes.message);
        toast.error(lockRes.message);
        setIsFinalConfirmOpen(false);
        return;
      }

      setScoreStatus("final");
      setConfirmedTotal(saveRes.total);
      setLastSavedAt(saveRes.updatedAt);
      setLockedAt(lockRes.lockedAt);
      setSavedSnapshot({ scores: { ...scores }, feedback, privateNote });
      setIsFinalConfirmOpen(false);
      toast.success("Nilai final berhasil disimpan dan dikunci.");
    });
  };

  const resetScoreState = () => {
    setScores(() => {
      const empty: Record<string, string> = {};
      for (const c of rubric) empty[c.column] = "";
      return empty;
    });
    setFeedback("");
    setPrivateNote("");
    setScoreStatus(null);
    setConfirmedTotal(null);
    setLastSavedAt(null);
    setSavedSnapshot({ scores: {}, feedback: "", privateNote: "" });
    setValidatedScoresData(null);
    setFormError(null);
  };

  const handleRecusalOpen = () => {
    setRecusalReason("");
    setRecusalError(null);
    setIsRecusalDialogOpen(true);
  };

  const handleCreateRecusal = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPending) return;
    const trimmed = recusalReason.trim();
    if (!trimmed) {
      setRecusalError("Alasan recusal wajib diisi.");
      return;
    }
    if (trimmed.length > 2000) {
      setRecusalError("Alasan recusal maksimal 2000 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await createRecusal({ tahap, team_id: team.id, reason: trimmed });
      if (!res.ok) {
        setRecusalError(res.message);
        return;
      }
      setRecusal({ reason: trimmed, created_at: new Date().toISOString() });
      setIsRecusalDialogOpen(false);
      setRecusalReason("");
      resetScoreState();
      toast.success("Recusal tersimpan. Tim ini ditandai tidak dinilai oleh Anda.");
    });
  };

  const handleCancelRecusal = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      const res = await cancelRecusal({ tahap, team_id: team.id });
      if (!res.ok) {
        setRecusalError(res.message);
        setIsCancelRecusalOpen(false);
        toast.error(res.message);
        return;
      }
      setRecusal(null);
      setRecusalError(null);
      setIsCancelRecusalOpen(false);
      toast.success("Recusal dibatalkan. Anda dapat menilai tim ini kembali.");
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" asChild className="size-8 -ml-2">
              <Link href="/judge" onClick={handleBackClick}>
                <ArrowLeft className="size-4" />
                <span className="sr-only">Kembali</span>
              </Link>
            </Button>
            <h1 className="font-semibold text-2xl font-mono">{team.team_code}</h1>
            <Badge variant={tahap === "final" ? "default" : "secondary"}>
              {tahap === "final" ? "Babak Final" : "Babak Awal"}
            </Badge>
            {isRecused && (
              <Badge variant="outline" className="gap-1 border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <UserX className="size-3" />
                Recusal
              </Badge>
            )}
            {isStageReleased && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                <Lock className="size-3" />
                Hasil Dirilis
              </Badge>
            )}
            {!isRecused && !isStageReleased && isLocked && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                <Lock className="size-3" />
                Terkunci
              </Badge>
            )}
            {!isRecused && !isStageReleased && !isLocked && scoreStatus === "draft" && (
              <Badge variant="secondary">Draf</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm font-medium pl-6">{team.team_name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isStageReleased && !isRecused && scoreStatus !== "final" && (
            <Button variant="outline" size="sm" onClick={handleRecusalOpen} disabled={isPending} className="gap-1.5">
              <Ban className="size-3.5" />
              Tidak menilai tim ini
            </Button>
          )}
          {!isStageReleased && isRecused && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelRecusalOpen(true)}
              disabled={isPending}
              className="gap-1.5"
            >
              <Undo2 className="size-3.5" />
              Batalkan recusal
            </Button>
          )}
          <Button variant="outline" asChild size="sm">
            <Link href="/judge" onClick={handleBackClick}>
              <ArrowLeft className="mr-1.5 size-3.5" />
              Kembali
            </Link>
          </Button>
        </div>
      </div>

      {/* Team Navigation Bar */}
      {navigation && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              Tim {navigation.currentPosition} dari {navigation.totalTeams}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!navigation.prevTeamId}
              asChild={Boolean(navigation.prevTeamId)}
            >
              {navigation.prevTeamId ? (
                <Link href={`/judge/nilai/${tahap}/${navigation.prevTeamId}`} onClick={handleBackClick}>
                  <ChevronLeft className="mr-1 size-4" />
                  Sebelumnya
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="mr-1 size-4" />
                  Sebelumnya
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!navigation.nextTeamId}
              asChild={Boolean(navigation.nextTeamId)}
            >
              {navigation.nextTeamId ? (
                <Link href={`/judge/nilai/${tahap}/${navigation.nextTeamId}`} onClick={handleBackClick}>
                  Berikutnya
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              ) : (
                <span>
                  Berikutnya
                  <ChevronRight className="ml-1 size-4" />
                </span>
              )}
            </Button>

            {navigation.nextUnscoredTeamId && (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/judge/nilai/${tahap}/${navigation.nextUnscoredTeamId}`} onClick={handleBackClick}>
                  <ClipboardCheck className="mr-1.5 size-4" />
                  Tim belum dinilai berikutnya
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

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

      {submission.notes_for_judges.trim() && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="size-4 text-primary" />
              Catatan untuk Juri
            </CardTitle>
            <CardDescription>Catatan dari peserta untuk dewan juri (hanya baca).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {submission.notes_for_judges}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recusal information, replaces the scoring form */}
      {isRecused && (
        <Card className="border-sky-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserX className="size-5 text-sky-600 dark:text-sky-400" />
              Anda tidak menilai tim ini
            </CardTitle>
            <CardDescription>
              Recusal dicatat pada {formatTimestampWita(recusal.created_at)}. Tim ini dihitung selesai pada progres
              penilaian Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Alasan recusal</p>
              <p className="whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 text-sm">
                {recusal.reason}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Alasan recusal hanya dapat dilihat oleh Anda dan panitia, tidak dibagikan ke tim.
            </p>

            {isStageReleased ? (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <Lock className="size-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription>
                  Recusal tidak dapat dibatalkan karena hasil {tahap === "final" ? "babak final" : "babak awal"} telah
                  dirilis.
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsCancelRecusalOpen(true)}
                disabled={isPending}
                className="gap-2"
              >
                <Undo2 className="size-4" />
                {isPending ? "Memproses..." : "Batalkan recusal"}
              </Button>
            )}

            {recusalError && (
              <Alert variant="destructive">
                <AlertDescription>{recusalError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scoring Form */}
      {!isRecused && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <CardTitle className="text-lg">Formulir Penilaian Rubrik</CardTitle>
                  <CardDescription>
                    Masukkan nilai skala 0–100 untuk setiap kriteria. Simpan sebagai draf bila belum lengkap, atau isi
                    semua kriteria untuk menyimpan nilai final.
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
              {isStageReleased && (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <Lock className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription>
                    Penilaian {tahap === "final" ? "babak final" : "babak awal"} telah dikunci karena hasil penilaian
                    sudah dirilis oleh panitia. Formulir berada dalam mode hanya-baca (read-only).
                  </AlertDescription>
                </Alert>
              )}

              {!isStageReleased && isLocked && (
                <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                  <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription>
                    Nilai Anda dikunci pada {formatTimestampWita(lockedAt)} dan tidak dapat diubah lagi. Hubungi panitia
                    jika membutuhkan perubahan.
                  </AlertDescription>
                </Alert>
              )}

              {!isReadOnly && scoreStatus === "draft" && (
                <Alert>
                  <Info className="size-4" />
                  <AlertDescription>
                    Tersimpan sebagai draf. Draf belum dihitung sebagai penilaian final dan tidak masuk peringkat sampai
                    Anda menyimpan nilai final.
                  </AlertDescription>
                </Alert>
              )}

              {/* Panel Ketentuan Juknis */}
              <Collapsible className="rounded-lg border bg-muted/40">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between p-3.5 text-left text-sm font-medium hover:bg-muted/60 transition-colors rounded-lg group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <span>Ketentuan Juknis</span>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 pt-1 text-xs text-muted-foreground space-y-2">
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                    <li>
                      Kegagalan akses atau fungsi live deployment yang berasal dari sisi peserta mengurangi nilai
                      Fungsionalitas (C.7b).
                    </li>
                    <li>
                      Penilaian alternatif lewat video dan GitHub hanya bila ada gangguan platform hosting yang dapat
                      diverifikasi (C.7c–d).
                    </li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>

              <div className="grid gap-4 sm:grid-cols-2">
                {rubric.map((criterion) => {
                  const val = scores[criterion.column] ?? "";
                  return (
                    <div
                      key={criterion.column}
                      className="flex flex-col justify-between space-y-3 rounded-lg border p-3.5 bg-card"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor={`score-${criterion.column}`} className="font-medium text-sm">
                            {criterion.label}
                          </Label>
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            Bobot {criterion.weight}%
                          </Badge>
                        </div>

                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                            >
                              <ChevronRight className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                              <span>Indikator penilaian</span>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-1.5 pb-0.5">
                            <p className="rounded-md bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
                              {criterion.indicator}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>

                      <Input
                        id={`score-${criterion.column}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={val}
                        disabled={isInputDisabled}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => handleScoreChange(criterion.column, e.target.value)}
                        className="font-mono text-base"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Feedback for the team */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="judge-feedback" className="font-medium text-sm">
                    Masukan untuk Tim
                  </Label>
                  <span className="text-xs text-muted-foreground">{feedback.length} / 2000 karakter</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dibagikan secara anonim ke tim setelah hasil penilaian dirilis.
                </p>
                <Textarea
                  id="judge-feedback"
                  placeholder="Berikan masukan konstruktif untuk karya tim ini (opsional)..."
                  rows={4}
                  maxLength={2000}
                  value={feedback}
                  disabled={isInputDisabled}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              {/* Private note, never shared with the team */}
              <div className="space-y-2 rounded-lg border border-dashed p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="judge-private-note" className="flex items-center gap-1.5 font-medium text-sm">
                    <StickyNote className="size-4 text-primary" />
                    Catatan pribadi
                  </Label>
                  <Badge variant="outline" className="text-[11px]">
                    Tidak dibagikan ke tim
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Catatan ini terpisah dari Masukan. Tidak dibagikan ke tim dan tidak dihitung sebagai penilaian.
                </p>
                <Textarea
                  id="judge-private-note"
                  placeholder="Catatan internal Anda untuk tim ini (opsional)..."
                  rows={3}
                  maxLength={2000}
                  value={privateNote}
                  disabled={isInputDisabled}
                  onChange={(e) => setPrivateNote(e.target.value)}
                />
                <p className="text-right text-xs text-muted-foreground">{privateNote.length} / 2000 karakter</p>
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
                  <span>{scoreStatus === "draft" ? "Total draf tersimpan:" : "Nilai tersimpan di database:"}</span>
                  <span className="font-bold font-mono text-sm">{confirmedTotal.toFixed(2)}</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col-reverse justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
              <Button variant="outline" type="button" asChild>
                <Link href="/judge" onClick={handleBackClick}>
                  Kembali
                </Link>
              </Button>
              {isReadOnly ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" />
                  {isStageReleased ? "Penilaian dikunci (hasil telah dirilis)" : "Nilai sudah dikunci"}
                </span>
              ) : (
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={handleSaveDraft}
                    className="gap-2"
                  >
                    <Save className="size-4" />
                    {isPending ? "Menyimpan..." : "Simpan draf"}
                  </Button>
                  <Button type="submit" disabled={isPending} className="gap-2">
                    <ClipboardCheck className="size-4" />
                    Simpan final
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Dialog Konfirmasi Simpan Nilai Final */}
      <AlertDialog open={isFinalConfirmOpen} onOpenChange={setIsFinalConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan sebagai nilai final?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-foreground">
                <p className="text-muted-foreground text-sm">
                  Periksa kembali ringkasan nilai untuk tim{" "}
                  <span className="font-semibold text-foreground">{team.team_code}</span>. Nilai final akan dikunci dan
                  tidak dapat diubah sendiri.
                </p>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  {rubric.map((criterion) => {
                    const rawVal = scores[criterion.column] ?? "-";
                    return (
                      <div key={criterion.column} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {criterion.label} <span className="text-[10px]">({criterion.weight}%)</span>
                        </span>
                        <span className="font-mono font-semibold">{rawVal}</span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex items-center justify-between font-medium text-sm">
                    <span>Total Berbobot (Pratinjau)</span>
                    <span className="font-mono font-bold text-primary">{previewTotal.toFixed(2)} / 100</span>
                  </div>
                </div>

                {hasLowScore && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>
                      Peringatan: Terdapat kriteria dengan nilai di bawah 10 (&lt; 10). Pastikan nilai ini sudah sesuai
                      sebelum menyimpan.
                    </span>
                  </div>
                )}

                {hasIdenticalScores && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>
                      Peringatan: Semua kriteria bernilai sama persis. Pastikan penilaian objektif telah diberikan untuk
                      setiap aspek.
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleFinalConfirm}>
              {isPending ? "Menyimpan..." : "Simpan final"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Konfirmasi Recusal */}
      <AlertDialog open={isRecusalDialogOpen} onOpenChange={setIsRecusalDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Tidak menilai tim ini?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-foreground">
                <p className="text-muted-foreground text-sm">
                  Recusal menandai bahwa Anda tidak menilai tim{" "}
                  <span className="font-semibold text-foreground">{team.team_code}</span>. Draf nilai yang tersimpan
                  akan dihapus dan tim ini dihitung selesai pada progres Anda.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="recusal-reason" className="text-sm font-medium">
                    Alasan recusal <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="recusal-reason"
                    placeholder="Jelaskan alasan Anda tidak menilai tim ini..."
                    rows={4}
                    maxLength={2000}
                    value={recusalReason}
                    disabled={isPending}
                    onChange={(e) => {
                      setRecusalReason(e.target.value);
                      setRecusalError(null);
                    }}
                  />
                  <p className="text-right text-xs text-muted-foreground">{recusalReason.length} / 2000 karakter</p>
                </div>
                {recusalError && (
                  <Alert variant="destructive">
                    <AlertDescription>{recusalError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleCreateRecusal}>
              {isPending ? "Menyimpan..." : "Simpan recusal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Konfirmasi Batal Recusal */}
      <AlertDialog open={isCancelRecusalOpen} onOpenChange={setIsCancelRecusalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan recusal?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan dapat menilai tim {team.team_code} kembali. Recusal hanya dapat dibatalkan selama hasil
              penilaian belum dirilis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Tutup</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleCancelRecusal}>
              {isPending ? "Memproses..." : "Batalkan recusal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

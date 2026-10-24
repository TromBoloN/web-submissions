"use client";

import { useEffect, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertOctagon,
  BookOpen,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  RotateCw,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDeadlineWita } from "@/lib/deadline";
import type { Database } from "@/types/database";

import { saveSubmission } from "./actions";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Submission = Database["public"]["Tables"]["submissions"]["Row"];

type SubmissionClientProps = {
  team: Team;
  submission: Submission | null;
  deadlineIso: string | null;
  serverNowIso: string;
  initialClosed: boolean;
  juknisUrl: string | null;
};

function formatTimestampWita(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "medium",
  }).format(date)} WITA`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy className="size-3.5" />
      {copied ? "Tersalin" : "Salin"}
    </Button>
  );
}

function CountdownTimer({
  deadlineIso,
  serverNowIso,
  onExpire,
}: {
  deadlineIso: string | null;
  serverNowIso: string;
  onExpire: () => void;
}) {
  // Compute offset between server clock at page load and browser clock at load
  const [clockOffset] = useState(() => {
    const serverTimeAtMount = new Date(serverNowIso).getTime();
    const browserTimeAtMount = Date.now();
    return serverTimeAtMount - browserTimeAtMount;
  });

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    if (!deadlineIso) return;
    const target = new Date(deadlineIso).getTime();

    const calculate = () => {
      // Current estimated server time
      const now = Date.now() + clockOffset;
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        onExpire();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [deadlineIso, clockOffset, onExpire]);

  if (!timeLeft) {
    return <span className="text-muted-foreground text-sm">Menghitung sisa waktu...</span>;
  }

  if (timeLeft.isPast) {
    return <span className="font-medium text-destructive text-sm">Waktu telah habis</span>;
  }

  let durationText = `${timeLeft.hours} jam ${timeLeft.minutes} menit ${timeLeft.seconds} detik`;
  if (timeLeft.days > 0) {
    durationText = `${timeLeft.days} hari ${durationText}`;
  }

  return <span className="font-semibold text-primary text-sm sm:text-base">Sisa waktu: {durationText}</span>;
}

export function SubmissionClient({
  team,
  submission,
  deadlineIso,
  serverNowIso,
  initialClosed,
  juknisUrl,
}: SubmissionClientProps) {
  const router = useRouter();
  // Closed state is only applied when page is loaded after deadline
  const isClosed = initialClosed;
  const [isCountdownZero, setIsCountdownZero] = useState(false);

  const [githubUrl, setGithubUrl] = useState(submission?.github_url ?? "");
  const [liveDemoUrl, setLiveDemoUrl] = useState(submission?.live_demo_url ?? "");
  const [videoUrl, setVideoUrl] = useState(submission?.video_url ?? "");

  const [fieldErrors, setFieldErrors] = useState<{
    github_url?: string;
    live_demo_url?: string;
    video_url?: string;
  }>({});

  const [serverError, setServerError] = useState<string>();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDisqualified = team.is_disqualified;
  const isReadOnly = isClosed || isDisqualified;
  const isSubmitted = submission?.status === "submitted";
  const hasSubmissionRow = Boolean(submission);

  const validateForSubmit = () => {
    const errors: typeof fieldErrors = {};

    const trimmedGithub = githubUrl.trim();
    if (!trimmedGithub) {
      errors.github_url = "Repositori GitHub wajib diisi.";
    } else if (!/^https:\/\/github\.com\/.+/i.test(trimmedGithub)) {
      errors.github_url = "Repositori GitHub harus berupa tautan repositori valid (diawali https://github.com/).";
    }

    const trimmedDemo = liveDemoUrl.trim();
    if (!trimmedDemo) {
      errors.live_demo_url = "URL Live Demo wajib diisi.";
    } else if (!/^https?:\/\/.+/i.test(trimmedDemo)) {
      errors.live_demo_url = "URL Live Demo harus berupa tautan web yang valid (diawali http:// atau https://).";
    }

    const trimmedVideo = videoUrl.trim();
    if (!trimmedVideo) {
      errors.video_url = "URL Video Demo wajib diisi.";
    } else if (!/^https?:\/\/.+/i.test(trimmedVideo)) {
      errors.video_url = "URL Video Demo harus berupa tautan video yang valid (diawali http:// atau https://).";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateForDraft = () => {
    const errors: typeof fieldErrors = {};

    const trimmedGithub = githubUrl.trim();
    if (trimmedGithub && !/^https:\/\/github\.com\/.+/i.test(trimmedGithub)) {
      errors.github_url = "Repositori GitHub harus diawali https://github.com/";
    }

    const trimmedDemo = liveDemoUrl.trim();
    if (trimmedDemo && !/^https?:\/\/.+/i.test(trimmedDemo)) {
      errors.live_demo_url = "URL Live Demo harus diawali http:// atau https://";
    }

    const trimmedVideo = videoUrl.trim();
    if (trimmedVideo && !/^https?:\/\/.+/i.test(trimmedVideo)) {
      errors.video_url = "URL Video Demo harus diawali http:// atau https://";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExecuteSave = (intent: "draft" | "submit") => {
    setServerError(undefined);
    const form = new FormData();
    form.set("github_url", githubUrl.trim());
    form.set("live_demo_url", liveDemoUrl.trim());
    form.set("video_url", videoUrl.trim());
    form.set("intent", intent);

    startTransition(async () => {
      const result = await saveSubmission(form);
      if (!result.ok) {
        setServerError(result.message);
        toast.error(result.message);
        return;
      }

      if (intent === "submit") {
        toast.success(isSubmitted ? "Submission berhasil diperbarui." : "Submission berhasil dikirim!");
      } else {
        toast.success("Draf submission berhasil disimpan.");
      }
      setIsConfirmOpen(false);
      router.refresh();
    });
  };

  const handleSaveDraftClick = () => {
    if (!validateForDraft()) return;
    handleExecuteSave("draft");
  };

  const handleSubmitClick = () => {
    if (!validateForSubmit()) return;
    setIsConfirmOpen(true);
  };

  let statusBadge = (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      Belum dikirim
    </Badge>
  );
  if (hasSubmissionRow) {
    if (isSubmitted) {
      statusBadge = <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Terkirim</Badge>;
    } else {
      statusBadge = <Badge variant="secondary">Draf</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-semibold text-2xl">Portal Submission</h1>
          {statusBadge}
        </div>
        <p className="text-muted-foreground">
          Kelola berkas dan tautan hasil karya proyek tim Anda untuk kompetisi MIT-WEEK 2026.
        </p>
      </div>

      {isDisqualified && (
        <Alert variant="destructive">
          <AlertOctagon className="size-4" />
          <AlertTitle>Tim Didiskualifikasi</AlertTitle>
          <AlertDescription>Tim Anda didiskualifikasi. Submission tidak dapat diubah.</AlertDescription>
        </Alert>
      )}

      {isClosed && !isDisqualified && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200">
          <Clock className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Batas Waktu Berakhir</AlertTitle>
          <AlertDescription>Batas waktu pengiriman telah berakhir. Submission tidak dapat diubah.</AlertDescription>
        </Alert>
      )}

      {!isClosed && !isDisqualified && isCountdownZero && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200">
          <Clock className="size-4 text-amber-600 dark:text-amber-400" />
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AlertTitle>Perhatian Batas Waktu</AlertTitle>
              <AlertDescription>
                Batas waktu hampir/telah berakhir, muat ulang halaman untuk memastikan.
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="w-fit shrink-0 gap-1.5"
            >
              <RotateCw className="size-3.5" />
              Muat ulang halaman
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formulir Pengiriman Berkas</CardTitle>
              <CardDescription>
                Masukkan tautan repositori GitHub, URL live demo aplikasi, dan video presentasi proyek tim Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="github_url" className="flex items-center gap-1.5 font-medium">
                  <Code2 className="size-4 text-muted-foreground" />
                  Repositori GitHub
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="github_url"
                  name="github_url"
                  type="url"
                  value={githubUrl}
                  disabled={isReadOnly || isPending}
                  onChange={(e) => {
                    setGithubUrl(e.target.value);
                    if (fieldErrors.github_url) {
                      setFieldErrors((prev) => ({ ...prev, github_url: undefined }));
                    }
                  }}
                  placeholder="https://github.com/organisasi/nama-proyek"
                  className={fieldErrors.github_url ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.github_url ? (
                  <p className="text-destructive text-xs">{fieldErrors.github_url}</p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Tautan repositori publik GitHub yang berisi kode sumber proyek. Wajib diawali{" "}
                    <code>https://github.com/</code>.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="live_demo_url" className="flex items-center gap-1.5 font-medium">
                  <Globe className="size-4 text-muted-foreground" />
                  URL Live Demo
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="live_demo_url"
                  name="live_demo_url"
                  type="url"
                  value={liveDemoUrl}
                  disabled={isReadOnly || isPending}
                  onChange={(e) => {
                    setLiveDemoUrl(e.target.value);
                    if (fieldErrors.live_demo_url) {
                      setFieldErrors((prev) => ({ ...prev, live_demo_url: undefined }));
                    }
                  }}
                  placeholder="https://proyek-mitweek.vercel.app"
                  className={fieldErrors.live_demo_url ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.live_demo_url ? (
                  <p className="text-destructive text-xs">{fieldErrors.live_demo_url}</p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Tautan aplikasi web yang sudah di-deploy dan dapat diuji secara langsung oleh publik (Vercel,
                    Netlify, dsb).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url" className="flex items-center gap-1.5 font-medium">
                  <Video className="size-4 text-muted-foreground" />
                  URL Video Demo
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="video_url"
                  name="video_url"
                  type="url"
                  value={videoUrl}
                  disabled={isReadOnly || isPending}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    if (fieldErrors.video_url) {
                      setFieldErrors((prev) => ({ ...prev, video_url: undefined }));
                    }
                  }}
                  placeholder="https://youtube.com/watch?v=... atau https://drive.google.com/..."
                  className={fieldErrors.video_url ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.video_url ? (
                  <p className="text-destructive text-xs">{fieldErrors.video_url}</p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Tautan video demonstrasi proyek berdurasi sesuai ketentuan (YouTube atau Google Drive dengan izin
                    akses publik).
                  </p>
                )}
              </div>

              {serverError && <p className="text-destructive text-sm">{serverError}</p>}
            </CardContent>

            {!isReadOnly && (
              <CardFooter className="flex flex-col-reverse justify-end gap-3 border-t pt-4 sm:flex-row">
                {!isSubmitted && (
                  <Button type="button" variant="outline" disabled={isPending} onClick={handleSaveDraftClick}>
                    Simpan draf
                  </Button>
                )}
                <Button type="button" disabled={isPending} onClick={handleSubmitClick}>
                  {isSubmitted ? "Perbarui submission" : "Kirim submission"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-primary" />
                Batas Waktu Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Batas akhir:</span>
                <p className="font-semibold text-foreground text-sm">{formatDeadlineWita(deadlineIso)}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2.5">
                <CountdownTimer
                  deadlineIso={deadlineIso}
                  serverNowIso={serverNowIso}
                  onExpire={() => setIsCountdownZero(true)}
                />
              </div>

              <div className="space-y-2 border-t pt-3">
                <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Link href="/team/studi-kasus">
                    <BookOpen className="size-4 text-primary" />
                    <span>Lihat Studi Kasus</span>
                  </Link>
                </Button>

                {juknisUrl?.startsWith("https://") && (
                  <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                    <a href={juknisUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="size-4 text-primary" />
                      <span>Buka Juknis Kompetisi</span>
                      <ExternalLink className="ml-auto size-3.5 text-muted-foreground" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informasi Tim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Kode Tim:</span>
                <div className="mt-1 flex items-center justify-between rounded-md border bg-muted/60 px-3 py-1.5">
                  <span className="font-bold font-mono text-lg">{team.team_code}</span>
                  <CopyButton value={team.team_code} />
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Kode tim dibutuhkan jika panitia memakai formulir cadangan.
                </p>
              </div>

              <div className="border-t pt-2">
                <span className="text-muted-foreground text-xs">Nama Tim:</span>
                <p className="font-medium text-foreground">{team.team_name}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-xs">Institusi:</span>
                <p className="text-foreground">{team.institution}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-xs">Ketua Tim:</span>
                <p className="text-foreground">{team.leader_name}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-xs">Anggota:</span>
                <p className="text-foreground">{team.members.join(", ")}</p>
              </div>
            </CardContent>
          </Card>

          {hasSubmissionRow && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Riwayat Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Pertama disimpan:</span>
                  <p className="font-medium text-foreground">{formatTimestampWita(submission?.submitted_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Terakhir diubah:</span>
                  <p className="font-medium text-foreground">{formatTimestampWita(submission?.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSubmitted ? "Perbarui Submission?" : "Kirim Submission Sekarang?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSubmitted
                ? "Pastikan seluruh tautan terbaru yang Anda masukkan sudah benar dan dapat diakses publik oleh dewan juri."
                : "Pastikan seluruh tautan (repositori GitHub, live demo, video demo) sudah benar dan dapat diakses publik oleh dewan juri. Anda tetap dapat memperbaruinya sebelum batas waktu berakhir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleExecuteSave("submit");
              }}
            >
              {isPending && "Menyimpan..."}
              {!isPending && (isSubmitted ? "Perbarui Sekarang" : "Kirim Sekarang")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  MessageCircle,
  RotateCw,
  StickyNote,
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
import { Textarea } from "@/components/ui/textarea";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";
import { formatDeadlineWita } from "@/lib/deadline";
import type { LinkCheckItem, LinkCheckResult } from "@/lib/link-check";
import type { Database } from "@/types/database";

import { checkMyLinks, saveSubmission } from "./actions";
import { FinalistBanner, type FinalistNoticeData } from "./finalist-banner";
import { SubmissionChecklist } from "./submission-checklist";
import { SubmissionReceipt } from "./submission-receipt";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Submission = Database["public"]["Tables"]["submissions"]["Row"];

type SubmissionClientProps = {
  team: Team;
  submission: Submission | null;
  deadlineIso: string | null;
  serverNowIso: string;
  initialClosed: boolean;
  juknisUrl: string | null;
  contactWhatsapp: string | null;
  finalistNotice: FinalistNoticeData | null;
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

function LinkCheckBadge({ item, isChecking }: { item?: LinkCheckItem; isChecking?: boolean }) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <RotateCw className="size-3 animate-spin" />
        <span>Memeriksa tautan...</span>
      </div>
    );
  }

  if (!item) return null;

  if (item.status === "ok") {
    return (
      <div className="flex items-start gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-700 text-xs dark:text-emerald-400">
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <span className="font-medium">Tautan valid:</span> {item.message}
        </div>
      </div>
    );
  }

  if (item.status === "warning") {
    return (
      <div className="flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-amber-700 text-xs dark:text-amber-400">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <span className="font-medium">Peringatan:</span> {item.message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 rounded-md border border-muted bg-muted/40 p-2 text-muted-foreground text-xs">
      <HelpCircle className="mt-0.5 size-3.5 shrink-0" />
      <div>
        <span className="font-medium">Info verifikasi:</span> {item.message}
      </div>
    </div>
  );
}

export function SubmissionClient({
  team,
  submission,
  deadlineIso,
  serverNowIso,
  initialClosed,
  juknisUrl,
  contactWhatsapp,
  finalistNotice,
}: SubmissionClientProps) {
  const router = useRouter();
  // Closed state is only applied when page is loaded after deadline
  const isClosed = initialClosed;
  const [isCountdownZero, setIsCountdownZero] = useState(false);

  const [githubUrl, setGithubUrl] = useState(submission?.github_url ?? "");
  const [liveDemoUrl, setLiveDemoUrl] = useState(submission?.live_demo_url ?? "");
  const [videoUrl, setVideoUrl] = useState(submission?.video_url ?? "");
  const [notesForJudges, setNotesForJudges] = useState(submission?.notes_for_judges ?? "");

  const [fieldErrors, setFieldErrors] = useState<{
    github_url?: string;
    live_demo_url?: string;
    video_url?: string;
  }>({});

  const [serverError, setServerError] = useState<string>();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [linkCheck, setLinkCheck] = useState<LinkCheckResult | null>(
    (submission?.link_check as unknown as LinkCheckResult | null) ?? null,
  );
  const [linkCheckedAt, setLinkCheckedAt] = useState<string | null>(submission?.link_checked_at ?? null);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  useEffect(() => {
    if (submission?.link_check) {
      setLinkCheck(submission.link_check as unknown as LinkCheckResult);
    }
    if (submission?.link_checked_at) {
      setLinkCheckedAt(submission.link_checked_at);
    }
  }, [submission?.link_check, submission?.link_checked_at]);

  const isDisqualified = team.is_disqualified;
  const isReadOnly = isClosed || isDisqualified;
  const isSubmitted = submission?.status === "submitted";
  const hasSubmissionRow = Boolean(submission);

  const runLinkCheck = async (showToast = false) => {
    setIsCheckingLinks(true);
    try {
      const res = await checkMyLinks();
      if (res.ok) {
        setLinkCheck(res.data);
        setLinkCheckedAt(res.checkedAt);
        if (showToast) {
          toast.success("Pemeriksaan tautan selesai.");
        }
      } else {
        if (res.data) setLinkCheck(res.data);
        if (res.checkedAt) setLinkCheckedAt(res.checkedAt);
        if (showToast) {
          toast.info(res.message);
        }
      }
    } catch {
      if (showToast) {
        toast.error("Gagal memeriksa tautan. Coba lagi beberapa saat.");
      }
    } finally {
      setIsCheckingLinks(false);
    }
  };

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
    form.set("notes_for_judges", notesForJudges.trim());
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

      // Trigger background link check without blocking save
      void runLinkCheck(false);
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
      <FinalistBanner notice={finalistNotice} />

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
          {isSubmitted && submission && <SubmissionReceipt team={team} submission={submission} />}

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
                <LinkCheckBadge item={linkCheck?.github} isChecking={isCheckingLinks} />
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
                <LinkCheckBadge item={linkCheck?.liveDemo} isChecking={isCheckingLinks} />
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
                <LinkCheckBadge item={linkCheck?.video} isChecking={isCheckingLinks} />
              </div>

              <p className="text-muted-foreground text-xs italic">
                * Pemeriksaan tautan hanya peringatan dan tidak menghalangi pengiriman.
              </p>

              <div className="space-y-2 border-t pt-5">
                <Label htmlFor="notes_for_judges" className="flex items-center gap-1.5 font-medium">
                  <StickyNote className="size-4 text-muted-foreground" />
                  Catatan untuk Juri
                  <span className="font-normal text-muted-foreground text-xs">(opsional)</span>
                </Label>
                <Textarea
                  id="notes_for_judges"
                  name="notes_for_judges"
                  rows={4}
                  maxLength={1000}
                  value={notesForJudges}
                  disabled={isReadOnly || isPending}
                  onChange={(e) => setNotesForJudges(e.target.value)}
                  placeholder="Contoh: akun demo yang dapat dipakai juri, langkah pengujian utama, atau batasan yang perlu diketahui."
                  className="min-h-24 resize-y"
                />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-muted-foreground text-xs">
                    Ditampilkan kepada dewan juri dan panitia. Gunakan akun demo khusus, jangan bagikan kata sandi
                    pribadi.
                  </p>
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {notesForJudges.length}/1000
                  </span>
                </div>
              </div>

              {serverError && <p className="text-destructive text-sm">{serverError}</p>}
            </CardContent>

            {!isReadOnly && (
              <CardFooter className="flex flex-col-reverse justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasSubmissionRow || isCheckingLinks || isPending}
                    onClick={() => runLinkCheck(true)}
                    className="gap-1.5"
                    title={hasSubmissionRow ? undefined : "Simpan draf terlebih dahulu untuk memeriksa tautan."}
                  >
                    <RotateCw className={`size-3.5 ${isCheckingLinks ? "animate-spin" : ""}`} />
                    {isCheckingLinks ? "Memeriksa tautan..." : "Periksa tautan"}
                  </Button>
                  {!hasSubmissionRow && (
                    <span className="text-muted-foreground text-xs">Simpan draf dulu untuk memeriksa tautan.</span>
                  )}
                  {hasSubmissionRow && linkCheckedAt && (
                    <span className="text-muted-foreground text-xs">Dicek: {formatTimestampWita(linkCheckedAt)}</span>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  {!isSubmitted && (
                    <Button type="button" variant="outline" disabled={isPending} onClick={handleSaveDraftClick}>
                      Simpan draf
                    </Button>
                  )}
                  <Button type="button" disabled={isPending} onClick={handleSubmitClick}>
                    {isSubmitted ? "Perbarui submission" : "Kirim submission"}
                  </Button>
                </div>
              </CardFooter>
            )}

            {isReadOnly && hasSubmissionRow && (
              <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCheckingLinks}
                  onClick={() => runLinkCheck(true)}
                  className="gap-1.5"
                >
                  <RotateCw className={`size-3.5 ${isCheckingLinks ? "animate-spin" : ""}`} />
                  {isCheckingLinks ? "Memeriksa tautan..." : "Periksa tautan"}
                </Button>
                {linkCheckedAt && (
                  <span className="text-muted-foreground text-xs">Dicek: {formatTimestampWita(linkCheckedAt)}</span>
                )}
              </CardFooter>
            )}
          </Card>

          <SubmissionChecklist />
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="size-4 text-primary" />
                Butuh bantuan?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground text-xs">
                Mengalami kendala saat mengirim karya? Hubungi panitia melalui WhatsApp.
              </p>
              {contactWhatsapp ? (
                <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                  <a href={toWhatsAppUrl(contactWhatsapp)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-left">
                      Chat panitia {formatWhatsAppNumber(contactWhatsapp) ?? contactWhatsapp}
                    </span>
                    <ExternalLink className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                  </a>
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">Nomor bantuan belum diatur oleh panitia.</p>
              )}
            </CardContent>
          </Card>

          {hasSubmissionRow && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Riwayat Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Pertama disimpan (draf/awal):</span>
                  <p className="font-medium text-foreground">{formatTimestampWita(submission?.submitted_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pertama dikirim (resmi):</span>
                  <p className="font-medium text-foreground">
                    {submission?.first_submitted_at
                      ? formatTimestampWita(submission.first_submitted_at)
                      : "Belum dikirim"}
                  </p>
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

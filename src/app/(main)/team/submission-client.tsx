"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "cn";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Clock,
  Code2,
  ExternalLink,
  FileX,
  Globe,
  HelpCircle,
  LockKeyhole,
  MessageCircle,
  RotateCw,
  StickyNote,
  Trash2,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";
import type { LinkCheckItem, LinkCheckResult } from "@/lib/link-check";
import type { Database } from "@/types/database";

import { checkMyLinks, saveSubmission } from "./actions";
import { GuardianIdCard } from "./guardian-id-card";
import { JourneyTrack } from "./journey-track";
import { SubmissionChecklist } from "./submission-checklist";
import { SubmissionReceipt } from "./submission-receipt";
import { TeamHero } from "./team-hero";
import { type FinalistNoticeData, resolveTeamPhase } from "./team-phase";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Submission = Database["public"]["Tables"]["submissions"]["Row"];

type SubmissionClientProps = {
  team: Team;
  submission: Submission | null;
  deadlineIso: string | null;
  serverNowIso: string;
  initialClosed: boolean;
  contactWhatsapp: string | null;
  showcasePublishedAt: string | null;
  finalistNotice: FinalistNoticeData | null;
  /** Preliminary or final results released (team can open /team/hasil). */
  resultsReleased: boolean;
  finalResultsReleased: boolean;
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

/** Closed-layout slot when the team never saved anything, so there is no receipt to show. */
function NoReceiptCard() {
  return (
    <div className="surface-calm flex flex-col items-center gap-2 p-8 text-center">
      <FileX className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-semibold text-sm">Tidak ada bukti pengiriman</p>
      <p className="max-w-sm text-muted-foreground text-xs">
        Tim Anda tidak mengirim atau menyimpan karya sebelum batas waktu berakhir.
      </p>
    </div>
  );
}

function ShowcaseConsentCard({
  isSubmitted,
  consent,
  showcasePublishedAt,
}: {
  isSubmitted: boolean;
  consent: boolean;
  showcasePublishedAt: string | null;
}) {
  const isLocked = Boolean(showcasePublishedAt);

  let line = "Atur judul, deskripsi, dan gambar yang tampil bersama karya tim di galeri.";
  let chip = { label: "Tidak tampil", tone: "muted" as "muted" | "mint" };
  if (!isSubmitted) {
    line = "Kirim submission dulu untuk memilih apakah karya ikut dipamerkan.";
    chip = { label: "Belum tersedia", tone: "muted" };
  } else if (isLocked) {
    line = "Galeri sudah terbit, jadi tampilan karya dikunci.";
    chip = { label: consent ? "Tampil · terkunci" : "Terkunci", tone: consent ? "mint" : "muted" };
  } else if (consent) {
    chip = { label: "Akan tampil", tone: "mint" };
  }

  return (
    <section
      aria-labelledby="showcase-card-title"
      className="flex h-full flex-col gap-4 rounded-2xl border-2 border-ink bg-hero p-5 text-white shadow-brutal-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold font-mono text-white/75 text-xs uppercase tracking-wider">Galeri karya</p>
          <h2 id="showcase-card-title" className="mt-0.5 font-display font-extrabold text-xl">
            Pamerkan karya kamu
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2 py-0.5 font-bold font-mono text-xs uppercase",
            chip.tone === "mint"
              ? "border-mint bg-mint text-ink dark:text-ink-foreground"
              : "border-white/40 text-white/90",
          )}
        >
          {isLocked && <LockKeyhole className="size-3" aria-hidden="true" />}
          {chip.label}
        </span>
      </div>

      <p className="text-sm text-white/85">{line}</p>

      <div className="mt-auto space-y-3">
        {isSubmitted && (
          <Button asChild className="press w-full sm:w-fit">
            <Link href="/team/karya">{isLocked ? "Lihat tampilan karya" : "Atur tampilan karya"}</Link>
          </Button>
        )}
        <details className="group text-white/80 text-xs">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded font-medium text-white/90 hover:text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            Tentang galeri & penghapusan
            <ChevronDown
              className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-2 leading-relaxed">
            Galeri tidak menampilkan nilai atau peringkat. Pemenang diumumkan terpisah. Setelah galeri diterbitkan,
            permintaan penghapusan dapat diajukan kepada panitia dan diproses secara manual.
          </p>
        </details>
      </div>
    </section>
  );
}

function LinkCheckBadge({
  item,
  isChecking,
  statusId,
}: {
  item?: LinkCheckItem;
  isChecking?: boolean;
  statusId: string;
}) {
  if (isChecking) {
    return (
      <div id={statusId} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <RotateCw className="size-3 animate-spin" />
        <span>Memeriksa tautan...</span>
      </div>
    );
  }

  if (!item) return null;

  if (item.status === "ok") {
    return (
      <div
        id={statusId}
        className="flex items-start gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-[13px] text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <span className="font-medium">Tautan valid:</span> {item.message}
        </div>
      </div>
    );
  }

  if (item.status === "warning") {
    return (
      <div
        id={statusId}
        className="flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-[13px] text-amber-700 dark:text-amber-400"
      >
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <span className="font-medium">Peringatan:</span> {item.message}
        </div>
      </div>
    );
  }

  return (
    <div
      id={statusId}
      className="flex items-start gap-1.5 rounded-md border border-muted bg-muted/40 p-2 text-[13px] text-muted-foreground"
    >
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
  contactWhatsapp,
  showcasePublishedAt,
  finalistNotice,
  resultsReleased,
  finalResultsReleased,
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
  const [isFormExpanded, setIsFormExpanded] = useState(!isSubmitted);

  const phase = resolveTeamPhase({
    serverNowIso,
    isClosed,
    isSubmitted,
    isDisqualified,
    finalistNotice,
    finalResultsReleased,
  });
  let submissionState: "none" | "draft" | "submitted" = "none";
  if (isSubmitted) submissionState = "submitted";
  else if (hasSubmissionRow) submissionState = "draft";
  const hasUnsavedChanges =
    githubUrl.trim() !== (submission?.github_url ?? "").trim() ||
    liveDemoUrl.trim() !== (submission?.live_demo_url ?? "").trim() ||
    videoUrl.trim() !== (submission?.video_url ?? "").trim() ||
    notesForJudges.trim() !== (submission?.notes_for_judges ?? "").trim();
  const handleCountdownExpire = useCallback(() => setIsCountdownZero(true), []);

  const handlePaste = async (setter: (val: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setter(text.trim());
        toast.success("Tautan berhasil ditempel.");
      }
    } catch {
      toast.error("Gagal membaca papan klip.");
    }
  };

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

  const receipt = isSubmitted && submission ? <SubmissionReceipt team={team} submission={submission} /> : null;

  const formCard = (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">Formulir Pengiriman Berkas</CardTitle>
        <CardDescription>
          Masukkan tautan repositori GitHub, URL live demo aplikasi, dan video presentasi proyek tim Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        {/* GitHub URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="github_url" className="flex items-center gap-1.5 font-medium">
              <Code2 className="size-4 text-muted-foreground" />
              Repositori GitHub
              <span className="text-destructive">*</span>
            </Label>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                {githubUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setGithubUrl("")}
                    className="h-7 px-2 text-muted-foreground text-xs hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                    <span>Hapus</span>
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              id="github_url"
              name="github_url"
              type="url"
              inputMode="url"
              value={githubUrl}
              aria-describedby={
                fieldErrors.github_url ? "github_url_error github_url_status" : "github_url_help github_url_status"
              }
              disabled={isReadOnly || isPending}
              onChange={(e) => {
                setGithubUrl(e.target.value);
                if (fieldErrors.github_url) {
                  setFieldErrors((prev) => ({ ...prev, github_url: undefined }));
                }
              }}
              onBlur={(e) => setGithubUrl(e.target.value.trim())}
              placeholder="https://github.com/organisasi/nama-proyek"
              className={fieldErrors.github_url ? "border-destructive pr-10 focus-visible:ring-destructive" : "pr-10"}
            />
            {!isReadOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Tempel URL GitHub"
                disabled={isPending}
                onClick={() => handlePaste(setGithubUrl)}
                className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <ClipboardPaste className="size-4" />
              </Button>
            )}
          </div>
          {fieldErrors.github_url ? (
            <p id="github_url_error" className="text-[13px] text-destructive">
              {fieldErrors.github_url}
            </p>
          ) : (
            <p id="github_url_help" className="text-[13px] text-muted-foreground">
              Tautan repositori publik GitHub yang berisi kode sumber proyek. Wajib diawali{" "}
              <code>https://github.com/</code>.
            </p>
          )}
          <LinkCheckBadge item={linkCheck?.github} isChecking={isCheckingLinks} statusId="github_url_status" />
        </div>

        {/* Live Demo URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="live_demo_url" className="flex items-center gap-1.5 font-medium">
              <Globe className="size-4 text-muted-foreground" />
              URL Live Demo
              <span className="text-destructive">*</span>
            </Label>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                {liveDemoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setLiveDemoUrl("")}
                    className="h-7 px-2 text-muted-foreground text-xs hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                    <span>Hapus</span>
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              id="live_demo_url"
              name="live_demo_url"
              type="url"
              inputMode="url"
              value={liveDemoUrl}
              aria-describedby={
                fieldErrors.live_demo_url
                  ? "live_demo_url_error live_demo_url_status"
                  : "live_demo_url_help live_demo_url_status"
              }
              disabled={isReadOnly || isPending}
              onChange={(e) => {
                setLiveDemoUrl(e.target.value);
                if (fieldErrors.live_demo_url) {
                  setFieldErrors((prev) => ({ ...prev, live_demo_url: undefined }));
                }
              }}
              onBlur={(e) => setLiveDemoUrl(e.target.value.trim())}
              placeholder="https://proyek-mitweek.vercel.app"
              className={
                fieldErrors.live_demo_url ? "border-destructive pr-10 focus-visible:ring-destructive" : "pr-10"
              }
            />
            {!isReadOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Tempel URL live demo"
                disabled={isPending}
                onClick={() => handlePaste(setLiveDemoUrl)}
                className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <ClipboardPaste className="size-4" />
              </Button>
            )}
          </div>
          {fieldErrors.live_demo_url ? (
            <p id="live_demo_url_error" className="text-[13px] text-destructive">
              {fieldErrors.live_demo_url}
            </p>
          ) : (
            <p id="live_demo_url_help" className="text-[13px] text-muted-foreground">
              Tautan aplikasi web yang sudah di-deploy dan dapat diuji secara langsung oleh publik (Vercel, Netlify,
              dsb).
            </p>
          )}
          <LinkCheckBadge item={linkCheck?.liveDemo} isChecking={isCheckingLinks} statusId="live_demo_url_status" />
        </div>

        {/* Video Demo URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="video_url" className="flex items-center gap-1.5 font-medium">
              <Video className="size-4 text-muted-foreground" />
              URL Video Demo
              <span className="text-destructive">*</span>
            </Label>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                {videoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setVideoUrl("")}
                    className="h-7 px-2 text-muted-foreground text-xs hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                    <span>Hapus</span>
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              id="video_url"
              name="video_url"
              type="url"
              inputMode="url"
              value={videoUrl}
              aria-describedby={
                fieldErrors.video_url ? "video_url_error video_url_status" : "video_url_help video_url_status"
              }
              disabled={isReadOnly || isPending}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                if (fieldErrors.video_url) {
                  setFieldErrors((prev) => ({ ...prev, video_url: undefined }));
                }
              }}
              onBlur={(e) => setVideoUrl(e.target.value.trim())}
              placeholder="https://youtube.com/watch?v=... atau https://youtu.be/..."
              className={fieldErrors.video_url ? "border-destructive pr-10 focus-visible:ring-destructive" : "pr-10"}
            />
            {!isReadOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Tempel URL video"
                disabled={isPending}
                onClick={() => handlePaste(setVideoUrl)}
                className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <ClipboardPaste className="size-4" />
              </Button>
            )}
          </div>
          {fieldErrors.video_url ? (
            <p id="video_url_error" className="text-[13px] text-destructive">
              {fieldErrors.video_url}
            </p>
          ) : (
            <p id="video_url_help" className="text-[13px] text-muted-foreground">
              Tautan video demonstrasi proyek berdurasi <strong>maksimal 5 menit</strong> (Juknis C.8). YouTube atau
              Google Drive dengan izin akses publik.
            </p>
          )}
          {(videoUrl.includes("list=") || videoUrl.includes("start_radio")) && (
            <p className="font-medium text-amber-600 text-xs">
              Tips: Tautan video terdeteksi memuat parameter playlist (&list=...). Disarankan menggunakan tautan
              langsung video tunggal agar juri dapat langsung membuka.
            </p>
          )}
          <LinkCheckBadge item={linkCheck?.video} isChecking={isCheckingLinks} statusId="video_url_status" />
        </div>

        <p className="text-muted-foreground text-xs italic">
          * Pemeriksaan tautan hanya peringatan dan tidak menghalangi pengiriman.
        </p>

        {/* Notes for judges */}
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
              Ditampilkan kepada dewan juri dan panitia. Gunakan akun demo khusus, jangan bagikan kata sandi pribadi.
            </p>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{notesForJudges.length}/1000</span>
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
  );

  const showcaseCard = (
    <ShowcaseConsentCard
      isSubmitted={isSubmitted}
      consent={team.showcase_consent}
      showcasePublishedAt={showcasePublishedAt}
    />
  );

  const idCard = (
    <GuardianIdCard
      teamCode={team.team_code}
      teamName={team.team_name}
      institution={team.institution}
      leaderName={team.leader_name}
      members={team.members}
    />
  );

  const helpCard = (
    <div className="surface-calm flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <MessageCircle className="size-4 shrink-0 text-ink" aria-hidden="true" />
        <span>
          <span className="font-semibold">Butuh bantuan?</span>{" "}
          <span className="text-foreground/75">Hubungi panitia.</span>
        </span>
      </p>
      {contactWhatsapp ? (
        <a
          href={toWhatsAppUrl(contactWhatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          title={`WhatsApp ${formatWhatsAppNumber(contactWhatsapp) ?? contactWhatsapp}`}
          className="press btn-loud inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mint px-4 py-1.5 font-semibold text-ink text-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 dark:text-ink-foreground"
        >
          Chat panitia
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(WhatsApp, membuka tab baru)</span>
        </a>
      ) : (
        <span className="text-foreground/75 text-xs">Nomor bantuan belum diatur panitia.</span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Hero; once closed the Guardian ID sits beside it */}
      <div className={phase === "open" ? undefined : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"}>
        <TeamHero
          phase={phase}
          submissionState={submissionState}
          deadlineIso={deadlineIso}
          serverNowIso={serverNowIso}
          onExpire={handleCountdownExpire}
          finalistNotice={finalistNotice}
          resultsReleased={resultsReleased}
          liveLinks={{ github: githubUrl, liveDemo: liveDemoUrl, video: videoUrl }}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        {phase !== "open" && idCard}
      </div>

      {/* 2. Deadline reached while the page was open */}
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

      {/* 3. Open: the form is the centrepiece. Closed: bento of receipt, showcase and help. */}
      {phase === "open" ? (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              {receipt}

              {/* Once submitted, the form collapses behind an expander */}
              {isSubmitted && !isReadOnly && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3.5">
                  <p className="font-semibold text-foreground text-sm">Perbarui Tautan Karya</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFormExpanded((prev) => !prev)}
                    className="shrink-0 gap-1.5"
                  >
                    <span>{isFormExpanded ? "Tutup formulir" : "Perbarui karya"}</span>
                    {isFormExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </Button>
                </div>
              )}

              {(!isSubmitted || isFormExpanded) && formCard}
            </div>

            <div className="space-y-6">
              {/* Studi kasus, juknis and gallery live in the sidebar */}
              {idCard}
              {!isSubmitted && <SubmissionChecklist />}
              {showcaseCard}
              {helpCard}
            </div>
          </div>

          <JourneyTrack serverNowIso={serverNowIso} />
        </>
      ) : (
        <>
          <JourneyTrack serverNowIso={serverNowIso} />

          {/* Receipt left; showcase + help share one column that matches the receipt's height */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 [&>*]:h-full">
              {receipt ?? (hasSubmissionRow ? formCard : <NoReceiptCard />)}
            </div>
            <div className="flex flex-col gap-6 lg:col-span-5">
              <div className="flex-1">{showcaseCard}</div>
              {helpCard}
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
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

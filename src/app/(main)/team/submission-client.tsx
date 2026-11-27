"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "cn";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  ExternalLink,
  FileX,
  Globe,
  LockKeyhole,
  MessageCircle,
  RotateCw,
  StickyNote,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { useEventInfo, useSchedule } from "@/components/event-info-provider";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";
import type { LinkCheckResult } from "@/lib/link-check";
import type { Database } from "@/types/database";

import { checkMyLinks, saveSubmission } from "./actions";
import { GuardianIdCard } from "./guardian-id-card";
import { JourneyTrack } from "./journey-track";
import { SubmissionChecklist } from "./submission-checklist";
import { LinkField } from "./submission-link-field";
import { SubmissionReceipt } from "./submission-receipt";
import { type SubmissionLinkErrors, validateSubmissionLinks } from "./submission-rules";
import { TeamHero } from "./team-hero";
import { type FinalistNoticeData, resolveTeamPhase } from "./team-phase";
import type { FinalPresentation } from "./team-schedule";

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
  finalPresentation: FinalPresentation | null;
  checklistItems: string[];
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
  isAnnouncedFinalist,
}: {
  isSubmitted: boolean;
  consent: boolean;
  showcasePublishedAt: string | null;
  /** True only after the finalist announcement is published and this team is a finalist. */
  isAnnouncedFinalist: boolean;
}) {
  const { finalist_count } = useEventInfo();
  const isLocked = Boolean(showcasePublishedAt) && !isAnnouncedFinalist;

  let line = "Atur judul, deskripsi, dan gambar yang tampil bersama karya tim di galeri.";
  let chip = { label: "Tidak tampil", tone: "muted" as "muted" | "mint" };
  if (!isSubmitted) {
    line = "Kirim submission dulu untuk memilih apakah karya ikut dipamerkan.";
    chip = { label: "Belum tersedia", tone: "muted" };
  } else if (isAnnouncedFinalist) {
    line = `Sebagai Top ${finalist_count}, karya tim otomatis tampil di galeri finalis. Atur tampilannya sebelum galeri finalis terbit.`;
    chip = { label: "Tampil · finalis", tone: "mint" };
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
  finalPresentation,
  checklistItems,
}: SubmissionClientProps) {
  const schedule = useSchedule();
  const router = useRouter();
  // Closed state is only applied when page is loaded after deadline
  const isClosed = initialClosed;
  const [isCountdownZero, setIsCountdownZero] = useState(false);
  const [githubUrl, setGithubUrl] = useState(submission?.github_url ?? "");
  const [liveDemoUrl, setLiveDemoUrl] = useState(submission?.live_demo_url ?? "");
  const [videoUrl, setVideoUrl] = useState(submission?.video_url ?? "");
  const [notesForJudges, setNotesForJudges] = useState(submission?.notes_for_judges ?? "");

  const [fieldErrors, setFieldErrors] = useState<SubmissionLinkErrors>({});

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
    schedule,
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
  const clearFieldError = (field: keyof SubmissionLinkErrors) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

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

  const validate = (mode: "draft" | "submit") => {
    const errors = validateSubmissionLinks(
      { github_url: githubUrl, live_demo_url: liveDemoUrl, video_url: videoUrl },
      mode,
    );
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
    if (!validate("draft")) return;
    handleExecuteSave("draft");
  };

  const handleSubmitClick = () => {
    if (!validate("submit")) return;
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
        <LinkField
          id="github_url"
          label="Repositori GitHub"
          icon={Code2}
          value={githubUrl}
          setValue={setGithubUrl}
          onUserInput={() => clearFieldError("github_url")}
          error={fieldErrors.github_url}
          placeholder="https://github.com/organisasi/nama-proyek"
          pasteLabel="Tempel URL GitHub"
          help={
            <>
              Tautan repositori publik GitHub yang berisi kode sumber proyek. Wajib diawali{" "}
              <code>https://github.com/</code>.
            </>
          }
          checkItem={linkCheck?.github}
          isChecking={isCheckingLinks}
          readOnly={isReadOnly}
          disabled={isPending}
        />

        <LinkField
          id="live_demo_url"
          label="URL Live Demo"
          icon={Globe}
          value={liveDemoUrl}
          setValue={setLiveDemoUrl}
          onUserInput={() => clearFieldError("live_demo_url")}
          error={fieldErrors.live_demo_url}
          placeholder="https://proyek-mitweek.vercel.app"
          pasteLabel="Tempel URL live demo"
          help="Tautan aplikasi web yang sudah di-deploy dan dapat diuji secara langsung oleh publik (Vercel, Netlify, dsb)."
          checkItem={linkCheck?.liveDemo}
          isChecking={isCheckingLinks}
          readOnly={isReadOnly}
          disabled={isPending}
        />

        <LinkField
          id="video_url"
          label="URL Video Demo"
          icon={Video}
          value={videoUrl}
          setValue={setVideoUrl}
          onUserInput={() => clearFieldError("video_url")}
          error={fieldErrors.video_url}
          placeholder="https://youtube.com/watch?v=... atau https://youtu.be/..."
          pasteLabel="Tempel URL video"
          help={
            <>
              Tautan video demonstrasi proyek berdurasi <strong>maksimal 5 menit</strong> (Juknis C.8). YouTube atau
              Google Drive dengan izin akses publik.
            </>
          }
          checkItem={linkCheck?.video}
          isChecking={isCheckingLinks}
          readOnly={isReadOnly}
          disabled={isPending}
        >
          {(videoUrl.includes("list=") || videoUrl.includes("start_radio")) && (
            <p className="font-medium text-amber-600 text-xs">
              Tips: Tautan video terdeteksi memuat parameter playlist (&list=...). Disarankan menggunakan tautan
              langsung video tunggal agar juri dapat langsung membuka.
            </p>
          )}
        </LinkField>

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
      isAnnouncedFinalist={finalistNotice?.is_finalist === true}
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
          finalPresentation={finalPresentation}
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
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3.5">
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
              {!isSubmitted && <SubmissionChecklist items={checklistItems} />}
              {showcaseCard}
              {helpCard}
            </div>
          </div>

          <JourneyTrack serverNowIso={serverNowIso} deadlineIso={deadlineIso} />
        </>
      ) : (
        <>
          <JourneyTrack serverNowIso={serverNowIso} deadlineIso={deadlineIso} />

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

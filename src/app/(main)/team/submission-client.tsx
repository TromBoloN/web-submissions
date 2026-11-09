"use client";

import { Fragment, useEffect, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "cn";
import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";
import { formatDeadlineMultiZone, formatDeadlineWita } from "@/lib/deadline";
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
  showcasePublishedAt: string | null;
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
      className="h-8 gap-1.5 border-primary/25 bg-primary/5 text-foreground hover:bg-primary/10 hover:text-foreground dark:border-white/30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white"
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
    totalMs: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    if (!deadlineIso) return;
    const target = new Date(deadlineIso).getTime();

    const calculate = () => {
      const now = Date.now() + clockOffset;
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isPast: true });
        onExpire();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff, isPast: false });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [deadlineIso, clockOffset, onExpire]);

  if (!timeLeft) {
    return <span className="text-muted-foreground text-xs">Menghitung sisa waktu...</span>;
  }

  if (timeLeft.isPast) {
    return (
      <div className="flex items-center gap-1.5 font-medium text-destructive text-xs">
        <Clock className="size-3.5" />
        <span>Batas waktu telah berakhir (Ditutup)</span>
      </div>
    );
  }

  const isCritical = timeLeft.totalMs <= 3600 * 1000; // <= 1 hour
  const isUrgent = timeLeft.totalMs <= 24 * 3600 * 1000; // <= 24 hours

  const segments = [
    { label: "Hari", value: String(timeLeft.days).padStart(2, "0") },
    { label: "Jam", value: String(timeLeft.hours).padStart(2, "0") },
    { label: "Menit", value: String(timeLeft.minutes).padStart(2, "0") },
    { label: "Detik", value: String(timeLeft.seconds).padStart(2, "0") },
  ];

  const getUrgencyClass = () => {
    if (isCritical) {
      return "border-destructive/40 bg-destructive/10 text-destructive motion-safe:animate-pulse";
    }
    if (isUrgent) {
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    }
    return "border-primary/20 bg-primary/5 text-primary";
  };

  const urgencyClass = getUrgencyClass();

  return (
    <div className="space-y-1.5">
      <div className="sr-only" aria-live="polite">
        Sisa waktu pengiriman: {timeLeft.days} hari {timeLeft.hours} jam {timeLeft.minutes} menit.
      </div>
      <div className="grid grid-cols-4 gap-1.5" aria-live="off">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`flex flex-col items-center justify-center rounded-md border p-1 text-center ${urgencyClass}`}
          >
            <span className="font-bold text-base tabular-nums tracking-tight sm:text-lg">{seg.value}</span>
            <span className="text-[9px] uppercase tracking-wider opacity-75">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextStepsCard({ serverNowIso }: { serverNowIso: string }) {
  const steps = [
    { start: "2026-11-10", end: "2026-11-10", dates: "10 Nov", title: "Batas pengumpulan karya", desc: "23.59 WITA" },
    {
      start: "2026-11-11",
      end: "2026-11-17",
      dates: "11–17 Nov",
      title: "Penilaian Babak Awal",
      desc: "Dewan juri mengevaluasi seluruh karya terkirim.",
    },
    {
      start: "2026-11-18",
      end: "2026-11-18",
      dates: "18 Nov",
      title: "Pengumuman Top 5",
      desc: "Daftar finalis resmi diumumkan di portal & media.",
    },
    {
      start: "2026-11-21",
      end: "2026-11-21",
      dates: "21 Nov",
      title: "Babak Final",
      desc: "Sesi presentasi karya (10m presentasi + 10m Q&A).",
    },
    {
      start: "2026-11-25",
      end: "2026-11-25",
      dates: "25 Nov",
      title: "Pengumuman Juara",
      desc: "Penetapan dan selebrasi pemenang MIT-WEEK 2026.",
    },
  ];
  const serverDate = new Date(serverNowIso);
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(serverDate);
  const today = `${dateParts.find((part) => part.type === "year")?.value}-${dateParts.find((part) => part.type === "month")?.value}-${dateParts.find((part) => part.type === "day")?.value}`;
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(serverDate);
  const firstFutureIndex = steps.findIndex((step) => step.start > today);
  const markerIndex = firstFutureIndex === -1 ? steps.length : firstFutureIndex;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="size-4 text-primary" />
          Langkah Berikutnya
        </CardTitle>
        <CardDescription className="text-xs">
          Linimasa penting kompetisi setelah tahap pengumpulan karya.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4 p-4 pl-8">
        <div className="absolute top-0 bottom-0 left-3 w-px bg-border" />
        {steps.map((st, index) => {
          const isPast = st.end < today;
          const isActive = !isPast && st.start <= today && today <= st.end;

          return (
            <Fragment key={st.title}>
              {index === markerIndex && (
                <div className="flex items-center gap-2 font-medium text-[10px] text-muted-foreground">
                  <span className="size-2.5 rounded-full border-2 border-background bg-primary" />
                  <span>Hari ini · {todayLabel}</span>
                </div>
              )}
              <div className={cn("relative flex items-start gap-3 text-xs", isPast && "text-muted-foreground")}>
                <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full border-2 border-background bg-primary" />
                <div className="min-w-0">
                  <p className={cn("font-medium", !isPast && "text-foreground")}>
                    <span className="mr-2 font-sans text-[11px] text-muted-foreground tabular-nums">{st.dates}</span>
                    {isPast && <CheckCircle2 className="mr-1 inline size-3.5 text-emerald-600 dark:text-emerald-400" />}
                    {st.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-normal">{st.desc}</p>
                  {isActive && <p className="mt-0.5 font-medium text-[11px] text-primary">Sedang berlangsung</p>}
                </div>
              </div>
            </Fragment>
          );
        })}
        {markerIndex === steps.length && (
          <div className="flex items-center gap-2 font-medium text-[10px] text-muted-foreground">
            <span className="size-2.5 rounded-full border-2 border-background bg-primary" />
            <span>Hari ini · {todayLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
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
  let showcaseStatus = "Belum ikut dipamerkan.";
  if (showcasePublishedAt) {
    showcaseStatus = "Tampilan karya telah dikunci karena galeri sudah diterbitkan.";
  } else if (consent) {
    showcaseStatus = "Karya akan dipamerkan.";
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="size-4 text-primary" />
          Pamerkan karya kamu
        </CardTitle>
        <CardDescription className="text-xs">
          Galeri tidak menampilkan nilai atau peringkat. Pemenang diumumkan terpisah. Setelah galeri diterbitkan,
          permintaan penghapusan dapat diajukan kepada panitia dan diproses secara manual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {!isSubmitted ? (
          <p className="text-muted-foreground text-xs">
            Kirim submission terlebih dahulu untuk memilih apakah karya akan dipamerkan.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-xs">{showcaseStatus}</p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/team/karya">{showcasePublishedAt ? "Lihat tampilan karya" : "Atur tampilan karya"}</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SubmissionStatusHero({
  team,
  submission,
  isClosed,
  isDisqualified,
  deadlineIso,
  serverNowIso,
  onExpire,
}: {
  team: Team;
  submission: Submission | null;
  isClosed: boolean;
  isDisqualified: boolean;
  deadlineIso: string | null;
  serverNowIso: string;
  onExpire: () => void;
}) {
  const isSubmitted = submission?.status === "submitted";
  const hasDraft = Boolean(submission && !isSubmitted);
  const githubFilled = Boolean(submission?.github_url?.trim());
  const liveDemoFilled = Boolean(submission?.live_demo_url?.trim());
  const videoFilled = Boolean(submission?.video_url?.trim());

  const missing: string[] = [];
  if (!githubFilled) missing.push("GitHub");
  if (!liveDemoFilled) missing.push("Live Demo");
  if (!videoFilled) missing.push("Video Demo");

  const heroTitle = (() => {
    if (isDisqualified) return "Tim Didiskualifikasi";
    if (isClosed && isSubmitted) return "Pengiriman Ditutup (Karya Tercatat)";
    if (isClosed && !isSubmitted) return "Pengiriman Ditutup (Tidak Ada Berkas)";
    if (isSubmitted) return "Karya Terkirim";
    if (hasDraft) return "Draf Tersimpan Sementara";
    return "Belum Ada Karya Tersimpan";
  })();

  const heroDescription = (() => {
    if (isDisqualified) {
      return "Akun tim Anda dinonaktifkan oleh panitia. Hubungi panitia untuk informasi lebih lanjut.";
    }
    if (isClosed && isSubmitted) {
      return "Batas waktu telah berakhir. Karya tim Anda telah tercatat dan siap untuk dinilai oleh dewan juri.";
    }
    if (isClosed && !isSubmitted) {
      return "Batas waktu pengiriman telah berakhir dan tim Anda belum mengumpulkan karya resmi.";
    }
    if (isSubmitted) {
      return `Bisa diperbarui sampai ${formatDeadlineWita(deadlineIso)}`;
    }
    return "Isi tiga tautan, simpan draf, lalu kirim sebelum batas waktu.";
  })();
  const multiZoneDeadline = formatDeadlineMultiZone(deadlineIso);

  return (
    <div className="portal-hero rounded-2xl p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {isSubmitted && <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
            <span className="font-semibold text-lg sm:text-xl">{heroTitle}</span>
            {hasDraft && !isClosed && (
              <Badge
                variant="secondary"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                Draf
              </Badge>
            )}
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-background/50 px-2.5 py-1 dark:border-white/20 dark:bg-white/10">
            <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">Kode Tim</span>
            <span className="font-bold font-mono text-foreground text-sm">{team.team_code}</span>
            <CopyButton value={team.team_code} />
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">{heroDescription}</p>
          {!isClosed && !isDisqualified && (
            <p className="font-sans text-foreground text-xs tabular-nums sm:whitespace-nowrap">
              Batas: {multiZoneDeadline?.wita ?? formatDeadlineWita(deadlineIso)}
              {multiZoneDeadline && ` · ${multiZoneDeadline.wib} · ${multiZoneDeadline.wit}`}
            </p>
          )}
        </div>

        {/* Copyable team code chip */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
          {!isClosed && !isDisqualified && (
            <div className="rounded-lg border border-primary/20 bg-background/50 p-2 dark:border-white/20 dark:bg-white/10">
              <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wider dark:text-white/75">
                Sisa waktu
              </p>
              <CountdownTimer deadlineIso={deadlineIso} serverNowIso={serverNowIso} onExpire={onExpire} />
            </div>
          )}
        </div>
      </div>
    </div>
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
  juknisUrl,
  contactWhatsapp,
  showcasePublishedAt,
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
  const [isFormExpanded, setIsFormExpanded] = useState(!isSubmitted);
  const [isTeamInfoOpen, setIsTeamInfoOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <FinalistBanner notice={finalistNotice} />

      {/* 1. State-Driven Hero with Stepper */}
      <SubmissionStatusHero
        team={team}
        submission={submission}
        isClosed={isClosed}
        isDisqualified={isDisqualified}
        deadlineIso={deadlineIso}
        serverNowIso={serverNowIso}
        onExpire={() => setIsCountdownZero(true)}
      />

      {/* 2. Urgent State Alerts */}
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

      {/* 3. Main Two-Column Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column (col-span-2) */}
        <div className="space-y-6 md:col-span-2">
          {/* If already submitted, receipt is shown prominently */}
          {isSubmitted && submission && <SubmissionReceipt team={team} submission={submission} />}

          {/* If already submitted, collapse the form behind an expander */}
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

          {/* Form Card */}
          {(!isSubmitted || isFormExpanded) && (
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
                        fieldErrors.github_url
                          ? "github_url_error github_url_status"
                          : "github_url_help github_url_status"
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
                      className={
                        fieldErrors.github_url ? "border-destructive pr-10 focus-visible:ring-destructive" : "pr-10"
                      }
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
                      Tautan aplikasi web yang sudah di-deploy dan dapat diuji secara langsung oleh publik (Vercel,
                      Netlify, dsb).
                    </p>
                  )}
                  <LinkCheckBadge
                    item={linkCheck?.liveDemo}
                    isChecking={isCheckingLinks}
                    statusId="live_demo_url_status"
                  />
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
                      className={
                        fieldErrors.video_url ? "border-destructive pr-10 focus-visible:ring-destructive" : "pr-10"
                      }
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
                      Tautan video demonstrasi proyek berdurasi <strong>maksimal 5 menit</strong> (Juknis C.8). YouTube
                      atau Google Drive dengan izin akses publik.
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
          )}
        </div>

        {/* Right Rail (col-span-1, quiet rail) */}
        <div className="space-y-6">
          {/* 1. Resource links */}
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm" className="justify-start gap-2">
              <Link href="/team/studi-kasus">
                <BookOpen className="size-4 text-primary" />
                <span>Lihat Studi Kasus</span>
              </Link>
            </Button>
            {juknisUrl?.startsWith("https://") && (
              <Button asChild variant="outline" size="sm" className="justify-start gap-2">
                <a href={juknisUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="size-4 text-primary" />
                  <span>Buka Juknis</span>
                </a>
              </Button>
            )}
          </div>

          {/* 2. Submission checklist */}
          {!isSubmitted && <SubmissionChecklist />}

          {/* 3. Showcase consent */}
          <ShowcaseConsentCard
            isSubmitted={isSubmitted}
            consent={team.showcase_consent}
            showcasePublishedAt={showcasePublishedAt}
          />

          {/* 4. Next Steps Timeline */}
          <NextStepsCard serverNowIso={serverNowIso} />

          {/* 5. Compact Team Info (No duplicate team code!) */}
          <Card className="gap-0 py-0">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>Informasi Tim</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTeamInfoOpen((prev) => !prev)}
                  className="h-7 gap-1 px-2 text-muted-foreground text-xs"
                  aria-expanded={isTeamInfoOpen}
                >
                  {isTeamInfoOpen ? "Tutup" : "Lihat"}
                  {isTeamInfoOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </Button>
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                {team.team_name} · {team.institution}
              </p>
            </CardHeader>
            {isTeamInfoOpen && (
              <CardContent className="space-y-2.5 p-4 pt-0 text-xs">
                <div>
                  <span className="text-muted-foreground">Nama Tim:</span>
                  <p className="font-semibold text-foreground text-sm">{team.team_name}</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Institusi:</span>
                  <p className="text-foreground">{team.institution}</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Ketua Tim:</span>
                  <p className="font-medium text-foreground">{team.leader_name}</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Anggota:</span>
                  <p className="text-foreground">{team.members.join(", ")}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 6. Quiet Help Card */}
          <Card className="gap-0 py-0">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="size-4 text-primary" />
                Butuh bantuan?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm">
              <p className="text-muted-foreground text-xs">
                Mengalami kendala saat mengirim karya? Hubungi panitia melalui WhatsApp.
              </p>
              {contactWhatsapp ? (
                <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                  <a href={toWhatsAppUrl(contactWhatsapp)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-left text-xs">
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
        </div>
      </div>

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

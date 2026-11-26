"use client";

import { type ReactNode, useEffect, useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import {
  AlertOctagon,
  ArrowRight,
  BookText,
  CheckCircle2,
  Circle,
  Clock,
  Mic,
  ScanSearch,
  Sparkles,
  Trophy,
} from "lucide-react";

import { useEventInfo, useSchedule } from "@/components/event-info-provider";
import { Button } from "@/components/ui/button";
import { formatStageDateLong, formatStageDates, getStage, type SystemStageKey } from "@/lib/competition-info";
import { formatDeadlineMultiZone, formatDeadlineWita } from "@/lib/deadline";

import type { FinalistNoticeData, TeamPhase } from "./team-phase";
import { daysBetweenDateKeys, type FinalPresentation, toWitaDateKey } from "./team-schedule";

type SubmissionState = "none" | "draft" | "submitted";

export type TeamHeroProps = {
  phase: TeamPhase;
  submissionState: SubmissionState;
  deadlineIso: string | null;
  serverNowIso: string;
  onExpire: () => void;
  finalistNotice: FinalistNoticeData | null;
  resultsReleased: boolean;
  /** From get_my_final_presentation(); null for non-finalists or if the RPC failed. */
  finalPresentation: FinalPresentation | null;
  /** Current form values, so the open-phase checklist updates while typing. */
  liveLinks: { github: string; liveDemo: string; video: string };
  hasUnsavedChanges: boolean;
};

const GITHUB_PATTERN = /^https:\/\/github\.com\/.+/i;
const HTTP_PATTERN = /^https?:\/\/.+/i;

function formatTimestampWita(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)} WITA`;
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
  // Offset between the server clock at page load and the browser clock, so the device clock never decides.
  const [clockOffset] = useState(() => new Date(serverNowIso).getTime() - Date.now());
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
      const diff = target - (Date.now() + clockOffset);
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isPast: true });
        onExpire();
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
        totalMs: diff,
        isPast: false,
      });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [deadlineIso, clockOffset, onExpire]);

  if (!deadlineIso) {
    return <p className="text-hero-fg-muted text-xs">Batas waktu belum diatur panitia.</p>;
  }

  if (!timeLeft) {
    return <p className="text-hero-fg-muted text-xs">Menghitung sisa waktu...</p>;
  }

  if (timeLeft.isPast) {
    return (
      <p className="flex items-center gap-1.5 font-medium text-destructive text-xs">
        <Clock className="size-3.5" />
        Batas waktu telah berakhir
      </p>
    );
  }

  const isCritical = timeLeft.totalMs <= 3_600_000;
  const isUrgent = timeLeft.totalMs <= 86_400_000;
  const segments = [
    { label: "Hari", value: timeLeft.days },
    { label: "Jam", value: timeLeft.hours },
    { label: "Menit", value: timeLeft.minutes },
    { label: "Detik", value: timeLeft.seconds },
  ];

  return (
    <div>
      <div className="sr-only" aria-live="polite">
        Sisa waktu pengiriman: {timeLeft.days} hari {timeLeft.hours} jam {timeLeft.minutes} menit.
      </div>
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={cn(
              "flex flex-col items-center rounded-xl border-2 border-ink bg-card px-1 py-2 text-ink shadow-brutal-sm",
              isUrgent && !isCritical && "border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300",
              isCritical && "border-destructive text-destructive motion-safe:animate-pulse",
            )}
          >
            <span className="font-display font-extrabold text-2xl tabular-nums leading-none sm:text-3xl">
              {String(seg.value).padStart(2, "0")}
            </span>
            <span className="mt-1 font-mono text-[11px] uppercase tracking-wider opacity-90">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-card px-3 py-1 font-bold font-mono text-[11px] text-ink uppercase tracking-wider shadow-brutal-sm">
      <span className="size-2 rounded-full bg-mint" aria-hidden="true" />
      {children}
    </span>
  );
}

function LoudShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      aria-label="Status tim"
      className={cn("surface-loud guardian-hero-mesh overflow-hidden p-5 sm:p-7", className)}
    >
      {children}
    </section>
  );
}

function CalmShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section aria-label="Status tim" className={cn("surface-calm space-y-4 p-5 sm:p-6", className)}>
      {children}
    </section>
  );
}

function NoticeMessage({ notice }: { notice: FinalistNoticeData | null }) {
  const message = notice?.message.trim();
  if (!message) return null;

  return (
    <div className="space-y-1.5">
      <p className="whitespace-pre-wrap rounded-xl border border-border bg-background/70 p-4 text-foreground text-sm leading-relaxed">
        {message}
      </p>
      {notice?.published_at && (
        <p className="text-muted-foreground text-xs">Dipublikasikan: {formatTimestampWita(notice.published_at)}</p>
      )}
    </div>
  );
}

function ResultsLink({ label }: { label: string }) {
  return (
    <Button asChild variant="outline" className="press btn-loud w-fit gap-2 rounded-full bg-card">
      <Link href="/team/hasil">
        {label}
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}

function LiveChecklist({
  liveLinks,
  hasUnsavedChanges,
}: {
  liveLinks: TeamHeroProps["liveLinks"];
  hasUnsavedChanges: boolean;
}) {
  const items = [
    { id: "github", label: "Repositori GitHub", ok: GITHUB_PATTERN.test(liveLinks.github.trim()) },
    { id: "demo", label: "Live demo publik", ok: HTTP_PATTERN.test(liveLinks.liveDemo.trim()) },
    { id: "video", label: "Video demo (maks. 5 menit)", ok: HTTP_PATTERN.test(liveLinks.video.trim()) },
  ];
  const doneCount = items.filter((item) => item.ok).length;

  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4 text-card-foreground shadow-brutal-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-bold font-mono text-[11px] text-ink uppercase tracking-wider">Kelengkapan</p>
        <span className="font-mono text-foreground/75 text-xs tabular-nums">
          {doneCount}/{items.length} tautan
        </span>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            {item.ok ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={cn(!item.ok && "text-muted-foreground")}>{item.label}</span>
            <span className="sr-only">{item.ok ? "sudah terisi" : "belum terisi"}</span>
          </li>
        ))}
        <li className="flex items-start gap-2 border-border border-t border-dashed pt-2 text-muted-foreground text-xs">
          <BookText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>README yang jelas tidak dicek otomatis. Pastikan sudah siap di repositori.</span>
        </li>
      </ul>
      {hasUnsavedChanges && (
        <p className="mt-3 text-amber-700 text-xs dark:text-amber-300">
          Ada perubahan di formulir yang belum disimpan.
        </p>
      )}
    </div>
  );
}

function OpenHero(props: TeamHeroProps) {
  const { submissionState, deadlineIso } = props;
  const multiZone = formatDeadlineMultiZone(deadlineIso);

  const copy = {
    none: { title: "Belum dikirim", desc: "Isi tiga tautan, simpan draf, lalu kirim sebelum batas waktu." },
    draft: { title: "Masih draf", desc: "Draf belum ikut dinilai. Kirim sebelum batas waktu agar tercatat." },
    submitted: { title: "Terkirim.", desc: `Masih bisa diperbarui sampai ${formatDeadlineWita(deadlineIso)}.` },
  }[submissionState];

  return (
    <LoudShell>
      <Eyebrow>Fase · Pengumpulan karya</Eyebrow>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start">
        <div className="min-w-0 space-y-3">
          <h1 className="team-hero-title">{copy.title}</h1>
          <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">{copy.desc}</p>
          {multiZone && (
            <p className="font-mono text-hero-fg text-xs tabular-nums">
              Batas: {multiZone.wita} · {multiZone.wib} · {multiZone.wit}
            </p>
          )}
          <div className="max-w-sm pt-1">
            <p className="mb-2 font-bold font-mono text-[11px] text-hero-fg uppercase tracking-wider">Sisa waktu</p>
            <CountdownTimer
              deadlineIso={props.deadlineIso}
              serverNowIso={props.serverNowIso}
              onExpire={props.onExpire}
            />
          </div>
        </div>
        <LiveChecklist liveLinks={props.liveLinks} hasUnsavedChanges={props.hasUnsavedChanges} />
      </div>
    </LoudShell>
  );
}

/** Big "N hari lagi" tile that fills the hero's right side until the next milestone. */
function MilestoneTile({
  label,
  stepId,
  serverNowIso,
  pendingText,
}: {
  label: string;
  stepId: SystemStageKey;
  serverNowIso: string;
  /** Shown instead of a count once the date has passed but the milestone has not happened yet. */
  pendingText: string;
}) {
  const step = getStage(useSchedule(), stepId);
  const dates = formatStageDates(step);
  const days = daysBetweenDateKeys(toWitaDateKey(serverNowIso), step.starts_on);

  let value = String(days);
  let unit = "hari lagi";
  let sentence = `${label} dalam ${days} hari, pada ${dates}.`;
  if (days === 0) {
    value = "Hari ini";
    unit = "";
    sentence = `${label} hari ini.`;
  } else if (days < 0) {
    value = "Segera";
    unit = "";
    sentence = `${label}: ${pendingText}`;
  }

  return (
    <div className="w-full shrink-0 rounded-2xl border-2 border-ink bg-card p-4 text-card-foreground shadow-brutal-sm sm:w-56">
      <p className="sr-only">{sentence}</p>
      <div aria-hidden="true">
        <p className="font-bold font-mono text-foreground/75 text-xs uppercase tracking-wider">{label}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display font-extrabold text-5xl text-ink tabular-nums leading-none">{value}</span>
          {unit && <span className="font-semibold text-foreground/80 text-sm">{unit}</span>}
        </p>
        <p className="mt-2 font-mono text-foreground/75 text-xs">{days < 0 ? pendingText : dates}</p>
      </div>
    </div>
  );
}

function ClosedHero(props: TeamHeroProps) {
  const review = getStage(useSchedule(), "review");

  return (
    <LoudShell>
      <Eyebrow>Fase · Pengiriman ditutup</Eyebrow>
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-3">
          <h1 className="team-hero-title team-hero-title-outline">Terkunci.</h1>
          <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
            Karya tim Anda sudah tercatat dan siap dinilai dewan juri. Penilaian dimulai {formatStageDates(review)}.
          </p>
        </div>
        <MilestoneTile
          label="Penilaian dimulai"
          stepId="review"
          serverNowIso={props.serverNowIso}
          pendingText="Dewan juri mulai menilai."
        />
      </div>
    </LoudShell>
  );
}

function ReviewHero(props: TeamHeroProps) {
  const { finalist_count } = useEventInfo();
  const schedule = useSchedule();
  const review = getStage(schedule, "review");
  const top5 = getStage(schedule, "top5");

  return (
    <LoudShell>
      <Eyebrow>Fase · {review.title}</Eyebrow>
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <ScanSearch className="size-7 shrink-0 text-ink" aria-hidden="true" />
            <h1 className="font-display font-extrabold text-3xl text-hero-fg tracking-tight sm:text-4xl">
              Juri sedang menilai
            </h1>
          </div>
          <div className="team-scan max-w-md" aria-hidden="true" />
          <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
            Tidak ada yang perlu dilakukan sekarang. Karya Anda aman tercatat. Penilaian berlangsung{" "}
            {formatStageDates(review)}, pengumuman Top {finalist_count} pada {formatStageDates(top5)}.
          </p>
        </div>
        <MilestoneTile
          label={`Top ${finalist_count} diumumkan`}
          stepId="top5"
          serverNowIso={props.serverNowIso}
          pendingText="Menunggu pengumuman panitia."
        />
      </div>
    </LoudShell>
  );
}

const FINAL_FALLBACK: FinalPresentation = {
  presentation_minutes: 10,
  qa_minutes: 10,
  venue: null,
  meeting_url: null,
  note: "Urutan tampil serta lokasi atau tautan sesi akan dikirim langsung oleh panitia.",
};

function FinalDetails({
  serverNowIso,
  presentation,
}: {
  serverNowIso: string;
  presentation: FinalPresentation | null;
}) {
  const final = getStage(useSchedule(), "final");
  const days = daysBetweenDateKeys(toWitaDateKey(serverNowIso), final.starts_on);
  const info = presentation ?? FINAL_FALLBACK;
  const details = [{ label: "Presentasi", value: `${info.presentation_minutes} menit` }];
  if (info.qa_minutes > 0) details.push({ label: "Tanya jawab", value: `${info.qa_minutes} menit` });
  const meetingUrl = info.meeting_url?.startsWith("https://") ? info.meeting_url : null;

  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4 text-card-foreground shadow-brutal-sm">
      <p className="flex items-center gap-2 font-bold font-mono text-ink text-xs uppercase tracking-wider">
        <Mic className="size-3.5" aria-hidden="true" />
        Babak Final · {formatStageDateLong(final.starts_on)}
      </p>
      {days > 0 && (
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display font-extrabold text-4xl text-ink tabular-nums leading-none">{days}</span>
          <span className="font-semibold text-foreground/80 text-sm">hari lagi</span>
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {details.map((item) => (
          <div key={item.label}>
            <dt className="text-foreground/75 text-xs">{item.label}</dt>
            <dd className="font-display font-extrabold text-xl">{item.value}</dd>
          </div>
        ))}
      </dl>
      {(info.venue || meetingUrl) && (
        <div className="mt-3 space-y-1 text-sm">
          {info.venue && (
            <p>
              <span className="text-foreground/75 text-xs">Lokasi: </span>
              <span className="font-semibold">{info.venue}</span>
            </p>
          )}
          {meetingUrl && (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-4"
            >
              Buka tautan sesi
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
      {info.note && <p className="mt-3 text-foreground/75 text-xs">{info.note}</p>}
    </div>
  );
}

function FinalistHero(props: TeamHeroProps) {
  const { event_name, finalist_count } = useEventInfo();
  return (
    <LoudShell>
      <Eyebrow>Hasil Babak Awal</Eyebrow>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="team-pop inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mint px-3 py-1 font-bold font-mono text-ink text-xs uppercase tracking-wider shadow-brutal-sm dark:text-ink-foreground">
              <Trophy className="size-3.5" aria-hidden="true" />
              Top {finalist_count}
            </span>
            {[0, 1, 2].map((index) => (
              <Sparkles
                key={index}
                className="team-pop size-5 text-guardian-accent"
                style={{ animationDelay: `${150 + index * 120}ms` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <h1 className="team-hero-title">Finalis!</h1>
          <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
            Selamat, tim Anda lolos ke Babak Final {event_name}. Siapkan presentasi terbaik kalian.
          </p>
          <NoticeMessage notice={props.finalistNotice} />
          {props.resultsReleased && <ResultsLink label="Lihat masukan juri" />}
        </div>
        <FinalDetails serverNowIso={props.serverNowIso} presentation={props.finalPresentation} />
      </div>
    </LoudShell>
  );
}

function FinalHero(props: TeamHeroProps) {
  const schedule = useSchedule();
  return (
    <LoudShell>
      <Eyebrow>Fase · Babak Final</Eyebrow>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <h1 className="team-hero-title">Babak Final</h1>
          <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
            Saatnya tampil. Hasil akhir diumumkan {formatStageDates(getStage(schedule, "winners"))} setelah seluruh
            finalis presentasi.
          </p>
          <NoticeMessage notice={props.finalistNotice} />
        </div>
        <FinalDetails serverNowIso={props.serverNowIso} presentation={props.finalPresentation} />
      </div>
    </LoudShell>
  );
}

function ResultsHero() {
  const { event_name } = useEventInfo();
  return (
    <LoudShell>
      <Eyebrow>Fase · Pengumuman juara</Eyebrow>
      <div className="mt-6 space-y-4">
        <h1 className="team-hero-title">Hasil final</h1>
        <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
          Hasil Babak Final sudah diumumkan. Terima kasih sudah tampil sebagai finalis {event_name}.
        </p>
        <ResultsLink label="Lihat hasil penilaian" />
      </div>
    </LoudShell>
  );
}

function NotFinalistHero(props: TeamHeroProps) {
  const { event_name, finalist_count } = useEventInfo();
  return (
    <CalmShell>
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Hasil Babak Awal</p>
      <h1 className="font-display font-extrabold text-2xl tracking-tight sm:text-3xl">
        Terima kasih sudah berkompetisi.
      </h1>
      <p className="max-w-2xl text-muted-foreground text-sm">
        Tim Anda belum masuk Top {finalist_count} kali ini. Karya Anda tetap tercatat dan menjadi bagian dari{" "}
        {event_name}.
      </p>
      <NoticeMessage notice={props.finalistNotice} />
      {props.resultsReleased && (
        <Button asChild variant="outline" className="press w-fit gap-2">
          <Link href="/team/hasil">
            Lihat masukan juri
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      )}
    </CalmShell>
  );
}

function MissedHero() {
  return (
    <CalmShell>
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Pengiriman ditutup</p>
      <h1 className="font-display font-extrabold text-2xl tracking-tight sm:text-3xl">Tidak ada karya tercatat</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">
        Batas waktu pengiriman telah berakhir dan tim Anda belum mengirim karya resmi. Hubungi panitia jika ada kendala.
      </p>
    </CalmShell>
  );
}

function DisqualifiedHero() {
  return (
    <CalmShell className="border-destructive/40">
      <div className="flex items-center gap-2 text-destructive">
        <AlertOctagon className="size-5" aria-hidden="true" />
        <h1 className="font-display font-extrabold text-2xl tracking-tight">Tim didiskualifikasi</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground text-sm">
        Akun tim Anda dinonaktifkan oleh panitia, dan submission tidak dapat diubah. Hubungi panitia untuk informasi
        lebih lanjut.
      </p>
    </CalmShell>
  );
}

export function TeamHero(props: TeamHeroProps) {
  switch (props.phase) {
    case "open":
      return <OpenHero {...props} />;
    case "closed":
      return <ClosedHero {...props} />;
    case "review":
      return <ReviewHero {...props} />;
    case "finalist":
      return <FinalistHero {...props} />;
    case "final":
      return <FinalHero {...props} />;
    case "results":
      return <ResultsHero />;
    case "not-finalist":
      return <NotFinalistHero {...props} />;
    case "missed":
      return <MissedHero />;
    case "disqualified":
      return <DisqualifiedHero />;
  }
}

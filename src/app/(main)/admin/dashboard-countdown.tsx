"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { CalendarClock, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isPast: boolean;
};

type LiveCountdownProps = {
  deadlineIso: string | null;
  deadlineLabel: string;
  serverNowIso: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function LiveCountdown({ deadlineIso, deadlineLabel, serverNowIso }: LiveCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!deadlineIso) {
      setTimeLeft(null);
      return;
    }

    const deadline = new Date(deadlineIso).getTime();
    if (Number.isNaN(deadline)) {
      setTimeLeft(null);
      return;
    }

    const offset = new Date(serverNowIso).getTime() - Date.now();

    const calculate = () => {
      const diff = deadline - (Date.now() + offset);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isPast: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
        totalMs: diff,
        isPast: false,
      });
    };

    calculate();
    const timer = window.setInterval(calculate, 1_000);
    return () => window.clearInterval(timer);
  }, [deadlineIso, serverNowIso]);

  if (!deadlineIso) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed bg-gradient-to-br from-muted/40 via-card to-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <CalendarClock aria-hidden="true" className="size-4 text-muted-foreground" />
              Batas submission belum diatur
            </p>
            <p className="text-muted-foreground text-sm">
              Tetapkan batas waktu agar hitung mundur dan status fase kompetisi aktif.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/pengaturan">Buka Pengaturan</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock aria-hidden="true" className="size-4" />
          Menghitung sisa waktu...
        </div>
      </div>
    );
  }

  if (timeLeft.isPast) {
    return (
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/50 via-card to-card p-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-muted-foreground/30 bg-muted text-muted-foreground" variant="outline">
              Ditutup
            </Badge>
            <span className="text-muted-foreground text-xs">{deadlineLabel}</span>
          </div>
          <p className="font-semibold text-xl">Batas submission telah berakhir</p>
          <p className="text-muted-foreground text-sm">
            Submission terkunci. Lanjutkan ke tahap penilaian sesuai linimasa di bawah.
          </p>
        </div>
      </div>
    );
  }

  let urgency: "calm" | "amber" | "urgent" = "calm";
  if (timeLeft.totalMs <= 12 * 3_600_000) {
    urgency = "urgent";
  } else if (timeLeft.totalMs <= 48 * 3_600_000) {
    urgency = "amber";
  }

  const tone = {
    calm: {
      card: "border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card",
      glow: "from-primary/30",
      digit: "border-primary/15 bg-primary/5 text-primary",
      badge: "border-primary/30 bg-primary/10 text-primary",
      label: "Aman",
    },
    amber: {
      card: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card",
      glow: "from-amber-500/30",
      digit: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      label: "Perhatikan",
    },
    urgent: {
      card: "border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card",
      glow: "from-destructive/30",
      digit: "border-destructive/25 bg-destructive/10 text-destructive motion-safe:animate-pulse",
      badge: "border-destructive/30 bg-destructive/10 text-destructive",
      label: "Mendesak",
    },
  }[urgency];

  const segments = [
    { label: "Hari", value: pad(timeLeft.days) },
    { label: "Jam", value: pad(timeLeft.hours) },
    { label: "Menit", value: pad(timeLeft.minutes) },
    { label: "Detik", value: pad(timeLeft.seconds) },
  ];

  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 ${tone.card}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-gradient-to-br ${tone.glow} to-transparent blur-2xl`}
      />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Menuju batas submission</p>
            <p className="font-medium text-sm">{deadlineLabel}</p>
          </div>
          <Badge className={tone.badge} variant="outline">
            <Clock aria-hidden="true" className="size-3" />
            {tone.label}
          </Badge>
        </div>

        <div aria-live="off" className="grid grid-cols-4 gap-2">
          {segments.map((segment) => (
            <div
              className={`flex flex-col items-center justify-center rounded-lg border px-1 py-2 text-center ${tone.digit}`}
              key={segment.label}
            >
              <span className="font-bold text-2xl tabular-nums tracking-tight sm:text-4xl">{segment.value}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-75">{segment.label}</span>
            </div>
          ))}
        </div>

        <p aria-live="polite" className="sr-only">
          Sisa waktu submission: {timeLeft.days} hari {timeLeft.hours} jam {timeLeft.minutes} menit.
        </p>
        <p className="text-muted-foreground text-xs">
          Dihitung dari jam server, bukan jam perangkat. Waktu dalam WITA.
        </p>
      </div>
    </div>
  );
}

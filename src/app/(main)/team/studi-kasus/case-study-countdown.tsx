"use client";

import { useEffect, useState } from "react";

import { Clock } from "lucide-react";

type CaseStudyCountdownProps = {
  deadlineIso: string | null;
  serverNowIso: string;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
};

export function CaseStudyCountdown({ deadlineIso, serverNowIso }: CaseStudyCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!deadlineIso) return;

    const offset = new Date(serverNowIso).getTime() - Date.now();
    const deadline = new Date(deadlineIso).getTime();
    const updateTimeLeft = () => {
      const remaining = deadline - (Date.now() + offset);
      if (remaining <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, isPast: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(remaining / 86_400_000),
        hours: Math.floor((remaining % 86_400_000) / 3_600_000),
        minutes: Math.floor((remaining % 3_600_000) / 60_000),
        isPast: false,
      });
    };

    updateTimeLeft();
    const interval = window.setInterval(updateTimeLeft, 60_000);
    return () => window.clearInterval(interval);
  }, [deadlineIso, serverNowIso]);

  if (!deadlineIso) return null;

  let countdownText = "Menghitung sisa waktu...";
  if (timeLeft?.isPast) {
    countdownText = "Batas pengiriman telah berakhir";
  } else if (timeLeft) {
    countdownText = `Sisa waktu: ${timeLeft.days} hari ${timeLeft.hours} jam ${timeLeft.minutes} menit`;
  }

  return (
    <p aria-live="polite" className="flex items-center justify-center gap-1.5 text-primary text-sm sm:justify-start">
      <Clock aria-hidden="true" className="size-4" />
      {countdownText}
    </p>
  );
}

"use client";

import { useState } from "react";

import { cn } from "cn";
import { Award } from "lucide-react";
import { toast } from "sonner";

import { createJudgeCardImage, shareOrDownload } from "@/app/(main)/_components/ranking/share-card";
import { APP_CONFIG } from "@/config/app-config";
import logo from "@/styles/flag-icons/MIT-WEEK, WEB LOGO.png";

export const JUDGE_STAGE_TEXT: Record<"preliminary" | "final" | "both", string> = {
  preliminary: "Babak awal",
  final: "Babak final",
  both: "Babak awal & final",
};

/** Draws the judge appreciation PNG and opens the share sheet, or downloads it. */
export function JudgeCardButton({
  judgeName,
  stageText,
  teamsJudged,
  className,
}: {
  judgeName: string;
  stageText: string;
  teamsJudged: number;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const blob = await createJudgeCardImage({
        judgeName,
        stageText,
        teamsJudged,
        eventName: APP_CONFIG.name,
        logoSrc: logo.src,
      });
      const result = await shareOrDownload(blob, "kartu-apresiasi-juri.png", `Apresiasi Juri ${APP_CONFIG.name}`);
      if (result === "downloaded") toast.success("Kartu apresiasi diunduh.");
    } catch {
      toast.error("Gagal membuat kartu apresiasi. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "btn-loud press inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 font-semibold text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 dark:text-ink-foreground",
        className,
      )}
    >
      <Award className="size-4" aria-hidden="true" />
      {busy ? "Menyiapkan kartu…" : "Unduh kartu apresiasi"}
    </button>
  );
}

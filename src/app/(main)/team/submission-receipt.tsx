"use client";

import { useState } from "react";

import { cn } from "cn";
import {
  Check,
  Clapperboard,
  Copy,
  ExternalLink,
  FolderGit2,
  Globe,
  type LucideIcon,
  Printer,
  Stamp,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Submission = Database["public"]["Tables"]["submissions"]["Row"];

type SubmissionReceiptProps = {
  team: Team;
  submission: Submission;
};

function formatWitaWithSeconds(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "medium",
  }).format(date);
}

function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("https://") || url.startsWith("http://");
}

function parseShortUrlLabel(url: string | null | undefined): string {
  if (!url) return "-";
  try {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return trimmed;
    }
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    // GitHub: owner/repo
    if (host === "github.com" || host.endsWith(".github.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return "github.com";
    }

    // YouTube: youtube.com · <id>
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v) return `youtube.com · ${v}`;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1]) return `youtube.com/shorts · ${parts[1]}`;
      return "youtube.com";
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `youtu.be · ${id}`;
      return "youtu.be";
    }

    // Generic: clean hostname
    const cleanHost = host.replace(/^www\./, "");
    const cleanPath = parsed.pathname === "/" ? "" : parsed.pathname;
    if (cleanPath.length > 0 && cleanPath.length <= 15) {
      return `${cleanHost}${cleanPath}`;
    }
    return cleanHost;
  } catch {
    return url;
  }
}

/** Copy icon that morphs into a check mark. */
function MorphCopyIcon({ copied }: { copied: boolean }) {
  return (
    <span className="relative inline-block size-3.5" aria-hidden="true">
      <Copy
        className={cn(
          "absolute inset-0 size-3.5 transition-all duration-200 motion-reduce:transition-none",
          copied ? "scale-0 opacity-0" : "scale-100 opacity-100",
        )}
      />
      <Check
        className={cn(
          "absolute inset-0 size-3.5 text-emerald-600 transition-all duration-200 motion-reduce:transition-none dark:text-emerald-400",
          copied ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
        strokeWidth={3}
      />
    </span>
  );
}

function ReceiptLinkRow({
  label,
  url,
  icon: Icon,
}: {
  label: string;
  url: string | null | undefined;
  icon: LucideIcon;
}) {
  const [copiedRow, setCopiedRow] = useState(false);
  const isValid = isSafeUrl(url);
  const shortLabel = parseShortUrlLabel(url);

  const handleCopyRow = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRow(true);
      toast.success(`Tautan ${label} disalin.`);
      setTimeout(() => setCopiedRow(false), 1500);
    } catch {
      toast.error("Gagal menyalin tautan.");
    }
  };

  return (
    <li className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5 print:border-0 print:bg-transparent print:p-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-ink bg-card text-ink print:hidden">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] text-foreground/75 uppercase tracking-wider">{label}</p>
        {isValid && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
            className="inline-flex max-w-full items-center gap-1 font-medium text-foreground text-sm underline-offset-2 hover:underline"
          >
            <span className="truncate">{shortLabel}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground print:hidden" aria-hidden="true" />
          </a>
        ) : (
          <p className="truncate text-muted-foreground text-sm">{url ? url : "-"}</p>
        )}
        {/* Full URL only on paper, where links can't be clicked. */}
        {isValid && url && <p className="hidden break-all text-xs print:block">{url}</p>}
      </div>
      {isValid && url && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopyRow}
          className="press size-8 shrink-0 text-muted-foreground hover:text-foreground print:hidden"
          aria-label={copiedRow ? `Tautan ${label} tersalin` : `Salin tautan ${label}`}
        >
          <MorphCopyIcon copied={copiedRow} />
        </Button>
      )}
    </li>
  );
}

function generateReceiptNumber(teamCode: string, dateIso: string | null | undefined): string {
  if (!dateIso) return `${teamCode}-PENDING`;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return `${teamCode}-PENDING`;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  const { year: y, month: m, day, hour: hh, minute: mm, second: ss } = parts;
  return `${teamCode}-${y}${m}${day}-${hh}${mm}${ss}`;
}

export function SubmissionReceipt({ team, submission }: SubmissionReceiptProps) {
  const [copied, setCopied] = useState(false);

  const receiptNumber = generateReceiptNumber(team.team_code, submission.first_submitted_at);
  const firstSubmittedFormatted = formatWitaWithSeconds(submission.first_submitted_at);
  const updatedAtFormatted = formatWitaWithSeconds(submission.updated_at);

  const handleCopy = async () => {
    const textToCopy = [
      "BUKTI PENGIRIMAN RESMI MIT-WEEK 2026",
      `No. Bukti: ${receiptNumber}`,
      `Institusi: ${team.institution}`,
      `GitHub: ${submission.github_url || "-"}`,
      `Live demo: ${submission.live_demo_url || "-"}`,
      `Video: ${submission.video_url || "-"}`,
      `Pertama dikirim: ${firstSubmittedFormatted} WITA`,
      `Terakhir diubah: ${updatedAtFormatted} WITA`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Bukti pengiriman berhasil disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin bukti pengiriman.");
    }
  };

  return (
    <section
      aria-labelledby="receipt-title"
      className="receipt-print surface-loud overflow-hidden print:rounded-none print:border print:border-black print:bg-white print:text-black print:shadow-none"
    >
      {/* Ticket body */}
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-1.5 font-bold font-mono text-[11px] text-ink uppercase tracking-wider print:text-black">
              <Ticket className="size-3.5 print:hidden" aria-hidden="true" />
              Bukti pengiriman · MIT-WEEK 2026
            </p>
            <h2 id="receipt-title" className="break-all font-bold font-mono text-foreground text-lg sm:text-xl">
              <span className="sr-only">Nomor bukti </span>
              {receiptNumber}
            </h2>
            <p className="text-muted-foreground text-xs">
              {team.team_name} · {team.institution}
            </p>
          </div>
          <span className="team-stamp shrink-0 text-xs sm:text-sm print:animate-none">
            <Stamp className="size-4" aria-hidden="true" />
            Terkirim
          </span>
        </div>

        <ul className="space-y-2">
          <ReceiptLinkRow label="Repositori" url={submission.github_url} icon={FolderGit2} />
          <ReceiptLinkRow label="Live demo" url={submission.live_demo_url} icon={Globe} />
          <ReceiptLinkRow label="Video demo" url={submission.video_url} icon={Clapperboard} />
        </ul>
      </div>

      {/* Perforation: dashed tear line with punched notches */}
      <div className="relative h-0" aria-hidden="true">
        <span className="absolute top-0 -left-3.5 size-7 -translate-y-1/2 rounded-full border-2 border-ink bg-background print:hidden" />
        <span className="absolute top-0 -right-3.5 size-7 -translate-y-1/2 rounded-full border-2 border-ink bg-background print:hidden" />
        <div className="mx-6 border-ink/40 border-t-2 border-dashed print:mx-0 print:border-black/40" />
      </div>

      {/* Ticket stub */}
      <div className="space-y-4 p-5 sm:p-6">
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Pertama dikirim</dt>
            <dd className="mt-0.5 font-medium text-foreground tabular-nums">{firstSubmittedFormatted} WITA</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Terakhir diperbarui</dt>
            <dd className="mt-0.5 font-medium text-foreground tabular-nums">{updatedAtFormatted} WITA</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="text-muted-foreground text-xs">Simpan atau cetak bukti ini sebagai tanda terima.</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="press btn-loud gap-1.5 rounded-full bg-card"
            >
              <Printer className="size-3.5" aria-hidden="true" />
              Cetak / PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="press btn-loud gap-1.5 rounded-full bg-card"
            >
              <MorphCopyIcon copied={copied} />
              {copied ? "Tersalin" : "Salin bukti"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

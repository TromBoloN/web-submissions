"use client";

import { useState } from "react";

import { Check, Copy, ExternalLink, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function ReceiptLinkRow({ label, url }: { label: string; url: string | null | undefined }) {
  const [copiedRow, setCopiedRow] = useState(false);
  const isValid = isSafeUrl(url);
  const shortLabel = parseShortUrlLabel(url);

  const handleCopyRow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
      <span className="font-sans text-muted-foreground">{label}:</span>
      <div className="min-w-0 truncate">
        {isValid && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
            className="inline-flex max-w-full items-center gap-1 font-sans text-primary underline underline-offset-2 hover:opacity-80"
          >
            <span className="truncate font-medium">{shortLabel}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        ) : (
          <span className="truncate font-sans text-muted-foreground">{url ?? "-"}</span>
        )}
      </div>
      {isValid && url ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopyRow}
          title={`Salin URL ${label}`}
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground focus-visible:ring-2"
        >
          {copiedRow ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          <span className="sr-only">Salin {label}</span>
        </Button>
      ) : (
        <span />
      )}
    </div>
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="gap-0 border-emerald-600/30 bg-emerald-50/40 py-0 dark:bg-emerald-950/10 print:border-none print:shadow-none">
      <CardHeader className="p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">Bukti Pengiriman Berkas</CardTitle>
              <CardDescription className="text-xs">
                No. Bukti: <span className="font-medium font-mono text-foreground">{receiptNumber}</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 text-xs sm:text-sm">
        <div className="grid gap-3 p-0">
          <ReceiptLinkRow label="GitHub" url={submission.github_url} />
          <ReceiptLinkRow label="Live demo" url={submission.live_demo_url} />
          <ReceiptLinkRow label="Video" url={submission.video_url} />

          {/* Timeline points */}
          <div className="space-y-2 border-t pt-3 font-sans sm:col-span-2">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Kronologi Pengiriman
            </span>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Pertama dikirim:</span>
                <span className="font-medium text-foreground tabular-nums">{firstSubmittedFormatted} WITA</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Terakhir diperbarui:</span>
                <span className="font-medium text-foreground tabular-nums">{updatedAtFormatted} WITA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="font-sans text-muted-foreground text-xs">
            Simpan atau cetak bukti ini sebagai tanda terima pengiriman submission MIT-WEEK 2026.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 font-sans focus-visible:ring-2"
            >
              <Printer className="size-3.5" />
              <span>Cetak / PDF</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 font-sans">
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Tersalin" : "Salin bukti"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

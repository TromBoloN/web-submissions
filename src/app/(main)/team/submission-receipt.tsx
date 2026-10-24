"use client";

import { useState } from "react";

import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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

export function SubmissionReceipt({ team, submission }: SubmissionReceiptProps) {
  const [copied, setCopied] = useState(false);

  const firstSubmittedFormatted = formatWitaWithSeconds(submission.first_submitted_at || submission.submitted_at);
  const updatedAtFormatted = formatWitaWithSeconds(submission.updated_at);

  const handleCopy = async () => {
    const textToCopy = [
      "BUKTI PENGIRIMAN MIT-WEEK 2026",
      `Kode tim: ${team.team_code}`,
      `Nama tim: ${team.team_name}`,
      `GitHub: ${submission.github_url || "-"}`,
      `Live demo: ${submission.live_demo_url || "-"}`,
      `Video: ${submission.video_url || "-"}`,
      `Pertama dikirim: ${firstSubmittedFormatted} WITA`,
      `Terakhir diperbarui: ${updatedAtFormatted} WITA`,
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
    <Card className="border-emerald-600/30 bg-emerald-50/40 dark:bg-emerald-950/10">
      <CardHeader className="p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">Bukti Pengiriman Berkas</CardTitle>
              <CardDescription className="text-xs">
                Tanda terima resmi dari sistem bahwa submission tim Anda telah tersimpan di pangkalan data.
              </CardDescription>
            </div>
          </div>
          <Badge className="w-fit bg-emerald-600 text-white text-xs hover:bg-emerald-600/90">Terkirim Resmi</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 text-xs sm:p-5 sm:pt-0 sm:text-sm">
        <div className="grid gap-3 rounded-lg border bg-background/80 p-3 font-mono sm:p-4">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <span className="font-sans text-muted-foreground">Kode tim:</span>
            <span className="font-bold text-foreground sm:col-span-2">{team.team_code}</span>
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <span className="font-sans text-muted-foreground">Nama tim:</span>
            <span className="font-sans text-foreground sm:col-span-2">{team.team_name}</span>
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <span className="font-sans text-muted-foreground">GitHub:</span>
            <div className="break-all sm:col-span-2">
              {isSafeUrl(submission.github_url) ? (
                <a
                  href={submission.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
                >
                  <span className="truncate">{submission.github_url}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground">{submission.github_url || "-"}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <span className="font-sans text-muted-foreground">Live demo:</span>
            <div className="break-all sm:col-span-2">
              {isSafeUrl(submission.live_demo_url) ? (
                <a
                  href={submission.live_demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
                >
                  <span className="truncate">{submission.live_demo_url}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground">{submission.live_demo_url || "-"}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <span className="font-sans text-muted-foreground">Video:</span>
            <div className="break-all sm:col-span-2">
              {isSafeUrl(submission.video_url) ? (
                <a
                  href={submission.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
                >
                  <span className="truncate">{submission.video_url}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground">{submission.video_url || "-"}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 border-t pt-2 sm:grid-cols-3">
            <span className="font-sans text-muted-foreground">Pertama dikirim:</span>
            <span className="font-medium font-sans text-foreground sm:col-span-2">{firstSubmittedFormatted} WITA</span>
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <span className="font-sans text-muted-foreground">Terakhir diperbarui:</span>
            <span className="font-medium font-sans text-foreground sm:col-span-2">{updatedAtFormatted} WITA</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-muted-foreground text-xs">
            Simpan atau salin bukti ini sebagai tanda terima pengiriman submission MIT-WEEK 2026.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5 font-sans">
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Tersalin" : "Salin bukti"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

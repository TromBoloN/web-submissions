import { Info, Sparkles, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FinalistNoticeData = {
  is_finalist: boolean;
  message: string;
  published_at: string | null;
};

interface FinalistBannerProps {
  notice: FinalistNoticeData | null;
}

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

export function FinalistBanner({ notice }: FinalistBannerProps) {
  if (!notice) return null;

  if (notice.is_finalist) {
    return (
      <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-sm dark:from-emerald-950/30 dark:via-emerald-950/10">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Trophy className="size-5" />
              </div>
              <div>
                <CardTitle className="font-bold text-emerald-800 text-lg sm:text-xl dark:text-emerald-300">
                  Selamat, Tim Anda Lolos ke Babak Final!
                </CardTitle>
                <p className="text-muted-foreground text-xs">Hasil seleksi babak penyisihan kompetisi MIT-WEEK 2026.</p>
              </div>
            </div>
            <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
              <Sparkles className="size-3.5" />
              Finalis Terpilih
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {notice.message ? (
            <div className="whitespace-pre-wrap rounded-md border border-emerald-500/20 bg-background/60 p-4 font-normal text-foreground text-sm leading-relaxed dark:bg-background/40">
              {notice.message}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Tim Anda resmi melaju ke babak final. Pantau arahan panitia dan persiapkan sesi presentasi karya tim Anda.
            </p>
          )}

          {notice.published_at && (
            <p className="text-muted-foreground text-xs">
              Dipublikasikan pada: {formatTimestampWita(notice.published_at)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Non-finalist: hide if message is empty
  const trimmedMessage = notice.message.trim();
  if (!trimmedMessage) {
    return null;
  }

  return (
    <Card className="border-muted bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Pengumuman Babak Penyisihan</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="whitespace-pre-wrap rounded-md border bg-background/60 p-3.5 text-foreground text-sm leading-relaxed dark:bg-background/40">
          {trimmedMessage}
        </div>
        {notice.published_at && (
          <p className="text-muted-foreground text-xs">
            Dipublikasikan pada: {formatTimestampWita(notice.published_at)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

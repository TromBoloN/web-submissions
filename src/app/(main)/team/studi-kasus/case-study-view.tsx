import { Clock, Lock, Sparkles } from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type CaseStudyData = {
  title: string;
  contentMd: string;
  updatedAt: string;
};

type CaseStudyViewProps = {
  userRole: "team" | "judge";
  caseStudy: CaseStudyData | null;
  releaseAt: string | null;
};

function formatWitaDate(iso: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "full",
    timeStyle: "short",
  }).format(date)} WITA`;
}

export function CaseStudyView({ userRole, caseStudy, releaseAt }: CaseStudyViewProps) {
  // Jika data studi kasus belum bisa dibaca (disembunyikan oleh RLS sebelum release_at)
  if (!caseStudy) {
    const formattedRelease = releaseAt ? formatWitaDate(releaseAt) : null;

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-semibold text-2xl">Studi Kasus</h1>
          <p className="text-muted-foreground text-sm">Tantangan dan studi kasus resmi MIT-WEEK 2026.</p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="text-center sm:text-left">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 sm:mx-0">
              <Lock className="size-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Studi Kasus Belum Dirilis</CardTitle>
            <CardDescription className="text-base text-foreground/80">
              {formattedRelease
                ? `Studi kasus akan dirilis pada ${formattedRelease}.`
                : "Studi kasus saat ini belum dirilis oleh panitia."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm">
            <p>
              Teks tantangan, contoh situasi, dan ketentuan lengkap studi kasus akan otomatis dapat diakses di halaman
              ini segera setelah waktu rilis tiba.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-background/60 p-3 text-xs">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <span>
                Silakan kembali dan muat ulang halaman ini setelah waktu yang ditentukan untuk memulai pengerjaan.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Jika studi kasus sudah dirilis / terbaca
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-normal text-xs">
            <Sparkles className="size-3 text-primary" />
            {userRole === "judge" ? "Studi Kasus Juri" : "Studi Kasus Resmi"}
          </Badge>
          <span className="text-muted-foreground text-xs">
            Terakhir diperbarui: {formatWitaDate(caseStudy.updatedAt)}
          </span>
        </div>
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">{caseStudy.title}</h1>
      </div>

      <Separator />

      <Card>
        <CardContent className="p-6 sm:p-8">
          <MarkdownContent content={caseStudy.contentMd} />
        </CardContent>
      </Card>
    </div>
  );
}

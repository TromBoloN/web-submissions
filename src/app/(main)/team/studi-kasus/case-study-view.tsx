import Link from "next/link";

import { BookOpenCheck, CheckCircle2, Clock, Lightbulb, Lock, ShieldCheck, Sparkles, Target } from "lucide-react";

import { CaseStudyCountdown } from "@/app/(main)/team/studi-kasus/case-study-countdown";
import { MarkdownContent } from "@/components/markdown-content";
import { type RubricBarItem, RubricBars } from "@/components/rubric-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PRELIMINARY_RUBRIC } from "@/lib/rubric";

type CaseStudyData = {
  title: string;
  contentMd: string;
  updatedAt: string;
};

type CaseStudyViewProps = {
  userRole: "team" | "judge";
  caseStudy: CaseStudyData | null;
  releaseAt: string | null;
  deadlineIso?: string | null;
  juknisUrl?: string | null;
  serverNowIso?: string;
};

const guardiansSteps = [
  {
    title: "Recognize",
    description: "Kenali sinyal interaksi digital yang perlu diperiksa sebelum dipercaya.",
    icon: ShieldCheck,
  },
  {
    title: "Learn",
    description: "Pelajari konteks dan bukti yang tersedia agar keputusan tidak terburu-buru.",
    icon: Lightbulb,
  },
  {
    title: "Act",
    description: "Arahkan pengguna pada tindakan aman dan langkah tindak lanjut yang jelas.",
    icon: Target,
  },
] as const;

const juknisTimeline = [
  "Pengumpulan karya sampai batas waktu yang tercantum di portal.",
  "Penilaian babak awal oleh dewan juri.",
  "Pengumuman Top 5 dan pelaksanaan babak final.",
  "Pengumuman juara oleh panitia.",
];

const rubricBars: RubricBarItem[] = PRELIMINARY_RUBRIC.map((criterion) => ({
  id: criterion.column,
  label: criterion.label,
  score: criterion.weight,
  weight: criterion.weight,
}));

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

function headingId(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getTableOfContents(content: string) {
  return content
    .split("\n")
    .flatMap((line) => {
      const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
      if (!match) return [];

      const title = match[2].replace(/[*_`]/g, "");
      return [{ id: headingId(title), level: match[1].length, title }];
    })
    .slice(0, 10);
}

function GuardiansCards() {
  return (
    <section aria-labelledby="guardians-heading" className="space-y-3">
      <div>
        <h2 id="guardians-heading" className="font-semibold text-lg">
          Kerangka Guardians
        </h2>
        <p className="text-muted-foreground text-sm">
          Bangun pengalaman yang membantu pengguna mengenali, memahami, dan bertindak.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {guardiansSteps.map(({ description, icon: Icon, title }) => (
          <Card key={title} className="bg-muted/20">
            <CardContent className="space-y-2 p-4">
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function TeamRail({
  juknisUrl,
  tableOfContents,
}: {
  juknisUrl: string | null | undefined;
  tableOfContents: ReturnType<typeof getTableOfContents>;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      {tableOfContents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daftar isi</CardTitle>
          </CardHeader>
          <CardContent>
            <nav aria-label="Daftar isi studi kasus">
              <ul className="space-y-2 text-sm">
                {tableOfContents.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
                    <a
                      className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      href={`#${item.id}`}
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="size-4 text-primary" />
            Yang harus dikumpulkan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              Repositori kode
            </li>
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              Live demo yang dapat diakses publik
            </li>
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              Video demonstrasi maksimal 5 menit
            </li>
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              README yang jelas dan lengkap
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bagaimana dinilai</CardTitle>
          <CardDescription>Bobot babak awal.</CardDescription>
        </CardHeader>
        <CardContent>
          <RubricBars items={rubricBars} />
        </CardContent>
      </Card>

      {juknisUrl?.startsWith("https://") && (
        <Button asChild className="w-full" variant="outline">
          <a href={juknisUrl} rel="noopener noreferrer" target="_blank">
            Buka PDF Juknis
          </a>
        </Button>
      )}
    </aside>
  );
}

function JuknisSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Juknis</CardTitle>
        <CardDescription>Ringkasan cepat; ketentuan lengkap tetap mengikuti Juknis resmi panitia.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 text-sm md:grid-cols-3">
        <section>
          <h3 className="mb-2 font-semibold">Linimasa</h3>
          <ol className="space-y-2 text-muted-foreground">
            {juknisTimeline.map((item, index) => (
              <li key={item}>
                {index + 1}. {item}
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3 className="mb-2 font-semibold">Aturan singkat</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>Karya harus relevan dengan studi kasus.</li>
            <li>Tautan pengumpulan harus dapat diakses publik.</li>
            <li>Keputusan dewan juri bersifat mutlak.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-semibold">FAQ</h3>
          <dl className="space-y-2 text-muted-foreground">
            <div>
              <dt className="font-medium text-foreground">Boleh mengubah karya?</dt>
              <dd>Ya, selama pengiriman masih dibuka.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Apa yang dikirim?</dt>
              <dd>Repositori, live demo, video, dan README.</dd>
            </div>
          </dl>
        </section>
      </CardContent>
    </Card>
  );
}

export function CaseStudyView({
  caseStudy,
  deadlineIso,
  juknisUrl,
  releaseAt,
  serverNowIso,
  userRole,
}: CaseStudyViewProps) {
  if (!caseStudy) {
    const formattedRelease = releaseAt ? formatWitaDate(releaseAt) : null;
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display font-semibold text-2xl">Studi Kasus</h1>
          <p className="text-muted-foreground text-sm">Tantangan resmi MIT-WEEK 2026.</p>
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
            <p>Teks tantangan dan ketentuan lengkap akan otomatis dapat diakses di halaman ini setelah waktu rilis.</p>
            <div className="flex items-center gap-2 rounded-md border bg-background/60 p-3 text-sm">
              <Clock className="size-4 shrink-0" />
              Silakan kembali setelah waktu rilis.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tableOfContents = getTableOfContents(caseStudy.contentMd);
  const isTeam = userRole === "team";
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-normal text-xs">
            <Sparkles className="size-3 text-primary" />
            {isTeam ? "Studi Kasus Resmi" : "Studi Kasus Juri"}
          </Badge>
          <span className="text-muted-foreground text-xs">
            Terakhir diperbarui: {formatWitaDate(caseStudy.updatedAt)}
          </span>
        </div>
        <h1 className="font-bold font-display text-2xl tracking-tight sm:text-3xl">{caseStudy.title}</h1>
      </div>
      <Separator />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-6">
          <Card>
            <CardContent className="space-y-8 p-6 sm:p-8">
              <GuardiansCards />
              <MarkdownContent content={caseStudy.contentMd} />
            </CardContent>
          </Card>
          {isTeam && <JuknisSummary />}
          {isTeam && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:items-start sm:text-left">
                <div>
                  <h2 className="font-semibold text-lg">Siap mengirim karya?</h2>
                  <p className="text-muted-foreground text-sm">
                    Pastikan semua tautan dan dokumentasi telah siap sebelum batas waktu.
                  </p>
                </div>
                {serverNowIso && <CaseStudyCountdown deadlineIso={deadlineIso ?? null} serverNowIso={serverNowIso} />}
                <Button asChild>
                  <Link href="/team">Buka portal pengiriman</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
        {isTeam ? (
          <TeamRail juknisUrl={juknisUrl} tableOfContents={tableOfContents} />
        ) : (
          tableOfContents.length > 0 && (
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Daftar isi</CardTitle>
                </CardHeader>
                <CardContent>
                  <nav aria-label="Daftar isi studi kasus">
                    <ul className="space-y-2 text-sm">
                      {tableOfContents.map((item) => (
                        <li key={item.id}>
                          <a className="text-muted-foreground hover:text-primary" href={`#${item.id}`}>
                            {item.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </CardContent>
              </Card>
            </aside>
          )
        )}
      </div>
    </div>
  );
}

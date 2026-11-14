import Link from "next/link";

import {
  BookOpenCheck,
  BookText,
  CheckCircle2,
  Circle,
  Clock,
  Lightbulb,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { CaseStudyCountdown } from "@/app/(main)/team/studi-kasus/case-study-countdown";
import { CaseStudyToc } from "@/app/(main)/team/studi-kasus/case-study-toc";
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

/** The team's saved links, used to tick the deliverables checklist. Team view only. */
export type CaseStudySubmission = {
  status: "draft" | "submitted";
  githubUrl: string | null;
  liveDemoUrl: string | null;
  videoUrl: string | null;
};

type CaseStudyViewProps = {
  userRole: "team" | "judge";
  submission?: CaseStudySubmission | null;
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

const ARTICLE_ID = "case-study-article";

const GITHUB_PATTERN = /^https:\/\/github\.com\/.+/i;
const HTTP_PATTERN = /^https?:\/\/.+/i;

function ReadyChecklist({ submission }: { submission: CaseStudySubmission | null }) {
  const items = [
    { id: "repo", label: "Repositori kode", ok: GITHUB_PATTERN.test(submission?.githubUrl?.trim() ?? "") },
    {
      id: "demo",
      label: "Live demo yang dapat diakses publik",
      ok: HTTP_PATTERN.test(submission?.liveDemoUrl?.trim() ?? ""),
    },
    {
      id: "video",
      label: "Video demonstrasi maksimal 5 menit",
      ok: HTTP_PATTERN.test(submission?.videoUrl?.trim() ?? ""),
    },
  ];
  const doneCount = items.filter((item) => item.ok).length;

  let statusLabel = "Belum ada karya tersimpan";
  if (submission?.status === "submitted") statusLabel = "Terkirim";
  else if (submission) statusLabel = "Draf tersimpan";

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium">
          Status: <span className="text-foreground">{statusLabel}</span>
        </span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {doneCount}/{items.length} tautan tersimpan
        </span>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            {item.ok ? (
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={item.ok ? undefined : "text-muted-foreground"}>{item.label}</span>
            <span className="sr-only">{item.ok ? "sudah tersimpan" : "belum tersimpan"}</span>
          </li>
        ))}
        <li className="flex items-start gap-2 border-border border-t border-dashed pt-2 text-muted-foreground text-xs">
          <BookText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>README yang jelas dan lengkap tidak dicek otomatis. Pastikan sudah siap di repositori.</span>
        </li>
      </ul>
    </div>
  );
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
      <ol className="grid gap-3 sm:grid-cols-3">
        {guardiansSteps.map(({ description, icon: Icon, title }, index) => (
          <li key={title} className="rounded-2xl border-2 border-ink bg-card p-4 shadow-brutal-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-display font-extrabold text-4xl text-guardian-accent tabular-nums leading-none">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon aria-hidden="true" className="size-5 text-ink" />
            </div>
            <h3 className="mt-3 font-bold font-display text-lg">{title}</h3>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{description}</p>
          </li>
        ))}
      </ol>
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
            <CaseStudyToc items={tableOfContents} articleId={ARTICLE_ID} />
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
  submission,
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
          <Card id={ARTICLE_ID}>
            <CardContent className="space-y-8 p-6 sm:p-8">
              <GuardiansCards />
              <MarkdownContent content={caseStudy.contentMd} />
            </CardContent>
          </Card>
          {isTeam && <JuknisSummary />}
          {isTeam && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col items-start gap-4 p-6">
                <div>
                  <h2 className="font-semibold text-lg">Siap mengirim karya?</h2>
                  <p className="text-muted-foreground text-sm">
                    Pastikan semua tautan dan dokumentasi telah siap sebelum batas waktu.
                  </p>
                </div>
                <ReadyChecklist submission={submission ?? null} />
                {serverNowIso && <CaseStudyCountdown deadlineIso={deadlineIso ?? null} serverNowIso={serverNowIso} />}
                <Button asChild className="press">
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
                  <CaseStudyToc items={tableOfContents} articleId={ARTICLE_ID} />
                </CardContent>
              </Card>
            </aside>
          )
        )}
      </div>
    </div>
  );
}

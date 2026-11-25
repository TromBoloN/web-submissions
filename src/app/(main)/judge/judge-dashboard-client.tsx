"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import {
  Check,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileEdit,
  FileQuestion,
  Gavel,
  Layers,
  ListOrdered,
  Lock,
  Search,
  Trophy,
  UserX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/types/database";

import { JUDGE_STAGE_TEXT, JudgeCardButton } from "./judge-card-button";
import type { JudgeTeamItem } from "./queries";

export type { JudgeTeamItem };

type ScoreFilter = "all" | "unscored" | "scored";
type SortOption = "team_code" | "team_name";

interface JudgeDashboardClientProps {
  judgeName: string;
  judgeStage: Database["public"]["Enums"]["judge_stage_type"] | null;
  preliminaryTeams: JudgeTeamItem[];
  finalTeams: JudgeTeamItem[];
  /** Final results released: the competition is over, show the closing header. */
  competitionOver: boolean;
  rankingPublished: boolean;
}

function formatTimestampWita(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)} WITA`;
}

function StageBadge({ stage }: { stage: Database["public"]["Enums"]["judge_stage_type"] | null }) {
  if (stage === "both") {
    return <Badge variant="secondary">Babak Awal & Final</Badge>;
  }
  if (stage === "final") {
    return <Badge className="border-ink bg-medal-gold text-ink dark:text-ink-foreground">Babak Final</Badge>;
  }
  return <Badge variant="outline">Babak Awal</Badge>;
}

function renderStatusBadge(item: JudgeTeamItem) {
  const isFinal = item.score?.status === "final";
  const isDraft = item.score?.status === "draft";
  const isLocked = Boolean(item.score?.locked_at);

  if (item.recusal) {
    return (
      <Badge variant="outline" className="gap-1 border-brand-sky/50 bg-brand-sky/15 text-foreground">
        <UserX className="size-3" />
        Recusal
      </Badge>
    );
  }

  if (item.is_stage_released && !isFinal) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-medal-gold/60 bg-medal-gold-soft text-ink dark:bg-medal-gold/15 dark:text-foreground"
      >
        <Lock className="size-3" />
        Tidak dinilai (hasil dirilis)
      </Badge>
    );
  }

  if (isLocked || item.is_stage_released) {
    return (
      <Badge variant="outline" className="gap-1 border-mint/60 bg-mint/15 text-foreground">
        <Lock className="size-3" />
        {item.is_stage_released ? "Terkunci (dirilis)" : "Terkunci"}
      </Badge>
    );
  }

  if (isDraft) {
    return (
      <Badge variant="secondary" className="gap-1">
        <FileEdit className="size-3" />
        Draf
      </Badge>
    );
  }

  if (isFinal) {
    return (
      <Badge className="gap-1 border-ink bg-mint text-ink dark:text-ink-foreground">
        <Check className="size-3" />
        Sudah dinilai
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      Belum dinilai
    </Badge>
  );
}

function renderActionButtonContent(item: JudgeTeamItem) {
  const isFinal = item.score?.status === "final";
  const isDraft = item.score?.status === "draft";
  const isLocked = Boolean(item.score?.locked_at);

  if (item.recusal) {
    return (
      <>
        <UserX className="mr-1.5 size-3.5" />
        Kelola recusal
      </>
    );
  }

  if (isLocked || item.is_stage_released) {
    return (
      <>
        <Eye className="mr-1.5 size-3.5" />
        Lihat nilai
      </>
    );
  }

  if (isDraft) {
    return (
      <>
        <FileEdit className="mr-1.5 size-3.5" />
        Lanjutkan draf
      </>
    );
  }

  if (isFinal) {
    return (
      <>
        <FileEdit className="mr-1.5 size-3.5" />
        Ubah nilai
      </>
    );
  }

  return (
    <>
      <ClipboardCheck className="mr-1.5 size-3.5" />
      Nilai
    </>
  );
}

function StageSection({
  stage,
  title,
  description,
  teams,
}: {
  stage: "preliminary" | "final";
  title: string;
  description: string;
  teams: JudgeTeamItem[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ScoreFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("team_code");

  const totalCount = teams.length;
  const finalCount = teams.filter((t) => t.score?.status === "final").length;
  const recusedCount = teams.filter((t) => t.recusal !== null).length;
  const completedCount = finalCount + recusedCount;
  const draftCount = teams.filter((t) => t.score?.status === "draft" && !t.recusal).length;
  const unscoredCount = teams.filter((t) => t.score?.status !== "final" && !t.recusal && !t.is_stage_released).length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTeams = useMemo(() => {
    let list = teams;

    // 1. Filter
    if (filter === "unscored") {
      // Belum selesai: no final score and no recusal, and results not released
      list = list.filter((item) => item.score?.status !== "final" && !item.recusal && !item.is_stage_released);
    } else if (filter === "scored") {
      // Selesai: final score or recusal (drafts are not counted)
      list = list.filter((item) => item.score?.status === "final" || item.recusal !== null);
    }
    // "all": shows everything, including "Tidak dinilai (hasil dirilis)"

    // 2. Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) => item.team_code.toLowerCase().includes(q) || item.team_name.toLowerCase().includes(q),
      );
    }

    // 3. Sort
    return [...list].sort((a, b) => {
      if (sortBy === "team_name") {
        return a.team_name.localeCompare(b.team_name, "id");
      }
      return a.team_code.localeCompare(b.team_code, "id", { numeric: true });
    });
  }, [teams, filter, search, sortBy]);

  let emptyTitle = "Tidak ada tim yang cocok dengan kriteria.";
  let emptyDescription = "Coba ubah kata kunci pencarian atau ganti filter.";
  if (teams.length === 0) {
    emptyTitle = "Belum ada submission yang dapat dinilai.";
    emptyDescription =
      stage === "final"
        ? "Tim finalis yang telah mengunggah submission akan muncul di sini."
        : "Tim peserta yang telah mengirimkan submission akan muncul di sini secara otomatis.";
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Progres: </span>
              <span className="font-semibold">
                {completedCount} dari {totalCount} tim selesai
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {finalCount} dinilai · {recusedCount} recusal
              </span>
              {draftCount > 0 && <span className="text-muted-foreground"> · {draftCount} draf</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Kelengkapan Penilaian</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Filter, Sort, and Search Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer",
                  filter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Semua ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unscored")}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer",
                  filter === "unscored"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Belum selesai ({unscoredCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("scored")}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer",
                  filter === "scored"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Selesai ({completedCount})
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode atau nama tim..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Urutkan:</span>
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                  <SelectTrigger className="h-9 text-xs w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_code">Kode Tim</SelectItem>
                    <SelectItem value="team_name">Nama Tim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <FileQuestion className="size-10 text-muted-foreground opacity-60 mb-2" />
              <p className="font-medium text-sm">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">{emptyDescription}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Kode Tim</TableHead>
                    <TableHead>Nama Tim</TableHead>
                    <TableHead className="w-[200px]">Status Penilaian</TableHead>
                    <TableHead className="w-[140px]">Total Skor</TableHead>
                    <TableHead className="w-[200px]">Terakhir Disimpan</TableHead>
                    <TableHead className="w-[130px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((item) => {
                    const isScored = item.score?.status === "final";
                    const isRecused = item.recusal !== null;
                    const isUnratedReleased = item.is_stage_released && !isScored && !isRecused;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.team_code}</TableCell>
                        <TableCell className="font-medium">{item.team_name}</TableCell>
                        <TableCell>{renderStatusBadge(item)}</TableCell>
                        <TableCell>
                          {item.score?.total_weighted_score !== null &&
                          item.score?.total_weighted_score !== undefined ? (
                            <span className="font-semibold text-foreground">
                              {Number(item.score.total_weighted_score).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestampWita(item.recusal?.created_at ?? item.score?.updated_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            size="sm"
                            variant={isScored || isRecused || isUnratedReleased ? "outline" : "default"}
                          >
                            <Link href={`/judge/nilai/${stage}/${item.id}`}>{renderActionButtonContent(item)}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-card p-3 shadow-brutal-sm">
      <p className="font-bold font-mono text-[11px] text-foreground/75 uppercase tracking-wider">{label}</p>
      <p className="font-display font-extrabold text-2xl text-ink tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}

const LOUD_LINK =
  "btn-loud press inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 font-semibold text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Shown once final results are released: thanks, the judge's own totals and where to go next. */
function ClosingHero({
  judgeName,
  stageText,
  teams,
  rankingPublished,
}: {
  judgeName: string;
  stageText: string;
  teams: JudgeTeamItem[];
  rankingPublished: boolean;
}) {
  const scored = teams.filter((t) => t.score?.status === "final");
  const totals = scored.flatMap((t) => (t.score?.total_weighted_score == null ? [] : [t.score.total_weighted_score]));
  const average = totals.length > 0 ? (totals.reduce((sum, v) => sum + v, 0) / totals.length).toFixed(2) : "-";
  const recusals = teams.filter((t) => t.recusal !== null).length;

  return (
    <section
      aria-labelledby="judge-closing-title"
      className="surface-loud guardian-hero-mesh overflow-hidden p-5 sm:p-7"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="inline-flex items-center gap-1.5 font-bold font-mono text-[11px] text-hero-fg uppercase tracking-wider">
            <Gavel className="size-3.5" aria-hidden="true" />
            Kompetisi selesai · {stageText}
          </p>
          <h1 id="judge-closing-title" className="team-hero-title break-words">
            Terima kasih, {judgeName}.
          </h1>
          <p className="max-w-xl text-hero-fg-muted text-sm sm:text-base">
            Seluruh hasil telah dirilis dan nilai Anda tersimpan sebagai arsip. Rekap penilaian tetap dapat dibuka kapan
            saja.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/judge/rekap" className={LOUD_LINK}>
              <ClipboardList className="size-4" aria-hidden="true" />
              Rekap penilaian
            </Link>
            {rankingPublished && (
              <Link href="/judge/peringkat" className={LOUD_LINK}>
                <ListOrdered className="size-4" aria-hidden="true" />
                Lihat peringkat
              </Link>
            )}
            <JudgeCardButton judgeName={judgeName} stageText={stageText} teamsJudged={scored.length} />
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 lg:w-80 lg:shrink-0">
          <StatTile label="Tim dinilai" value={String(scored.length)} hint="nilai terkirim" />
          <StatTile label="Recusal" value={String(recusals)} hint="tim tidak dinilai" />
          <div className="col-span-2">
            <StatTile label="Rata-rata nilai Anda" value={average} hint="total berbobot, seluruh babak" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function JudgeDashboardClient({
  judgeName,
  judgeStage,
  preliminaryTeams,
  finalTeams,
  competitionOver,
  rankingPublished,
}: JudgeDashboardClientProps) {
  const stage = judgeStage ?? "preliminary";
  const prelimCompletedCount = preliminaryTeams.filter((t) => t.score?.status === "final" || t.recusal !== null).length;
  const finalCompletedCount = finalTeams.filter((t) => t.score?.status === "final" || t.recusal !== null).length;

  const stageText = JUDGE_STAGE_TEXT[stage];

  const queue = (
    <>
      {stage === "both" && (
        <Tabs defaultValue="preliminary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="preliminary" className="gap-2">
              <Layers className="size-4" />
              Babak Awal ({prelimCompletedCount}/{preliminaryTeams.length})
            </TabsTrigger>
            <TabsTrigger value="final" className="gap-2">
              <Trophy className="size-4" />
              Final ({finalCompletedCount}/{finalTeams.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preliminary">
            <StageSection
              stage="preliminary"
              title="Daftar Tim — Babak Awal"
              description="Seluruh tim dengan submission terkirim yang berhak dinilai pada babak penyisihan."
              teams={preliminaryTeams}
            />
          </TabsContent>

          <TabsContent value="final">
            <StageSection
              stage="final"
              title="Daftar Tim — Babak Final"
              description="Tim finalis resmi yang berhak dinilai pada babak final."
              teams={finalTeams}
            />
          </TabsContent>
        </Tabs>
      )}

      {stage === "final" && (
        <StageSection
          stage="final"
          title="Daftar Tim — Babak Final"
          description="Tim finalis resmi yang berhak dinilai pada babak final."
          teams={finalTeams}
        />
      )}

      {stage === "preliminary" && (
        <StageSection
          stage="preliminary"
          title="Daftar Tim — Babak Awal"
          description="Seluruh tim dengan submission terkirim yang berhak dinilai pada babak penyisihan."
          teams={preliminaryTeams}
        />
      )}
    </>
  );

  if (competitionOver) {
    return (
      <div className="space-y-6">
        <ClosingHero
          judgeName={judgeName}
          stageText={stageText}
          teams={[...preliminaryTeams, ...finalTeams]}
          rankingPublished={rankingPublished}
        />
        <details className="surface-calm p-4 sm:p-5">
          <summary className="cursor-pointer rounded-md font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Riwayat penilaian
            <span className="ml-2 font-normal text-muted-foreground text-xs">daftar tim dan status nilai Anda</span>
          </summary>
          <div className="mt-4 space-y-4">{queue}</div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-1.5 font-bold font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
          <Gavel className="size-3.5" aria-hidden="true" />
          Dewan juri
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display font-semibold text-2xl tracking-tight">Penilaian Karya</h1>
          <StageBadge stage={judgeStage} />
        </div>
        <p className="text-muted-foreground">
          Selamat bertugas, <span className="font-medium text-foreground">{judgeName}</span>. Berikan penilaian secara
          independen dan objektif.
        </p>
      </div>
      {queue}
    </div>
  );
}

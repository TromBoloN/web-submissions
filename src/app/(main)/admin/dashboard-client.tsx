"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarClock,
  CheckCircle2,
  Download,
  FileCheck2,
  FilePenLine,
  Gavel,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

import { LiveCountdown } from "./dashboard-countdown";
import { updateResultsRelease } from "./pengaturan/actions";

export type ChaseTeam = {
  teamCode: string;
  teamName: string;
  leaderName: string;
  institution: string;
  status: "draft" | "none";
  updatedAt: string | null;
};

export type JudgeProgress = {
  id: string;
  name: string;
  stage: "preliminary" | "final" | "both" | null;
  assigned: number;
  completed: number;
  drafts: number;
  locked: number;
  recusals: number;
};

export type TopTeam = {
  rank: number;
  teamCode: string;
  teamName: string;
  judgesCount: number;
  avgScore: number | null;
};

export type FinalistSlot = {
  teamCode: string;
  teamName: string;
} | null;

export type ActivityItem = {
  id: string;
  kind: "audit" | "submission";
  label: string;
  target: string;
  actor: string | null;
  createdAt: string;
};

export type HealthWarning = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

export type PhaseItem = {
  id: string;
  label: string;
  range: string;
  status: "done" | "active" | "upcoming";
};

export type TrendPoint = {
  date: string;
  count: number;
  cumulative: number;
};

export type JudgingSummary = {
  assigned: number;
  completed: number;
  drafts: number;
  locked: number;
  recusals: number;
};

type AdminDashboardClientProps = {
  serverNowIso: string;
  deadlineIso: string | null;
  deadlineLabel: string;
  submittedCount: number;
  draftCount: number;
  totalTeams: number;
  activeTeamCount: number;
  activeJudgeCount: number;
  finalistCount: number;
  finalistSlots: FinalistSlot[];
  trend: TrendPoint[];
  todayCount: number;
  todayDelta: number;
  chaseTeams: ChaseTeam[];
  judgeProgress: JudgeProgress[];
  judgingSummary: JudgingSummary;
  topFive: TopTeam[];
  prelimRankedCount: number;
  preliminaryResultsReleased: boolean;
  finalResultsReleased: boolean;
  recentActivity: ActivityItem[];
  healthWarnings: HealthWarning[];
  phases: PhaseItem[];
  currentPhaseLabel: string;
};

const metricTones = {
  chart1: { card: "from-chart-1/15 via-card to-card", icon: "bg-chart-1/15 text-chart-1" },
  chart2: { card: "from-chart-2/15 via-card to-card", icon: "bg-chart-2/15 text-chart-2" },
  chart3: { card: "from-chart-3/15 via-card to-card", icon: "bg-chart-3/15 text-chart-3" },
  chart4: { card: "from-chart-4/15 via-card to-card", icon: "bg-chart-4/15 text-chart-4" },
} as const;

function formatDateTimeWita(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)} WITA`;
}

function formatScore(value: number | null) {
  return value === null || Number.isNaN(value) ? "—" : value.toFixed(2);
}

function stageLabel(stage: JudgeProgress["stage"]) {
  if (stage === "preliminary") return "Babak awal";
  if (stage === "final") return "Final";
  if (stage === "both") return "Babak awal + final";
  return "Belum diatur";
}

function percent(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
      <Icon aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="font-medium text-sm">{title}</p>
      <p className="max-w-sm text-muted-foreground text-xs">{description}</p>
    </div>
  );
}

function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;

  const width = 120;
  const height = 36;
  const max = Math.max(1, ...points.map((point) => point.cumulative));
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - (point.cumulative / max) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      aria-label="Tren submission kumulatif 14 hari terakhir"
      className="h-9 w-full text-chart-1"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polygon fill="currentColor" opacity="0.12" points={area} />
      <polyline
        fill="none"
        points={line}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof metricTones;
  children?: React.ReactNode;
}) {
  const selected = metricTones[tone];

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${selected.card}`}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="font-semibold text-2xl tabular-nums tracking-tight">{value}</p>
          </div>
          <div className={`rounded-lg p-2 ${selected.icon}`}>
            <Icon aria-hidden="true" className="size-5" />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{hint}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function SubmissionRing({ submitted, drafts, total }: { submitted: number; drafts: number; total: number }) {
  const pct = percent(submitted, total);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const missing = Math.max(0, total - submitted - drafts);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-36 shrink-0">
        <svg
          aria-label={`${submitted} dari ${total} tim sudah mengirim submission`}
          className="size-full -rotate-90"
          role="img"
          viewBox="0 0 140 140"
        >
          <circle className="stroke-muted" cx="70" cy="70" fill="none" r={radius} strokeWidth="12" />
          <circle
            className="stroke-chart-1 transition-all duration-700"
            cx="70"
            cy="70"
            fill="none"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="12"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-semibold text-3xl tabular-nums">
            {submitted}
            <span className="text-muted-foreground text-lg">/{total}</span>
          </span>
          <span className="text-muted-foreground text-xs">terkirim</span>
        </div>
      </div>

      <div className="w-full space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-chart-1" />
            Terkirim
          </span>
          <span className="font-medium tabular-nums">{submitted}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500" />
            Draf
          </span>
          <span className="font-medium tabular-nums">{drafts}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-muted-foreground/40" />
            Belum ada
          </span>
          <span className="font-medium tabular-nums">{missing}</span>
        </div>
        <p className="text-muted-foreground text-xs">Draf adalah target tindak lanjut terbaik.</p>
      </div>
    </div>
  );
}

function PhaseTimeline({ phases }: { phases: PhaseItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-5 text-primary" />
          Fase kompetisi
        </CardTitle>
        <CardDescription>Linimasa dari juknis. Fase aktif disorot.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {phases.map((phase, index) => {
            const isActive = phase.status === "active";
            const isDone = phase.status === "done";

            let phaseClass = "border-dashed border-border";
            if (isActive) {
              phaseClass = "border-primary/40 bg-primary/5 shadow-sm";
            } else if (isDone) {
              phaseClass = "border-border bg-muted/30";
            }

            let markerClass = "bg-muted text-muted-foreground";
            if (isActive) {
              markerClass = "bg-primary text-primary-foreground";
            } else if (isDone) {
              markerClass = "bg-chart-3/20 text-chart-3";
            }

            return (
              <li className={`relative rounded-lg border p-3 ${phaseClass}`} key={phase.id}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${markerClass}`}
                  >
                    {isDone ? <CheckCircle2 aria-hidden="true" className="size-4" /> : index + 1}
                  </span>
                  {isActive && (
                    <Badge className="border-primary/30 bg-primary/10 text-primary" variant="outline">
                      Sekarang
                    </Badge>
                  )}
                </div>
                <p className="mt-2 font-medium text-sm">{phase.label}</p>
                <p className="text-muted-foreground text-xs">{phase.range}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function ChasePanel({ teams, deadlineLabel }: { teams: ChaseTeam[]; deadlineLabel: string }) {
  const draftCount = teams.filter((team) => team.status === "draft").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX aria-hidden="true" className="size-5 text-amber-600 dark:text-amber-400" />
          Belum submit
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" variant="outline">
            {teams.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {draftCount} draf · {teams.length - draftCount} belum ada. Draf diprioritaskan.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[26rem] overflow-y-auto pr-1">
        {teams.length === 0 ? (
          <EmptyState
            description="Semua tim aktif sudah mengirim submission."
            icon={CheckCircle2}
            title="Tidak ada yang perlu diingatkan"
          />
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => {
              const isDraft = team.status === "draft";
              const message = `Halo Kak, kami dari panitia MIT-WEEK 2026. Tim ${team.teamName} (${team.teamCode}) ${
                isDraft ? "masih berstatus draf" : "belum mengirim submission"
              }. Batas pengiriman ${deadlineLabel}. Mohon segera diselesaikan melalui portal peserta. Terima kasih.`;
              const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

              return (
                <li
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={team.teamCode}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="font-mono text-[11px]" variant="outline">
                        {team.teamCode}
                      </Badge>
                      <span className="truncate font-medium text-sm">{team.teamName}</span>
                      <Badge
                        className={
                          isDraft
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        }
                        variant="outline"
                      >
                        {isDraft ? "Draf" : "Belum ada"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {team.leaderName}
                      {team.institution ? ` · ${team.institution}` : ""}
                      {isDraft && team.updatedAt ? ` · diperbarui ${formatDateTimeWita(team.updatedAt)}` : ""}
                    </p>
                  </div>
                  <Button asChild className="shrink-0 gap-1.5" size="sm" variant="outline">
                    <a href={whatsappHref} rel="noopener noreferrer" target="_blank">
                      <MessageCircle aria-hidden="true" className="size-3.5" />
                      Ingatkan
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function JudgingPanel({ judges, summary }: { judges: JudgeProgress[]; summary: JudgingSummary }) {
  const overallPct = percent(summary.completed, summary.assigned);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel aria-hidden="true" className="size-5 text-chart-4" />
          Progres penilaian
        </CardTitle>
        <CardDescription>Penilaian final dan recusal dihitung selesai; draf belum.</CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/peringkat">
              Detail
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {summary.completed}/{summary.assigned} penugasan selesai
            </span>
            <span className="text-muted-foreground tabular-nums">{overallPct}%</span>
          </div>
          <Progress className="h-2" value={overallPct} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span>{summary.drafts} draf</span>
            <span>{summary.locked} terkunci</span>
            <span>{summary.recusals} recusal</span>
          </div>
        </div>

        {judges.length === 0 ? (
          <EmptyState
            description="Tambahkan akun juri dan atur tahap penilaiannya."
            icon={Gavel}
            title="Belum ada juri aktif"
          />
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {judges.map((judge) => {
              const judgePct = percent(judge.completed, judge.assigned);

              return (
                <li className="space-y-1.5 rounded-lg border p-3" key={judge.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{judge.name}</span>
                      <Badge className="text-[11px]" variant="outline">
                        {stageLabel(judge.stage)}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {judge.completed}/{judge.assigned}
                    </span>
                  </div>
                  <Progress className="h-1.5" value={judgePct} />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
                    <span>{judge.drafts} draf</span>
                    <span>{judge.locked} terkunci</span>
                    <span>{judge.recusals} recusal</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TopFivePanel({
  topFive,
  prelimRankedCount,
  finalistCount,
  finalistSlots,
}: {
  topFive: TopTeam[];
  prelimRankedCount: number;
  finalistCount: number;
  finalistSlots: FinalistSlot[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy aria-hidden="true" className="size-5 text-chart-3" />
          Pratinjau Top 5
        </CardTitle>
        <CardDescription>
          {prelimRankedCount > 0
            ? `${prelimRankedCount} tim sudah masuk peringkat babak awal.`
            : "Peringkat terisi otomatis saat nilai juri masuk."}
        </CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/peringkat">
              Peringkat
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {topFive.length === 0 ? (
          <EmptyState
            description="Nilai juri akan mengisi peringkat secara bertahap."
            icon={Sparkles}
            title="Belum ada nilai masuk"
          />
        ) : (
          <ol className="space-y-2">
            {topFive.map((row) => (
              <li className="flex items-center gap-3 rounded-lg border p-3" key={row.teamCode}>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    row.rank === 1 ? "bg-chart-3/20 text-chart-3" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{row.teamName}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.teamCode} · {row.judgesCount} juri
                  </p>
                </div>
                <span className="font-semibold text-sm tabular-nums">{formatScore(row.avgScore)}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="space-y-2 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-sm">Status finalis</p>
            <Badge
              className={finalistCount >= 5 ? "border-chart-3/30 bg-chart-3/10 text-chart-3" : "text-muted-foreground"}
              variant="outline"
            >
              {finalistCount}/5 ditetapkan
            </Badge>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {finalistSlots.map((slot, index) => (
              <div
                className={`rounded-md border p-2 text-center ${
                  slot ? "border-chart-3/30 bg-chart-3/10" : "border-dashed"
                }`}
                key={slot?.teamCode ?? `empty-${index}`}
              >
                <p className="text-[10px] text-muted-foreground">#{index + 1}</p>
                <p className="truncate font-mono font-medium text-[11px]">{slot ? slot.teamCode : "—"}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {finalistCount === 0 ? "Belum ada finalis yang ditetapkan." : "Kelola finalis di halaman Finalis."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReleaseRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label className="cursor-pointer font-medium text-sm" htmlFor={id}>
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{checked ? "Terlihat oleh tim" : "Disembunyikan dari tim"}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          className={checked ? "border-chart-3/30 bg-chart-3/10 text-chart-3" : "text-muted-foreground"}
          variant="outline"
        >
          {checked ? "Dirilis" : "Belum"}
        </Badge>
        <Switch checked={checked} disabled={disabled} id={id} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

function ReleaseControls({
  preliminaryResultsReleased,
  finalResultsReleased,
}: {
  preliminaryResultsReleased: boolean;
  finalResultsReleased: boolean;
}) {
  const router = useRouter();
  const [preliminaryReleased, setPreliminaryReleased] = useState(preliminaryResultsReleased);
  const [finalReleased, setFinalReleased] = useState(finalResultsReleased);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ stage: "preliminary" | "final"; target: boolean } | null>(null);

  const handleConfirm = () => {
    if (!confirm) return;

    const { stage, target } = confirm;
    setConfirm(null);

    startTransition(async () => {
      const result = await updateResultsRelease(stage, target);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (stage === "preliminary") {
        setPreliminaryReleased(target);
      } else {
        setFinalReleased(target);
      }

      toast.success(
        target ? `Hasil ${stageLabel(stage)} berhasil dirilis.` : `Hasil ${stageLabel(stage)} berhasil disembunyikan.`,
      );
      router.refresh();
    });
  };

  let actionLabel = "Ya, sembunyikan";
  if (isPending) {
    actionLabel = "Menyimpan...";
  } else if (confirm?.target) {
    actionLabel = "Ya, rilis";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award aria-hidden="true" className="size-5 text-primary" />
          Rilis hasil
        </CardTitle>
        <CardDescription>Kontrol cepat tanpa membuka Pengaturan.</CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/pengaturan">
              Pengaturan
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <ReleaseRow
          checked={preliminaryReleased}
          disabled={isPending}
          id="dashboard-prelim-release"
          label="Babak awal"
          onChange={(checked) => setConfirm({ stage: "preliminary", target: checked })}
        />
        <ReleaseRow
          checked={finalReleased}
          disabled={isPending}
          id="dashboard-final-release"
          label="Babak final"
          onChange={(checked) => setConfirm({ stage: "final", target: checked })}
        />
      </CardContent>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        open={Boolean(confirm)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.target
                ? `Rilis hasil ${confirm.stage === "preliminary" ? "babak awal" : "babak final"}?`
                : `Sembunyikan hasil ${confirm?.stage === "preliminary" ? "babak awal" : "babak final"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.target
                ? "Nilai, kriteria, dan masukan anonim akan langsung terlihat oleh tim."
                : "Tim tidak akan dapat melihat hasil sampai dirilis kembali."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className={confirm?.target ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
              disabled={isPending}
              onClick={handleConfirm}
            >
              {actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ExportLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Button asChild className="h-auto w-full justify-between py-2.5" variant="outline">
      <a href={href}>
        <span className="text-left">
          <span className="block font-medium">{label}</span>
          <span className="block text-muted-foreground text-xs">{hint}</span>
        </span>
        <Download aria-hidden="true" className="size-4" />
      </a>
    </Button>
  );
}

function ExportsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download aria-hidden="true" className="size-5 text-chart-2" />
          Ekspor cepat
        </CardTitle>
        <CardDescription>Unduh CSV terbaru tanpa membuka halaman lain.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ExportLink href="/admin/submission/export" hint="Tanpa nilai dan data pribadi" label="Submission tim" />
        <ExportLink
          href="/admin/peringkat/export?tahap=preliminary"
          hint="Nilai final per juri"
          label="Nilai babak awal"
        />
        <ExportLink href="/admin/peringkat/export?tahap=final" hint="Nilai final per juri" label="Nilai babak final" />
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity aria-hidden="true" className="size-5 text-chart-1" />
          Aktivitas terbaru
        </CardTitle>
        <CardDescription>Submission dan tindakan sensitif terakhir.</CardDescription>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <EmptyState
            description="Submission dan tindakan admin akan muncul di sini."
            icon={Activity}
            title="Belum ada aktivitas"
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li className="flex gap-3" key={item.id}>
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                    item.kind === "submission" ? "bg-chart-1/15 text-chart-1" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.kind === "submission" ? (
                    <FileCheck2 aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Activity aria-hidden="true" className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{item.actor ?? "Sistem"}</span> · {item.label}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">{item.target}</p>
                  <p className="text-muted-foreground text-[11px]">{formatDateTimeWita(item.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HealthWarnings({ warnings }: { warnings: HealthWarning[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-5 text-chart-3" />
          Kesehatan data
        </CardTitle>
        <CardDescription>
          {warnings.length === 0 ? "Tidak ada peringatan." : `${warnings.length} hal perlu dicek.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-72 overflow-y-auto pr-1">
        {warnings.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-chart-3/30 bg-chart-3/10 p-3 text-chart-3 text-sm">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Semua aman.
          </div>
        ) : (
          <ul className="space-y-2">
            {warnings.map((warning) => (
              <li key={warning.id}>
                <Link
                  className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 transition-colors hover:bg-amber-500/10"
                  href={warning.href}
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{warning.title}</p>
                    <p className="text-muted-foreground text-xs">{warning.detail}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardClient({
  serverNowIso,
  deadlineIso,
  deadlineLabel,
  submittedCount,
  draftCount,
  totalTeams,
  activeTeamCount,
  activeJudgeCount,
  finalistCount,
  finalistSlots,
  trend,
  todayCount,
  todayDelta,
  chaseTeams,
  judgeProgress,
  judgingSummary,
  topFive,
  prelimRankedCount,
  preliminaryResultsReleased,
  finalResultsReleased,
  recentActivity,
  healthWarnings,
  phases,
  currentPhaseLabel,
}: AdminDashboardClientProps) {
  const trendLabel =
    todayDelta === 0 ? "Sama dengan kemarin" : `${todayDelta > 0 ? "+" : ""}${todayDelta} dari kemarin`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">Dasbor</h1>
            <Badge className="border-primary/30 bg-primary/10 text-primary" variant="outline">
              Fase {currentPhaseLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">MIT-WEEK 2026 · data per {formatDateTimeWita(serverNowIso)}</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-3 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-chart-3" />
          </span>
          Data dimuat ulang saat halaman dibuka
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveCountdown deadlineIso={deadlineIso} deadlineLabel={deadlineLabel} serverNowIso={serverNowIso} />
        </div>
        <Card className="bg-gradient-to-br from-chart-1/10 via-card to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users aria-hidden="true" className="size-5 text-chart-1" />
              Progres submission
            </CardTitle>
            <CardDescription>
              {activeTeamCount} tim aktif dari {totalTeams} terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionRing drafts={draftCount} submitted={submittedCount} total={totalTeams} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint={`${draftCount} draf menunggu tindak lanjut`}
          icon={FileCheck2}
          label="Terkirim"
          tone="chart1"
          value={`${submittedCount}/${totalTeams}`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className={todayDelta >= 0 ? "text-chart-3" : "text-destructive"}>{trendLabel}</span>
              <span className="text-muted-foreground">{todayCount} hari ini</span>
            </div>
            <Sparkline points={trend} />
          </div>
        </MetricCard>
        <MetricCard
          hint="Prioritas utama untuk diingatkan"
          icon={FilePenLine}
          label="Draf"
          tone="chart2"
          value={String(draftCount)}
        />
        <MetricCard
          hint={`${judgingSummary.completed}/${judgingSummary.assigned} penugasan selesai`}
          icon={Gavel}
          label="Juri aktif"
          tone="chart4"
          value={String(activeJudgeCount)}
        />
        <MetricCard
          hint={finalistCount === 0 ? "Belum ditetapkan" : "Finalis sudah ditetapkan"}
          icon={Trophy}
          label="Finalis"
          tone="chart3"
          value={`${finalistCount}/5`}
        />
      </div>

      <PhaseTimeline phases={phases} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ChasePanel deadlineLabel={deadlineLabel} teams={chaseTeams} />
          <JudgingPanel judges={judgeProgress} summary={judgingSummary} />
          <TopFivePanel
            finalistCount={finalistCount}
            finalistSlots={finalistSlots}
            prelimRankedCount={prelimRankedCount}
            topFive={topFive}
          />
        </div>
        <div className="space-y-4">
          <ReleaseControls
            finalResultsReleased={finalResultsReleased}
            preliminaryResultsReleased={preliminaryResultsReleased}
          />
          <ExportsCard />
          <HealthWarnings warnings={healthWarnings} />
          <ActivityFeed items={recentActivity} />
        </div>
      </div>
    </div>
  );
}

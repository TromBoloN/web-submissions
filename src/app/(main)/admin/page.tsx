import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { formatDeadlineWita } from "@/lib/deadline";
import { createClient } from "@/lib/supabase/server";

import {
  type ActivityItem,
  AdminDashboardClient,
  type ChaseTeam,
  type FinalistSlot,
  type HealthWarning,
  type JudgeProgress,
  type PhaseItem,
  type TopTeam,
  type TrendPoint,
} from "./dashboard-client";

export const metadata: Metadata = {
  title: `Dasbor | ${APP_CONFIG.name}`,
  description: "Ringkasan, tindak lanjut, dan progres kompetisi MIT-WEEK 2026.",
};

const auditActionLabels: Record<string, string> = {
  account_activated: "Mengaktifkan akun",
  account_created: "Membuat akun",
  account_deactivated: "Menonaktifkan akun",
  account_password_reset: "Mereset kata sandi",
  account_updated: "Memperbarui akun",
  finalist_selected: "Memilih finalis",
  finalist_unselected: "Membatalkan finalis",
  results_released: "Merilis hasil",
  results_unreleased: "Menarik rilis hasil",
  score_changed: "Mengubah nilai",
  score_locked: "Mengunci nilai",
  team_disqualified: "Mendiskualifikasi tim",
  team_disqualification_removed: "Membatalkan diskualifikasi",
};

const targetTypeLabels: Record<string, string> = {
  competition_settings: "Pengaturan kompetisi",
  final_score: "Nilai final",
  preliminary_score: "Nilai babak awal",
  profile: "Akun",
  team: "Tim",
};

function witaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function metadataStage(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const stage = (metadata as Record<string, unknown>).stage;
    return typeof stage === "string" ? stage : null;
  }
  return null;
}

function countLinkWarnings(linkCheck: unknown): number {
  if (!linkCheck || typeof linkCheck !== "object" || Array.isArray(linkCheck)) {
    return 0;
  }

  const record = linkCheck as Record<string, unknown>;
  return ["github", "liveDemo", "video"].reduce((count, key) => {
    const item = record[key];
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return count + ((item as Record<string, unknown>).status === "warning" ? 1 : 0);
    }
    return count;
  }, 0);
}

export default async function AdminPage() {
  const supabase = await createClient();
  const now = new Date();
  const serverNowIso = now.toISOString();

  const [
    settingsRes,
    teamsRes,
    submissionsRes,
    profilesRes,
    prelimScoresRes,
    finalScoresRes,
    recusalsRes,
    prelimRankingRes,
    auditRes,
  ] = await Promise.all([
    supabase
      .from("competition_settings")
      .select("submission_closes_at, preliminary_results_released, final_results_released")
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, team_code, team_name, institution, leader_name, is_finalist, is_disqualified")
      .order("team_code", { ascending: true }),
    supabase
      .from("submissions")
      .select("team_id, status, submitted_at, first_submitted_at, updated_at, link_check, link_checked_at"),
    supabase.from("profiles").select("id, full_name, role, judge_stage, is_active"),
    supabase.from("preliminary_scores").select("judge_id, team_id, status, locked_at"),
    supabase.from("final_scores").select("judge_id, team_id, status, locked_at"),
    supabase.from("judge_recusals").select("judge_id, team_id, stage"),
    supabase
      .from("preliminary_ranking")
      .select("rank, team_id, team_code, team_name, avg_score, judges_count")
      .order("rank", { ascending: true }),
    supabase
      .from("audit_logs")
      .select("id, actor_id, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const queryError =
    settingsRes.error ??
    teamsRes.error ??
    submissionsRes.error ??
    profilesRes.error ??
    prelimScoresRes.error ??
    finalScoresRes.error ??
    recusalsRes.error ??
    prelimRankingRes.error ??
    auditRes.error;

  if (queryError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Dasbor</h1>
          <p className="text-muted-foreground text-sm">Ringkasan dan tindak lanjut kompetisi MIT-WEEK 2026.</p>
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data dasbor tidak dapat dimuat. Silakan coba lagi.
        </p>
      </div>
    );
  }

  const settings = settingsRes.data;
  const teams = teamsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const prelimScores = prelimScoresRes.data ?? [];
  const finalScores = finalScoresRes.data ?? [];
  const recusals = recusalsRes.data ?? [];
  const prelimRanking = prelimRankingRes.data ?? [];
  const auditLogs = auditRes.data ?? [];

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const submissionByTeam = new Map(submissions.map((submission) => [submission.team_id, submission]));

  const deadlineIso = settings?.submission_closes_at ?? null;
  const deadlineLabel = formatDeadlineWita(deadlineIso);

  const activeTeams = teams.filter((team) => !team.is_disqualified);
  const submittedSubmissions = submissions.filter((submission) => submission.status === "submitted");
  const draftSubmissions = submissions.filter((submission) => submission.status === "draft");

  const chaseTeams: ChaseTeam[] = activeTeams
    .map((team) => {
      const submission = submissionByTeam.get(team.id);
      if (submission?.status === "submitted") {
        return null;
      }

      return {
        teamCode: team.team_code,
        teamName: team.team_name,
        leaderName: team.leader_name,
        institution: team.institution,
        status: submission?.status === "draft" ? "draft" : "none",
        updatedAt: submission?.updated_at ?? null,
      } satisfies ChaseTeam;
    })
    .filter((team): team is ChaseTeam => team !== null)
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "draft" ? -1 : 1;
      }
      return a.teamCode.localeCompare(b.teamCode);
    });

  const eligiblePrelimTeams = activeTeams.filter((team) => submissionByTeam.get(team.id)?.status === "submitted");
  const eligibleFinalTeams = activeTeams.filter(
    (team) => team.is_finalist && submissionByTeam.get(team.id)?.status === "submitted",
  );
  const eligiblePrelimIds = new Set(eligiblePrelimTeams.map((team) => team.id));
  const eligibleFinalIds = new Set(eligibleFinalTeams.map((team) => team.id));

  const activeJudges = profiles
    .filter((profile) => profile.role === "judge" && profile.is_active)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const judgeById = new Map(activeJudges.map((judge) => [judge.id, judge]));

  type JudgeAccumulator = { completed: number; drafts: number; locked: number; recusals: number };
  const judgeAccumulators = new Map<string, JudgeAccumulator>();
  const getAccumulator = (judgeId: string) => {
    const current = judgeAccumulators.get(judgeId) ?? { completed: 0, drafts: 0, locked: 0, recusals: 0 };
    judgeAccumulators.set(judgeId, current);
    return current;
  };

  for (const score of prelimScores) {
    const judge = judgeById.get(score.judge_id);
    if (!judge || (judge.judge_stage !== "preliminary" && judge.judge_stage !== "both")) continue;
    if (!eligiblePrelimIds.has(score.team_id)) continue;

    const accumulator = getAccumulator(score.judge_id);
    if (score.status === "final") {
      accumulator.completed += 1;
      if (score.locked_at) {
        accumulator.locked += 1;
      }
    } else {
      accumulator.drafts += 1;
    }
  }

  for (const score of finalScores) {
    const judge = judgeById.get(score.judge_id);
    if (!judge || (judge.judge_stage !== "final" && judge.judge_stage !== "both")) continue;
    if (!eligibleFinalIds.has(score.team_id)) continue;

    const accumulator = getAccumulator(score.judge_id);
    if (score.status === "final") {
      accumulator.completed += 1;
      if (score.locked_at) {
        accumulator.locked += 1;
      }
    } else {
      accumulator.drafts += 1;
    }
  }

  for (const recusal of recusals) {
    if (!judgeById.has(recusal.judge_id)) continue;
    const eligibleIds = recusal.stage === "final" ? eligibleFinalIds : eligiblePrelimIds;
    if (!eligibleIds.has(recusal.team_id)) continue;

    const accumulator = getAccumulator(recusal.judge_id);
    accumulator.completed += 1;
    accumulator.recusals += 1;
  }

  const judgeProgress: JudgeProgress[] = activeJudges.map((judge) => {
    const accumulator = judgeAccumulators.get(judge.id) ?? { completed: 0, drafts: 0, locked: 0, recusals: 0 };
    const assignedPrelim =
      judge.judge_stage === "preliminary" || judge.judge_stage === "both" ? eligiblePrelimTeams.length : 0;
    const assignedFinal = judge.judge_stage === "final" || judge.judge_stage === "both" ? eligibleFinalTeams.length : 0;
    const assigned = assignedPrelim + assignedFinal;

    return {
      id: judge.id,
      name: judge.full_name,
      stage: judge.judge_stage,
      assigned,
      completed: Math.min(assigned, accumulator.completed),
      drafts: accumulator.drafts,
      locked: accumulator.locked,
      recusals: accumulator.recusals,
    };
  });

  const judgingSummary = judgeProgress.reduce(
    (summary, judge) => ({
      assigned: summary.assigned + judge.assigned,
      completed: summary.completed + judge.completed,
      drafts: summary.drafts + judge.drafts,
      locked: summary.locked + judge.locked,
      recusals: summary.recusals + judge.recusals,
    }),
    { assigned: 0, completed: 0, drafts: 0, locked: 0, recusals: 0 },
  );

  const finalists = teams.filter((team) => team.is_finalist && !team.is_disqualified);
  const finalistSlots: FinalistSlot[] = Array.from({ length: 5 }, (_, index) => {
    const finalist = finalists[index];
    return finalist ? { teamCode: finalist.team_code, teamName: finalist.team_name } : null;
  });

  const topFive: TopTeam[] = prelimRanking.slice(0, 5).map((row) => ({
    rank: row.rank ?? 0,
    teamCode: row.team_code ?? "-",
    teamName: row.team_name ?? "-",
    judgesCount: row.judges_count ?? 0,
    avgScore: row.avg_score,
  }));

  const trendDays = 14;
  const trendKeys: string[] = [];
  for (let index = trendDays - 1; index >= 0; index -= 1) {
    trendKeys.push(witaDateKey(new Date(now.getTime() - index * 86_400_000)));
  }

  const dailySubmissions = new Map<string, number>();
  for (const submission of submittedSubmissions) {
    const stamp = submission.first_submitted_at ?? submission.submitted_at;
    if (!stamp) continue;
    const key = witaDateKey(new Date(stamp));
    dailySubmissions.set(key, (dailySubmissions.get(key) ?? 0) + 1);
  }

  const beforeWindow = submittedSubmissions.filter((submission) => {
    const stamp = submission.first_submitted_at ?? submission.submitted_at;
    return stamp ? witaDateKey(new Date(stamp)) < trendKeys[0] : false;
  }).length;

  let cumulative = beforeWindow;
  const trend: TrendPoint[] = trendKeys.map((date) => {
    const count = dailySubmissions.get(date) ?? 0;
    cumulative += count;
    return { date, count, cumulative };
  });

  const todayCount = trend[trend.length - 1]?.count ?? 0;
  const yesterdayCount = trend[trend.length - 2]?.count ?? 0;
  const todayDelta = todayCount - yesterdayCount;

  const healthWarnings: HealthWarning[] = [];

  for (const submission of submittedSubmissions) {
    if (!submission.link_checked_at) continue;
    const warningCount = countLinkWarnings(submission.link_check);
    if (warningCount === 0) continue;

    const team = teamById.get(submission.team_id);
    healthWarnings.push({
      id: `link-${submission.team_id}`,
      title: "Tautan submission bermasalah",
      detail: `${team?.team_name ?? "Tim"} · ${warningCount} tautan perlu dicek`,
      href: "/admin/submission",
    });
  }

  for (const team of teams.filter((item) => item.is_disqualified)) {
    healthWarnings.push({
      id: `disqualified-${team.id}`,
      title: "Tim didiskualifikasi",
      detail: `${team.team_name} (${team.team_code})`,
      href: "/admin/tim",
    });
  }

  for (const judge of activeJudges.filter((item) => !item.judge_stage)) {
    healthWarnings.push({
      id: `judge-stage-${judge.id}`,
      title: "Juri tanpa tahap penilaian",
      detail: judge.full_name,
      href: "/admin/akun",
    });
  }

  const phaseDefinitions = [
    { id: "submission", label: "Submission", range: `s.d. ${deadlineLabel}` },
    { id: "judging", label: "Penilaian", range: "11–17 Nov 2026" },
    { id: "top5", label: "Top 5", range: "18 Nov 2026" },
    { id: "final", label: "Final", range: "21 Nov 2026" },
    { id: "winners", label: "Pemenang", range: "25 Nov 2026" },
  ];

  const parsedDeadline = deadlineIso ? new Date(deadlineIso) : null;
  const submissionEnd =
    parsedDeadline && !Number.isNaN(parsedDeadline.getTime()) ? parsedDeadline : new Date("2026-11-10T23:59:00+08:00");
  const phaseEnds: (Date | null)[] = [
    submissionEnd,
    new Date("2026-11-18T00:00:00+08:00"),
    new Date("2026-11-21T00:00:00+08:00"),
    new Date("2026-11-25T00:00:00+08:00"),
    null,
  ];

  let activePhaseIndex = phaseEnds.findIndex((end) => end === null || now < end);
  if (activePhaseIndex === -1) {
    activePhaseIndex = phaseDefinitions.length - 1;
  }

  const phases: PhaseItem[] = phaseDefinitions.map((phase, index) => {
    let status: PhaseItem["status"] = "upcoming";
    if (index === activePhaseIndex) {
      status = "active";
    } else if (index < activePhaseIndex) {
      status = "done";
    }

    return { ...phase, status };
  });
  const currentPhaseLabel = phaseDefinitions[activePhaseIndex].label;

  const auditTarget = (log: { target_type: string; target_id: string | null; metadata: unknown }) => {
    if (log.target_type === "team" && log.target_id) {
      return teamById.get(log.target_id)?.team_name ?? "Tim";
    }
    if (log.target_type === "profile" && log.target_id) {
      return profileById.get(log.target_id)?.full_name ?? "Akun";
    }
    if ((log.target_type === "preliminary_score" || log.target_type === "final_score") && log.target_id) {
      const team = teamById.get(log.target_id);
      const stage = metadataStage(log.metadata);
      let stageText = "";
      if (stage === "preliminary") {
        stageText = " · babak awal";
      } else if (stage === "final") {
        stageText = " · final";
      }
      return team ? `${team.team_name}${stageText}` : (targetTypeLabels[log.target_type] ?? "Nilai");
    }
    if (log.target_type === "competition_settings") {
      const stage = metadataStage(log.metadata);
      if (stage === "preliminary") return "Hasil babak awal";
      if (stage === "final") return "Hasil babak final";
      return "Pengaturan kompetisi";
    }
    return targetTypeLabels[log.target_type] ?? "Sistem";
  };

  const auditActivity: ActivityItem[] = auditLogs.map((log) => ({
    id: `audit-${log.id}`,
    kind: "audit",
    label: auditActionLabels[log.action] ?? log.action,
    target: auditTarget(log),
    actor: profileById.get(log.actor_id)?.full_name ?? null,
    createdAt: log.created_at,
  }));

  const submissionActivity: ActivityItem[] = submittedSubmissions
    .map((submission): ActivityItem | null => {
      const team = teamById.get(submission.team_id);
      const stamp = submission.first_submitted_at ?? submission.submitted_at;
      if (!stamp) return null;

      return {
        id: `submission-${submission.team_id}`,
        kind: "submission" as const,
        label: "Mengirim submission",
        target: team ? `${team.team_name} (${team.team_code})` : "Tim",
        actor: team?.leader_name ?? null,
        createdAt: stamp,
      } satisfies ActivityItem;
    })
    .filter((item): item is ActivityItem => item !== null);

  const recentActivity = [...auditActivity, ...submissionActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <AdminDashboardClient
      activeJudgeCount={activeJudges.length}
      activeTeamCount={activeTeams.length}
      chaseTeams={chaseTeams}
      currentPhaseLabel={currentPhaseLabel}
      deadlineIso={deadlineIso}
      deadlineLabel={deadlineLabel}
      draftCount={draftSubmissions.length}
      finalResultsReleased={Boolean(settings?.final_results_released)}
      finalistCount={finalists.length}
      finalistSlots={finalistSlots}
      healthWarnings={healthWarnings}
      judgeProgress={judgeProgress}
      judgingSummary={judgingSummary}
      phases={phases}
      prelimRankedCount={prelimRanking.length}
      preliminaryResultsReleased={Boolean(settings?.preliminary_results_released)}
      recentActivity={recentActivity}
      serverNowIso={serverNowIso}
      submittedCount={submittedSubmissions.length}
      todayCount={todayCount}
      todayDelta={todayDelta}
      topFive={topFive}
      totalTeams={teams.length}
      trend={trend}
    />
  );
}

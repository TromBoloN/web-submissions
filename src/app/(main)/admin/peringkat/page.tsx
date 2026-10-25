import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { type JudgeProgress, type JudgeScoreDetail, RankingClient, type RankingRow } from "./ranking-client";

export const metadata: Metadata = {
  title: `Peringkat | ${APP_CONFIG.name}`,
  description: "Hasil pemeringkatan dan progres penilaian juri MIT-WEEK 2026.",
};

export default async function AdminPeringkatPage() {
  await requireRole("admin");

  const supabase = await createClient();

  const [judgesRes, teamsRes, submissionsRes, prelimRankingRes, finalRankingRes, prelimScoresRes, finalScoresRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, judge_stage, is_active")
        .eq("role", "judge")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
      supabase
        .from("teams")
        .select("id, team_code, team_name, is_finalist, is_disqualified")
        .order("team_code", { ascending: true }),
      supabase.from("submissions").select("team_id, status"),
      supabase.from("preliminary_ranking").select("*").order("rank", { ascending: true }),
      supabase.from("final_ranking").select("*").order("rank", { ascending: true }),
      supabase.from("preliminary_scores").select("*").order("created_at", { ascending: true }),
      supabase.from("final_scores").select("*").order("created_at", { ascending: true }),
    ]);

  if (
    judgesRes.error ||
    teamsRes.error ||
    submissionsRes.error ||
    prelimRankingRes.error ||
    finalRankingRes.error ||
    prelimScoresRes.error ||
    finalScoresRes.error
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Peringkat & Hasil Penilaian</h1>
          <p className="text-muted-foreground text-sm">
            Pantau progres penilaian juri, hasil pemeringkatan babak awal dan final, serta rincian nilai per tim.
          </p>
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data peringkat atau penilaian tidak dapat dimuat. Silakan muat ulang halaman.
        </p>
      </div>
    );
  }

  const judges = judgesRes.data ?? [];
  const teams = teamsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const prelimScores = prelimScoresRes.data ?? [];
  const finalScores = finalScoresRes.data ?? [];

  const submissionMap = new Map(submissions.map((s) => [s.team_id, s.status]));
  const judgeMap = new Map(judges.map((j) => [j.id, j]));

  // Eligible teams
  const eligiblePrelimTeams = teams.filter((t) => !t.is_disqualified && submissionMap.get(t.id) === "submitted");
  const eligibleFinalTeams = teams.filter(
    (t) => !t.is_disqualified && t.is_finalist && submissionMap.get(t.id) === "submitted",
  );

  const prelimExpectedTotal = eligiblePrelimTeams.length;
  const finalExpectedTotal = eligibleFinalTeams.length;

  // Count scores entered per judge
  const prelimCountByJudge = new Map<string, number>();
  for (const s of prelimScores) {
    prelimCountByJudge.set(s.judge_id, (prelimCountByJudge.get(s.judge_id) ?? 0) + 1);
  }

  const finalCountByJudge = new Map<string, number>();
  for (const s of finalScores) {
    finalCountByJudge.set(s.judge_id, (finalCountByJudge.get(s.judge_id) ?? 0) + 1);
  }

  // Build judges progress
  const judgesProgress: JudgeProgress[] = judges.map((j) => {
    const stage = j.judge_stage ?? "preliminary";
    const pCompleted = prelimCountByJudge.get(j.id) ?? 0;
    const fCompleted = finalCountByJudge.get(j.id) ?? 0;

    let isIncomplete = false;
    if (stage === "preliminary" || stage === "both") {
      if (pCompleted < prelimExpectedTotal) isIncomplete = true;
    }
    if (stage === "final" || stage === "both") {
      if (fCompleted < finalExpectedTotal) isIncomplete = true;
    }

    return {
      judge_id: j.id,
      judge_name: j.full_name,
      judge_stage: stage,
      prelim_completed: pCompleted,
      prelim_total: prelimExpectedTotal,
      final_completed: fCompleted,
      final_total: finalExpectedTotal,
      is_incomplete: isIncomplete,
    };
  });

  // Build team score breakdown for preliminary
  const prelimBreakdown: Record<string, JudgeScoreDetail[]> = {};
  for (const s of prelimScores) {
    if (!prelimBreakdown[s.team_id]) {
      prelimBreakdown[s.team_id] = [];
    }
    prelimBreakdown[s.team_id].push({
      judge_id: s.judge_id,
      judge_name: judgeMap.get(s.judge_id)?.full_name ?? "Juri",
      functionality_score: s.functionality_score,
      case_study_fit_score: s.case_study_fit_score,
      ui_ux_score: s.ui_ux_score,
      code_quality_score: s.code_quality_score,
      documentation_score: s.documentation_score,
      total_weighted_score: s.total_weighted_score,
      feedback: s.feedback,
      updated_at: s.updated_at,
      locked_at: s.locked_at,
    });
  }

  // Build team score breakdown for final
  const finalBreakdown: Record<string, JudgeScoreDetail[]> = {};
  for (const s of finalScores) {
    if (!finalBreakdown[s.team_id]) {
      finalBreakdown[s.team_id] = [];
    }
    finalBreakdown[s.team_id].push({
      judge_id: s.judge_id,
      judge_name: judgeMap.get(s.judge_id)?.full_name ?? "Juri",
      functionality_score: s.functionality_score,
      case_study_fit_score: s.case_study_fit_score,
      ui_ux_score: s.ui_ux_score,
      code_quality_score: s.code_quality_score,
      documentation_score: s.documentation_score,
      presentation_qa_score: s.presentation_qa_score,
      total_weighted_score: s.total_weighted_score,
      feedback: s.feedback,
      updated_at: s.updated_at,
      locked_at: s.locked_at,
    });
  }

  // Format ranking rows
  const prelimRanking: RankingRow[] = (prelimRankingRes.data ?? []).map((r) => ({
    rank: r.rank,
    team_id: r.team_id ?? "",
    team_code: r.team_code ?? "-",
    team_name: r.team_name ?? "-",
    judges_count: r.judges_count ?? 0,
    avg_score: r.avg_score,
  }));

  const finalRanking: RankingRow[] = (finalRankingRes.data ?? []).map((r) => ({
    rank: r.rank,
    team_id: r.team_id ?? "",
    team_code: r.team_code ?? "-",
    team_name: r.team_name ?? "-",
    judges_count: r.judges_count ?? 0,
    avg_score: r.avg_score,
  }));

  return (
    <RankingClient
      judgesProgress={judgesProgress}
      prelimRanking={prelimRanking}
      finalRanking={finalRanking}
      prelimBreakdown={prelimBreakdown}
      finalBreakdown={finalBreakdown}
    />
  );
}

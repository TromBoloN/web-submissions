import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { type JudgingProgressStats, ResultsReleaseClient, type StageJudgingProgress } from "./results-release-client";

type Judge = { id: string; judge_stage: string | null };
type ScoreRow = { judge_id: string; team_id: string; status: string };
type RecusalRow = { judge_id: string; team_id: string; stage: string };

/** Progress for one stage; same eligibility rules as /admin/peringkat. */
function stageProgress(
  judges: Judge[],
  stage: "preliminary" | "final",
  eligibleTeamIds: Set<string>,
  scores: ScoreRow[],
  recusals: RecusalRow[],
): StageJudgingProgress {
  const stageJudges = judges.filter((j) => j.judge_stage === stage || j.judge_stage === "both");
  const judgeIds = new Set(stageJudges.map((j) => j.id));

  const doneByJudge = new Map<string, number>();
  const bump = (judgeId: string) => doneByJudge.set(judgeId, (doneByJudge.get(judgeId) ?? 0) + 1);

  for (const s of scores) {
    if (s.status === "final" && judgeIds.has(s.judge_id) && eligibleTeamIds.has(s.team_id)) bump(s.judge_id);
  }
  for (const r of recusals) {
    if (r.stage === stage && judgeIds.has(r.judge_id) && eligibleTeamIds.has(r.team_id)) bump(r.judge_id);
  }

  const expectedPerJudge = eligibleTeamIds.size;
  const completedJudges = stageJudges.filter((j) => (doneByJudge.get(j.id) ?? 0) >= expectedPerJudge).length;

  return {
    totalJudges: stageJudges.length,
    completedJudges,
    incompleteJudges: stageJudges.length - completedJudges,
    totalExpectedScores: stageJudges.length * expectedPerJudge,
    completedScores: Array.from(doneByJudge.values()).reduce((a, b) => a + b, 0),
    isAllCompleted: stageJudges.length > 0 && completedJudges === stageJudges.length,
    eligibleTeamsCount: expectedPerJudge,
  };
}

export default async function ResultsSettingsPage() {
  const supabase = await createClient();

  const [settingsRes, judgesRes, teamsRes, submissionsRes, prelimRes, finalRes, recusalsRes] = await Promise.all([
    supabase
      .from("competition_settings")
      .select("preliminary_results_released, final_results_released")
      .eq("id", true)
      .maybeSingle(),
    supabase.from("profiles").select("id, judge_stage").eq("role", "judge").eq("is_active", true),
    supabase.from("teams").select("id, is_finalist, is_disqualified"),
    supabase.from("submissions").select("team_id, status"),
    supabase.from("preliminary_scores").select("judge_id, team_id, status"),
    supabase.from("final_scores").select("judge_id, team_id, status"),
    supabase.from("judge_recusals").select("judge_id, team_id, stage"),
  ]);

  if (settingsRes.error) return <SettingsLoadError />;

  const submitted = new Set((submissionsRes.data ?? []).filter((s) => s.status === "submitted").map((s) => s.team_id));
  const teams = (teamsRes.data ?? []).filter((t) => !t.is_disqualified && submitted.has(t.id));
  const prelimTeamIds = new Set(teams.map((t) => t.id));
  const finalTeamIds = new Set(teams.filter((t) => t.is_finalist).map((t) => t.id));
  const judges = judgesRes.data ?? [];
  const recusals = recusalsRes.data ?? [];

  const judgingStats: JudgingProgressStats = {
    preliminary: stageProgress(judges, "preliminary", prelimTeamIds, prelimRes.data ?? [], recusals),
    final: stageProgress(judges, "final", finalTeamIds, finalRes.data ?? [], recusals),
  };

  return (
    <ResultsReleaseClient
      preliminaryResultsReleased={Boolean(settingsRes.data?.preliminary_results_released)}
      finalResultsReleased={Boolean(settingsRes.data?.final_results_released)}
      judgingStats={judgingStats}
    />
  );
}

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { JudgeDashboardClient, type JudgeTeamItem } from "./judge-dashboard-client";

export default async function JudgePage() {
  const profile = await requireRole("judge");
  const stage = profile.judge_stage ?? "preliminary";

  const supabase = await createClient();

  const isPrelimNeeded = stage === "preliminary" || stage === "both";
  const isFinalNeeded = stage === "final" || stage === "both";

  const [
    { data: teams, error: teamsError },
    { data: submissions, error: submissionsError },
    prelimScoresResult,
    finalScoresResult,
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, team_code, team_name, is_finalist, is_disqualified")
      .eq("is_disqualified", false)
      .order("team_code", { ascending: true }),
    supabase.from("submissions").select("team_id, status").eq("status", "submitted"),
    isPrelimNeeded
      ? supabase
          .from("preliminary_scores")
          .select("team_id, total_weighted_score, updated_at, locked_at")
          .eq("judge_id", profile.id)
      : Promise.resolve({ data: [], error: null }),
    isFinalNeeded
      ? supabase
          .from("final_scores")
          .select("team_id, total_weighted_score, updated_at, locked_at")
          .eq("judge_id", profile.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamsError || submissionsError || prelimScoresResult.error || finalScoresResult.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl">Penilaian Karya</h1>
          <p className="text-muted-foreground">Panel penilaian untuk dewan juri MIT-WEEK 2026.</p>
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data penilaian tidak dapat dimuat. Silakan coba muat ulang halaman.
        </p>
      </div>
    );
  }

  const submittedTeamIds = new Set((submissions ?? []).map((s) => s.team_id));

  const prelimScoreMap = new Map(
    (prelimScoresResult.data ?? []).map((score) => [
      score.team_id,
      {
        total_weighted_score: Number(score.total_weighted_score),
        updated_at: score.updated_at,
        locked_at: score.locked_at,
      },
    ]),
  );

  const finalScoreMap = new Map(
    (finalScoresResult.data ?? []).map((score) => [
      score.team_id,
      {
        total_weighted_score: Number(score.total_weighted_score),
        updated_at: score.updated_at,
        locked_at: score.locked_at,
      },
    ]),
  );

  // Teams with 'submitted' status that are NOT disqualified
  const submittedTeams = (teams ?? []).filter((team) => !team.is_disqualified && submittedTeamIds.has(team.id));

  const preliminaryTeams: JudgeTeamItem[] = isPrelimNeeded
    ? submittedTeams.map((team) => ({
        id: team.id,
        team_code: team.team_code,
        team_name: team.team_name,
        is_finalist: team.is_finalist,
        score: prelimScoreMap.get(team.id) ?? null,
      }))
    : [];

  const finalTeams: JudgeTeamItem[] = isFinalNeeded
    ? submittedTeams
        .filter((team) => team.is_finalist)
        .map((team) => ({
          id: team.id,
          team_code: team.team_code,
          team_name: team.team_name,
          is_finalist: team.is_finalist,
          score: finalScoreMap.get(team.id) ?? null,
        }))
    : [];

  return (
    <JudgeDashboardClient
      judgeName={profile.full_name}
      judgeStage={profile.judge_stage}
      preliminaryTeams={preliminaryTeams}
      finalTeams={finalTeams}
    />
  );
}

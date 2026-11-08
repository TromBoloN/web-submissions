import "server-only";

import { requireRole } from "@/lib/auth";
import type { ScoringStage } from "@/lib/rubric";
import { createClient } from "@/lib/supabase/server";

export interface JudgeTeamItem {
  id: string;
  team_code: string;
  team_name: string;
  is_finalist: boolean;
  is_stage_released: boolean;
  score: {
    total_weighted_score: number;
    updated_at: string;
    locked_at: string | null;
  } | null;
}

/**
 * Returns the deterministic list of teams eligible for scoring by the current judge.
 * Query is strictly subject to RLS and ordered by team_code ascending.
 * Disqualified teams, draft submissions, and non-finalists (for final stage) are excluded.
 */
export async function getJudgeTeamList(stage: ScoringStage): Promise<JudgeTeamItem[]> {
  const profile = await requireRole("judge");
  const judgeStage = profile.judge_stage ?? "preliminary";

  const allowedStages = judgeStage === "both" ? ["preliminary", "final"] : [judgeStage];
  if (!allowedStages.includes(stage)) {
    return [];
  }

  const supabase = await createClient();

  const [
    { data: teams, error: teamsError },
    { data: submissions, error: submissionsError },
    scoresResult,
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, team_code, team_name, is_finalist, is_disqualified")
      .eq("is_disqualified", false)
      .order("team_code", { ascending: true }),
    supabase.from("submissions").select("team_id, status").eq("status", "submitted"),
    stage === "preliminary"
      ? supabase
          .from("preliminary_scores")
          .select("team_id, total_weighted_score, updated_at, locked_at")
          .eq("judge_id", profile.id)
      : supabase
          .from("final_scores")
          .select("team_id, total_weighted_score, updated_at, locked_at")
          .eq("judge_id", profile.id),
    supabase
      .from("competition_settings")
      .select("preliminary_results_released, final_results_released")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (teamsError || submissionsError || scoresResult.error || settingsError) {
    console.error("Failed to fetch judge team list", {
      teamsError,
      submissionsError,
      scoresError: scoresResult.error,
      settingsError,
    });
    return [];
  }

  const isStageReleased = Boolean(
    stage === "preliminary" ? settings?.preliminary_results_released : settings?.final_results_released,
  );

  const submittedTeamIds = new Set((submissions ?? []).map((s) => s.team_id));

  const scoreMap = new Map(
    (scoresResult.data ?? []).map((score) => [
      score.team_id,
      {
        total_weighted_score: Number(score.total_weighted_score),
        updated_at: score.updated_at,
        locked_at: score.locked_at,
      },
    ]),
  );

  // Teams that are submitted and not disqualified
  let eligibleTeams = (teams ?? []).filter((team) => !team.is_disqualified && submittedTeamIds.has(team.id));

  // For final stage, team must be finalist
  if (stage === "final") {
    eligibleTeams = eligibleTeams.filter((team) => team.is_finalist);
  }

  // Ensure deterministic sort by team_code ascending
  eligibleTeams.sort((a, b) => a.team_code.localeCompare(b.team_code, "id", { numeric: true }));

  return eligibleTeams.map((team) => ({
    id: team.id,
    team_code: team.team_code,
    team_name: team.team_name,
    is_finalist: team.is_finalist,
    is_stage_released: isStageReleased,
    score: scoreMap.get(team.id) ?? null,
  }));
}

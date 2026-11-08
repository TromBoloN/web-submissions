import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import type { ScoringStage } from "@/lib/rubric";
import { createClient } from "@/lib/supabase/server";

import { getJudgeTeamList } from "../../../queries";
import { ScoringFormClient } from "./scoring-form-client";

interface PageProps {
  params: Promise<{
    tahap: string;
    teamId: string;
  }>;
}

export default async function JudgeScoringPage({ params }: PageProps) {
  const profile = await requireRole("judge");
  const { tahap: rawTahap, teamId } = await params;

  if (rawTahap !== "preliminary" && rawTahap !== "final") {
    redirect("/judge");
  }

  const tahap = rawTahap as ScoringStage;

  // Validate judge stage allows this tahap
  const judgeStage = profile.judge_stage ?? "preliminary";
  if (judgeStage !== "both" && judgeStage !== tahap) {
    redirect("/judge");
  }

  // Validate UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId);
  if (!isUuid) {
    redirect("/judge");
  }

  // Retrieve authorized team list for this judge and stage
  const teamList = await getJudgeTeamList(tahap);
  const currentIndex = teamList.findIndex((t) => t.id === teamId);

  // If the team is not in the authorized list (disqualified, draft, non-finalist, or wrong stage), redirect
  if (currentIndex === -1) {
    redirect("/judge");
  }

  const currentTeamItem = teamList[currentIndex];

  const supabase = await createClient();

  // Load submission and stage settings
  const [{ data: submission }, { data: settings }] = await Promise.all([
    supabase
      .from("submissions")
      .select("status, github_url, live_demo_url, video_url, notes_for_judges")
      .eq("team_id", teamId)
      .maybeSingle(),
    supabase
      .from("competition_settings")
      .select("preliminary_results_released, final_results_released")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (submission?.status !== "submitted") {
    redirect("/judge");
  }

  const isStageReleased = Boolean(
    tahap === "preliminary" ? settings?.preliminary_results_released : settings?.final_results_released,
  );

  // Calculate navigation:
  // Previous and Next teams in the sorted list
  const prevTeam = currentIndex > 0 ? teamList[currentIndex - 1] : null;
  const nextTeam = currentIndex < teamList.length - 1 ? teamList[currentIndex + 1] : null;

  // Find next unrated team (score === null and stage not released)
  const nextForward = teamList.slice(currentIndex + 1).find((t) => t.score === null && !t.is_stage_released);
  const nextFromStart = teamList.slice(0, currentIndex).find((t) => t.score === null && !t.is_stage_released);
  const nextUnscored = nextForward ?? nextFromStart;

  // Load judge's existing score for this team (if any)
  let initialScore = null;
  if (tahap === "preliminary") {
    const { data: prelimScore } = await supabase
      .from("preliminary_scores")
      .select("*")
      .eq("judge_id", profile.id)
      .eq("team_id", teamId)
      .maybeSingle();

    if (prelimScore) {
      initialScore = {
        functionality_score: Number(prelimScore.functionality_score),
        case_study_fit_score: Number(prelimScore.case_study_fit_score),
        ui_ux_score: Number(prelimScore.ui_ux_score),
        code_quality_score: Number(prelimScore.code_quality_score),
        documentation_score: Number(prelimScore.documentation_score),
        total_weighted_score: Number(prelimScore.total_weighted_score),
        feedback: prelimScore.feedback,
        updated_at: prelimScore.updated_at,
        locked_at: prelimScore.locked_at,
      };
    }
  } else {
    const { data: finalScore } = await supabase
      .from("final_scores")
      .select("*")
      .eq("judge_id", profile.id)
      .eq("team_id", teamId)
      .maybeSingle();

    if (finalScore) {
      initialScore = {
        functionality_score: Number(finalScore.functionality_score),
        case_study_fit_score: Number(finalScore.case_study_fit_score),
        ui_ux_score: Number(finalScore.ui_ux_score),
        code_quality_score: Number(finalScore.code_quality_score),
        documentation_score: Number(finalScore.documentation_score),
        presentation_qa_score: Number(finalScore.presentation_qa_score),
        total_weighted_score: Number(finalScore.total_weighted_score),
        feedback: finalScore.feedback,
        updated_at: finalScore.updated_at,
        locked_at: finalScore.locked_at,
      };
    }
  }

  return (
    <ScoringFormClient
      tahap={tahap}
      team={{
        id: currentTeamItem.id,
        team_code: currentTeamItem.team_code,
        team_name: currentTeamItem.team_name,
      }}
      submission={{
        github_url: submission.github_url ?? "",
        live_demo_url: submission.live_demo_url ?? "",
        video_url: submission.video_url ?? "",
        notes_for_judges: submission.notes_for_judges ?? "",
      }}
      initialScore={initialScore}
      isStageReleased={isStageReleased}
      navigation={{
        currentPosition: currentIndex + 1,
        totalTeams: teamList.length,
        prevTeamId: prevTeam ? prevTeam.id : null,
        nextTeamId: nextTeam ? nextTeam.id : null,
        nextUnscoredTeamId: nextUnscored ? nextUnscored.id : null,
      }}
    />
  );
}

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

function toNullableNumber(value: number | null): number | null {
  return value === null ? null : Number(value);
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

  // Load submission, stage settings, and the judge's recusal for this team
  const [{ data: submission }, { data: settings }, { data: recusal }] = await Promise.all([
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
    supabase
      .from("judge_recusals")
      .select("reason, created_at")
      .eq("judge_id", profile.id)
      .eq("team_id", teamId)
      .eq("stage", tahap)
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

  // Find next team without a final score or recusal (drafts still count as unfinished)
  const nextForward = teamList
    .slice(currentIndex + 1)
    .find((t) => t.score?.status !== "final" && !t.recusal && !t.is_stage_released);
  const nextFromStart = teamList
    .slice(0, currentIndex)
    .find((t) => t.score?.status !== "final" && !t.recusal && !t.is_stage_released);
  const nextUnscored = nextForward ?? nextFromStart;

  // Load judge's existing score for this team (if any)
  let initialScore = null;
  if (tahap === "preliminary") {
    const { data: prelimScore } = await supabase
      .from("preliminary_scores")
      .select(
        "functionality_score, case_study_fit_score, ui_ux_score, code_quality_score, documentation_score, total_weighted_score, feedback, private_note, status, updated_at, locked_at",
      )
      .eq("judge_id", profile.id)
      .eq("team_id", teamId)
      .maybeSingle();

    if (prelimScore) {
      initialScore = {
        functionality_score: toNullableNumber(prelimScore.functionality_score),
        case_study_fit_score: toNullableNumber(prelimScore.case_study_fit_score),
        ui_ux_score: toNullableNumber(prelimScore.ui_ux_score),
        code_quality_score: toNullableNumber(prelimScore.code_quality_score),
        documentation_score: toNullableNumber(prelimScore.documentation_score),
        total_weighted_score: toNullableNumber(prelimScore.total_weighted_score),
        feedback: prelimScore.feedback,
        private_note: prelimScore.private_note,
        status: prelimScore.status,
        updated_at: prelimScore.updated_at,
        locked_at: prelimScore.locked_at,
      };
    }
  } else {
    const { data: finalScore } = await supabase
      .from("final_scores")
      .select(
        "functionality_score, case_study_fit_score, ui_ux_score, code_quality_score, documentation_score, presentation_qa_score, total_weighted_score, feedback, private_note, status, updated_at, locked_at",
      )
      .eq("judge_id", profile.id)
      .eq("team_id", teamId)
      .maybeSingle();

    if (finalScore) {
      initialScore = {
        functionality_score: toNullableNumber(finalScore.functionality_score),
        case_study_fit_score: toNullableNumber(finalScore.case_study_fit_score),
        ui_ux_score: toNullableNumber(finalScore.ui_ux_score),
        code_quality_score: toNullableNumber(finalScore.code_quality_score),
        documentation_score: toNullableNumber(finalScore.documentation_score),
        presentation_qa_score: toNullableNumber(finalScore.presentation_qa_score),
        total_weighted_score: toNullableNumber(finalScore.total_weighted_score),
        feedback: finalScore.feedback,
        private_note: finalScore.private_note,
        status: finalScore.status,
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
      initialRecusal={recusal ? { reason: recusal.reason, created_at: recusal.created_at } : null}
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

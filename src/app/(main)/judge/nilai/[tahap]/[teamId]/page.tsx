import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import type { ScoringStage } from "@/lib/rubric";
import { createClient } from "@/lib/supabase/server";

import { getJudgeTeamList } from "../../../queries";
import type { PreliminaryReviewScore } from "./preliminary-review";
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

  const supabase = await createClient();

  // Everything below depends only on the session judge, tahap and teamId, so load it in one parallel batch.
  // RLS scopes every read; the authorization redirects below still run before anything renders.
  const prelimScoreQuery =
    tahap === "preliminary"
      ? supabase
          .from("preliminary_scores")
          .select(
            "functionality_score, case_study_fit_score, ui_ux_score, code_quality_score, documentation_score, total_weighted_score, feedback, private_note, status, updated_at, locked_at",
          )
          .eq("judge_id", profile.id)
          .eq("team_id", teamId)
          .maybeSingle()
      : null;
  const finalScoreQuery =
    tahap === "final"
      ? supabase
          .from("final_scores")
          .select(
            "functionality_score, case_study_fit_score, ui_ux_score, code_quality_score, documentation_score, presentation_qa_score, total_weighted_score, feedback, private_note, status, updated_at, locked_at",
          )
          .eq("judge_id", profile.id)
          .eq("team_id", teamId)
          .maybeSingle()
      : null;
  // Final stage only: anonymous final-status preliminary scores. The RPC enforces judge stage, release,
  // finalist and recusal checks itself and returns no rows otherwise.
  const preliminaryReviewQuery =
    tahap === "final" ? supabase.rpc("get_preliminary_scores_for_final", { p_team_id: teamId }) : null;

  const [
    teamList,
    { data: submission },
    { data: settings },
    { data: recusal },
    prelimScoreRes,
    finalScoreRes,
    preliminaryReviewRes,
  ] = await Promise.all([
    // Authorized team list for this judge and stage
    getJudgeTeamList(tahap),
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
    prelimScoreQuery,
    finalScoreQuery,
    preliminaryReviewQuery,
  ]);

  const currentIndex = teamList.findIndex((t) => t.id === teamId);

  // If the team is not in the authorized list (disqualified, draft, non-finalist, or wrong stage), redirect
  if (currentIndex === -1) {
    redirect("/judge");
  }

  const currentTeamItem = teamList[currentIndex];

  if (submission?.status !== "submitted") {
    redirect("/judge");
  }

  // null hides the panel: not the final stage, preliminary not released yet, or the RPC failed
  // (e.g. migration 20261121010000 not applied). An empty array shows the "no scores yet" state.
  const preliminaryReview: PreliminaryReviewScore[] | null =
    tahap === "final" && settings?.preliminary_results_released && preliminaryReviewRes && !preliminaryReviewRes.error
      ? (preliminaryReviewRes.data ?? []).map((row) => ({
          judgeLabel: row.judge_label,
          scores: {
            functionality_score: toNullableNumber(row.functionality_score),
            case_study_fit_score: toNullableNumber(row.case_study_fit_score),
            ui_ux_score: toNullableNumber(row.ui_ux_score),
            code_quality_score: toNullableNumber(row.code_quality_score),
            documentation_score: toNullableNumber(row.documentation_score),
          },
          totalWeightedScore: toNullableNumber(row.total_weighted_score),
          feedback: row.feedback,
        }))
      : null;

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
    const prelimScore = prelimScoreRes?.data;

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
    const finalScore = finalScoreRes?.data;

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
      preliminaryReview={preliminaryReview}
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

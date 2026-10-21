import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import type { ScoringStage } from "@/lib/rubric";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();

  // Load team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, team_code, team_name, is_finalist, is_disqualified")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !team || team.is_disqualified) {
    redirect("/judge");
  }

  // Final stage requires the team to be a finalist
  if (tahap === "final" && !team.is_finalist) {
    redirect("/judge");
  }

  // Load submission (must be 'submitted')
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("status, github_url, live_demo_url, video_url")
    .eq("team_id", teamId)
    .maybeSingle();

  if (submissionError || !submission || submission.status !== "submitted") {
    redirect("/judge");
  }

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
      };
    }
  }

  return (
    <ScoringFormClient
      tahap={tahap}
      team={{
        id: team.id,
        team_code: team.team_code,
        team_name: team.team_name,
      }}
      submission={{
        github_url: submission.github_url ?? "",
        live_demo_url: submission.live_demo_url ?? "",
        video_url: submission.video_url ?? "",
      }}
      initialScore={initialScore}
    />
  );
}

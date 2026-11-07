import { createClient } from "@/lib/supabase/server";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [settingsRes, caseStudyRes, judgesRes, teamsRes, submissionsRes, prelimScoresRes, finalScoresRes] =
    await Promise.all([
      supabase
        .from("competition_settings")
        .select(
          "submission_closes_at, updated_at, juknis_url, contact_whatsapp, preliminary_results_released, final_results_released",
        )
        .eq("id", true)
        .maybeSingle(),
      supabase.from("case_study").select("title, content_md, release_at, updated_at").eq("id", true).maybeSingle(),
      supabase.from("profiles").select("id, full_name, judge_stage").eq("role", "judge").eq("is_active", true),
      supabase.from("teams").select("id, is_finalist, is_disqualified"),
      supabase.from("submissions").select("team_id, status"),
      supabase.from("preliminary_scores").select("judge_id, team_id"),
      supabase.from("final_scores").select("judge_id, team_id"),
    ]);

  if (settingsRes.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl">Pengaturan</h1>
          <p className="text-muted-foreground">Kelola konfigurasi dan batas waktu kompetisi MIT-WEEK 2026.</p>
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Pengaturan kompetisi tidak dapat dimuat. Silakan coba lagi.
        </p>
      </div>
    );
  }

  const settings = settingsRes.data;
  const caseStudy = caseStudyRes.data ?? null;

  const judges = judgesRes.data ?? [];
  const teams = teamsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const prelimScores = prelimScoresRes.data ?? [];
  const finalScores = finalScoresRes.data ?? [];

  const submissionMap = new Map(submissions.map((s) => [s.team_id, s.status]));

  // Eligible teams (same calculation as /admin/peringkat)
  const eligiblePrelimTeams = teams.filter((t) => !t.is_disqualified && submissionMap.get(t.id) === "submitted");
  const eligibleFinalTeams = teams.filter(
    (t) => !t.is_disqualified && t.is_finalist && submissionMap.get(t.id) === "submitted",
  );

  const eligiblePrelimTeamIds = new Set(eligiblePrelimTeams.map((t) => t.id));
  const eligibleFinalTeamIds = new Set(eligibleFinalTeams.map((t) => t.id));

  // Preliminary judges & scores
  const prelimJudges = judges.filter((j) => j.judge_stage === "preliminary" || j.judge_stage === "both");
  const prelimJudgeIds = new Set(prelimJudges.map((j) => j.id));

  const prelimCountByJudge = new Map<string, number>();
  for (const s of prelimScores) {
    if (prelimJudgeIds.has(s.judge_id) && eligiblePrelimTeamIds.has(s.team_id)) {
      prelimCountByJudge.set(s.judge_id, (prelimCountByJudge.get(s.judge_id) ?? 0) + 1);
    }
  }

  const prelimExpectedPerJudge = eligiblePrelimTeams.length;
  const completedPrelimJudges = prelimJudges.filter(
    (j) => (prelimCountByJudge.get(j.id) ?? 0) >= prelimExpectedPerJudge,
  ).length;
  const totalPrelimExpectedScores = prelimJudges.length * prelimExpectedPerJudge;
  const completedPrelimScores = Array.from(prelimCountByJudge.values()).reduce((a, b) => a + b, 0);

  // Final judges & scores
  const finalJudges = judges.filter((j) => j.judge_stage === "final" || j.judge_stage === "both");
  const finalJudgeIds = new Set(finalJudges.map((j) => j.id));

  const finalCountByJudge = new Map<string, number>();
  for (const s of finalScores) {
    if (finalJudgeIds.has(s.judge_id) && eligibleFinalTeamIds.has(s.team_id)) {
      finalCountByJudge.set(s.judge_id, (finalCountByJudge.get(s.judge_id) ?? 0) + 1);
    }
  }

  const finalExpectedPerJudge = eligibleFinalTeams.length;
  const completedFinalJudges = finalJudges.filter(
    (j) => (finalCountByJudge.get(j.id) ?? 0) >= finalExpectedPerJudge,
  ).length;
  const totalFinalExpectedScores = finalJudges.length * finalExpectedPerJudge;
  const completedFinalScores = Array.from(finalCountByJudge.values()).reduce((a, b) => a + b, 0);

  const judgingStats = {
    preliminary: {
      totalJudges: prelimJudges.length,
      completedJudges: completedPrelimJudges,
      incompleteJudges: prelimJudges.length - completedPrelimJudges,
      totalExpectedScores: totalPrelimExpectedScores,
      completedScores: completedPrelimScores,
      isAllCompleted: prelimJudges.length > 0 && completedPrelimJudges === prelimJudges.length,
      eligibleTeamsCount: eligiblePrelimTeams.length,
    },
    final: {
      totalJudges: finalJudges.length,
      completedJudges: completedFinalJudges,
      incompleteJudges: finalJudges.length - completedFinalJudges,
      totalExpectedScores: totalFinalExpectedScores,
      completedScores: completedFinalScores,
      isAllCompleted: finalJudges.length > 0 && completedFinalJudges === finalJudges.length,
      eligibleTeamsCount: eligibleFinalTeams.length,
    },
  };

  return (
    <SettingsClient
      currentClosesAt={settings?.submission_closes_at ?? null}
      currentJuknisUrl={settings?.juknis_url ?? null}
      currentContactWhatsapp={settings?.contact_whatsapp ?? null}
      updatedAt={settings?.updated_at ?? null}
      preliminaryResultsReleased={Boolean(settings?.preliminary_results_released)}
      finalResultsReleased={Boolean(settings?.final_results_released)}
      judgingStats={judgingStats}
      caseStudy={
        caseStudy
          ? {
              title: caseStudy.title,
              contentMd: caseStudy.content_md,
              releaseAt: caseStudy.release_at,
              updatedAt: caseStudy.updated_at,
            }
          : null
      }
    />
  );
}

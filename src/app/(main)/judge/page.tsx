import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { JudgeDashboardClient } from "./judge-dashboard-client";
import { getJudgeTeamList } from "./queries";

export default async function JudgePage() {
  const profile = await requireRole("judge");
  const stage = profile.judge_stage ?? "preliminary";

  const isPrelimNeeded = stage === "preliminary" || stage === "both";
  const isFinalNeeded = stage === "final" || stage === "both";

  const supabase = await createClient();
  const [preliminaryTeams, finalTeams, { data: settings }, { data: rankingSetting }] = await Promise.all([
    isPrelimNeeded ? getJudgeTeamList("preliminary") : Promise.resolve([]),
    isFinalNeeded ? getJudgeTeamList("final") : Promise.resolve([]),
    supabase.from("competition_settings").select("final_results_released").eq("id", true).maybeSingle(),
    // Separate query, like the team layout, so a missing column never breaks the dashboard.
    supabase.from("competition_settings").select("ranking_published").eq("id", true).maybeSingle(),
  ]);

  return (
    <JudgeDashboardClient
      judgeName={profile.full_name}
      judgeStage={profile.judge_stage}
      preliminaryTeams={preliminaryTeams}
      finalTeams={finalTeams}
      competitionOver={Boolean(settings?.final_results_released)}
      rankingPublished={Boolean(rankingSetting?.ranking_published)}
    />
  );
}

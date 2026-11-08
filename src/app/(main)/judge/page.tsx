import { requireRole } from "@/lib/auth";

import { JudgeDashboardClient } from "./judge-dashboard-client";
import { getJudgeTeamList } from "./queries";

export default async function JudgePage() {
  const profile = await requireRole("judge");
  const stage = profile.judge_stage ?? "preliminary";

  const isPrelimNeeded = stage === "preliminary" || stage === "both";
  const isFinalNeeded = stage === "final" || stage === "both";

  const [preliminaryTeams, finalTeams] = await Promise.all([
    isPrelimNeeded ? getJudgeTeamList("preliminary") : Promise.resolve([]),
    isFinalNeeded ? getJudgeTeamList("final") : Promise.resolve([]),
  ]);

  return (
    <JudgeDashboardClient
      judgeName={profile.full_name}
      judgeStage={profile.judge_stage}
      preliminaryTeams={preliminaryTeams}
      finalTeams={finalTeams}
    />
  );
}

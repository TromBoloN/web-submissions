import { type CompetitionStage, getStage, stageState } from "@/lib/competition-info";

import { toWitaDateKey } from "./team-schedule";

export type FinalistNoticeData = {
  is_finalist: boolean;
  message: string;
  published_at: string | null;
};

/**
 * Where a team is in the competition, as seen from the team portal.
 * - open: submissions accepted (deadline not passed at page load)
 * - missed: deadline passed without a submitted entry
 * - closed: entry recorded, preliminary review not started yet
 * - review: preliminary judging, finalist notice not published yet
 * - finalist / not-finalist: finalist notice published
 * - final: finalist, on or after the final presentation day
 * - results: finalist, final results released
 */
export type TeamPhase =
  | "disqualified"
  | "open"
  | "missed"
  | "closed"
  | "review"
  | "finalist"
  | "not-finalist"
  | "final"
  | "results";

export type TeamPhaseInput = {
  serverNowIso: string;
  isClosed: boolean;
  isSubmitted: boolean;
  isDisqualified: boolean;
  finalistNotice: FinalistNoticeData | null;
  finalResultsReleased: boolean;
  schedule: readonly CompetitionStage[];
};

/** Pure: depends only on server time and data, never the device clock. */
export function resolveTeamPhase(input: TeamPhaseInput): TeamPhase {
  if (input.isDisqualified) return "disqualified";
  if (!input.isClosed) return "open";
  if (!input.isSubmitted) return "missed";

  const notice = input.finalistNotice;
  if (notice) {
    if (!notice.is_finalist) return "not-finalist";
    if (input.finalResultsReleased) return "results";
    const today = toWitaDateKey(input.serverNowIso);
    return stageState(getStage(input.schedule, "final"), today) === "future" ? "finalist" : "final";
  }

  const today = toWitaDateKey(input.serverNowIso);
  return stageState(getStage(input.schedule, "review"), today) === "future" ? "closed" : "review";
}

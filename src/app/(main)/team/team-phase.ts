import { getScheduleStep, toWitaDateKey } from "./team-schedule";

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
    return today >= getScheduleStep("final").start ? "final" : "finalist";
  }

  const today = toWitaDateKey(input.serverNowIso);
  return today < getScheduleStep("review").start ? "closed" : "review";
}

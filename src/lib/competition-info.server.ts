import "server-only";

import { cache } from "react";

import { type CompetitionStage, EVENT_INFO_FALLBACK, type EventInfo, scheduleOrFallback } from "@/lib/competition-info";
import { createClient } from "@/lib/supabase/server";

/** Event name, track and finalist count. Works for anon (/login, /karya). Memoized per request. */
export const getEventInfo = cache(async (): Promise<EventInfo> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_event_info");
  if (error || !data?.[0]) {
    if (error) console.error("get_public_event_info failed", error);
    return EVENT_INFO_FALLBACK;
  }
  return data[0];
});

/** Competition milestones ordered by sort_order. Works for anon. Memoized per request. */
export const getSchedule = cache(async (): Promise<readonly CompetitionStage[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_competition_schedule");
  if (error) console.error("get_public_competition_schedule failed", error);
  return scheduleOrFallback(error ? null : data);
});

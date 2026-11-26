"use client";

import { createContext, type ReactNode, useContext } from "react";

import { type CompetitionStage, EVENT_INFO_FALLBACK, type EventInfo, SCHEDULE_FALLBACK } from "@/lib/competition-info";

const EventInfoContext = createContext<EventInfo>(EVENT_INFO_FALLBACK);
const ScheduleContext = createContext<readonly CompetitionStage[]>(SCHEDULE_FALLBACK);

/** Set once in the root layout from getEventInfo()/getSchedule(); client code reads useEventInfo()/useSchedule(). */
export function EventInfoProvider({
  value,
  schedule,
  children,
}: {
  value: EventInfo;
  schedule: readonly CompetitionStage[];
  children: ReactNode;
}) {
  return (
    <EventInfoContext.Provider value={value}>
      <ScheduleContext.Provider value={schedule}>{children}</ScheduleContext.Provider>
    </EventInfoContext.Provider>
  );
}

export function useEventInfo(): EventInfo {
  return useContext(EventInfoContext);
}

export function useSchedule(): readonly CompetitionStage[] {
  return useContext(ScheduleContext);
}

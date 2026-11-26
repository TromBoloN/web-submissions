"use client";

import { createContext, type ReactNode, useContext } from "react";

import { EVENT_INFO_FALLBACK, type EventInfo } from "@/lib/competition-info";

const EventInfoContext = createContext<EventInfo>(EVENT_INFO_FALLBACK);

/** Set once in the root layout from getEventInfo(); client components read it with useEventInfo(). */
export function EventInfoProvider({ value, children }: { value: EventInfo; children: ReactNode }) {
  return <EventInfoContext.Provider value={value}>{children}</EventInfoContext.Provider>;
}

export function useEventInfo(): EventInfo {
  return useContext(EventInfoContext);
}

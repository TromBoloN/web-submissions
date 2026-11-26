import { describe, expect, it } from "vitest";

import { winnersGoogleCalendarUrl } from "@/app/karya/karya-utils";
import {
  formatStageDateLong,
  formatStageDates,
  getStage,
  SCHEDULE_FALLBACK,
  scheduleOrFallback,
  stageState,
} from "@/lib/competition-info";

describe("formatStageDates", () => {
  it("formats a single day, a same-month range and a cross-month range", () => {
    expect(formatStageDates({ starts_on: "2026-11-18", ends_on: "2026-11-18" })).toBe("18 Nov");
    expect(formatStageDates({ starts_on: "2026-11-11", ends_on: "2026-11-17" })).toBe("11–17 Nov");
    expect(formatStageDates({ starts_on: "2026-11-30", ends_on: "2026-12-02" })).toBe("30 Nov – 2 Des");
  });

  it("never shifts the calendar day and formats the long form", () => {
    expect(formatStageDateLong("2026-11-21")).toBe("21 November 2026");
    expect(formatStageDates({ starts_on: "2027-01-01", ends_on: "2027-01-01" })).toBe("1 Jan");
  });
});

describe("scheduleOrFallback", () => {
  it("uses the fallback when rows are missing or empty, otherwise the rows", () => {
    expect(scheduleOrFallback(null)).toBe(SCHEDULE_FALLBACK);
    expect(scheduleOrFallback([])).toBe(SCHEDULE_FALLBACK);
    const rows = [{ ...SCHEDULE_FALLBACK[0], title: "Ganti" }];
    expect(scheduleOrFallback(rows)).toBe(rows);
    expect(getStage(rows, "review").title).toBe("Ganti");
    // A system stage missing from a broken response falls back to the default row.
    expect(getStage(rows, "final").starts_on).toBe("2026-11-21");
  });
});

describe("stageState", () => {
  const stage = { starts_on: "2026-11-11", ends_on: "2026-11-17", status_override: null };
  it("follows WITA date keys, inclusive on both ends", () => {
    expect(stageState(stage, "2026-11-10")).toBe("future");
    expect(stageState(stage, "2026-11-11")).toBe("current");
    expect(stageState(stage, "2026-11-17")).toBe("current");
    expect(stageState(stage, "2026-11-18")).toBe("past");
  });
  it("lets the admin override win", () => {
    expect(stageState({ ...stage, status_override: "upcoming" }, "2026-11-20")).toBe("future");
    expect(stageState({ ...stage, status_override: "done" }, "2026-11-12")).toBe("past");
    expect(stageState({ ...stage, status_override: "current" }, "2026-11-01")).toBe("current");
  });
});

describe("winners calendar event", () => {
  it("ends the all-day event on the day after, across month ends", () => {
    const url = winnersGoogleCalendarUrl("https://example.test/karya", {
      startsOn: "2027-11-30",
      endsOn: "2027-11-30",
      eventName: "MIT-WEEK 2027",
      eventTrack: "Web Development",
    });
    const params = new URL(url).searchParams;
    expect(params.get("dates")).toBe("20271130/20271201");
    expect(params.get("text")).toBe("Pengumuman Juara · Web Development Competition MIT-WEEK 2027");
  });
});

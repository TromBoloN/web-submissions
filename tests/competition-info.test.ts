import { describe, expect, it } from "vitest";

import {
  formatStageDateLong,
  formatStageDates,
  getStage,
  SCHEDULE_FALLBACK,
  scheduleOrFallback,
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
    expect(getStage(rows, "review")?.title).toBe("Ganti");
    expect(getStage(rows, "missing")).toBeUndefined();
  });
});

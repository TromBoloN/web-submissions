import { describe, expect, it } from "vitest";

import {
  parseWitaInputToExclusiveCutoff,
  parseWitaInputToUtcIso,
  toLastAcceptedMoment,
  toWitaDateTimeLocalString,
  toWitaDateTimeLocalStringExact,
} from "@/lib/deadline";

describe("deadline calculations", () => {
  it("stores the minute after the last accepted WITA minute as the exclusive cutoff", () => {
    expect(parseWitaInputToExclusiveCutoff("2026-11-08T23:59")).toBe("2026-11-08T16:00:00.000Z");
  });

  it("parses a WITA input without applying the exclusive-minute adjustment", () => {
    expect(parseWitaInputToUtcIso("2026-11-08T23:59")).toBe("2026-11-08T15:59:00.000Z");
  });

  it("converts an exclusive cutoff back to the last accepted WITA minute", () => {
    const lastAccepted = toLastAcceptedMoment("2026-11-08T16:00:00.000Z");

    expect(lastAccepted?.toISOString()).toBe("2026-11-08T15:59:00.000Z");
    expect(toWitaDateTimeLocalString("2026-11-08T16:00:00.000Z")).toBe("2026-11-08T23:59");
  });

  it("represents a 23:59 WITA deadline cutoff at the next day's midnight", () => {
    const exclusiveCutoff = parseWitaInputToExclusiveCutoff("2026-11-08T23:59");

    expect(exclusiveCutoff).not.toBeNull();
    expect(toWitaDateTimeLocalStringExact(exclusiveCutoff)).toBe("2026-11-09T00:00");
  });

  it("rejects malformed WITA input and invalid stored cutoffs", () => {
    expect(parseWitaInputToExclusiveCutoff("2026-11-08")).toBeNull();
    expect(toLastAcceptedMoment("not-a-date")).toBeNull();
  });
});

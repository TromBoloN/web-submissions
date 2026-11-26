import { describe, expect, it } from "vitest";

import { CONTENT_FIELDS, contentList, fillPlaceholders, isContentKey, resolveSiteContent } from "@/lib/site-content";

describe("site content registry", () => {
  it("uses defaults when nothing is saved, saved rows otherwise, and ignores unknown keys", () => {
    expect(resolveSiteContent(null)["karya.tagline"]).toBe(CONTENT_FIELDS["karya.tagline"].default);
    const content = resolveSiteContent([
      { key: "karya.tagline", value: "Baru" },
      { key: "dropped.key", value: "x" },
    ]);
    expect(content["karya.tagline"]).toBe("Baru");
    expect(content["login.help"]).toBe(CONTENT_FIELDS["login.help"].default);
    expect("dropped.key" in content).toBe(false);
  });

  it("rejects unknown keys, including inherited object properties", () => {
    expect(isContentKey("team.checklist")).toBe(true);
    expect(isContentKey("toString")).toBe(false);
    expect(isContentKey("team.unknown")).toBe(false);
  });

  it("splits list values and fills placeholders", () => {
    expect(contentList(" satu \r\n\n dua ")).toEqual(["satu", "dua"]);
    expect(fillPlaceholders("{bidang} di {acara}", { event_name: "MIT-WEEK 2027", event_track: "UI/UX" })).toBe(
      "UI/UX di MIT-WEEK 2027",
    );
  });

  it("keeps every default within its own limit", () => {
    for (const field of Object.values(CONTENT_FIELDS)) {
      expect(field.default.length).toBeLessThanOrEqual(field.max);
    }
  });
});

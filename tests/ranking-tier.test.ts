import { describe, expect, it } from "vitest";

import { hasCeremony, rankTier } from "@/app/(main)/team/peringkat/ranking-tier";

const row = (rank: number, stage = "preliminary", score: number | null = 80) => ({ rank, stage, score });

describe("rankTier", () => {
  it("gives medals to places 1-3", () => {
    expect(rankTier(row(1, "final"), 44)).toBe("gold");
    expect(rankTier(row(2, "final"), 44)).toBe("silver");
    expect(rankTier(row(3, "final"), 44)).toBe("bronze");
  });

  it("marks finalists 4-5 and unscored finalists", () => {
    expect(rankTier(row(4, "final"), 44)).toBe("finalist");
    expect(rankTier(row(5, "final", null), 44)).toBe("finalist");
  });

  it("splits the rest into top 10, top 25% and base", () => {
    expect(rankTier(row(7), 44)).toBe("top10");
    expect(rankTier(row(11), 44)).toBe("top25");
    expect(rankTier(row(12), 44)).toBe("base");
    expect(rankTier(row(44), 44)).toBe("base");
    expect(rankTier(row(6, "preliminary", null), 44)).toBe("base");
  });

  it("only ceremony tiers get the intro", () => {
    expect(hasCeremony("gold")).toBe(true);
    expect(hasCeremony("top10")).toBe(true);
    expect(hasCeremony("top25")).toBe(false);
    expect(hasCeremony("base")).toBe(false);
  });
});

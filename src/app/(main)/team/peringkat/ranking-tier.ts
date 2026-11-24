// Tier logic for the team ranking page. No server-only/client-only imports: page.tsx, the team layout
// (cookies) and client components all use it.

export type RankTier = "gold" | "silver" | "bronze" | "finalist" | "top10" | "top25" | "base";

/** Tiers that get the full celebration (reveal intro, particles, stamp, rank count-up). */
const CEREMONY_TIERS: ReadonlySet<RankTier> = new Set(["gold", "silver", "bronze", "finalist", "top10"]);

/** Tiers that earn a medal marker in the sidebar. */
export const MEDAL_TIERS: ReadonlySet<RankTier> = new Set(["gold", "silver", "bronze", "finalist"]);

export type ReleaseKey = "final" | "provisional";

/** Presentation-only cookies (never trusted for data). Values: ReleaseKey / a MEDAL_TIERS member. */
export const SEEN_COOKIE = "mitweek_peringkat_seen";
export const MEDAL_COOKIE = "mitweek_peringkat_medal";

/**
 * TESTING ONLY: when true, the reveal intro plays on every page load (the seen cookie is ignored for
 * the intro). The sidebar still uses the cookie. Set to false before the real release.
 */
export const REVEAL_TEST_MODE: boolean = false;

export function releaseKeyFor(finalResultsReleased: boolean): ReleaseKey {
  return finalResultsReleased ? "final" : "provisional";
}

export function parseMedalCookie(value: string | undefined): "gold" | "silver" | "bronze" | "finalist" | null {
  return value === "gold" || value === "silver" || value === "bronze" || value === "finalist" ? value : null;
}

export function rankTier(row: { rank: number; score: number | null; stage: string }, total: number): RankTier {
  if (row.score === null) return row.stage === "final" ? "finalist" : "base";
  if (row.rank === 1) return "gold";
  if (row.rank === 2) return "silver";
  if (row.rank === 3) return "bronze";
  if (row.stage === "final") return "finalist";
  if (row.rank <= 10) return "top10";
  if (total > 0 && row.rank / total <= 0.25) return "top25";
  return "base";
}

export function hasCeremony(tier: RankTier): boolean {
  return CEREMONY_TIERS.has(tier);
}

/** Stamp text per tier (uppercased by the .team-stamp class). */
export const TIER_STAMP: Record<RankTier, string | null> = {
  gold: "Juara 1",
  silver: "Juara 2",
  bronze: "Juara 3",
  finalist: "Finalis",
  top10: "Top 10",
  top25: "Top 25%",
  base: null,
};

/** Accent used for stamps and the rank number's hard shadow. */
export const TIER_ACCENT: Record<RankTier, "gold" | "silver" | "bronze" | "mint" | null> = {
  gold: "gold",
  silver: "silver",
  bronze: "bronze",
  finalist: "mint",
  top10: "mint",
  top25: null,
  base: null,
};

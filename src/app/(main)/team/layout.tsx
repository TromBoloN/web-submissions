import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { DashboardShell, getShellSettings } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { MEDAL_COOKIE, parseMedalCookie, releaseKeyFor, SEEN_COOKIE } from "@/app/(main)/team/peringkat/ranking-tier";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TeamLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const [{ data: settings, error: settingsError }, { data: team }, cookieStore] = await Promise.all([
    getShellSettings(),
    supabase.from("teams").select("team_code").eq("profile_id", profile.id).maybeSingle(),
    cookies(),
  ]);

  const resultsReleased =
    !settingsError && Boolean(settings?.preliminary_results_released || settings?.final_results_released);
  const rankingPublished = Boolean(settings?.ranking_published);

  // Presentation-only cookies written by /team/peringkat (never trusted for data).
  const releaseKey = releaseKeyFor(Boolean(settings?.final_results_released));
  const rankingNav = rankingPublished
    ? {
        fresh: cookieStore.get(SEEN_COOKIE)?.value !== releaseKey,
        medal: parseMedalCookie(cookieStore.get(MEDAL_COOKIE)?.value),
      }
    : undefined;

  return (
    <DashboardShell
      user={profile}
      resultsReleased={resultsReleased}
      rankingPublished={rankingPublished}
      rankingNav={rankingNav}
      teamCode={team?.team_code ?? null}
    >
      {children}
    </DashboardShell>
  );
}

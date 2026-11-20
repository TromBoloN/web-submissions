import type { ReactNode } from "react";

import { DashboardShell } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TeamLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const [{ data: settings, error: settingsError }, { data: rankingSetting }, { data: team }] = await Promise.all([
    supabase
      .from("competition_settings")
      .select("preliminary_results_released, final_results_released")
      .eq("id", true)
      .maybeSingle(),
    // Separate query so the layout still loads before 20261121000000_public_ranking is applied.
    supabase.from("competition_settings").select("ranking_published").eq("id", true).maybeSingle(),
    supabase.from("teams").select("team_code").eq("profile_id", profile.id).maybeSingle(),
  ]);

  const resultsReleased =
    !settingsError && Boolean(settings?.preliminary_results_released || settings?.final_results_released);

  return (
    <DashboardShell
      user={profile}
      resultsReleased={resultsReleased}
      rankingPublished={Boolean(rankingSetting?.ranking_published)}
      teamCode={team?.team_code ?? null}
    >
      {children}
    </DashboardShell>
  );
}

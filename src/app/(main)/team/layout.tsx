import type { ReactNode } from "react";

import { DashboardShell } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TeamLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const { data: settings, error: settingsError } = await supabase
    .from("competition_settings")
    .select("preliminary_results_released, final_results_released")
    .eq("id", true)
    .maybeSingle();

  const resultsReleased =
    !settingsError && Boolean(settings?.preliminary_results_released || settings?.final_results_released);

  return (
    <DashboardShell user={profile} resultsReleased={resultsReleased}>
      {children}
    </DashboardShell>
  );
}

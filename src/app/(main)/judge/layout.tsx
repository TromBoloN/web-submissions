import type { ReactNode } from "react";

import { DashboardShell } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function JudgeLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("judge");
  const supabase = await createClient();
  const { data: rankingSetting } = await supabase
    .from("competition_settings")
    .select("ranking_published")
    .eq("id", true)
    .maybeSingle();

  return (
    <DashboardShell user={profile} rankingPublished={Boolean(rankingSetting?.ranking_published)}>
      {children}
    </DashboardShell>
  );
}

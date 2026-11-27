import type { ReactNode } from "react";

import { DashboardShell, getShellSettings } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function JudgeLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("judge");
  const { data: settings } = await getShellSettings();

  return (
    <DashboardShell user={profile} rankingPublished={Boolean(settings?.ranking_published)}>
      {children}
    </DashboardShell>
  );
}

import type { ReactNode } from "react";

import { DashboardShell } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function JudgeLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("judge");
  return <DashboardShell user={profile}>{children}</DashboardShell>;
}

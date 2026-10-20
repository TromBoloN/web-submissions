import type { ReactNode } from "react";

import { DashboardShell } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function TeamLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("team");
  return <DashboardShell user={profile}>{children}</DashboardShell>;
}

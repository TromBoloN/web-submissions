import type { ReactNode } from "react";

import { DashboardShell } from "./_components/dashboard-shell";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const { requireRole } = await import("@/lib/auth");
  const profile = await requireRole(["admin", "judge", "team"]);

  return <DashboardShell user={profile}>{children}</DashboardShell>;
}

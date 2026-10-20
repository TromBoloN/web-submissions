import type { ReactNode } from "react";

import { DashboardShell } from "@/app/(main)/dashboard/_components/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("admin");
  return <DashboardShell user={profile}>{children}</DashboardShell>;
}

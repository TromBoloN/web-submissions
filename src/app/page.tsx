import { redirect } from "next/navigation";

import { getCurrentProfile, getDashboardPath } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  redirect(getDashboardPath(profile.role));
}

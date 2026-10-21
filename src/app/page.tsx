import { redirect } from "next/navigation";

import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  redirect(getDashboardPath(profile.role));
}

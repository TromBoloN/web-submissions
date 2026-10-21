import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role_type"];

const roleDashboards: Record<UserRole, string> = {
  admin: "/admin",
  judge: "/judge",
  team: "/team",
};

export function getDashboardPath(role: UserRole) {
  return roleDashboards[role];
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (error || !profile || !profile.is_active) {
    return null;
  }

  return profile;
}

export async function requireRole(roles: UserRole | UserRole[]) {
  const profile = await getCurrentProfile();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!profile) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect(getDashboardPath(profile.role));
  }

  return profile;
}

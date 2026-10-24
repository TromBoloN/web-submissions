import { emailToDisplayName } from "@/lib/identity";
import type { Database } from "@/types/database";

export type CurrentUser = Pick<Database["public"]["Tables"]["profiles"]["Row"], "email" | "full_name" | "role">;

export function getRoleLabel(role: CurrentUser["role"]) {
  return { admin: "Admin", judge: "Juri", team: "Peserta" }[role];
}

export function getUserDisplayEmail(email: string | null | undefined): string {
  if (!email) return "";
  return emailToDisplayName(email);
}

export { emailToDisplayName };

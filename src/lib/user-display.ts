import type { Database } from "@/types/database";

export type CurrentUser = Pick<Database["public"]["Tables"]["profiles"]["Row"], "email" | "full_name" | "role">;

export function getRoleLabel(role: CurrentUser["role"]) {
  return { admin: "Admin", judge: "Juri", team: "Peserta" }[role];
}

import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type TeamData = Database["public"]["Tables"]["teams"]["Row"];
export type Role = Database["public"]["Enums"]["user_role_type"];
export type JudgeStage = Database["public"]["Enums"]["judge_stage_type"];

export type AccountRow = Profile & {
  team: Pick<TeamData, "id" | "team_code" | "team_name" | "institution" | "leader_name" | "members"> | null;
  teamName: string | null;
};

export type AccountsClientProps = {
  rows: AccountRow[];
  total: number;
  page: number;
  pageSize: number;
  nextTeamCode: string;
  currentUserId: string;
};

export type MemberItem = { id: string; name: string };

export type CreatedAccountInfo = {
  email: string;
  password: string;
  role?: "admin" | "judge" | "team";
  username?: string;
};

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { type AccountRow, AccountsClient } from "./accounts-client";

const pageSize = 10;

type AccountsPageProps = {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
};

function getNextTeamCode(codes: string[]) {
  const highest = codes.reduce((current, code) => {
    const number = Number(code.match(/^MIT-(\d{3})$/)?.[1] ?? 0);
    return Math.max(current, number);
  }, 0);
  return `MIT-${String(highest + 1).padStart(3, "0")}`;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const role = ["admin", "judge", "team"].includes(params.role ?? "")
    ? (params.role as Database["public"]["Enums"]["user_role_type"])
    : undefined;
  const parsedPage = Number(params.page ?? 1);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const supabase = await createClient();
  const caller = await getCurrentProfile();

  let profileQuery = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (query) {
    profileQuery = profileQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
  }
  if (role) {
    profileQuery = profileQuery.eq("role", role);
  }

  const [{ data: profiles, count, error: profilesError }, { data: teams, error: teamsError }] = await Promise.all([
    profileQuery,
    supabase.from("teams").select("id, profile_id, team_code, team_name, institution, leader_name, members"),
  ]);
  const teamByProfile = new Map((teams ?? []).map((team) => [team.profile_id, team]));
  const rows: AccountRow[] = (profiles ?? []).map((profile) => {
    const team = teamByProfile.get(profile.id) ?? null;
    return {
      ...profile,
      team,
      teamName: team?.team_name ?? null,
    };
  });
  const nextTeamCode = getNextTeamCode((teams ?? []).map((team) => team.team_code));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Akun</h1>
        <p className="text-muted-foreground">Kelola akun admin, juri, dan peserta.</p>
      </div>
      {profilesError || teamsError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data akun tidak dapat dimuat. Silakan coba lagi.
        </p>
      ) : (
        <AccountsClient
          rows={rows}
          total={count ?? 0}
          page={page}
          pageSize={pageSize}
          nextTeamCode={nextTeamCode}
          currentUserId={caller?.id ?? ""}
        />
      )}
    </div>
  );
}

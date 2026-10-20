import { createClient } from "@/lib/supabase/server";

import { type TeamRow, TeamsClient } from "./teams-client";

export default async function TeamsPage() {
  const supabase = await createClient();

  const [{ data: teams, error: teamsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase
      .from("teams")
      .select(
        "id, profile_id, team_code, team_name, institution, leader_name, members, is_finalist, is_disqualified, created_at",
      )
      .order("team_code", { ascending: true }),
    supabase.from("profiles").select("id, email"),
  ]);

  if (teamsError || profilesError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl">Tim</h1>
          <p className="text-muted-foreground">Kelola tim peserta, status finalis, dan diskualifikasi.</p>
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data tim tidak dapat dimuat. Silakan coba lagi.
        </p>
      </div>
    );
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));

  const rows: TeamRow[] = (teams ?? []).map((team) => ({
    ...team,
    email: profileMap.get(team.profile_id) ?? null,
  }));

  const finalistCount = rows.filter((team) => team.is_finalist).length;

  return <TeamsClient rows={rows} finalistCount={finalistCount} />;
}

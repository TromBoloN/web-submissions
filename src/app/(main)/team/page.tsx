import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SubmissionClient } from "./submission-client";

export default async function TeamPage() {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const [teamRes, settingsRes] = await Promise.all([
    supabase.from("teams").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("competition_settings").select("submission_closes_at").eq("id", true).maybeSingle(),
  ]);

  if (teamRes.error || !teamRes.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl">Portal Submission</h1>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data tim Anda tidak ditemukan atau gagal dimuat. Silakan hubungi panitia.
        </p>
      </div>
    );
  }

  const team = teamRes.data;
  const serverNowIso = new Date().toISOString();
  const deadlineIso = settingsRes.data?.submission_closes_at ?? null;
  const initialClosed = deadlineIso ? new Date(serverNowIso) >= new Date(deadlineIso) : false;

  const { data: submission } = await supabase.from("submissions").select("*").eq("team_id", team.id).maybeSingle();

  return (
    <SubmissionClient
      team={team}
      submission={submission ?? null}
      deadlineIso={deadlineIso}
      serverNowIso={serverNowIso}
      initialClosed={initialClosed}
    />
  );
}

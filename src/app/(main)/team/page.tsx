import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SubmissionClient } from "./submission-client";

export default async function TeamPage() {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const [teamRes, settingsRes, noticeRes] = await Promise.all([
    supabase.from("teams").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase
      .from("competition_settings")
      .select(
        "submission_closes_at, contact_whatsapp, showcase_published_at, preliminary_results_released, final_results_released",
      )
      .eq("id", true)
      .maybeSingle(),
    supabase.rpc("get_my_finalist_notice"),
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

  const finalistNotice = noticeRes.data && noticeRes.data.length > 0 ? noticeRes.data[0] : null;

  return (
    <SubmissionClient
      team={team}
      submission={submission ?? null}
      deadlineIso={deadlineIso}
      serverNowIso={serverNowIso}
      initialClosed={initialClosed}
      contactWhatsapp={settingsRes.data?.contact_whatsapp ?? null}
      showcasePublishedAt={settingsRes.data?.showcase_published_at ?? null}
      finalistNotice={finalistNotice}
      resultsReleased={Boolean(
        settingsRes.data?.preliminary_results_released || settingsRes.data?.final_results_released,
      )}
      finalResultsReleased={Boolean(settingsRes.data?.final_results_released)}
    />
  );
}

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { KaryaClient } from "./karya-client";

export default async function TeamKaryaPage() {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const [teamRes, settingsRes] = await Promise.all([
    supabase.from("teams").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase
      .from("competition_settings")
      .select("showcase_published_at, showcase_finalists_published_at")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (teamRes.error || !teamRes.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl">Atur Tampilan Karya</h1>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data tim Anda tidak ditemukan atau gagal dimuat. Silakan hubungi panitia.
        </p>
      </div>
    );
  }

  const team = teamRes.data;
  const { data: submission } = await supabase
    .from("submissions")
    .select("status, github_url, live_demo_url, video_url")
    .eq("team_id", team.id)
    .maybeSingle();

  return (
    <KaryaClient
      team={team}
      submission={submission ?? null}
      showcasePublishedAt={settingsRes.data?.showcase_published_at ?? null}
      showcaseFinalistsPublishedAt={settingsRes.data?.showcase_finalists_published_at ?? null}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
    />
  );
}

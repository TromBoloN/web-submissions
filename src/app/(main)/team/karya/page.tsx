import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { KaryaClient } from "./karya-client";

export default async function TeamKaryaPage() {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const [teamRes, settingsRes, noticeRes] = await Promise.all([
    // Own submission embedded (1:1, RLS applies) so it doesn't wait on a second round trip.
    supabase
      .from("teams")
      .select("*, submissions(status, github_url, live_demo_url, video_url)")
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("competition_settings")
      .select("showcase_published_at, showcase_finalists_published_at")
      .eq("id", true)
      .maybeSingle(),
    // Returns a row only once the finalist announcement is published.
    supabase.rpc("get_my_finalist_notice"),
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

  const { submissions: submission, ...team } = teamRes.data;

  return (
    <KaryaClient
      team={team}
      submission={submission ?? null}
      showcasePublishedAt={settingsRes.data?.showcase_published_at ?? null}
      showcaseFinalistsPublishedAt={settingsRes.data?.showcase_finalists_published_at ?? null}
      isAnnouncedFinalist={noticeRes.data?.[0]?.is_finalist === true}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
    />
  );
}

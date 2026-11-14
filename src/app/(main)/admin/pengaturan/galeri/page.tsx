import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { ShowcaseClient, type ShowcaseTeam } from "./showcase-client";

export default async function GallerySettingsPage() {
  const supabase = await createClient();

  const [settingsRes, teamsRes, submissionsRes] = await Promise.all([
    supabase
      .from("competition_settings")
      .select("showcase_published_at, winners_published_at")
      .eq("id", true)
      .maybeSingle(),
    supabase.from("teams").select("id, team_name, is_finalist, showcase_consent, showcase_title, showcase_image_path"),
    supabase.from("submissions").select("team_id, status, link_check"),
  ]);

  if (settingsRes.error) return <SettingsLoadError />;

  const submissionByTeam = new Map((submissionsRes.data ?? []).map((s) => [s.team_id, s]));
  const showcaseTeams: ShowcaseTeam[] = (teamsRes.data ?? [])
    .filter((team) => team.showcase_consent && submissionByTeam.get(team.id)?.status === "submitted")
    .map((team) => ({
      id: team.id,
      teamName: team.team_name,
      isFinalist: team.is_finalist,
      showcaseTitle: team.showcase_title,
      hasImage: Boolean(team.showcase_image_path),
      linkCheck: submissionByTeam.get(team.id)?.link_check ?? null,
    }));

  return (
    <ShowcaseClient
      showcasePublishedAt={settingsRes.data?.showcase_published_at ?? null}
      winnersPublishedAt={settingsRes.data?.winners_published_at ?? null}
      showcaseTeams={showcaseTeams}
    />
  );
}

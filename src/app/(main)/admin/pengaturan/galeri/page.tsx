import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { FinalistCardsClient, type FinalistCardTeam } from "./finalist-cards-client";
import { ShowcaseClient, type ShowcaseTeam } from "./showcase-client";

export default async function GallerySettingsPage() {
  const supabase = await createClient();

  const [settingsRes, teamsRes, submissionsRes, rankingRes] = await Promise.all([
    supabase
      .from("competition_settings")
      .select("showcase_published_at, winners_published_at")
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("teams")
      .select(
        "id, team_code, team_name, is_finalist, showcase_consent, showcase_title, showcase_description, showcase_image_path",
      ),
    supabase.from("submissions").select("team_id, status, link_check, github_url, live_demo_url, video_url"),
    supabase.from("preliminary_ranking").select("team_id, rank"),
  ]);

  if (settingsRes.error) return <SettingsLoadError />;

  const submissionByTeam = new Map((submissionsRes.data ?? []).map((s) => [s.team_id, s]));
  const rankByTeam = new Map((rankingRes.data ?? []).map((r) => [r.team_id, r.rank]));
  const teams = teamsRes.data ?? [];

  // Finalists are shown in the gallery even without consent (migration 20261117000000).
  const showcaseTeams: ShowcaseTeam[] = teams
    .filter(
      (team) => (team.showcase_consent || team.is_finalist) && submissionByTeam.get(team.id)?.status === "submitted",
    )
    .map((team) => ({
      id: team.id,
      teamName: team.team_name,
      isFinalist: team.is_finalist,
      showcaseTitle: team.showcase_title,
      hasImage: Boolean(team.showcase_image_path),
      linkCheck: submissionByTeam.get(team.id)?.link_check ?? null,
    }));

  const finalistCards: FinalistCardTeam[] = teams
    .filter((team) => team.is_finalist)
    .map((team) => {
      const submission = submissionByTeam.get(team.id);
      return {
        id: team.id,
        teamCode: team.team_code,
        teamName: team.team_name,
        rank: rankByTeam.get(team.id) ?? null,
        title: team.showcase_title,
        description: team.showcase_description,
        imagePath: team.showcase_image_path,
        consent: team.showcase_consent,
        githubUrl: submission?.github_url ?? "",
        liveDemoUrl: submission?.live_demo_url ?? "",
        videoUrl: submission?.video_url ?? "",
      };
    })
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));

  return (
    <div className="space-y-6">
      <ShowcaseClient
        showcasePublishedAt={settingsRes.data?.showcase_published_at ?? null}
        winnersPublishedAt={settingsRes.data?.winners_published_at ?? null}
        showcaseTeams={showcaseTeams}
      />
      <FinalistCardsClient teams={finalistCards} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />
    </div>
  );
}

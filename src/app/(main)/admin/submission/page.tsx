import { createClient } from "@/lib/supabase/server";

import { type SubmissionRow, SubmissionsClient } from "./submissions-client";

export default async function AdminSubmissionPage() {
  const supabase = await createClient();

  const [{ data: teams, error: teamsError }, { data: submissions, error: submissionsError }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, team_code, team_name, institution, leader_name, members, is_finalist, is_disqualified")
      .order("team_code", { ascending: true }),
    supabase
      .from("submissions")
      .select("id, team_id, github_url, live_demo_url, video_url, status, submitted_at, updated_at"),
  ]);

  if (teamsError || submissionsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl">Submission</h1>
          <p className="text-muted-foreground">Pantau dan kelola berkas submission dari seluruh tim peserta.</p>
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data submission tidak dapat dimuat. Silakan coba lagi.
        </p>
      </div>
    );
  }

  const submissionMap = new Map((submissions ?? []).map((sub) => [sub.team_id, sub]));

  const rows: SubmissionRow[] = (teams ?? []).map((team) => {
    const sub = submissionMap.get(team.id);
    if (!sub) {
      return {
        team_id: team.id,
        team_code: team.team_code,
        team_name: team.team_name,
        institution: team.institution,
        leader_name: team.leader_name,
        members: team.members ?? [],
        is_finalist: team.is_finalist,
        is_disqualified: team.is_disqualified,
        submission_id: null,
        status: "unsubmitted",
        github_url: "",
        live_demo_url: "",
        video_url: "",
        submitted_at: null,
        updated_at: null,
      };
    }

    return {
      team_id: team.id,
      team_code: team.team_code,
      team_name: team.team_name,
      institution: team.institution,
      leader_name: team.leader_name,
      members: team.members ?? [],
      is_finalist: team.is_finalist,
      is_disqualified: team.is_disqualified,
      submission_id: sub.id,
      status: sub.status,
      github_url: sub.github_url ?? "",
      live_demo_url: sub.live_demo_url ?? "",
      video_url: sub.video_url ?? "",
      submitted_at: sub.submitted_at,
      updated_at: sub.updated_at,
    };
  });

  return <SubmissionsClient rows={rows} />;
}

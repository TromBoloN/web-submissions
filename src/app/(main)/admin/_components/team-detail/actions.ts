"use server";

import "server-only";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TeamDetail = {
  team_code: string;
  team_name: string;
  institution: string;
  leader_name: string;
  members: string[];
  is_finalist: boolean;
  is_disqualified: boolean;
  email: string | null;
  submission: {
    status: string;
    github_url: string;
    live_demo_url: string;
    video_url: string;
    notes_for_judges: string;
    first_submitted_at: string | null;
    updated_at: string | null;
  } | null;
};

export type TeamDetailResult = { success: true; team: TeamDetail } | { success: false; error: string };

const teamIdSchema = z.uuid({ message: "Tim tidak valid." });

/** Admin-only read of one team plus its submission, for the shared team detail sheet. */
export async function getTeamDetail(teamId: string): Promise<TeamDetailResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke data ini." };
  }

  const parsed = teamIdSchema.safeParse(teamId);
  if (!parsed.success) {
    return { success: false, error: "Tim tidak valid." };
  }

  const supabase = await createClient();
  const [teamRes, submissionRes] = await Promise.all([
    supabase
      .from("teams")
      .select("profile_id, team_code, team_name, institution, leader_name, members, is_finalist, is_disqualified")
      .eq("id", parsed.data)
      .maybeSingle(),
    supabase
      .from("submissions")
      .select("status, github_url, live_demo_url, video_url, notes_for_judges, first_submitted_at, updated_at")
      .eq("team_id", parsed.data)
      .maybeSingle(),
  ]);

  if (teamRes.error || submissionRes.error) {
    console.error("Failed to load team detail", teamRes.error ?? submissionRes.error);
    return { success: false, error: "Detail tim tidak dapat dimuat. Silakan coba lagi." };
  }

  const team = teamRes.data;
  if (!team) {
    return { success: false, error: "Tim tidak ditemukan." };
  }

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", team.profile_id).maybeSingle();
  const sub = submissionRes.data;

  return {
    success: true,
    team: {
      team_code: team.team_code,
      team_name: team.team_name,
      institution: team.institution,
      leader_name: team.leader_name,
      members: team.members ?? [],
      is_finalist: team.is_finalist,
      is_disqualified: team.is_disqualified,
      email: profile?.email ?? null,
      submission: sub
        ? {
            status: sub.status,
            github_url: sub.github_url ?? "",
            live_demo_url: sub.live_demo_url ?? "",
            video_url: sub.video_url ?? "",
            notes_for_judges: sub.notes_for_judges ?? "",
            first_submitted_at: sub.first_submitted_at,
            updated_at: sub.updated_at,
          }
        : null,
    },
  };
}

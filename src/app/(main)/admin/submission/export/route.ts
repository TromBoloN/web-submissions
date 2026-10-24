import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { CSV_BOM, escapeCsvCell, formatWitaDateOnly, formatWitaDateTime } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const caller = await getCurrentProfile();
  if (!caller) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (caller.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();

  const [{ data: teams, error: teamsError }, { data: submissions, error: submissionsError }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, team_code, team_name, institution, leader_name, members, is_finalist, is_disqualified")
      .order("team_code", { ascending: true }),
    supabase
      .from("submissions")
      .select("team_id, github_url, live_demo_url, video_url, status, submitted_at, first_submitted_at, updated_at"),
  ]);

  if (teamsError || submissionsError) {
    return new NextResponse("Gagal memuat data untuk ekspor", { status: 500 });
  }

  const submissionMap = new Map((submissions ?? []).map((s) => [s.team_id, s]));

  const headers = [
    "team_code",
    "team_name",
    "institution",
    "leader_name",
    "members",
    "status",
    "github_url",
    "live_demo_url",
    "video_url",
    "first_submitted_at",
    "first_saved_at",
    "last_updated_at",
    "is_finalist",
    "is_disqualified",
  ];

  const headerLine = headers.map(escapeCsvCell).join(",");

  const rows = (teams ?? []).map((team) => {
    const sub = submissionMap.get(team.id);

    let statusLabel = "Belum dikirim";
    if (sub?.status === "submitted") {
      statusLabel = "Terkirim";
    } else if (sub?.status === "draft") {
      statusLabel = "Draf";
    }

    const membersText = Array.isArray(team.members) ? team.members.join("; ") : "";

    const values = [
      team.team_code,
      team.team_name,
      team.institution,
      team.leader_name,
      membersText,
      statusLabel,
      sub?.github_url ?? "",
      sub?.live_demo_url ?? "",
      sub?.video_url ?? "",
      formatWitaDateTime(sub?.first_submitted_at),
      formatWitaDateTime(sub?.submitted_at),
      formatWitaDateTime(sub?.updated_at),
      team.is_finalist ? "true" : "false",
      team.is_disqualified ? "true" : "false",
    ];

    return values.map(escapeCsvCell).join(",");
  });

  const csvContent = `${CSV_BOM}${headerLine}\r\n${rows.join("\r\n")}\r\n`;

  const todayStr = formatWitaDateOnly(new Date());
  const filename = `submissions-${todayStr}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

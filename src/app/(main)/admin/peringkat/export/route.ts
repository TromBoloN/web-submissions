import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { CSV_BOM, escapeCsvCell, formatWitaDateOnly, formatWitaDateTime } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const caller = await getCurrentProfile();
  if (!caller) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (caller.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const tahap = request.nextUrl.searchParams.get("tahap");
  if (tahap !== "preliminary" && tahap !== "final") {
    return new NextResponse("Parameter tahap tidak valid. Gunakan 'preliminary' atau 'final'.", { status: 400 });
  }

  const supabase = await createClient();

  const isPrelim = tahap === "preliminary";
  const scoresTable = isPrelim ? "preliminary_scores" : "final_scores";

  const [scoresRes, teamsRes, judgesRes] = await Promise.all([
    supabase.from(scoresTable).select("*").order("created_at", { ascending: true }),
    supabase.from("teams").select("id, team_code, team_name").order("team_code", { ascending: true }),
    supabase.from("profiles").select("id, full_name").eq("role", "judge"),
  ]);

  if (scoresRes.error || teamsRes.error || judgesRes.error) {
    return new NextResponse("Gagal memuat data nilai untuk ekspor.", { status: 500 });
  }

  const teamMap = new Map((teamsRes.data ?? []).map((t) => [t.id, t]));
  const judgeMap = new Map((judgesRes.data ?? []).map((j) => [j.id, j]));

  const headers = isPrelim
    ? [
        "team_code",
        "team_name",
        "judge_name",
        "functionality_score",
        "case_study_fit_score",
        "ui_ux_score",
        "code_quality_score",
        "documentation_score",
        "total_weighted_score",
        "feedback",
        "created_at",
        "updated_at",
      ]
    : [
        "team_code",
        "team_name",
        "judge_name",
        "functionality_score",
        "case_study_fit_score",
        "ui_ux_score",
        "code_quality_score",
        "documentation_score",
        "presentation_qa_score",
        "total_weighted_score",
        "feedback",
        "created_at",
        "updated_at",
      ];

  const headerLine = headers.map(escapeCsvCell).join(",");

  const rows = (scoresRes.data ?? []).map((score) => {
    const team = teamMap.get(score.team_id);
    const judge = judgeMap.get(score.judge_id);

    const values = isPrelim
      ? [
          team?.team_code ?? "",
          team?.team_name ?? "",
          judge?.full_name ?? "",
          score.functionality_score,
          score.case_study_fit_score,
          score.ui_ux_score,
          score.code_quality_score,
          score.documentation_score,
          score.total_weighted_score ?? "",
          score.feedback ?? "",
          formatWitaDateTime(score.created_at),
          formatWitaDateTime(score.updated_at),
        ]
      : [
          team?.team_code ?? "",
          team?.team_name ?? "",
          judge?.full_name ?? "",
          score.functionality_score,
          score.case_study_fit_score,
          score.ui_ux_score,
          score.code_quality_score,
          score.documentation_score,
          (score as { presentation_qa_score: number }).presentation_qa_score,
          score.total_weighted_score ?? "",
          score.feedback ?? "",
          formatWitaDateTime(score.created_at),
          formatWitaDateTime(score.updated_at),
        ];

    return values.map(escapeCsvCell).join(",");
  });

  const csvContent = `${CSV_BOM}${headerLine}\r\n${rows.join("\r\n")}\r\n`;

  const todayStr = formatWitaDateOnly(new Date());
  const filename = `scores-${tahap}-${todayStr}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

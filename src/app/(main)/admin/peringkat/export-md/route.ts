import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { formatWitaDateOnly, formatWitaDateTime } from "@/lib/csv";
import { getRubricForStage } from "@/lib/rubric";
import { buildScoreMarkdown, type ScoreMarkdownTeam } from "@/lib/score-markdown";
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

  const [scoresRes, rankingRes, teamsRes, judgesRes, sanctionsRes] = await Promise.all([
    isPrelim
      ? supabase
          .from("preliminary_scores")
          .select(
            "team_id, judge_id, functionality_score, case_study_fit_score, ui_ux_score, code_quality_score, documentation_score, total_weighted_score, feedback, updated_at",
          )
          .eq("status", "final")
      : supabase
          .from("final_scores")
          .select(
            "team_id, judge_id, functionality_score, case_study_fit_score, ui_ux_score, code_quality_score, documentation_score, presentation_qa_score, total_weighted_score, feedback, updated_at",
          )
          .eq("status", "final"),
    isPrelim
      ? supabase.from("preliminary_ranking").select("*").order("rank", { ascending: true })
      : supabase.from("final_ranking").select("*").order("rank", { ascending: true }),
    supabase.from("teams").select("id, team_code, team_name").order("team_code", { ascending: true }),
    supabase.from("profiles").select("id, full_name").eq("role", "judge"),
    // Errors only before migration 20261122000000_score_sanctions; the export then just omits sanctions.
    supabase
      .from("score_sanctions")
      .select("team_id, criterion, points, reason")
      .eq("stage", tahap)
      .order("created_at", { ascending: true }),
  ]);

  if (scoresRes.error || rankingRes.error || teamsRes.error || judgesRes.error) {
    return new NextResponse("Gagal memuat data nilai untuk ekspor.", { status: 500 });
  }

  const rubric = getRubricForStage(tahap);
  const judgeMap = new Map((judgesRes.data ?? []).map((j) => [j.id, j.full_name]));
  const teamMap = new Map((teamsRes.data ?? []).map((t) => [t.id, t]));

  // Group finalized scores by team, judges sorted by name.
  const scoresByTeam = new Map<string, ScoreMarkdownTeam["judges"]>();
  for (const s of (scoresRes.data ?? []) as Array<Record<string, unknown>>) {
    const teamId = s.team_id as string;
    const scores: Record<string, number | null> = {};
    for (const c of rubric) scores[c.column] = (s[c.column] as number | null) ?? null;
    const list = scoresByTeam.get(teamId) ?? [];
    list.push({
      judge_name: judgeMap.get(s.judge_id as string) ?? "Juri",
      scores,
      total_weighted_score: (s.total_weighted_score as number | null) ?? null,
      feedback: (s.feedback as string | null) ?? null,
      updated_at: s.updated_at as string,
    });
    scoresByTeam.set(teamId, list);
  }
  for (const list of scoresByTeam.values()) {
    list.sort((a, b) => a.judge_name.localeCompare(b.judge_name, "id"));
  }

  const sanctionsByTeam = new Map<string, NonNullable<ScoreMarkdownTeam["sanctions"]>>();
  for (const s of sanctionsRes.error ? [] : (sanctionsRes.data ?? [])) {
    const list = sanctionsByTeam.get(s.team_id) ?? [];
    list.push({ criterion: s.criterion, points: Number(s.points), reason: s.reason });
    sanctionsByTeam.set(s.team_id, list);
  }

  // Order teams by ranking view (scores after sanctions); append any scored team missing from it.
  const teams: ScoreMarkdownTeam[] = [];
  const seen = new Set<string>();
  for (const r of rankingRes.data ?? []) {
    if (!r.team_id || !scoresByTeam.has(r.team_id)) continue;
    seen.add(r.team_id);
    teams.push({
      rank: r.rank,
      team_code: r.team_code ?? "-",
      team_name: r.team_name ?? "-",
      avg_score: r.avg_score,
      raw_avg_score: r.raw_avg_score,
      sanctions: sanctionsByTeam.get(r.team_id) ?? [],
      judges: scoresByTeam.get(r.team_id) ?? [],
    });
  }
  for (const [teamId, judges] of scoresByTeam) {
    if (seen.has(teamId)) continue;
    const team = teamMap.get(teamId);
    const totals = judges.map((j) => j.total_weighted_score).filter((v): v is number => v !== null);
    teams.push({
      rank: null,
      team_code: team?.team_code ?? "-",
      team_name: team?.team_name ?? "-",
      avg_score: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null,
      judges,
    });
  }

  const markdown = buildScoreMarkdown({
    stage: tahap,
    generatedAt: formatWitaDateTime(new Date().toISOString()),
    teams,
    formatDate: formatWitaDateTime,
  });

  const filename = `score-${tahap}-${formatWitaDateOnly(new Date())}.md`;

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

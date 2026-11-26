import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { getRubricForStage, type ScoringStage } from "@/lib/rubric";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { type RecapRecusal, type RecapScore, RekapClient } from "./rekap-client";

export const metadata: Metadata = {
  title: "Rekap Penilaian",
};

type Tables = Database["public"]["Tables"];
type ScoreRow = Tables["preliminary_scores"]["Row"] | Tables["final_scores"]["Row"];

export default async function JudgeRekapPage() {
  const profile = await requireRole("judge");
  const stage = profile.judge_stage ?? "preliminary";
  const stages: ScoringStage[] = stage === "both" ? ["preliminary", "final"] : [stage];
  const supabase = await createClient();

  // Own rows only: filtered by judge_id here and by RLS in the database.
  const [prelim, final, teams, recusals] = await Promise.all([
    stages.includes("preliminary")
      ? supabase.from("preliminary_scores").select("*").eq("judge_id", profile.id)
      : Promise.resolve({ data: [], error: null }),
    stages.includes("final")
      ? supabase.from("final_scores").select("*").eq("judge_id", profile.id)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("teams").select("id, team_code, team_name"),
    supabase.from("judge_recusals").select("team_id, stage, reason").eq("judge_id", profile.id),
  ]);

  if (prelim.error || final.error || teams.error || recusals.error) {
    console.error("Failed to load judge recap", {
      prelim: prelim.error,
      final: final.error,
      teams: teams.error,
      recusals: recusals.error,
    });
    return (
      <div className="space-y-6">
        <h1 className="font-display font-semibold text-2xl tracking-tight">Rekap Penilaian Saya</h1>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Gagal memuat rekap penilaian. Silakan coba beberapa saat lagi atau hubungi panitia.
        </p>
      </div>
    );
  }

  const teamById = new Map((teams.data ?? []).map((t) => [t.id, t]));
  const byCode = (a: { team_code: string }, b: { team_code: string }) =>
    a.team_code.localeCompare(b.team_code, "id", { numeric: true });

  const toScores = (rows: ScoreRow[], s: ScoringStage) =>
    rows
      .map((row): RecapScore => {
        const team = teamById.get(row.team_id);
        return {
          stage: s,
          team_code: team?.team_code ?? "-",
          team_name: team?.team_name ?? "-",
          // Only the rubric columns reach the client (no row ids).
          scores: Object.fromEntries(
            getRubricForStage(s).map((c) => [c.column, (row as unknown as Record<string, number | null>)[c.column]]),
          ),
          total_weighted_score: row.total_weighted_score === null ? null : Number(row.total_weighted_score),
          feedback: row.feedback,
          private_note: row.private_note,
          status: row.status,
          locked_at: row.locked_at,
          updated_at: row.updated_at,
        };
      })
      .sort(byCode);

  const recusalRows: RecapRecusal[] = (recusals.data ?? [])
    .map((r) => ({
      stage: r.stage,
      team_code: teamById.get(r.team_id)?.team_code ?? "-",
      team_name: teamById.get(r.team_id)?.team_name ?? "-",
      reason: r.reason,
    }))
    .sort(byCode);

  return (
    <RekapClient
      judgeName={profile.full_name}
      stages={stages}
      scores={[...toScores(prelim.data ?? [], "preliminary"), ...toScores(final.data ?? [], "final")]}
      recusals={recusalRows}
    />
  );
}

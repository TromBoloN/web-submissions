import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { JudgePeringkatClient } from "./peringkat-client";

export const metadata: Metadata = {
  title: "Peringkat",
  description: "Peringkat akhir seluruh tim kompetisi.",
};

export default async function JudgePeringkatPage() {
  const profile = await requireRole("judge");
  const supabase = await createClient();

  // get_public_ranking() is gated by ranking_published inside the function; the redirect below
  // still happens before anything renders. Score counts are the judge's own rows only (RLS).
  const [
    { data: settings },
    { data: rankingSetting, error: rankingSettingError },
    { data, error },
    preliminaryCount,
    finalCount,
  ] = await Promise.all([
    supabase.from("competition_settings").select("final_results_released").eq("id", true).maybeSingle(),
    supabase.from("competition_settings").select("ranking_published").eq("id", true).maybeSingle(),
    supabase.rpc("get_public_ranking"),
    supabase
      .from("preliminary_scores")
      .select("id", { count: "exact", head: true })
      .eq("judge_id", profile.id)
      .eq("status", "final"),
    supabase
      .from("final_scores")
      .select("id", { count: "exact", head: true })
      .eq("judge_id", profile.id)
      .eq("status", "final"),
  ]);

  if (rankingSettingError || !rankingSetting?.ranking_published) {
    redirect("/judge");
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display font-semibold text-2xl tracking-tight">Peringkat</h1>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Gagal memuat peringkat. Silakan coba beberapa saat lagi atau hubungi panitia.
        </p>
      </div>
    );
  }

  return (
    <JudgePeringkatClient
      rows={data ?? []}
      provisional={!settings?.final_results_released}
      judgeName={profile.full_name}
      judgeStage={profile.judge_stage}
      scoredPreliminary={preliminaryCount.error ? null : (preliminaryCount.count ?? 0)}
      scoredFinal={finalCount.error ? null : (finalCount.count ?? 0)}
    />
  );
}

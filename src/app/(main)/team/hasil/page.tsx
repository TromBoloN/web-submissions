import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { ResultsClient, type TeamResultsData } from "./results-client";

export const metadata: Metadata = {
  title: `Hasil Penilaian | ${APP_CONFIG.name}`,
  description: "Hasil penilaian dan masukan juri kompetisi MIT-WEEK 2026.",
};

export default async function TeamHasilPage() {
  await requireRole("team");
  const supabase = await createClient();

  // 1. Check release flags in competition_settings
  const { data: settings } = await supabase
    .from("competition_settings")
    .select("preliminary_results_released, final_results_released")
    .eq("id", true)
    .maybeSingle();

  const isAnyReleased = Boolean(settings?.preliminary_results_released || settings?.final_results_released);

  // If neither flag is on, redirect to /team
  if (!isAnyReleased) {
    redirect("/team");
  }

  // 2. Fetch results from RPC
  const { data: rawResults, error } = await supabase.rpc("get_my_results");

  // Handle function error with friendly generic message
  if (error || !rawResults) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Hasil Penilaian</h1>
          <p className="text-muted-foreground text-sm">Hasil penilaian dan masukan juri untuk tim Anda.</p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Gagal memuat hasil penilaian. Silakan coba beberapa saat lagi atau hubungi panitia.
        </div>
      </div>
    );
  }

  const results = rawResults as unknown as TeamResultsData;

  // 3. Handle no_submission state
  if (results.status === "no_submission") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Hasil Penilaian</h1>
          <p className="text-muted-foreground text-sm">Hasil penilaian dan masukan juri untuk tim Anda.</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">Tidak ada penilaian karena submission belum terkirim.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Handle disqualified state (neutral message, no scores)
  if (results.status === "disqualified" || results.is_disqualified) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Hasil Penilaian</h1>
          <p className="text-muted-foreground text-sm">Hasil penilaian dan masukan juri untuk tim Anda.</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">Tim Anda tidak memenuhi syarat penilaian kompetisi.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 5. Handle released state
  return <ResultsClient results={results} />;
}

import { redirect } from "next/navigation";

import { Award, MessageSquareQuote } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";
import { requireRole } from "@/lib/auth";
import { FINAL_RUBRIC, PRELIMINARY_RUBRIC } from "@/lib/rubric";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `Hasil Penilaian | ${APP_CONFIG.name}`,
  description: "Hasil penilaian dan masukan juri kompetisi MIT-WEEK 2026.",
};

type CriterionResult = {
  key: string;
  average: number | null;
};

type StageResult = {
  judge_count: number;
  criteria: CriterionResult[];
  total: number | null;
  comments: string[];
};

type TeamResultsData = {
  status: "ok" | "disqualified" | "no_submission";
  is_disqualified: boolean;
  is_finalist: boolean;
  preliminary: StageResult | null;
  final: StageResult | null;
};

function getCriterionLabel(stage: "preliminary" | "final", key: string): string {
  const rubric = stage === "preliminary" ? PRELIMINARY_RUBRIC : FINAL_RUBRIC;
  const found = rubric.find((c) => c.column === key);
  return found?.label ?? key;
}

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Hasil Penilaian</h1>
        <p className="text-muted-foreground text-sm">
          Berikut adalah hasil nilai rata-rata per kriteria dan masukan anonim dari juri.
        </p>
      </div>

      <div className="space-y-6">
        {/* Preliminary Results */}
        {results.preliminary && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="size-5 text-primary" />
                    Babak Awal
                  </CardTitle>
                  <CardDescription>Dinilai oleh {results.preliminary.judge_count} juri</CardDescription>
                </div>
                {results.preliminary.total !== null && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground text-xs">Total Nilai:</span>
                    <span className="font-bold font-mono text-2xl text-primary">
                      {results.preliminary.total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Criteria List */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Nilai Rata-rata per Kriteria</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {results.preliminary.criteria.map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                      <span className="text-foreground text-xs">{getCriterionLabel("preliminary", item.key)}</span>
                      <span className="font-medium font-mono text-sm">
                        {item.average !== null ? item.average.toFixed(2) : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 font-medium text-sm">
                  <MessageSquareQuote className="size-4 text-muted-foreground" />
                  Masukan dari Juri
                </h3>
                {results.preliminary.comments.length > 0 ? (
                  <div className="space-y-2">
                    {results.preliminary.comments.map((comment) => (
                      <div
                        key={comment}
                        className="whitespace-pre-wrap rounded-md border bg-card p-3 text-muted-foreground text-xs leading-relaxed"
                      >
                        {comment}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    Belum ada masukan tertulis dari juri untuk babak ini.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final Results */}
        {results.final && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="size-5 text-primary" />
                    Babak Final
                  </CardTitle>
                  <CardDescription>Dinilai oleh {results.final.judge_count} juri</CardDescription>
                </div>
                {results.final.total !== null && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground text-xs">Total Nilai:</span>
                    <span className="font-bold font-mono text-2xl text-primary">{results.final.total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Criteria List */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Nilai Rata-rata per Kriteria</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {results.final.criteria.map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                      <span className="text-foreground text-xs">{getCriterionLabel("final", item.key)}</span>
                      <span className="font-medium font-mono text-sm">
                        {item.average !== null ? item.average.toFixed(2) : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 font-medium text-sm">
                  <MessageSquareQuote className="size-4 text-muted-foreground" />
                  Masukan dari Juri
                </h3>
                {results.final.comments.length > 0 ? (
                  <div className="space-y-2">
                    {results.final.comments.map((comment) => (
                      <div
                        key={comment}
                        className="whitespace-pre-wrap rounded-md border bg-card p-3 text-muted-foreground text-xs leading-relaxed"
                      >
                        {comment}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    Belum ada masukan tertulis dari juri untuk babak ini.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

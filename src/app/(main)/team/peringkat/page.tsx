import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { PeringkatClient } from "./peringkat-client";

export const metadata: Metadata = {
  title: `Peringkat | ${APP_CONFIG.name}`,
  description: "Peringkat akhir seluruh tim kompetisi MIT-WEEK 2026.",
};

export default async function TeamPeringkatPage() {
  await requireRole("team");
  const supabase = await createClient();

  // get_public_ranking() is gated by ranking_published inside the function, so it can run in parallel
  // with the settings read; the redirect below still happens before anything renders.
  const [{ data: settings }, { data: rankingSetting, error: rankingSettingError }, { data, error }] = await Promise.all(
    [
      supabase.from("competition_settings").select("final_results_released").eq("id", true).maybeSingle(),
      supabase.from("competition_settings").select("ranking_published").eq("id", true).maybeSingle(),
      supabase.rpc("get_public_ranking"),
    ],
  );

  if (rankingSettingError || !rankingSetting?.ranking_published) {
    redirect("/team");
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

  return <PeringkatClient rows={data ?? []} provisional={!settings?.final_results_released} />;
}

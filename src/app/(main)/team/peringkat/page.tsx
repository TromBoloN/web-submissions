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

  const [{ data: settings }, { data: rankingSetting, error: rankingSettingError }] = await Promise.all([
    supabase.from("competition_settings").select("final_results_released").eq("id", true).maybeSingle(),
    supabase.from("competition_settings").select("ranking_published").eq("id", true).maybeSingle(),
  ]);

  if (rankingSettingError || !rankingSetting?.ranking_published) {
    redirect("/team");
  }

  const { data, error } = await supabase.rpc("get_public_ranking");

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

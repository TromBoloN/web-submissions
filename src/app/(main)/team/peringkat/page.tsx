import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { PeringkatClient } from "./peringkat-client";
import { hasCeremony, REVEAL_TEST_MODE, rankTier, releaseKeyFor, SEEN_COOKIE } from "./ranking-tier";

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

  const rows = data ?? [];
  const releaseKey = releaseKeyFor(Boolean(settings?.final_results_released));
  const seenThisRelease = (await cookies()).get(SEEN_COOKIE)?.value === releaseKey;

  // Decided on the server so a first-time ceremony visitor's very first paint is the curtain (no rank flash).
  const own = rows.find((row) => row.is_own_team);
  const ownTier = own ? rankTier(own, rows.length) : null;
  const playIntro = ownTier !== null && hasCeremony(ownTier) && (REVEAL_TEST_MODE || !seenThisRelease);

  return (
    <PeringkatClient
      rows={rows}
      provisional={!settings?.final_results_released}
      playIntro={playIntro}
      releaseKey={releaseKey}
      seenThisRelease={seenThisRelease}
    />
  );
}

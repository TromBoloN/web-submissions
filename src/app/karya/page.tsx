import type { Metadata } from "next";

import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { KaryaClient, type KaryaItem } from "./karya-client";

export const metadata: Metadata = {
  title: "GUARDIANS · Galeri Karya MIT-WEEK 2026",
  description:
    "Ruang pameran karya peserta Web Development Competition MIT-WEEK 2026: Guardians of the Digital Space. Menampilkan karya inovatif dari tim peserta.",
  robots: { index: false, follow: false },
};

export default async function PublicKaryaPage() {
  const supabase = await createClient();

  const [
    { data: rawShowcase, error: showcaseError },
    { data: rawWinners, error: winnersError },
    { data: settings },
    { data: finalistTeams },
  ] = await Promise.all([
    supabase.rpc("get_public_showcase"),
    supabase.rpc("get_public_showcase_winners"),
    adminClient
      .from("competition_settings")
      .select("showcase_published_at, showcase_finalists_published_at, winners_published_at")
      .eq("id", true)
      .single(),
    adminClient.from("teams").select("team_name").eq("showcase_is_finalist", true),
  ]);

  if (showcaseError || winnersError) {
    return (
      <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display font-semibold text-3xl">Kenalan Sama Para Penjaga</h1>
          <p className="mt-3 text-muted-foreground">Galeri belum dapat dimuat. Silakan coba lagi nanti.</p>
        </div>
      </main>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const isWinnersPublished = Boolean(settings?.winners_published_at);
  const isGalleryPublished = Boolean(settings?.showcase_published_at);

  let initialState: "locked" | "open" | "win" = "locked";
  if (isWinnersPublished) {
    initialState = "win";
  } else if (isGalleryPublished) {
    initialState = "open";
  }

  const finalistNames = new Set((finalistTeams ?? []).map((t) => t.team_name));

  const winners: KaryaItem[] = (isWinnersPublished ? (rawWinners ?? []) : []).map((item) => ({
    teamName: item.team_name,
    title: item.showcase_title || item.team_name,
    description: item.showcase_description || "Solusi inovatif ruang digital.",
    imageUrl: item.showcase_image_path
      ? `${supabaseUrl}/storage/v1/object/public/web-showcase/${item.showcase_image_path}`
      : null,
    githubUrl: item.github_url,
    liveDemoUrl: item.live_demo_url,
    videoUrl: item.video_url,
    winnerRank: item.winner_rank,
    winnerScore: item.final_score,
    isFinalist: true,
  }));

  const allCards: KaryaItem[] = (rawShowcase ?? []).map((item) => ({
    teamName: item.team_name,
    title: item.showcase_title || item.team_name,
    description: item.showcase_description || "Solusi inovatif ruang digital.",
    imageUrl: item.showcase_image_path
      ? `${supabaseUrl}/storage/v1/object/public/web-showcase/${item.showcase_image_path}`
      : null,
    githubUrl: item.github_url,
    liveDemoUrl: item.live_demo_url,
    videoUrl: item.video_url,
    isFinalist: finalistNames.has(item.team_name),
  }));

  const finalists = allCards.filter((c) => c.isFinalist);

  return <KaryaClient initialState={initialState} cards={allCards} winners={winners} finalists={finalists} />;
}

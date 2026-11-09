import type { Metadata } from "next";

import type { ShowcaseCardData } from "@/components/showcase-card";
import { ShowcaseGallery } from "@/components/showcase-gallery";
import { createClient } from "@/lib/supabase/server";

import { GuardianBackground, GuardianFooter, KaryaHero, KaryaThemeToggle } from "./karya-hero";

export const metadata: Metadata = {
  title: "Kenalan Sama Para Penjaga | Galeri Karya MIT-WEEK 2026",
  description:
    "Ruang pameran karya peserta kompetisi MIT-WEEK 2026: Guardians of the Digital Space. Temukan solusi inovatif perlindungan ruang digital.",
  robots: { index: false, follow: false },
};

export default async function PublicKaryaPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: winnerData, error: winnersError }] = await Promise.all([
    supabase.rpc("get_public_showcase"),
    supabase.rpc("get_public_showcase_winners"),
  ]);

  if (error || winnersError) {
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
  const winners: ShowcaseCardData[] = (winnersError ? [] : (winnerData ?? [])).map((item) => ({
    teamName: item.team_name,
    title: item.showcase_title,
    description: item.showcase_description,
    imageUrl: item.showcase_image_path
      ? `${supabaseUrl}/storage/v1/object/public/web-showcase/${item.showcase_image_path}`
      : null,
    githubUrl: item.github_url,
    liveDemoUrl: item.live_demo_url,
    videoUrl: item.video_url,
    winnerRank: item.winner_rank,
    winnerScore: item.final_score,
  }));

  const winnerNames = new Set(winners.map((winner) => winner.teamName));
  const cards: ShowcaseCardData[] = (data ?? [])
    .filter((item) => !winnerNames.has(item.team_name))
    .map((item) => ({
      teamName: item.team_name,
      title: item.showcase_title,
      description: item.showcase_description,
      imageUrl: item.showcase_image_path
        ? `${supabaseUrl}/storage/v1/object/public/web-showcase/${item.showcase_image_path}`
        : null,
      githubUrl: item.github_url,
      liveDemoUrl: item.live_demo_url,
      videoUrl: item.video_url,
    }));

  return (
    <main className="karya-page relative min-h-dvh overflow-hidden bg-[#F7F9FF] text-[#262470] dark:bg-[#0a0d17] dark:text-slate-100">
      {/* Calm Guardian Surface Background */}
      <GuardianBackground />

      {/* Floating Theme Toggle */}
      <KaryaThemeToggle />

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 xl:px-10">
        {/* Section 4.1 & 4.2: Hero & Fact Strip */}
        <KaryaHero count={cards.length} />

        {/* Section 4.3 & 4.4: Winners Podium & Bento Gallery */}
        <div className="mt-12 sm:mt-16">
          <ShowcaseGallery cards={cards} winners={winners} serverNow={Date.now()} />
        </div>

        {/* Section 4.6: Footer with Bird Easter Egg & Sign-off */}
        <GuardianFooter />
      </div>
    </main>
  );
}

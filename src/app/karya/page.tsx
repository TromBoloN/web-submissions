import type { Metadata } from "next";

import type { ShowcaseCardData } from "@/components/showcase-card";
import { ShowcaseGallery } from "@/components/showcase-gallery";
import { createClient } from "@/lib/supabase/server";

import { KaryaBackgroundCircuit, KaryaHero, KaryaThemeToggle } from "./karya-hero";

export const metadata: Metadata = {
  title: "Karya Peserta | MIT-WEEK 2026",
  description: "Galeri karya peserta kompetisi MIT-WEEK 2026: Guardians of the Digital Space.",
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
          <h1 className="font-display font-semibold text-3xl">Karya Peserta</h1>
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
    <main className="karya-page min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Fixed Background Circuit with sparse pulses */}
      <KaryaBackgroundCircuit />

      {/* Theme Toggle Button portaled to document.body */}
      <KaryaThemeToggle />

      {/* Main Widened Container (1360-1440px) */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 xl:px-10">
        {/* Hero Section & Stat Strip */}
        <KaryaHero count={cards.length} />

        {/* Gallery Section */}
        <div className="mt-12 sm:mt-16">
          <ShowcaseGallery cards={cards} winners={winners} serverNow={Date.now()} />
        </div>

        {/* Footer with Circuit Trace ending at node // END */}
        <footer className="mt-20 border-t border-border/80 pt-8 pb-14 text-foreground/90 text-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5 text-xs sm:text-sm">
              <p className="font-semibold text-foreground">MIT-WEEK 2026 · Pameran Digital</p>
              <p className="text-foreground/80 dark:text-slate-300">
                Galeri tidak menampilkan nilai atau peringkat. Pemenang diumumkan terpisah.
              </p>
              <p className="font-medium text-foreground dark:text-slate-200">
                Untuk permintaan penghapusan karya, silakan hubungi panitia MIT-WEEK 2026.
              </p>
            </div>

            {/* Trace ending at node with // END */}
            <div className="flex items-center gap-3 self-start font-mono text-xs text-signal sm:self-center">
              <svg
                className="h-4 w-16 stroke-current text-signal/60"
                viewBox="0 0 64 16"
                fill="none"
                aria-hidden="true"
              >
                <path d="M0 8h46l8-6h10" strokeWidth="1.5" />
                <circle cx="60" cy="2" r="2.5" className="fill-signal" />
              </svg>
              <span className="border border-signal/40 bg-signal/10 px-2.5 py-0.5 tracking-widest text-[11px] text-signal font-semibold">
                SYS {"//"} END
              </span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

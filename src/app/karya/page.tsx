import { cache } from "react";

import type { Metadata } from "next";

import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { KARYA_DESCRIPTION_FALLBACK } from "./karya-card";
import { KaryaClient, type KaryaItem } from "./karya-client";
import { karyaSlug, pickDaily, witaDateKey } from "./karya-utils";

const BASE_TITLE = "GUARDIANS · Galeri Karya MIT-WEEK 2026";
const BASE_DESCRIPTION =
  "Ruang pameran karya peserta Web Development Competition MIT-WEEK 2026: Guardians of the Digital Space. Menampilkan karya inovatif dari tim peserta.";
const SPOTLIGHT_COUNT = 5;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** ?karya=<slug> from a shared project link, accepted only in slug form. */
async function readKaryaParam(searchParams: SearchParams): Promise<string | null> {
  const raw = (await searchParams).karya;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[a-z0-9-]{1,80}$/.test(value) ? value : null;
}

/** Everything the gallery may show right now. Cached per request (page + metadata share it). */
const loadGallery = cache(async () => {
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

  if (showcaseError || winnersError) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const imageUrl = (path: string | null) =>
    path ? `${supabaseUrl}/storage/v1/object/public/web-showcase/${path}` : null;

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
    description: item.showcase_description || KARYA_DESCRIPTION_FALLBACK,
    imageUrl: imageUrl(item.showcase_image_path),
    githubUrl: item.github_url,
    liveDemoUrl: item.live_demo_url,
    videoUrl: item.video_url,
    winnerRank: item.winner_rank,
    winnerScore: item.final_score,
    isFinalist: true,
  }));

  const cards: KaryaItem[] = (rawShowcase ?? []).map((item) => ({
    teamName: item.team_name,
    title: item.showcase_title || item.team_name,
    description: item.showcase_description || KARYA_DESCRIPTION_FALLBACK,
    imageUrl: imageUrl(item.showcase_image_path),
    githubUrl: item.github_url,
    liveDemoUrl: item.live_demo_url,
    videoUrl: item.video_url,
    isFinalist: finalistNames.has(item.team_name),
  }));

  const finalists = cards.filter((c) => c.isFinalist);

  // Visible projects without duplicates (winners also appear in the showcase list).
  const visible = new Map<string, KaryaItem>();
  for (const item of [...winners, ...cards]) {
    if (!visible.has(item.teamName)) visible.set(item.teamName, item);
  }

  return { initialState, cards, winners, finalists, visible: [...visible.values()] };
});

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const base: Metadata = {
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: { title: BASE_TITLE, description: BASE_DESCRIPTION, type: "website" },
  };

  const slug = await readKaryaParam(searchParams);
  if (!slug) return base;

  // Only projects the gallery already shows get their own preview; anything else gets the default.
  const gallery = await loadGallery();
  const item = gallery?.visible.find((entry) => karyaSlug(entry.teamName) === slug);
  if (!item) return base;

  const title = `${item.title} · Galeri Karya MIT-WEEK 2026`;
  const description = `Karya ${item.teamName}. ${item.description}`.slice(0, 200);
  const images = item.imageUrl ? [{ url: item.imageUrl, alt: `Pratinjau karya ${item.title}` }] : undefined;

  return {
    ...base,
    title,
    description,
    openGraph: { title, description, type: "website", images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
  };
}

export default async function PublicKaryaPage({ searchParams }: { searchParams: SearchParams }) {
  const [gallery, initialKarya] = await Promise.all([loadGallery(), readKaryaParam(searchParams)]);

  if (!gallery) {
    return (
      <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display font-semibold text-3xl">Kenalan Sama Para Penjaga</h1>
          <p className="mt-3 text-muted-foreground">Galeri belum dapat dimuat. Silakan coba lagi nanti.</p>
        </div>
      </main>
    );
  }

  // "Sorotan hari ini": same picks for everyone on a given WITA day, never score-based.
  const spotlightNames = pickDaily(
    gallery.visible,
    (item) => item.teamName,
    witaDateKey(new Date()),
    SPOTLIGHT_COUNT,
  ).map((item) => item.teamName);

  return (
    <KaryaClient
      initialState={gallery.initialState}
      cards={gallery.cards}
      winners={gallery.winners}
      finalists={gallery.finalists}
      spotlightNames={spotlightNames}
      initialKarya={initialKarya}
    />
  );
}

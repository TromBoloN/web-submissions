import type { Metadata } from "next";

import type { ShowcaseCardData } from "@/components/showcase-card";
import { ShowcaseGallery } from "@/components/showcase-gallery";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Karya Peserta | MIT-WEEK 2026",
  description: "Galeri karya peserta MIT-WEEK 2026.",
  robots: { index: false, follow: false },
};

export default async function PublicKaryaPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_showcase");

  if (error) {
    return (
      <main className="min-h-dvh bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display font-semibold text-3xl">Karya Peserta</h1>
          <p className="mt-3 text-slate-400">Galeri belum dapat dimuat. Silakan coba lagi nanti.</p>
        </div>
      </main>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const cards: ShowcaseCardData[] = (data ?? []).map((item) => ({
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
    <main className="min-h-dvh overflow-hidden bg-slate-950 text-slate-100">
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/20 sm:min-h-[370px] sm:p-10 lg:p-14">
          <div className="absolute -top-32 -right-20 size-80 rounded-full bg-cyan-300/10 blur-3xl motion-safe:animate-pulse" />
          <div className="absolute right-1/4 bottom-[-8rem] size-72 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="absolute top-8 right-8 hidden text-right sm:block">
            <p className="font-display font-semibold text-4xl text-white">{cards.length}</p>
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">karya dipamerkan</p>
          </div>
          <div className="relative max-w-4xl">
            <p className="mb-6 flex items-center gap-3 font-medium text-cyan-200 text-xs uppercase tracking-[0.28em]">
              <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_18px] shadow-cyan-300" />
              MIT-WEEK 2026 · Pameran digital
            </p>
            <h1 className="max-w-3xl font-display font-semibold text-5xl text-white leading-[0.95] tracking-[-0.06em] sm:text-7xl">
              Karya peserta.
            </h1>
            <p className="mt-6 max-w-xl font-display text-2xl text-slate-300 leading-tight sm:text-3xl">
              Guardians of the Digital Space
            </p>
            <p className="mt-6 max-w-2xl text-slate-400 leading-7">
              Sebuah koleksi karya yang dibagikan oleh tim peserta. Jelajahi ide, eksperimen, dan solusi digital mereka
              dalam satu ruang.
            </p>
          </div>
        </header>

        <div className="mt-10">
          <ShowcaseGallery cards={cards} />
        </div>

        <footer className="mt-16 border-white/10 border-t py-8 text-slate-500 text-sm leading-6">
          <p>Galeri tidak menampilkan nilai atau peringkat. Pemenang diumumkan terpisah.</p>
          <p className="mt-1">Untuk permintaan penghapusan karya, silakan hubungi panitia MIT-WEEK 2026.</p>
        </footer>
      </div>
    </main>
  );
}

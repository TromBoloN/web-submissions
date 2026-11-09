"use client";

import { useMemo, useState } from "react";

import { Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";

import { ShowcaseCard, type ShowcaseCardData } from "./showcase-card";

export function ShowcaseGallery({ cards }: { cards: ShowcaseCardData[] }) {
  const [query, setQuery] = useState("");
  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    if (!normalizedQuery) return cards;
    return cards.filter((card) =>
      `${card.teamName} ${card.title}`.toLocaleLowerCase("id-ID").includes(normalizedQuery),
    );
  }, [cards, query]);

  return (
    <section className="space-y-6" aria-labelledby="gallery-grid-title">
      <div className="flex flex-col gap-4 border-white/10 border-y py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-medium text-cyan-200 text-sm">
            <Sparkles className="size-4" />
            Koleksi karya
          </p>
          <h2 id="gallery-grid-title" className="mt-1 font-display font-semibold text-2xl text-white">
            {filteredCards.length} karya ditampilkan
          </h2>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama tim atau karya"
            aria-label="Cari nama tim atau karya"
            className="border-white/15 bg-white/[0.06] pl-9 text-white placeholder:text-slate-500 focus-visible:ring-cyan-300"
          />
        </div>
      </div>
      {filteredCards.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card, index) => (
            <div key={`${card.teamName}-${card.title}`} style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}>
              <ShowcaseCard data={card} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">
          Tidak ada karya yang cocok dengan pencarian.
        </div>
      )}
    </section>
  );
}

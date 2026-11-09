"use client";

import { useEffect, useMemo, useState } from "react";

import { Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";

import { ShowcaseCard, type ShowcaseCardData } from "./showcase-card";

function hash(value: string): number {
  return Array.from(value).reduce((total, character) => (total * 31 + character.charCodeAt(0)) | 0, 7);
}

function shuffleForVisitor(cards: ShowcaseCardData[], seed: string): ShowcaseCardData[] {
  return [...cards].sort((a, b) => hash(`${seed}:${a.teamName}`) - hash(`${seed}:${b.teamName}`));
}

export function ShowcaseGallery({
  cards,
  winners,
  initialQuery = "",
}: {
  cards: ShowcaseCardData[];
  winners: ShowcaseCardData[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [visitorSeed, setVisitorSeed] = useState("server");

  useEffect(() => {
    const storedSeed = sessionStorage.getItem("showcase-order-seed");
    const seed = storedSeed ?? `${Date.now()}-${Math.random()}`;
    if (!storedSeed) sessionStorage.setItem("showcase-order-seed", seed);
    setVisitorSeed(seed);
  }, []);

  useEffect(() => {
    const urlQuery = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(urlQuery);
  }, []);

  const shuffledCards = useMemo(() => shuffleForVisitor(cards, visitorSeed), [cards, visitorSeed]);
  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    if (!normalizedQuery) return shuffledCards;
    return shuffledCards.filter((card) =>
      `${card.teamName} ${card.title}`.toLocaleLowerCase("id-ID").includes(normalizedQuery),
    );
  }, [query, shuffledCards]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };

  return (
    <section className="space-y-6" aria-labelledby="gallery-grid-title">
      {winners.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="font-medium text-cyan-200 text-sm">Pengumuman pemenang</p>
            <h2 className="mt-1 font-display font-semibold text-2xl text-white">Tiga karya terbaik</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {winners.map((winner) => (
              <ShowcaseCard key={`winner-${winner.teamName}`} data={winner} variant="winner" />
            ))}
          </div>
        </div>
      )}
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
            onChange={(event) => handleQueryChange(event.target.value)}
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

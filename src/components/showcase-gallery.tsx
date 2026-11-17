"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";

import { ShowcaseCard, type ShowcaseCardData } from "./showcase-card";

function hash(value: string): number {
  return Array.from(value).reduce((total, character) => (total * 31 + character.charCodeAt(0)) | 0, 7);
}

function shuffleForVisitor(cards: ShowcaseCardData[], seed: string): ShowcaseCardData[] {
  return [...cards].sort((a, b) => hash(`${seed}:${a.teamName}`) - hash(`${seed}:${b.teamName}`));
}

function ReleaseVault({ serverNow }: { serverNow: number }) {
  const releaseAt = Date.parse("2026-11-18T00:00:00+08:00");
  const [remaining, setRemaining] = useState(Math.max(0, releaseAt - serverNow));

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, releaseAt - serverNow - (Date.now() - startedAt)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [releaseAt, serverNow]);

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <div className="karya-vault relative overflow-hidden border border-amber-500/30 bg-card/80 p-4 text-center sm:p-6">
      <div className="karya-vault-glow" aria-hidden="true" />
      <div className="karya-vault-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="karya-ghost-card" key={index}>
            <div className="karya-ghost-image" />
            <div className="karya-ghost-copy" />
            <div className="karya-ghost-copy karya-ghost-copy-short" />
            <div className="karya-ghost-buttons">
              <span />
              <span />
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-10">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center border border-amber-500/50 text-amber-500">
          <svg aria-hidden="true" viewBox="0 0 64 64" className="size-12 fill-none stroke-current stroke-2">
            <path d="M17 28h30v24H17zM23 28V19a9 9 0 0 1 18 0v9" />
            <circle cx="32" cy="39" r="3" />
          </svg>
        </div>
        <p className="font-mono text-amber-500 text-xs uppercase tracking-[0.3em]">TERENKRIPSI · ARSIP BELUM DIBUKA</p>
        <p className="mt-3 text-muted-foreground">Galeri karya akan dibuka pada 18 November 2026.</p>
        <div className="mx-auto mt-6 grid max-w-md grid-cols-4 gap-2">
          {[
            ["HARI", days],
            ["JAM", hours],
            ["MENIT", minutes],
            ["DETIK", seconds],
          ].map(([label, value]) => (
            <div key={label} className="border border-border bg-background/70 px-2 py-3">
              <p className="font-display font-semibold text-xl text-foreground">{String(value).padStart(2, "0")}</p>
              <p className="font-mono text-[9px] text-muted-foreground tracking-[0.16em]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShowcaseGallery({
  cards,
  winners,
  initialQuery = "",
  serverNow,
}: {
  cards: ShowcaseCardData[];
  winners: ShowcaseCardData[];
  initialQuery?: string;
  serverNow: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [visitorSeed, setVisitorSeed] = useState("server");
  const connectorRef = useRef<HTMLDivElement>(null);
  const [connectorVisible, setConnectorVisible] = useState(false);

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

  useEffect(() => {
    const element = connectorRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setConnectorVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setConnectorVisible(true);
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
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

  const emptyState =
    cards.length === 0 ? (
      <ReleaseVault serverNow={serverNow} />
    ) : (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
        Tidak ada karya yang cocok dengan pencarian.
      </div>
    );

  return (
    <section ref={connectorRef} className="relative space-y-6" aria-labelledby="gallery-grid-title">
      <svg
        aria-hidden="true"
        className={`karya-gallery-connector-line ${connectorVisible ? "is-connected" : ""}`}
        viewBox="0 0 120 48"
        preserveAspectRatio="none"
      >
        <path d="M20 0 V24 H50 L68 42 H120" />
        <path d="M28 0 V20 H54 L72 34 H120" />
        <path d="M36 0 V16 H58 L76 26 H120" />
        <circle cx="20" cy="0" r="3" />
        <circle cx="28" cy="0" r="3" />
        <circle cx="36" cy="0" r="3" />
      </svg>
      {winners.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="font-medium text-amber-500 text-sm">Pengumuman pemenang</p>
            <h2 className="mt-1 font-display font-semibold text-2xl text-foreground">Tiga karya terbaik</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {winners.map((winner) => (
              <ShowcaseCard key={`winner-${winner.teamName}`} data={winner} variant="winner" />
            ))}
          </div>
        </div>
      )}
      <div className="karya-section-divider flex flex-col gap-4 border-border border-b py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-medium text-signal text-sm">
            <Sparkles className="size-4" />
            {"//"} ARSIP
          </p>
          <h2 id="gallery-grid-title" className="mt-1 font-display font-semibold text-2xl text-foreground">
            Koleksi karya
          </h2>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Cari nama tim atau karya"
            aria-label="Cari nama tim atau karya"
            className="border-border bg-card pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
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
        emptyState
      )}
    </section>
  );
}

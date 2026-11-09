"use client";

import { useEffect, useMemo, useState } from "react";

import { Lock, Search, Sparkles } from "lucide-react";

import { KARYA_DATES } from "@/app/karya/karya-constants";
import { Input } from "@/components/ui/input";

import { ShowcaseCard, type ShowcaseCardData } from "./showcase-card";

function hash(value: string): number {
  return Array.from(value).reduce((total, character) => (total * 31 + character.charCodeAt(0)) | 0, 7);
}

function shuffleForVisitor(cards: ShowcaseCardData[], seed: string): ShowcaseCardData[] {
  return [...cards].sort((a, b) => hash(`${seed}:${a.teamName}`) - hash(`${seed}:${b.teamName}`));
}

const HEX_LINES = [
  "0x4D 0x49 0x54 0x2D 0x57 0x45 0x45 0x4B 0x20 0x32 0x30 0x32 0x36 0x00 0xFF 0x8A 0x2B 0xC4",
  "0x73 0x65 0x63 0x75 0x72 0x69 0x74 0x79 0x5F 0x76 0x61 0x75 0x6C 0x74 0x5F 0x65 0x6E 0x63",
  "0x9A 0x3F 0x12 0x5D 0xEE 0x04 0x7C 0x88 0x31 0xB5 0x4A 0x90 0xF1 0x22 0x67 0x8C 0x3D 0x19",
  "0x47 0x55 0x41 0x52 0x44 0x49 0x41 0x4E 0x53 0x5F 0x44 0x49 0x47 0x49 0x54 0x41 0x4C 0x21",
  "0x10 0x44 0x82 0x3E 0xA1 0x77 0x4B 0x9F 0x60 0x2E 0xD3 0x8C 0x55 0x1B 0x72 0x94 0x0A 0xFC",
];

function ReleaseVault() {
  return (
    <div className="space-y-6">
      {/* Compact Vault Box (~1/3 previous height) with radial text scrim */}
      <div className="karya-vault relative overflow-hidden bg-card p-6 sm:p-9 text-center shadow-lg">
        {/* Slow scrolling hex/ciphertext background faded toward center */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.07] dark:opacity-[0.14]"
          style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 20%, black 85%)" }}
        >
          <div className="karya-ciphertext flex flex-col gap-2 font-mono text-[11px] leading-none text-foreground">
            {[...HEX_LINES, ...HEX_LINES, ...HEX_LINES, ...HEX_LINES].map((line, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: purely decorative repeating ciphertext lines
              <div key={idx} className="whitespace-nowrap tracking-widest">
                {line} {line}
              </div>
            ))}
          </div>
        </div>

        {/* Ambient Subtle Amber Radial Glow */}
        <div
          className="pointer-events-none absolute inset-x-1/4 top-0 h-1/2 bg-radial from-amber-500/15 via-transparent to-transparent opacity-80"
          aria-hidden="true"
        />

        {/* Dark radial scrim directly behind center content for maximum legibility */}
        <div
          className="pointer-events-none absolute inset-0 bg-radial from-card via-card/85 to-transparent"
          aria-hidden="true"
        />

        {/* Centered Content */}
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="mx-auto mb-4 flex size-14 sm:size-16 items-center justify-center border border-amber-500/50 bg-amber-500/10 text-amber-500">
            <Lock className="size-7 sm:size-8" />
          </div>

          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">
            TERKUNCI · ARSIP BELUM DIBUKA
          </p>

          <p className="mt-3 font-medium text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed">
            Arsip karya peserta saat ini terkunci dan akan dibuka untuk umum pada{" "}
            <span className="font-bold text-foreground">{KARYA_DATES.galleryReleaseDateFull}</span>.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 border border-border/80 bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-xs">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>STATUS: LOCKED {"//"} MENUNGGU RILIS</span>
          </div>
        </div>
      </div>

      {/* Release Timeline Underneath in Square HUD Style */}
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
          {/* Node 1 */}
          <div className="karya-timeline-node relative flex-1 border border-border/80 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <span className="font-mono text-[10px] font-semibold text-signal tracking-[0.2em] uppercase">
                NODE 01
              </span>
              <span className="inline-flex items-center gap-1 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-500 uppercase tracking-wider">
                FASE BERIKUTNYA
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-display font-semibold text-base sm:text-lg text-foreground tracking-tight">
                {KARYA_DATES.galleryReleaseNodeLabel}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm font-normal text-foreground/80 dark:text-slate-300 leading-relaxed">
                Pembukaan arsip publik untuk karya peserta yang bersedia ditampilkan.
              </p>
            </div>
          </div>

          {/* Timeline Connector Arrow on desktop */}
          <div
            className="hidden sm:flex items-center justify-center px-2 text-signal/60 font-mono text-sm select-none"
            aria-hidden="true"
          >
            ───►
          </div>

          {/* Node 2 */}
          <div className="karya-timeline-node relative flex-1 border border-border/80 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <span className="font-mono text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase">
                NODE 02
              </span>
              <span className="inline-flex items-center gap-1 border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                FINAL
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-display font-semibold text-base sm:text-lg text-foreground tracking-tight">
                {KARYA_DATES.winnersReleaseNodeLabel}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm font-normal text-foreground/80 dark:text-slate-300 leading-relaxed">
                Pengumuman resmi karya finalis dan tiga tim terbaik peraih penghargaan MIT-WEEK 2026.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShowcaseGallery({
  cards,
  winners,
  initialQuery = "",
}: {
  cards: ShowcaseCardData[];
  winners: ShowcaseCardData[];
  initialQuery?: string;
  serverNow?: number;
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

  const emptyState =
    cards.length === 0 ? (
      <ReleaseVault />
    ) : (
      <div className="border border-dashed border-border/80 bg-card p-10 text-center text-muted-foreground">
        <p className="font-medium text-foreground">Tidak ada hasil yang ditemukan</p>
        <p className="mt-1 text-xs">Coba kata kunci pencarian lain atau kosongkan kolom pencarian.</p>
      </div>
    );

  return (
    <section className="relative space-y-6" aria-labelledby="gallery-grid-title">
      {/* Winners Section if released */}
      {winners.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="font-mono text-xs font-semibold text-amber-500 uppercase tracking-widest">
              PENGUMUMAN PEMENANG
            </p>
            <h2 className="mt-1 font-display font-semibold text-2xl text-foreground">Tiga karya terbaik</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {winners.map((winner) => (
              <ShowcaseCard key={`winner-${winner.teamName}`} data={winner} variant="winner" />
            ))}
          </div>
        </div>
      )}

      {/* Header: Plain left-aligned row (Title left, Search right) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-signal uppercase tracking-[0.22em]">
            <Sparkles className="size-3.5" />
            SYS {"//"} ARSIP
          </p>
          <h2
            id="gallery-grid-title"
            className="font-display font-semibold text-2xl text-foreground tracking-tight sm:text-3xl"
          >
            Koleksi karya
          </h2>
        </div>

        {/* Search input right aligned with solid background */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Cari nama tim atau karya..."
            aria-label="Cari nama tim atau karya"
            className="h-10 rounded-none border border-border/80 bg-card pl-9 font-sans text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-signal focus-visible:ring-1 focus-visible:ring-signal"
          />
        </div>
      </div>

      {/* Sibling Divider */}
      <div className="h-px w-full bg-border/60" aria-hidden="true" />

      {/* Showcase Grid: 1 col phone, 2 md, 3 lg, 4 2xl */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredCards.map((card, index) => (
            <div key={`${card.teamName}-${card.title}`} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
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

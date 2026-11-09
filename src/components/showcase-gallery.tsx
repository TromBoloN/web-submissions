"use client";

import { useEffect, useMemo, useState } from "react";

import { Award, Search, Shield, Sparkles } from "lucide-react";

import { enrichGuardianCard, KARYA_DATES } from "@/app/karya/karya-constants";
import { Input } from "@/components/ui/input";

import { ShowcaseCard, type ShowcaseCardData, ShowcaseDetailModal } from "./showcase-card";

function hash(value: string): number {
  return Array.from(value).reduce((total, character) => (total * 31 + character.charCodeAt(0)) | 0, 7);
}

function shuffleForVisitor(cards: ShowcaseCardData[], seed: string): ShowcaseCardData[] {
  return [...cards].sort((a, b) => hash(`${seed}:${a.teamName}`) - hash(`${seed}:${b.teamName}`));
}

function useCountdown(targetTimestamp: number) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, targetTimestamp - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds };
}

/**
 * Confetti particle burst for Rank 1
 */
function ConfettiBurst() {
  const particles = [
    { x: -35, y: -45, color: "#2FBF71", delay: 0 },
    { x: 30, y: -50, color: "#3FA9D9", delay: 100 },
    { x: -20, y: -65, color: "#262470", delay: 200 },
    { x: 25, y: -60, color: "#5B4FC9", delay: 150 },
    { x: 0, y: -70, color: "#2FBF71", delay: 50 },
  ];

  return (
    <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 z-20" aria-hidden="true">
      {particles.map((p, idx) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: confetti decorative elements
          key={idx}
          className="absolute size-2.5 rounded-full animate-bounce"
          style={{
            backgroundColor: p.color,
            transform: `translate(${p.x}px, ${p.y}px)`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Section 4.3: Pemenang (Podium Layout)
 * Displays top 3 cards with giant outlined rank numbers, committee note, and confetti on Rank 1.
 */
function WinnersPodium({
  winners,
  onOpenDetail,
}: {
  winners: ShowcaseCardData[];
  onOpenDetail: (card: ShowcaseCardData) => void;
}) {
  if (winners.length === 0) return null;

  // Sort by rank: 1, 2, 3
  const rank1 = winners.find((w) => w.winnerRank === 1);
  const rank2 = winners.find((w) => w.winnerRank === 2);
  const rank3 = winners.find((w) => w.winnerRank === 3);

  const podiumOrder = [
    { item: rank2, rankNumber: "02", label: "Juara 2", accentColor: "#3FA9D9", elevation: "" },
    { item: rank1, rankNumber: "01", label: "Juara 1", accentColor: "#2FBF71", elevation: "sm:-mt-6 lg:-mt-8" },
    { item: rank3, rankNumber: "03", label: "Juara 3", accentColor: "#5B4FC9", elevation: "" },
  ].filter(
    (p): p is { item: ShowcaseCardData; rankNumber: string; label: string; accentColor: string; elevation: string } =>
      Boolean(p.item),
  );

  return (
    <section className="space-y-6 pt-6" aria-labelledby="winners-podium-title">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b-2 border-[#262470]/20 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#262470] bg-[#2FBF71] px-3 py-0.5 text-xs font-black uppercase text-[#262470] shadow-[2px_2px_0_#262470]">
            <Award className="size-3.5" />
            <span>PODIUM FINALIS TERBAIK</span>
          </div>
          <h2 id="winners-podium-title" className="mt-2 font-display font-black text-2xl sm:text-3xl text-foreground">
            Tiga Karya Penjaga Terpilih
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
            Dinilai oleh dewan juri berdasarkan dampak perlindungan, inovasi solusi, dan kemudahan bagi pengguna.
          </p>
        </div>
      </div>

      {/* Podium Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-end pt-4">
        {podiumOrder.map(({ item, rankNumber, label, elevation }) => (
          <div key={`podium-${item.teamName}`} className={`relative flex flex-col ${elevation}`}>
            {/* Rank 1 Confetti Burst */}
            {rankNumber === "01" && <ConfettiBurst />}

            {/* Giant Outlined Rank Stand Header */}
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="font-mono text-xs font-black uppercase tracking-wider text-[#262470] dark:text-[#6F8FD0]">
                {label}
              </span>
              <span
                className="font-display font-black text-5xl sm:text-6xl text-white select-none drop-shadow-[3px_3px_0_#262470]"
                style={{
                  WebkitTextStroke: "2.5px #262470",
                }}
              >
                {rankNumber}
              </span>
            </div>

            {/* The Winner Card */}
            <ShowcaseCard data={item} variant="winner" onOpenDetail={onOpenDetail} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Locked Vault State: Sebentar lagi, 18 Nov
 */
function LockedVaultState() {
  const { days, hours, minutes, seconds } = useCountdown(KARYA_DATES.galleryReleaseTimestamp);

  return (
    <div className="guardian-card relative overflow-hidden bg-white p-6 sm:p-10 text-center shadow-[6px_6px_0_#262470] dark:bg-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#262470] bg-[#2FBF71] px-4 py-1 text-xs font-black uppercase text-[#262470] shadow-[3px_3px_0_#262470]">
          <Shield className="size-3.5 fill-current" />
          <span>TERBUKA UNTUK SEMUA · SEBENTAR LAGI, 18 NOV</span>
        </div>

        <div>
          <h3 className="font-display font-black text-2xl sm:text-3xl text-foreground">Kenalan sama para penjaga.</h3>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
            Arsip karya dari teman-temanmu sedang dipersiapkan dan akan dibuka penuh untuk umum pada{" "}
            <span className="font-extrabold text-[#262470] dark:text-[#3FA9D9]">
              {KARYA_DATES.galleryReleaseDateFull}
            </span>
            .
          </p>
        </div>

        {/* Monospace Countdown Blocks */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono">
          <div className="guardian-card flex flex-col items-center justify-center bg-[#F7F9FF] px-4 py-2.5 sm:px-6 sm:py-3 shadow-[3px_3px_0_#262470] dark:bg-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-[#262470] dark:text-[#3FA9D9]">
              {String(days).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">HARI</span>
          </div>

          <span className="text-xl font-black text-[#262470]">:</span>

          <div className="guardian-card flex flex-col items-center justify-center bg-[#F7F9FF] px-4 py-2.5 sm:px-6 sm:py-3 shadow-[3px_3px_0_#262470] dark:bg-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-[#262470] dark:text-[#3FA9D9]">
              {String(hours).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">JAM</span>
          </div>

          <span className="text-xl font-black text-[#262470]">:</span>

          <div className="guardian-card flex flex-col items-center justify-center bg-[#F7F9FF] px-4 py-2.5 sm:px-6 sm:py-3 shadow-[3px_3px_0_#262470] dark:bg-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-[#262470] dark:text-[#3FA9D9]">
              {String(minutes).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">MENIT</span>
          </div>

          <span className="text-xl font-black text-[#262470]">:</span>

          <div className="guardian-card flex flex-col items-center justify-center bg-[#F7F9FF] px-4 py-2.5 sm:px-6 sm:py-3 shadow-[3px_3px_0_#262470] dark:bg-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-[#262470] dark:text-[#3FA9D9]">
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">DETIK</span>
          </div>
        </div>

        {/* Roadmap Timeline */}
        <div className="mt-8 pt-6 border-t-2 border-[#262470]/20 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="guardian-card p-4 bg-[#F7F9FF] dark:bg-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-extrabold uppercase text-[#262470] dark:text-[#3FA9D9]">
                TAHAP 01
              </span>
              <span className="rounded bg-[#2FBF71] px-2 py-0.5 text-[9px] font-black text-[#262470]">SELANJUTNYA</span>
            </div>
            <h4 className="font-display font-bold text-sm text-foreground">{KARYA_DATES.galleryReleaseNodeLabel}</h4>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Pembukaan ruang galeri untuk seluruh karya peserta yang bersedia dibagikan.
            </p>
          </div>

          <div className="guardian-card p-4 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-extrabold uppercase text-muted-foreground">TAHAP 02</span>
              <span className="rounded bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">FINAL</span>
            </div>
            <h4 className="font-display font-bold text-sm text-foreground">{KARYA_DATES.winnersReleaseNodeLabel}</h4>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Pengumuman resmi karya finalis dan penyerahan penghargaan juara MIT-WEEK 2026.
            </p>
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
  const [selectedCampus, setSelectedCampus] = useState("Semua");

  // Detail Modal state
  const [selectedCard, setSelectedCard] = useState<ShowcaseCardData | null>(null);

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

  // Enrich all cards with Guardian model attributes
  const enrichedWinners = useMemo(() => winners.map((winner, idx) => enrichGuardianCard(winner, idx)), [winners]);

  const enrichedCards = useMemo(() => cards.map((card, idx) => enrichGuardianCard(card, idx)), [cards]);

  const shuffledCards = useMemo(() => shuffleForVisitor(enrichedCards, visitorSeed), [enrichedCards, visitorSeed]);

  // Dynamic filter lists derived from cards
  const uniqueCampuses = useMemo(() => {
    const set = new Set(enrichedCards.map((c) => c.campus).filter(Boolean));
    return ["Semua", ...Array.from(set)];
  }, [enrichedCards]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

    return shuffledCards.filter((card) => {
      const matchesQuery =
        !normalizedQuery ||
        `${card.teamName} ${card.title} ${card.description} ${card.campus}`
          .toLocaleLowerCase("id-ID")
          .includes(normalizedQuery);

      const matchesCampus = selectedCampus === "Semua" || card.campus === selectedCampus;

      return matchesQuery && matchesCampus;
    });
  }, [query, selectedCampus, shuffledCards]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };

  return (
    <section className="relative space-y-10" aria-labelledby="gallery-grid-title">
      {/* Detail Modal */}
      <ShowcaseDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />

      {/* Winners Section if released */}
      {enrichedWinners.length > 0 && <WinnersPodium winners={enrichedWinners} onOpenDetail={setSelectedCard} />}

      {/* Main Gallery Section Header */}
      <div className="space-y-6 pt-4 border-t-2 border-[#262470]/20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-extrabold uppercase text-[#262470] dark:text-[#3FA9D9]">
              <Sparkles className="size-3.5 text-[#2FBF71]" />
              <span>KOLEKSI LENGKAP KARYA</span>
            </div>
            <h2 id="gallery-grid-title" className="font-display font-black text-2xl sm:text-3xl text-foreground">
              Jelajahi Karya Para Penjaga
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Temukan solusi nyata dan inovasi digital yang dikembangkan oleh seluruh tim peserta.
            </p>
          </div>

          {/* Search Input & Campus Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {uniqueCampuses.length > 2 && (
              <select
                id="filter-campus"
                value={selectedCampus}
                aria-label="Saring berdasarkan kampus"
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="rounded-xl border-2 border-[#262470] bg-white px-3 py-2 text-xs font-bold text-[#262470] shadow-[3px_3px_0_#262470] dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {uniqueCampuses.map((c) => (
                  <option key={c} value={c}>
                    {c === "Semua" ? "Semua Kampus" : c}
                  </option>
                ))}
              </select>
            )}

            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#262470] dark:text-[#3FA9D9]" />
              <Input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Cari nama tim atau karya..."
                className="guardian-card h-10 w-full pl-10 pr-4 text-xs font-semibold shadow-[3px_3px_0_#262470]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Gallery Cards or Vault / Empty State */}
      {cards.length === 0 && <LockedVaultState />}

      {cards.length > 0 && filteredCards.length === 0 && (
        <div className="guardian-card p-10 text-center bg-white dark:bg-slate-900 shadow-[4px_4px_0_#262470]">
          <p className="font-display font-bold text-lg text-foreground">Tidak ada karya yang cocok</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coba sesuaikan kata kunci pencarian atau pilih kampus lain.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedCampus("Semua");
            }}
            className="guardian-btn-secondary mt-4 px-4 py-1.5 text-xs"
          >
            Reset Pencarian
          </button>
        </div>
      )}

      {cards.length > 0 && filteredCards.length > 0 && (
        /* Bento Layout: Mixed Tile Sizes */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCards.map((card, idx) => {
            const isBentoHero = idx === 0 && filteredCards.length > 2;

            return (
              <div key={`gallery-${card.teamName}`} className={isBentoHero ? "md:col-span-2 md:row-span-1" : ""}>
                <ShowcaseCard data={card} onOpenDetail={setSelectedCard} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

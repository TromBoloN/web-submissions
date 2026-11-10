"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { KARYA_DATES } from "./karya-constants";
import { KaryaLogo } from "./karya-logo";

export type KaryaItem = {
  teamName: string;
  title: string;
  description: string;
  imageUrl: string | null;
  githubUrl: string;
  liveDemoUrl: string;
  videoUrl: string;
  isFinalist?: boolean;
  winnerRank?: number;
  winnerScore?: number;
};

const PALETTES = [
  ["#5b3fd0", "#4aa3e8"],
  ["#2f4fd0", "#3fc8a0"],
  ["#1f8a70", "#2f4fd0"],
  ["#2b2f8f", "#22d395"],
  ["#3a7bd5", "#3fc8a0"],
  ["#6a4df0", "#3fc8a0"],
  ["#2f4fd0", "#4aa3e8"],
  ["#2b2f8f", "#6f86ee"],
  ["#8a3fd0", "#e8734a"],
  ["#1f8a70", "#4aa3e8"],
];

function getPalette(name: string): [string, string] {
  const hash = Array.from(name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const pair = PALETTES[hash % PALETTES.length];
  return [pair[0], pair[1]];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}

const TITLE_LETTERS = [
  { id: "letter-g", ch: "G", i: 0 },
  { id: "letter-u", ch: "U", i: 1 },
  { id: "letter-a1", ch: "A", i: 2 },
  { id: "letter-r", ch: "R", i: 3 },
  { id: "letter-d", ch: "D", i: 4 },
  { id: "letter-i", ch: "I", i: 5 },
  { id: "letter-a2", ch: "A", i: 6 },
  { id: "letter-n", ch: "N", i: 7 },
  { id: "letter-s", ch: "S", i: 8 },
];

const STAGE_LABELS = {
  done: "Selesai",
  now: "Sekarang",
  next: "Selanjutnya",
  later: "Nanti",
} as const;

type StageStatus = keyof typeof STAGE_LABELS;

const TIMELINE_STAGES = [
  { label: KARYA_DATES.stage1Label, description: KARYA_DATES.stage1Desc },
  { label: KARYA_DATES.stage3Label, description: KARYA_DATES.stage3Desc },
] as const;

function getStageStatus(index: number, activeIndex: number): StageStatus {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "now";
  if (index === activeIndex + 1) return "next";
  return "later";
}

// Icons
const GhIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-4"
  >
    <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
  </svg>
);

const VidIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-6 text-foreground"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export function KaryaClient({
  initialState,
  cards,
  winners,
  finalists,
}: {
  initialState: "locked" | "open" | "win";
  cards: KaryaItem[];
  winners: KaryaItem[];
  finalists: KaryaItem[];
}) {
  const state = initialState;
  const isLocked = state === "locked";
  const isWin = state === "win";

  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [activeModalItem, setActiveModalItem] = useState<KaryaItem | null>(null);

  // Floating thumbnail preview in list view
  const [hoveredItem, setHoveredItem] = useState<KaryaItem | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Theme store
  const themeMode = usePreferencesStore((s) => s.values.theme_mode);
  const setPreference = usePreferencesStore((s) => s.setPreference);
  const isDark = themeMode === "dark";
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const [themeSpin, setThemeSpin] = useState(false);

  // Loader + hero entrance on every refresh or entry
  const [showLoader, setShowLoader] = useState(false);
  const [loaderOpen, setLoaderOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }

    setShowLoader(true);
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const openTimer = setTimeout(() => {
      setLoaderOpen(true);
      hideTimer = setTimeout(() => {
        setShowLoader(false);
        setEntered(true);
      }, 900);
    }, 1500);

    return () => {
      clearTimeout(openTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const handleDismissLoader = () => {
    setLoaderOpen(true);
    setTimeout(() => {
      setShowLoader(false);
      setEntered(true);
    }, 300);
  };

  // Lens tracking on desktop, eased and throttled to animation frames
  const lensRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lens = lensRef.current;
    if (!lens) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let targetX = window.innerWidth * 0.6;
    let targetY = window.innerHeight * 0.4;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) < 0.5) return;
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      lens.style.setProperty("--mx", `${currentX.toFixed(0)}px`);
      lens.style.setProperty("--my", `${currentY.toFixed(0)}px`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  // Filtered rest of cards (non-finalists / general participants)
  const restCards = useMemo(() => {
    const finalistNames = new Set(finalists.map((f) => f.teamName));
    const winnerNames = new Set(winners.map((w) => w.teamName));
    return cards.filter((c) => !finalistNames.has(c.teamName) && !winnerNames.has(c.teamName));
  }, [cards, finalists, winners]);

  const filteredRestCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return restCards;
    return restCards.filter(
      (c) =>
        c.teamName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [restCards, query]);

  // Remaining 2 finalists in winner release
  const remainingFinalists = useMemo(() => {
    if (!isWin) return finalists;
    const winnerNames = new Set(winners.map((w) => w.teamName));
    return finalists.filter((f) => !winnerNames.has(f.teamName));
  }, [finalists, winners, isWin]);

  // Podium order: Juara 2 (kiri), Juara 1 (tengah naik), Juara 3 (kanan)
  const podiumWinners = useMemo(() => {
    const r1 = winners.find((w) => w.winnerRank === 1);
    const r2 = winners.find((w) => w.winnerRank === 2);
    const r3 = winners.find((w) => w.winnerRank === 3);
    return [
      { item: r2, rank: 2, orderClass: "p2" },
      { item: r1, rank: 1, orderClass: "p1" },
      { item: r3, rank: 3, orderClass: "p3" },
    ].filter((p): p is { item: KaryaItem; rank: number; orderClass: string } => Boolean(p.item));
  }, [winners]);

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setThemeSpin(false);
    requestAnimationFrame(() => setThemeSpin(true));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      setPreference("theme_mode", next);
      return;
    }

    const rect = themeButtonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight - 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => {
      setPreference("theme_mode", next);
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
          },
          {
            duration: 700,
            easing: "cubic-bezier(.65,0,.25,1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        // View transitions are progressive enhancement; ignore unsupported setups.
      });
  };

  let activeStage = 0;
  if (isLocked) {
    activeStage = -1;
  } else if (isWin) {
    activeStage = 1;
  }
  const showFinalists = isLocked || (isWin ? remainingFinalists.length > 0 : finalists.length > 0);

  let fnoteText = "Lima karya terbaik yang melaju ke presentasi final 21 November 2026.";
  if (isLocked) {
    fnoteText = "Diumumkan 18 November 2026, bersamaan dengan dibukanya galeri.";
  } else if (isWin) {
    fnoteText = "Finalis yang belum meraih posisi juara.";
  }

  let worksNoteText = "Karya tampil atas persetujuan tim, dalam urutan acak. Pemenang diumumkan 25 November 2026.";
  if (isLocked) {
    worksNoteText =
      "Galeri belum dibuka. Tampilan di bawah hanya contoh (grid dan list); jumlah karya yang tampil tergantung persetujuan tiap tim.";
  } else if (isWin) {
    worksNoteText = "Karya lainnya tampil dalam urutan acak.";
  }

  return (
    <div className={`karya-page${isDark ? " dark" : ""}${entered ? " go" : ""}`} data-theme={isDark ? "dark" : "light"}>
      {/* Background Atmosphere */}
      <div className="bgfx" aria-hidden="true">
        <svg
          viewBox="0 0 1600 1000"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          stroke="var(--line)"
          strokeWidth="1.2"
        >
          <title>Latar belakang atmosferik</title>
          <g className="g1">
            <circle cx="1180" cy="330" r="300" />
            <circle cx="1180" cy="330" r="470" strokeDasharray="3 11" />
          </g>
          <g className="g2">
            <circle cx="260" cy="760" r="240" />
            <circle cx="260" cy="760" r="380" strokeDasharray="2 9" />
          </g>
          <path d="M0 500H1600M800 0V1000" strokeOpacity=".5" />
        </svg>
      </div>
      <div className="lens" ref={lensRef} id="lens" aria-hidden="true" />

      {/* Interactive Loader (Every refresh or entry, click to skip) */}
      {showLoader && (
        <button
          type="button"
          className={`ld ${loaderOpen ? "open" : ""}`}
          onClick={handleDismissLoader}
          aria-label="Tutup loader"
        >
          <div className="ld-p ld-t" />
          <div className="ld-p ld-b" />
          <div className="ld-c">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="dr" cx="60" cy="60" r="55" pathLength="1" />
              <polygon className="dr h" points="60,14 100,37 100,83 60,106 20,83 20,37" pathLength="1" />
              <polygon className="fl" points="60,30 86,45 86,75 60,90 34,75 34,45" />
            </svg>
            <p className="mono font-semibold">Menyiapkan ruang yang aman</p>
          </div>
        </button>
      )}

      {/* Header */}
      <header className="mx-auto flex max-w-[1360px] items-center gap-3 px-4 pt-5 sm:px-6">
        <KaryaLogo className="size-9 shrink-0" spin={false} />
        <span className="font-extrabold text-base tracking-tight sm:text-lg">MIT-WEEK 2026</span>
        <span className="pill mono ml-1 hidden sm:inline-flex">Web Development Competition</span>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1360px] px-4 pb-28 sm:px-6">
        {/* Hero Section */}
        <section
          id="hero"
          className={`hero mt-6 grid items-center gap-8 p-6 sm:p-10 lg:mt-10 lg:grid-cols-12 lg:p-14 ${
            !isLocked ? "compact" : ""
          }`}
        >
          <div className="lg:col-span-8">
            <span className="pill mono rise" style={{ "--e": ".2s" } as React.CSSProperties}>
              Galeri karya · Web Development Competition
            </span>
            <h1 className="ttl mt-5" aria-label="GUARDIANS">
              {TITLE_LETTERS.map((item) => (
                <span key={item.id} className="lw" aria-hidden="true">
                  <span className="ltr" style={{ "--i": item.i } as React.CSSProperties}>
                    {item.ch}
                  </span>
                </span>
              ))}
            </h1>
            <p
              className="mt-4 font-extrabold text-xl tracking-tight sm:text-3xl rise"
              style={{ "--e": ".9s" } as React.CSSProperties}
            >
              Kenalan sama para penjaga digital.
            </p>
            <div className="hx">
              <p
                className="muted mt-4 max-w-xl text-base leading-relaxed sm:text-lg rise"
                style={{ "--e": "1.1s" } as React.CSSProperties}
              >
                Ruang pameran karya peserta Web Development Competition, salah satu kompetisi di MIT-WEEK 2026. Jelajahi
                ide, eksperimen, dan solusi nyata dari teman-temanmu yang menjaga ruang digital kita tetap aman,
                inklusif, dan bersahabat.
              </p>
            </div>
          </div>

          <div
            className="hx flex flex-col items-center gap-4 lg:col-span-4 rise"
            style={{ "--e": "1.1s" } as React.CSSProperties}
          >
            <KaryaLogo className="size-36 sm:size-44" />
            <span className="pill mono">MIT-WEEK 2026 · Web Development</span>
          </div>
        </section>

        {/* Schedule Timeline */}
        <section id="tl" className="mt-10" aria-label="Jadwal">
          <p className="mono muted mb-3 text-xs">Jadwal · Web Development Competition MIT-WEEK 2026</p>
          <ol id="tlist" className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
            {TIMELINE_STAGES.map((stage, index) => {
              const status = getStageStatus(index, activeStage);
              const isDone = status === "done";
              const isNow = status === "now";

              return (
                <li key={stage.label} className="box relative p-5">
                  <div className="flex items-center gap-3">
                    <svg width="30" height="34" viewBox="0 0 38 42" aria-hidden="true">
                      <polygon
                        points="19,2 36,11 36,31 19,40 2,31 2,11"
                        fill={isNow ? "var(--acc)" : "var(--card)"}
                        stroke="var(--line)"
                        strokeWidth="3"
                      />
                      {isDone && (
                        <path
                          d="M12 22l5 5 9-11"
                          fill="none"
                          stroke="var(--ink)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      )}
                      {isNow && <circle cx="19" cy="21" r="4.5" fill="#06150d" />}
                      {!isDone && !isNow && index === 0 && (
                        <>
                          <rect
                            x="12"
                            y="20"
                            width="14"
                            height="10"
                            rx="2"
                            fill="none"
                            stroke="var(--ink)"
                            strokeWidth="2.6"
                          />
                          <path d="M15 20v-3a4 4 0 0 1 8 0v3" fill="none" stroke="var(--ink)" strokeWidth="2.6" />
                        </>
                      )}
                      {!isDone && !isNow && index !== 0 && <circle cx="19" cy="21" r="2.5" fill="var(--ink)" />}
                    </svg>
                    <span className="mono muted text-xs">TAHAP 0{index + 1}</span>
                    <span className={`st ${status}`}>{STAGE_LABELS[status]}</span>
                  </div>
                  <h3 className="mt-3 font-extrabold leading-tight">{stage.label}</h3>
                  {isLocked && <p className="tdesc muted mt-1 text-sm leading-snug">{stage.description}</p>}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Works Section */}
        <section id="works" className="mt-12" aria-labelledby="h-works">
          {/* Winner Podium (Visible only in 'win' release) */}
          {isWin && (
            <div id="podium" className="mb-16">
              <h2 className="font-extrabold text-3xl tracking-tight sm:text-4xl">Juara MIT-WEEK 2026</h2>
              <p className="muted mt-2">Diumumkan pada 25 November 2026.</p>
              <div id="pgrid" className="mt-8 grid items-start gap-7 md:grid-cols-3">
                {podiumWinners.map(({ item, rank, orderClass }) => (
                  <CardView
                    key={item.teamName}
                    item={item}
                    podiumRank={rank}
                    orderClass={orderClass}
                    onOpenModal={() => setActiveModalItem(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Finalists Section */}
          {showFinalists && (
            <div id="finals" className="mb-16">
              <h2 id="h-fin" className="font-extrabold text-3xl tracking-tight sm:text-4xl">
                {isWin ? "Finalis lainnya" : "Top 5 finalis"}
              </h2>
              <p id="fnote" className="muted mt-2">
                {fnoteText}
              </p>

              {/* Skeletons when locked */}
              {isLocked && (
                <div className="fin mt-8">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
                    <SkeletonCard key={`skel-fin-${idx}`} />
                  ))}
                </div>
              )}

              {/* When WIN: remaining finalists, centered and evenly sized */}
              {!isLocked && isWin && remainingFinalists.length > 0 && (
                <div className={`fin mt-8${remainingFinalists.length > 1 ? " n2" : ""}`}>
                  {remainingFinalists.map((item) => (
                    <CardView
                      key={item.teamName}
                      item={item}
                      isFinalistBadge
                      onOpenModal={() => setActiveModalItem(item)}
                    />
                  ))}
                </div>
              )}

              {/* When OPEN (18 Nov): 5 finalists in balanced grid */}
              {!isLocked && !isWin && finalists.length > 0 && (
                <div className="fin mt-8">
                  {finalists.map((item) => (
                    <CardView
                      key={item.teamName}
                      item={item}
                      isFinalistBadge
                      onOpenModal={() => setActiveModalItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Participant Works Header & Controls */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 id="h-works" className="font-extrabold text-3xl tracking-tight sm:text-4xl">
                {isLocked ? "Karya peserta" : "Karya lainnya"}
              </h2>
              <p id="note" className="muted mt-2 max-w-xl" aria-live="polite">
                {worksNoteText}
              </p>
            </div>

            <div id="tools" className="flex flex-wrap items-center gap-3">
              <fieldset className="flex gap-2 border-0 p-0 m-0" aria-label="Tampilan karya">
                <button type="button" className="btn" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                  Grid
                </button>
                <button type="button" className="btn" aria-pressed={view === "list"} onClick={() => setView("list")}>
                  List
                </button>
              </fieldset>
              {!isLocked && (
                <>
                  <label className="sr-only" htmlFor="q">
                    Cari nama tim atau judul karya
                  </label>
                  <input
                    id="q"
                    type="search"
                    placeholder="Cari nama tim atau judul..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="box w-full px-4 py-2.5 text-base md:w-64"
                  />
                </>
              )}
            </div>
          </div>

          {/* Locked State Grid Skeletons */}
          {isLocked && view === "grid" && (
            <div className="view-anim mt-8 grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
                <SkeletonCard key={`skel-all-${idx}`} />
              ))}
            </div>
          )}

          {/* Locked State List Skeletons */}
          {isLocked && view === "list" && (
            <div className="view-anim list">
              {Array.from({ length: 6 }).map((_, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
                <SkeletonRow key={`skel-row-${idx}`} />
              ))}
            </div>
          )}

          {/* Released State Grid View */}
          {!isLocked && view === "grid" && (
            <div className="view-anim mt-8 grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredRestCards.map((item) => (
                <CardView key={item.teamName} item={item} onOpenModal={() => setActiveModalItem(item)} />
              ))}
            </div>
          )}

          {/* Released State List View */}
          {!isLocked && view === "list" && (
            <div
              className="view-anim list"
              onPointerMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
              onPointerLeave={() => setHoveredItem(null)}
            >
              {filteredRestCards.map((item) => (
                <article key={`row-${item.teamName}`} className="row" onPointerEnter={() => setHoveredItem(item)}>
                  <div className="thumb">
                    <CardThumbnail item={item} />
                  </div>
                  <div className="min-w-0">
                    <p className="mono tm">Oleh {item.teamName}</p>
                    <h3>
                      <button type="button" className="tt" onClick={() => setActiveModalItem(item)}>
                        {item.title}
                      </button>
                    </h3>
                  </div>
                  <div className="act">
                    <ActionButtons item={item} />
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Empty search notice */}
          {!isLocked && filteredRestCards.length === 0 && (
            <p className="box mt-6 p-6 font-semibold">Tidak ada karya yang cocok. Coba nama tim atau judul lain.</p>
          )}
        </section>
      </main>

      {/* Floating Thumbnail Preview following mouse on List View (Desktop) */}
      {hoveredItem && view === "list" && (
        <div
          id="fp"
          className="box on"
          style={{
            transform: `translate(${
              mousePos.x + 28 + 270 > (typeof window !== "undefined" ? window.innerWidth : 1200)
                ? mousePos.x - 298
                : mousePos.x + 28
            }px, ${mousePos.y - 90}px) rotate(-3deg)`,
          }}
          aria-hidden="true"
        >
          <div className="thumb">
            <CardThumbnail item={hoveredItem} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-[1360px] px-4 pb-28 sm:px-6">
        <div className="border-t pt-6" style={{ borderColor: "color-mix(in srgb, var(--line) 22%, transparent)" }}>
          <p className="font-extrabold">MIT-WEEK 2026 · Web Development Competition</p>
          <p className="muted mt-1 text-sm">
            Galeri ini hanya memuat karya Web Development Competition; kompetisi MIT-WEEK 2026 lainnya tidak ditampilkan
            di sini. Karya tampil atas persetujuan tim, tanpa skor numerik.
          </p>
          <p className="mt-2 font-semibold text-sm">
            Untuk permintaan penghapusan karya atau pembaruan tautan, silakan hubungi panitia MIT-WEEK 2026.
          </p>
        </div>
      </footer>

      {/* Floating Theme Button (FAB) */}
      <button
        id="theme"
        ref={themeButtonRef}
        type="button"
        onClick={toggleTheme}
        onAnimationEnd={() => setThemeSpin(false)}
        className={`fab box${themeSpin ? " spin" : ""}`}
        aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      >
        {isDark ? (
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
      </button>

      {/* Detail Modal Dialog */}
      {activeModalItem && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="fixed inset-0 bg-black/65 backdrop-blur-xs cursor-default border-0"
            aria-label="Tutup modal"
            onClick={() => setActiveModalItem(null)}
          />
          <div className="box relative z-10 max-h-[90vh] w-full max-w-[640px] overflow-y-auto">
            <div className="thumb">
              <CardThumbnail item={activeModalItem} />
            </div>
            <div className="dbody p-5 sm:p-6">
              <p className="mono muted text-xs">Oleh {activeModalItem.teamName}</p>
              <h3 className="mt-1 font-extrabold text-2xl tracking-tight">{activeModalItem.title}</h3>
              <p className="mt-3 leading-relaxed text-sm sm:text-base">{activeModalItem.description}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <ActionButtons item={activeModalItem} isModal />
                <button type="button" className="btn ml-auto" onClick={() => setActiveModalItem(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents

function CardThumbnail({ item }: { item: KaryaItem }) {
  const [c1, c2] = getPalette(item.teamName);
  const initials = getInitials(item.teamName);

  if (item.imageUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: public storage image
      <img
        src={item.imageUrl}
        alt={`Pratinjau karya ${item.title}`}
        loading="lazy"
        className="size-full object-cover object-top"
      />
    );
  }

  return (
    <div className="fb size-full" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <span className="chip" aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}

function ActionButtons({ item, isModal = false }: { item: KaryaItem; isModal?: boolean }) {
  return (
    <>
      {item.liveDemoUrl ? (
        <a
          href={item.liveDemoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn pri"
          style={isModal ? { flex: "none" } : undefined}
        >
          Buka demo
        </a>
      ) : (
        <span className="btn pri off" style={isModal ? { flex: "none" } : undefined}>
          Buka demo
        </span>
      )}

      {item.githubUrl ? (
        <a
          href={item.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn ico"
          title="Kode GitHub"
          aria-label={`Kode GitHub ${item.title}`}
        >
          <GhIcon />
        </a>
      ) : (
        <span className="btn ico off" title="Kode GitHub tidak tersedia">
          <GhIcon />
        </span>
      )}

      {item.videoUrl ? (
        <a
          href={item.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn ico"
          title="Video demo"
          aria-label={`Video demo ${item.title}`}
        >
          <VidIcon />
        </a>
      ) : (
        <span className="btn ico off" title="Video tidak tersedia">
          <VidIcon />
        </span>
      )}
    </>
  );
}

function CardView({
  item,
  isFinalistBadge = false,
  podiumRank,
  orderClass,
  onOpenModal,
}: {
  item: KaryaItem;
  isFinalistBadge?: boolean;
  podiumRank?: number;
  orderClass?: string;
  onOpenModal: () => void;
}) {
  return (
    <article className={`card box ${orderClass ?? ""}`}>
      {isFinalistBadge && (
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <span className="mono muted text-xs">Finalis</span>
          <span className="pill mono" style={{ boxShadow: "none", padding: "2px 10px" }}>
            Top 5
          </span>
        </div>
      )}

      {podiumRank && (
        <div className="flex items-end justify-between px-5 pt-3 pb-2">
          <span className="mono muted text-xs">Juara {podiumRank}</span>
          <span className="rank" aria-hidden="true">
            0{podiumRank}
          </span>
        </div>
      )}

      <div className="thumb">
        <CardThumbnail item={item} />
      </div>

      <div className="cb">
        <p className="mono tm">Oleh {item.teamName}</p>
        <h3>
          <button type="button" className="tt" onClick={onOpenModal}>
            {item.title}
          </button>
        </h3>
        <p className="ds">{item.description}</p>
        <div className="act">
          <ActionButtons item={item} />
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <article className="card box sk">
      <div className="thumb hatch">
        <LockIcon />
      </div>
      <div className="cb">
        <i className="bar" style={{ width: "38%", height: "0.8rem" }} />
        <i className="bar" style={{ width: "80%", height: "1.3rem", marginTop: "8px" }} />
        <i className="bar" style={{ width: "100%", marginTop: "14px" }} />
        <i className="bar" style={{ width: "92%" }} />
        <i className="bar" style={{ width: "55%" }} />
        <div className="act">
          <span className="btn pri off">Buka demo</span>
          <span className="btn ico off">
            <GhIcon />
          </span>
          <span className="btn ico off">
            <VidIcon />
          </span>
        </div>
      </div>
    </article>
  );
}

function SkeletonRow() {
  return (
    <article className="row sk">
      <div className="thumb hatch">
        <LockIcon />
      </div>
      <div className="min-w-0">
        <i className="bar" style={{ width: "30%", height: "0.8rem" }} />
        <i className="bar" style={{ width: "70%", height: "1.4rem", marginTop: "8px" }} />
      </div>
      <div className="act">
        <span className="btn pri off">Buka demo</span>
        <span className="btn ico off">
          <GhIcon />
        </span>
        <span className="btn ico off">
          <VidIcon />
        </span>
      </div>
    </article>
  );
}

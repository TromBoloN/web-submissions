"use client";

import { useEffect, useState } from "react";

import { FolderGit2, Lock, Moon, ShieldCheck, Sun } from "lucide-react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { KARYA_DATES } from "./karya-constants";

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function CountUp({ target }: { target: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const [count, setCount] = useState(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion) {
      setCount(target);
      return;
    }

    const duration = 700;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      setCount(Math.round(progress * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, target]);

  return <>{count}</>;
}

export function KaryaThemeToggle() {
  const themeMode = usePreferencesStore((state) => state.values.theme_mode);
  const setPreference = usePreferencesStore((state) => state.setPreference);
  const [mounted, setMounted] = useState(false);
  const isDark = themeMode === "dark";

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <Button
      type="button"
      variant="outline"
      onClick={() => setPreference("theme_mode", isDark ? "light" : "dark")}
      aria-label={isDark ? "Gunakan mode terang" : "Gunakan mode gelap"}
      className="karya-theme-toggle fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 size-10 rounded-none border border-border/80 bg-background p-0 text-foreground shadow-lg hover:border-signal/60 hover:bg-muted"
    >
      {isDark ? <Sun className="size-4 text-signal" /> : <Moon className="size-4 text-foreground" />}
    </Button>,
    document.body,
  );
}

export function KaryaHero({ count }: { count: number }) {
  return (
    <>
      <header className="karya-hero relative flex min-h-[420px] flex-col justify-end overflow-hidden p-6 sm:min-h-[480px] sm:p-10 lg:p-14">
        <div className="karya-hero-scrim absolute inset-0" aria-hidden="true" />
        <div className="karya-hero-brackets pointer-events-none absolute inset-3 z-10" aria-hidden="true" />
        <div className="karya-hero-label karya-hero-label-top-left">SYS {"//"} ONLINE</div>
        <div className="karya-hero-label karya-hero-label-top-right">NODE 01 · 06°12′S</div>
        <div className="karya-hero-label karya-hero-label-bottom-right">X: 108.22 · Y: 01</div>
        <div className="karya-hero-ticks pointer-events-none absolute inset-0 z-10" aria-hidden="true" />

        {/* Unified Hero SVG: Shield + Concentric Lock Scanner + Connected Traces in one shared viewBox */}
        <svg
          aria-hidden="true"
          className="karya-circuit pointer-events-none absolute inset-0 size-full text-signal opacity-30 sm:opacity-100"
          viewBox="0 0 680 400"
          preserveAspectRatio="xMaxYMid meet"
        >
          {/* Concentric Scanner Rings centered on lock (510, 195) drawn behind shield & traces */}
          <g className="karya-lock-scanner-group">
            <circle className="karya-lock-ring" cx="510" cy="195" r="28" />
            <circle className="karya-lock-ring karya-lock-ring-2" cx="510" cy="195" r="28" />
            <circle className="karya-lock-ring karya-lock-ring-3" cx="510" cy="195" r="28" />
            <circle className="karya-scanner-arc" cx="510" cy="195" r="46" />
          </g>

          {/* Ghost Shield Aura */}
          <path
            className="karya-ghost-shield"
            d="M 510 65 L 595 105 V 195 C 595 270 550 310 510 330 C 470 310 425 270 425 195 V 105 Z"
          />

          {/* Trace 1 (Top bundle) connecting directly to Shield Port 1 at (430, 125) */}
          <path className="karya-trace-bundle" d="M 150 75 H 330 L 380 125 H 430" />
          <path className="karya-trace-pulse" d="M 150 75 H 330 L 380 125 H 430" />

          {/* Trace 2 (Upper-mid bundle) connecting directly to Shield Port 2 at (430, 170) */}
          <path className="karya-trace-bundle" d="M 190 120 H 350 L 400 170 H 430" />
          <path className="karya-trace-pulse" d="M 190 120 H 350 L 400 170 H 430" />

          {/* Trace 3 (Lower-mid bundle) connecting directly to Shield Port 3 at (435, 215) */}
          <path className="karya-trace-bundle karya-trace-lower" d="M 170 265 H 350 L 400 215 H 435" />
          <path className="karya-trace-pulse karya-trace-lower" d="M 170 265 H 350 L 400 215 H 435" />

          {/* Trace 4 (Bottom bundle) connecting directly to Shield Port 4 at (455, 260) */}
          <path className="karya-trace-bundle karya-trace-lower" d="M 130 310 H 370 L 420 260 H 455" />
          <path className="karya-trace-pulse karya-trace-lower" d="M 130 310 H 370 L 420 260 H 455" />

          {/* Right Output Traces from Ports on right shield edge */}
          <path className="karya-trace-bundle karya-trace-right" d="M 590 135 H 650" />
          <path className="karya-trace-pulse karya-trace-right" d="M 590 135 H 650" />
          <path className="karya-trace-bundle karya-trace-right" d="M 590 180 H 665" />
          <path className="karya-trace-pulse karya-trace-right" d="M 590 180 H 665" />
          <path className="karya-trace-bundle karya-trace-right" d="M 585 225 H 645" />
          <path className="karya-trace-pulse karya-trace-right" d="M 585 225 H 645" />

          {/* Via Dots at Origins and Ports */}
          <g className="karya-vias">
            <circle cx="150" cy="75" r="3.5" />
            <circle cx="190" cy="120" r="3.5" />
            <circle cx="170" cy="265" r="3.5" />
            <circle cx="130" cy="310" r="3.5" />

            {/* Port connection via dots on shield boundary */}
            <circle cx="430" cy="125" r="3.5" />
            <circle cx="430" cy="170" r="3.5" />
            <circle cx="435" cy="215" r="3.5" />
            <circle cx="455" cy="260" r="3.5" />

            {/* Right via dots */}
            <circle cx="590" cy="135" r="3.5" />
            <circle cx="650" cy="135" r="3.5" />
            <circle cx="590" cy="180" r="3.5" />
            <circle cx="665" cy="180" r="3.5" />
            <circle cx="585" cy="225" r="3.5" />
            <circle cx="645" cy="225" r="3.5" />
          </g>

          {/* Data Packets */}
          <g className="karya-packets">
            <circle className="karya-packet" cx="370" cy="170" r="3" />
            <circle className="karya-packet karya-packet-blocked" cx="390" cy="215" r="3" />
          </g>

          {/* Main Shield Structure (Visible immediately in server HTML) */}
          <g className="karya-shield">
            {/* Shield Outlines */}
            <path
              className="karya-shield-glow"
              d="M 510 75 L 590 110 V 195 C 590 265 548 302 510 320 C 472 302 430 265 430 195 V 110 Z"
            />
            <path
              className="karya-shield-outline"
              d="M 510 75 L 590 110 V 195 C 590 265 548 302 510 320 C 472 302 430 265 430 195 V 110 Z"
            />

            {/* Centered Padlock inside Shield at (510, 195) */}
            <path className="karya-lock" d="M 485 180 h 50 v 40 h -50 z M 495 180 v -16 a 15 15 0 0 1 30 0 v 16" />
            <circle className="karya-lock-core" cx="510" cy="198" r="4.5" />
          </g>
        </svg>

        {/* Hero Content with Type Effect (Server HTML rendered with aria-label) */}
        <section
          className="relative z-10 max-w-3xl"
          aria-label="Karya peserta. Guardians of the Digital Space. Sebuah koleksi karya yang dibagikan oleh tim peserta. Jelajahi ide, eksperimen, dan solusi digital mereka dalam satu ruang."
        >
          <div className="mb-4 flex items-center gap-2 font-mono text-signal text-xs uppercase tracking-[0.25em]">
            <span className="size-2 rounded-full bg-signal animate-pulse" />
            <span>&gt; MIT-WEEK 2026 {"//"} PAMERAN DIGITAL</span>
            <span className="karya-cursor" aria-hidden="true" />
          </div>

          {/* Fixed-height container prevents any layout shift during typing reveal */}
          <div className="relative min-h-[3.25rem] sm:min-h-[4.75rem] lg:min-h-[5.5rem]">
            <h1 className="karya-headline font-display font-bold text-4xl text-foreground tracking-tight sm:text-6xl lg:text-7xl leading-[1.05]">
              Karya peserta.
            </h1>
          </div>

          <div className="karya-type-sub relative mt-1 min-h-[1.75rem] sm:min-h-[2.25rem]">
            <p className="font-display text-xl font-medium text-foreground/90 sm:text-2xl lg:text-3xl tracking-tight dark:text-foreground/80">
              Guardians of the Digital Space
            </p>
          </div>

          <p className="karya-type-desc mt-4 max-w-2xl text-muted-foreground text-sm sm:text-base leading-relaxed">
            Sebuah koleksi karya yang dibagikan oleh tim peserta. Jelajahi ide, eksperimen, dan solusi digital mereka
            dalam satu ruang.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 border border-signal/40 bg-signal/10 px-3 py-1 font-mono text-signal text-xs uppercase tracking-wider">
              <span className="size-1.5 bg-signal" />
              AKSES TERBUKA
            </span>
          </div>
        </section>
      </header>

      {/* Unified HUD Stat Strip (16px gap, larger mono values, single clean icon per cell, high-contrast labels) */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Cell 1: KARYA */}
        <div className="karya-stat-cell relative p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <FolderGit2 className="size-4 text-signal" />
            <span className="font-mono text-xs font-semibold text-foreground/85 uppercase tracking-[0.2em] dark:text-muted-foreground">
              KARYA
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <CountUp target={count} />
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tracking-wider uppercase">DIPAMERKAN</p>
        </div>

        {/* Cell 2: TEMA */}
        <div className="karya-stat-cell relative p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-signal" />
            <span className="font-mono text-xs font-semibold text-foreground/85 uppercase tracking-[0.2em] dark:text-muted-foreground">
              TEMA
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-signal sm:text-3xl">GUARDIANS</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
            OF DIGITAL SPACE
          </p>
        </div>

        {/* Cell 3: STATUS */}
        <div className="karya-stat-cell relative p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-amber-500" />
            <span className="font-mono text-xs font-semibold text-foreground/85 uppercase tracking-[0.2em] dark:text-muted-foreground">
              STATUS
            </span>
          </div>
          <p className="mt-2 font-mono text-xl font-bold tracking-tight text-amber-500 sm:text-2xl">MENUNGGU RILIS</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
            {KARYA_DATES.galleryReleaseDate}
          </p>
        </div>
      </div>
    </>
  );
}

export function KaryaBackgroundCircuit() {
  return (
    <svg
      aria-hidden="true"
      className="karya-background-circuit pointer-events-none fixed inset-0 size-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
    >
      {/* 8 Sparse Outer-Edge Circuit Paths (Masked away from central column) */}
      {/* 1. Top-Left */}
      <path className="karya-bg-trace" d="M 0 90 H 140 L 190 140 H 260" />
      <path className="karya-bg-pulse-cyan" d="M 0 90 H 140 L 190 140 H 260" />

      {/* 2. Top-Right */}
      <path className="karya-bg-trace" d="M 1440 100 H 1300 L 1250 150 H 1180" />
      <path className="karya-bg-pulse-amber" d="M 1440 100 H 1300 L 1250 150 H 1180" />

      {/* 3. Mid-Left */}
      <path className="karya-bg-trace" d="M 0 470 H 120 L 160 510 H 230" />
      <path className="karya-bg-pulse-cyan" d="M 0 470 H 120 L 160 510 H 230" />

      {/* 4. Mid-Right */}
      <path className="karya-bg-trace" d="M 1440 520 H 1320 L 1280 480 H 1210" />
      <path className="karya-bg-pulse-amber" d="M 1440 520 H 1320 L 1280 480 H 1210" />

      {/* 5. Bottom-Left */}
      <path className="karya-bg-trace" d="M 30 900 V 800 L 70 750 H 190" />
      <path className="karya-bg-pulse-cyan" d="M 30 900 V 800 L 70 750 H 190" />

      {/* 6. Bottom-Right */}
      <path className="karya-bg-trace" d="M 1410 900 V 790 L 1370 740 H 1250" />
      <path className="karya-bg-pulse-amber" d="M 1410 900 V 790 L 1370 740 H 1250" />

      {/* 7. Far Top-Edge Corner */}
      <path className="karya-bg-trace" d="M 350 0 V 35 L 385 70 H 460" />
      <path className="karya-bg-pulse-cyan" d="M 350 0 V 35 L 385 70 H 460" />

      {/* 8. Far Bottom-Edge Corner */}
      <path className="karya-bg-trace" d="M 1090 900 V 855 L 1055 820 H 980" />
      <path className="karya-bg-pulse-amber" d="M 1090 900 V 855 L 1055 820 H 980" />

      {/* Outer Via Dots */}
      <g className="karya-bg-vias">
        <circle cx="260" cy="140" r="3.5" />
        <circle cx="1180" cy="150" r="3.5" />
        <circle cx="230" cy="510" r="3.5" />
        <circle cx="1210" cy="480" r="3.5" />
        <circle cx="190" cy="750" r="3.5" />
        <circle cx="1250" cy="740" r="3.5" />
        <circle cx="460" cy="70" r="3.5" />
        <circle cx="980" cy="820" r="3.5" />
      </g>
    </svg>
  );
}

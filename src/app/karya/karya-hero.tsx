"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import { GraduationCap, Layers, Shield, ShieldCheck, Users, Zap } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import mitWeekLogo from "@/styles/flag-icons/MIT-WEEK, WEB LOGO.png";

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

    const duration = 750;
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

/** Floating light/dark toggle for /karya; same component as the dashboard header. */
export function KaryaThemeToggle() {
  return <ThemeToggle floating />;
}

/**
 * 1.5s First-visit Shield Unlock Intro (SessionStorage Guarded)
 */
function FirstVisitUnlockIntro() {
  const [showIntro, setShowIntro] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const seen = sessionStorage.getItem("guardians-intro-seen");
    if (!seen) {
      setShowIntro(true);
      sessionStorage.setItem("guardians-intro-seen", "true");
      const timer = setTimeout(() => setShowIntro(false), 1400);
      return () => clearTimeout(timer);
    }
  }, [reducedMotion]);

  if (!showIntro) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1d1a5c] text-white animate-out fade-out duration-500 fill-mode-forwards select-none">
      <div className="flex size-24 items-center justify-center rounded-3xl border-4 border-white bg-[#00e676] text-[#1d1a5c] shadow-[6px_6px_0_#000000] animate-bounce">
        <ShieldCheck className="size-12 stroke-[2.5]" />
      </div>
      <p className="mt-5 font-mono text-xs font-black uppercase tracking-[0.25em] text-[#00e676]">
        MEMBUKA RUANG KARYA MIT-WEEK 2026...
      </p>
    </div>
  );
}

/**
 * Marquee Strip
 */
function CyberMarquee() {
  const marqueeItems = [
    "WEB DEVELOPMENT",
    "GUARDIANS OF DIGITAL SPACE",
    "MIT-WEEK 2026",
    "INOVASI MAHASISWA & PELAJAR",
    "SOLUSI DIGITAL TANGGUH",
  ];

  return (
    <div
      className="relative w-full overflow-hidden border-y-2 border-[#1d1a5c] bg-[#eef2ff] py-3.5 text-[#1d1a5c] select-none dark:bg-slate-900 dark:text-slate-200"
      aria-hidden="true"
    >
      <div className="guardian-marquee-track flex items-center gap-6 font-display font-black text-sm sm:text-base tracking-widest uppercase">
        {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: marquee stream
          <span key={idx} className="flex items-center gap-4 shrink-0">
            <span>{item}</span>
            <Zap className="size-4 fill-[#00e676] text-[#00e676]" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function KaryaHero({ count }: { count: number }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [mouseShift, setMouseShift] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMouseShift({ x: x * 8, y: y * 8 });
    };

    const onLeave = () => setMouseShift({ x: 0, y: 0 });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <FirstVisitUnlockIntro />

      {/* Main Hero Container */}
      <div
        ref={heroRef}
        className="guardian-hero-mesh guardian-hero-grain relative rounded-3xl border-2 border-[#1d1a5c] p-6 sm:p-10 lg:p-12 shadow-[6px_6px_0_#1d1a5c] overflow-hidden"
      >
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines, Pill, Date Info */}
          <div className="lg:col-span-8 space-y-6">
            {/* Real Competition Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#1d1a5c] bg-white px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#1d1a5c] shadow-[3px_3px_0_#1d1a5c]">
              <span className="size-2 rounded-full bg-[#00e676] animate-pulse" />
              <span>GALERI KARYA · MIT-WEEK 2026</span>
            </div>

            {/* Giant Outlined Headline with Cursor Shift */}
            <div
              style={{
                transform: `translate3d(${mouseShift.x}px, ${mouseShift.y}px, 0)`,
                transition: "transform 0.15s ease-out",
              }}
              className="space-y-1"
            >
              <h1 className="guardian-title-giant">GUARDIANS</h1>
              <p className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[var(--hero-fg)]">
                Kenalan sama para penjaga digital.
              </p>
            </div>

            {/* Welcome Description with High Contrast Semantic Tokens */}
            <p className="max-w-2xl font-medium text-sm sm:text-base leading-relaxed text-[var(--hero-fg-muted)]">
              Ruang pameran karya peserta Web Development Competition MIT-WEEK 2026. Jelajahi ide, eksperimen, dan
              solusi nyata dari teman-temanmu yang menjaga ruang digital kita tetap aman, inklusif, dan bersahabat.
            </p>

            {/* Static Date Badge (Informational Only) */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-[#1d1a5c] bg-[#1d1a5c] px-4 py-3 text-white shadow-[4px_4px_0_#5b3fd6]">
                <Shield className="size-5 text-[#00e676] shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#00e676]">
                    JADWAL PEMBUKAAN GALERI
                  </span>
                  <span className="font-display font-bold text-xs sm:text-sm text-white">
                    {KARYA_DATES.galleryPlannedText}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Official MIT-WEEK Logo */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center">
            <div className="relative p-5 rounded-3xl border-2 border-[#1d1a5c] bg-white/95 shadow-[5px_5px_0_#1d1a5c] dark:bg-slate-900/90">
              <Image
                src={mitWeekLogo}
                alt="Logo Resmi MIT-WEEK 2026"
                width={200}
                height={200}
                className="size-36 sm:size-44 object-contain"
                priority
              />
            </div>
            <div className="mt-4 rounded-xl border-2 border-[#1d1a5c] bg-white px-3.5 py-1.5 text-xs font-black text-[#1d1a5c] shadow-[3px_3px_0_#1d1a5c]">
              <span>MIT-WEEK 2026 · WEB DEVELOPMENT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee Under Hero */}
      <div className="mt-6">
        <CyberMarquee />
      </div>

      {/* Section 4.2: Fact Strip (Three Real Numbers / Gated) */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Karya */}
        <div className="guardian-card p-5 sm:p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              KARYA DARI PESERTA
            </span>
            <Layers className="size-4 text-[#3fa9d9]" />
          </div>
          <p className="mt-2 font-display font-black text-3xl sm:text-4xl text-[#1d1a5c] dark:text-[#8ba9ec]">
            {count > 0 ? <CountUp target={count} /> : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            {count > 0 ? "Karya terdaftar & bersedia ditampilkan" : "Menunggu pembukaan galeri"}
          </p>
        </div>

        {/* Total Tim */}
        <div className="guardian-card p-5 sm:p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              TIM PESERTA
            </span>
            <Users className="size-4 text-[#00e676]" />
          </div>
          <p className="mt-2 font-display font-black text-3xl sm:text-4xl text-[#1d1a5c] dark:text-[#8ba9ec]">
            {count > 0 ? <CountUp target={count} /> : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            {count > 0 ? "Inovator pengembang web" : "Menunggu pembukaan galeri"}
          </p>
        </div>

        {/* Institusi Asal */}
        <div className="guardian-card p-5 sm:p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              INSTITUSI ASAL
            </span>
            <GraduationCap className="size-4 text-[#5b3fd6]" />
          </div>
          <p className="mt-2 font-display font-black text-3xl sm:text-4xl text-[#1d1a5c] dark:text-[#8ba9ec]">
            {count > 0 ? <CountUp target={count} /> : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">Sekolah & kampus dari seluruh Indonesia</p>
        </div>
      </div>
    </>
  );
}

/**
 * Calm Surface Background
 */
export function GuardianBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-[#f7f9ff] dark:bg-[#0a0d17] transition-colors duration-300"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#1d1a5c_1px,transparent_1px)] opacity-[0.035] dark:opacity-[0.06] [background-size:20px_20px]" />
    </div>
  );
}

/**
 * Section 4.6: Footer
 */
export function GuardianFooter() {
  return (
    <footer className="mt-20 border-t-2 border-[#1d1a5c]/20 pt-8 pb-16 text-foreground text-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5 text-xs sm:text-sm">
          <p className="font-display font-black text-base text-foreground">
            MIT-WEEK 2026 · Web Development Competition
          </p>
          <p className="text-muted-foreground font-medium">
            Galeri menampilkan karya terpilih tanpa skor numerik demi merayakan kolaborasi seluruh tim peserta.
          </p>
          <p className="font-semibold text-foreground/90">
            Untuk permintaan penghapusan karya atau pembaruan tautan, silakan hubungi panitia MIT-WEEK 2026.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="rounded-full border-2 border-[#1d1a5c] bg-white px-3.5 py-1 font-mono text-xs font-black uppercase text-[#1d1a5c] shadow-[2px_2px_0_#1d1a5c] dark:bg-slate-900 dark:text-slate-200">
            Sampai jumpa di karya berikutnya
          </div>
        </div>
      </div>
    </footer>
  );
}

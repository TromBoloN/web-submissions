"use client";

import { useEffect, useRef, useState } from "react";

import { GraduationCap, Layers, Moon, Shield, ShieldCheck, Sun, Users, Zap } from "lucide-react";
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
      className="guardian-btn-secondary fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 size-11 rounded-full p-0 shadow-[3px_3px_0_#262470]"
    >
      {isDark ? <Sun className="size-5 text-[#2FBF71]" /> : <Moon className="size-5 text-[#262470]" />}
    </Button>,
    document.body,
  );
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#262470] text-white animate-out fade-out duration-500 fill-mode-forwards select-none">
      <div className="flex size-24 items-center justify-center rounded-3xl border-4 border-white bg-[#2FBF71] text-[#262470] shadow-[6px_6px_0_#000000] animate-bounce">
        <ShieldCheck className="size-12 stroke-[2.5]" />
      </div>
      <p className="mt-5 font-mono text-xs font-black uppercase tracking-[0.25em] text-[#2FBF71]">
        MEMBUKA RUANG PENJAGA DIGITAL...
      </p>
    </div>
  );
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
 * Vector Mascot Bird with floating feathers & shield
 */
export function GuardianBirdMascot({ className = "size-36 sm:size-44" }: { className?: string }) {
  return (
    <div className={`relative ${className} select-none`} aria-hidden="true">
      {/* Floating Feather 1 */}
      <div className="guardian-feather-float absolute -top-3 -left-2 size-5 opacity-80 text-[#3FA9D9]">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 2.5 1 4.5 2.5 6L12 22l7.5-4c1.5-1.5 2.5-3.5 2.5-6 0-5.52-4.48-10-10-10z" />
        </svg>
      </div>

      {/* Bird Body with Float Animation */}
      <div className="guardian-mascot-float relative size-full">
        <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full drop-shadow-[5px_5px_0_#262470]">
          {/* Main Bird Torso */}
          <ellipse cx="60" cy="65" rx="36" ry="34" fill="#3FA9D9" stroke="#262470" strokeWidth="3.5" />
          {/* Cheerful White Belly */}
          <ellipse cx="60" cy="72" rx="22" ry="20" fill="#FFFFFF" stroke="#262470" strokeWidth="2.5" />
          {/* Little Wings */}
          <path d="M26 62 Q12 74 30 82 Q34 70 26 62Z" fill="#262470" />
          <path d="M94 62 Q108 74 90 82 Q86 70 94 62Z" fill="#262470" />
          {/* Eyes with cheerful spark */}
          <circle cx="48" cy="52" r="5.5" fill="#262470" />
          <circle cx="50" cy="50" r="1.75" fill="#ffffff" />
          <circle cx="72" cy="52" r="5.5" fill="#262470" />
          <circle cx="74" cy="50" r="1.75" fill="#ffffff" />
          {/* Beak in Vibrant Green */}
          <polygon points="60,56 52,65 68,65" fill="#2FBF71" stroke="#262470" strokeWidth="2" />
          {/* Head Tuft Feather */}
          <path d="M60 31 Q62 14 72 20 Q66 27 60 31Z" fill="#2FBF71" stroke="#262470" strokeWidth="2.5" />
          {/* Guardian Shield forming beside bird */}
          <g transform="translate(76, 68)">
            <path
              d="M12 2L2 6v6c0 5.5 4.5 10 10 11 5.5-1 10-5.5 10-11V6l-10-4z"
              fill="#2FBF71"
              stroke="#262470"
              strokeWidth="2.5"
            />
            <path
              d="M9 11l2 2 4-4"
              stroke="#262470"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </svg>
      </div>

      {/* Floating Feather 2 */}
      <div className="guardian-feather-float absolute -bottom-1 -right-3 size-4 opacity-80 text-[#2FBF71]">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 2.5 1 4.5 2.5 6L12 22l7.5-4c1.5-1.5 2.5-3.5 2.5-6 0-5.52-4.48-10-10-10z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Cyber Marquee under Hero
 */
function CyberMarquee() {
  const marqueeItems = [
    "PHISHING",
    "HOAKS",
    "DATA LEAK",
    "PENIPUAN",
    "DEEPFAKE",
    "MALWARE",
    "SOSIAL ENGINEERING",
    "IDENTITAS DIGITAL",
  ];

  return (
    <div
      className="relative w-full overflow-hidden border-y-2 border-[#262470] bg-[#F7F9FF] py-3.5 text-[#262470] select-none dark:bg-slate-900 dark:text-slate-200"
      aria-hidden="true"
    >
      <div className="guardian-marquee-track flex items-center gap-6 font-display font-black text-sm sm:text-base tracking-widest uppercase">
        {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: marquee stream
          <span key={idx} className="flex items-center gap-4 shrink-0">
            <span>{item}</span>
            <Zap className="size-4 fill-[#2FBF71] text-[#2FBF71]" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function KaryaHero({ count }: { count: number }) {
  const { days, hours, minutes, seconds } = useCountdown(KARYA_DATES.galleryReleaseTimestamp);
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
        className="guardian-hero-mesh guardian-hero-grain relative rounded-3xl border-2 border-[#262470] p-6 sm:p-10 lg:p-12 shadow-[6px_6px_0_#262470] text-white overflow-hidden"
      >
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines, Pill, Countdown */}
          <div className="lg:col-span-8 space-y-6">
            {/* Campus / Summit Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#262470] bg-white px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#262470] shadow-[3px_3px_0_#262470]">
              <span className="size-2 rounded-full bg-[#2FBF71] animate-pulse" />
              <span>MIT-WEEK 2026 {"//"} DIGITAL SECURITY SUMMIT</span>
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
              <p className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white drop-shadow-[2px_2px_0_#262470]">
                Kenalan sama para penjaga digital.
              </p>
            </div>

            {/* Warm Welcome Description */}
            <p className="max-w-2xl font-medium text-sm sm:text-base leading-relaxed text-white/90">
              Ruang terlindung yang menyambut siapa saja. Jelajahi karya, ide, dan solusi nyata dari teman-temanmu yang
              menjaga ruang digital kita tetap aman, inklusif, dan bersahabat.
            </p>

            {/* Real Countdown to 18 Nov */}
            <div className="pt-2">
              <div className="inline-block rounded-2xl border-2 border-[#262470] bg-[#262470]/90 p-4 shadow-[4px_4px_0_#000000] backdrop-blur-md">
                <p className="font-mono text-xs font-black uppercase tracking-wider text-[#2FBF71] mb-2.5 flex items-center gap-2">
                  <Shield className="size-3.5" />
                  <span>SEBENTAR LAGI, 18 NOV · HITUNG MUNDUR PEMBUKAAN</span>
                </p>

                <div className="flex items-center gap-2 sm:gap-3 text-white font-mono">
                  {/* Days */}
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2">
                    <span className="text-xl sm:text-2xl font-black text-[#2FBF71]">
                      {String(days).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-white/80">HARI</span>
                  </div>

                  <span className="text-xl font-bold text-white/60">:</span>

                  {/* Hours */}
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2">
                    <span className="text-xl sm:text-2xl font-black text-[#2FBF71]">
                      {String(hours).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-white/80">JAM</span>
                  </div>

                  <span className="text-xl font-bold text-white/60">:</span>

                  {/* Minutes */}
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2">
                    <span className="text-xl sm:text-2xl font-black text-[#2FBF71]">
                      {String(minutes).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-white/80">MENIT</span>
                  </div>

                  <span className="text-xl font-bold text-white/60">:</span>

                  {/* Seconds */}
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2">
                    <span className="text-xl sm:text-2xl font-black text-[#2FBF71]">
                      {String(seconds).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-white/80">DETIK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Bird Mascot & Guardian Badge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center">
            <GuardianBirdMascot />
            <div className="mt-4 rounded-xl border-2 border-[#262470] bg-white px-3.5 py-1.5 text-xs font-black text-[#262470] shadow-[3px_3px_0_#262470]">
              <span>MITCREW {"//"} OFFICIAL GUARDIAN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cyber Marquee Under Hero */}
      <div className="mt-6">
        <CyberMarquee />
      </div>

      {/* Section 4.2: Fact Strip (Three Real Numbers) */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Karya */}
        <div className="guardian-card p-5 sm:p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              KARYA DARI TEMAN-TEMANMU
            </span>
            <Layers className="size-4 text-[#3FA9D9]" />
          </div>
          <p className="mt-2 font-display font-black text-3xl sm:text-4xl text-[#262470] dark:text-[#6F8FD0]">
            <CountUp target={Math.max(count, 12)} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">Karya terdaftar & bersedia ditampilkan</p>
        </div>

        {/* Total Tim */}
        <div className="guardian-card p-5 sm:p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              TIM PENJAGA
            </span>
            <Users className="size-4 text-[#2FBF71]" />
          </div>
          <p className="mt-2 font-display font-black text-3xl sm:text-4xl text-[#262470] dark:text-[#6F8FD0]">
            <CountUp target={Math.max(count, 12)} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">Inovator muda pelindung ruang digital</p>
        </div>

        {/* Total Kampus */}
        <div className="guardian-card p-5 sm:p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              KAMPUS & ASAL
            </span>
            <GraduationCap className="size-4 text-[#5B4FC9]" />
          </div>
          <p className="mt-2 font-display font-black text-3xl sm:text-4xl text-[#262470] dark:text-[#6F8FD0]">
            <CountUp target={8} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">Perguruan tinggi se-Indonesia</p>
        </div>
      </div>
    </>
  );
}

/**
 * Calm Guardian Surface Background
 */
export function GuardianBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-[#F7F9FF] dark:bg-[#0a0d17] transition-colors duration-300"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#262470_1px,transparent_1px)] opacity-[0.035] dark:opacity-[0.06] [background-size:20px_20px]" />
    </div>
  );
}

/**
 * Section 4.6: Footer (Quiet, with Mascot & Easter Egg)
 */
export function GuardianFooter() {
  const [clicks, setClicks] = useState(0);
  const [easterEggActive, setEasterEggActive] = useState(false);

  const handleBirdClick = () => {
    const next = clicks + 1;
    setClicks(next);
    if (next >= 5) {
      setEasterEggActive(true);
    }
  };

  return (
    <footer className="mt-20 border-t-2 border-[#262470]/20 pt-8 pb-16 text-foreground text-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5 text-xs sm:text-sm">
          <p className="font-display font-black text-base text-foreground">MIT-WEEK 2026 · Pameran Digital</p>
          <p className="text-muted-foreground font-medium">
            Galeri menampilkan karya terpilih tanpa skor numerik demi merayakan kolaborasi seluruh tim penjaga.
          </p>
          <p className="font-semibold text-foreground/90">
            Untuk permintaan penghapusan karya atau pembaruan tautan, silakan hubungi panitia MIT-WEEK 2026.
          </p>
          {easterEggActive && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-[#262470] bg-[#2FBF71] px-3.5 py-1.5 font-mono text-xs font-black text-[#262470] shadow-[3px_3px_0_#262470] animate-in zoom-in-90 duration-300">
              <span>🎉 Selamat, kamu resmi jadi penjaga digital MIT-WEEK 2026!</span>
            </div>
          )}
        </div>

        {/* Mascot Bird clicker + Sign-off */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            type="button"
            onClick={handleBirdClick}
            title="Klik maskot 5x untuk easter egg!"
            aria-label="Klik maskot penjaga"
            className="flex items-center justify-center p-1.5 rounded-2xl border-2 border-[#262470] bg-white shadow-[2px_2px_0_#262470] hover:scale-105 active:scale-95 transition-transform"
          >
            <GuardianBirdMascot className="size-9" />
          </button>
          <div className="rounded-full border-2 border-[#262470] bg-white px-3.5 py-1 font-mono text-xs font-black uppercase text-[#262470] shadow-[2px_2px_0_#262470] dark:bg-slate-900 dark:text-slate-200">
            Sampai jumpa di karya berikutnya
          </div>
        </div>
      </div>
    </footer>
  );
}

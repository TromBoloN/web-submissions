"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "cn";

import { MAIN_ID, type RankingRow } from "@/app/(main)/_components/ranking/ranking-shared";

import { type RankTier, TIER_ACCENT, TIER_STAMP } from "./ranking-tier";

/**
 * title → drum (suspense) → roll (slot machine, lands by itself) → land (impact, stamp, name) → open.
 * Whole thing ≈ 7.5s; "Lewati" / Esc jumps straight to "open".
 */
type Phase = "title" | "drum" | "roll" | "land" | "open";

const AT_DRUM = 1400;
const AT_ROLL = 3000;
const LAND_HOLD = 2100; // time on the landed result before the curtain opens
const OPEN_MS = 800;

const TIER_GLOW: Record<RankTier, string> = {
  gold: "var(--medal-gold)",
  silver: "var(--medal-silver)",
  bronze: "var(--medal-bronze)",
  finalist: "var(--safe)",
  top10: "var(--safe)",
  top25: "var(--safe)",
  base: "var(--safe)",
};

const BURST_COLORS: Record<RankTier, string[]> = {
  gold: ["var(--medal-gold)", "var(--safe)", "var(--guardian-accent)", "var(--medal-gold)"],
  silver: ["var(--medal-silver)", "var(--guardian-accent)", "var(--medal-silver)"],
  bronze: ["var(--medal-bronze)", "var(--medal-gold)"],
  finalist: ["var(--safe)", "var(--guardian-accent)"],
  top10: ["var(--safe)", "var(--guardian-accent)"],
  top25: ["var(--safe)"],
  base: ["var(--safe)"],
};

/**
 * Slot machine: random places flicker fast, then decelerate and land on the rank. Ticks get slower
 * (≈45ms → 320ms) over ~2s. Mounted only on the client, mid-intro, so Math.random is fine here.
 */
function SlotNumber({ rank, tier, onLanded }: { rank: number; tier: RankTier; onLanded: () => void }) {
  const [value, setValue] = useState(() => Math.max(1, Math.ceil(Math.random() * 10)));
  const [tick, setTick] = useState(0);
  const [blur, setBlur] = useState(3);
  const landedRef = useRef<boolean>(false);

  useEffect(() => {
    const max = Math.max(10, rank + 3);
    const timers: number[] = [];
    let elapsed = 0;
    let delay = 45;
    while (elapsed + delay < 1900) {
      elapsed += delay;
      const speed = delay;
      timers.push(
        window.setTimeout(() => {
          let next = Math.ceil(Math.random() * max);
          if (next === rank) next = (next % max) + 1; // don't spoil it early
          setValue(next);
          setTick((t) => t + 1);
          setBlur(Math.max(0, 3.5 - speed / 60));
        }, elapsed),
      );
      delay = Math.min(320, delay * 1.13);
    }
    timers.push(
      window.setTimeout(() => {
        setValue(rank);
        setTick((t) => t + 1);
        setBlur(0);
        if (!landedRef.current) {
          landedRef.current = true;
          onLanded();
        }
      }, elapsed + 380),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [rank, onLanded]);

  const accent = TIER_ACCENT[tier];
  const landed = value === rank && blur === 0;
  return (
    <p
      key={tick}
      className={cn(
        "font-display font-extrabold text-8xl text-white tabular-nums leading-none sm:text-9xl",
        landed ? cn("reveal-slam", accent && `rank-number--${accent}`) : "reveal-tick",
      )}
      style={{ filter: blur > 0 ? `blur(${blur.toFixed(1)}px)` : undefined }}
      aria-hidden="true"
    >
      #{value}
    </p>
  );
}

/** Shockwave rings + hex confetti exploding from the centre at the moment of landing. */
function ImpactBurst({ tier }: { tier: RankTier }) {
  const sparks = useMemo(() => {
    const colors = BURST_COLORS[tier];
    const count = tier === "gold" ? 40 : 26;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const distance = 160 + Math.random() * 260;
      return {
        key: i,
        style: {
          "--tx": `${(Math.cos(angle) * distance).toFixed(0)}px`,
          "--ty": `${(Math.sin(angle) * distance).toFixed(0)}px`,
          "--c": colors[i % colors.length],
          "--s": `${(8 + Math.random() * 10).toFixed(0)}px`,
          "--rot": `${Math.round(200 + Math.random() * 500)}deg`,
          "--delay": `${(Math.random() * 0.12).toFixed(2)}s`,
        } as CSSProperties,
      };
    });
  }, [tier]);

  const ring = { "--ring": TIER_GLOW[tier] } as CSSProperties;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="reveal-ring" style={ring} />
      <span className="reveal-ring" style={{ ...ring, "--delay": "0.14s" } as CSSProperties} />
      <span className="reveal-ring" style={{ ...ring, "--delay": "0.28s" } as CSSProperties} />
      {sparks.map((s) => (
        <span key={s.key} className="reveal-spark" style={s.style} />
      ))}
    </div>
  );
}

/**
 * Full-screen reveal for ceremony tiers (top 10), rendered on the server so the first painted frame is
 * the curtain and the rank never flashes underneath. Skippable; skipped under reduced motion. Without JS
 * it closes itself after 8s (CSS) or is hidden by <noscript>.
 */
export function RevealIntro({
  own,
  tier,
  eventName,
  onDone,
}: {
  own: RankingRow;
  tier: RankTier;
  eventName: string;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const finishedRef = useRef<boolean>(false);
  const openedRef = useRef<boolean>(false);
  const timersRef = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDone();
  }, [onDone]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const open = useCallback(() => {
    openedRef.current = true;
    clearTimers();
    setPhase("open");
    timersRef.current = [window.setTimeout(finish, OPEN_MS)];
  }, [clearTimers, finish]);

  const handleLanded = useCallback(() => {
    if (openedRef.current) return; // skipped while rolling: don't restart the landing
    setPhase("land");
    timersRef.current.push(window.setTimeout(open, LAND_HOLD));
  }, [open]);

  useEffect(() => {
    const root = rootRef.current;
    if (root) root.dataset.js = "1"; // Cancels the CSS no-JS auto-close.

    const main = document.getElementById(MAIN_ID);
    main?.setAttribute("inert", "");
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") open();
      // Focus trap: "Lewati" is the only focusable element while the curtain is up.
      if (event.key === "Tab") {
        event.preventDefault();
        skipRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
    } else {
      skipRef.current?.focus();
      timersRef.current = [
        window.setTimeout(() => setPhase("drum"), AT_DRUM),
        window.setTimeout(() => setPhase("roll"), AT_ROLL),
      ];
    }

    return () => {
      clearTimers();
      window.removeEventListener("keydown", onKey);
      main?.removeAttribute("inert");
      html.style.overflow = previousOverflow;
    };
  }, [finish, open, clearTimers]);

  const stamp = TIER_STAMP[tier];
  const accent = TIER_ACCENT[tier];
  const rolling = phase === "roll" || phase === "land" || phase === "open";
  const landed = phase === "land" || phase === "open";

  return (
    <div
      ref={rootRef}
      className="reveal-root"
      data-phase={phase === "land" ? "hold" : phase}
      role="dialog"
      aria-modal="true"
      aria-label="Pengumuman peringkat"
    >
      <noscript>
        <style>{".reveal-root{display:none!important}"}</style>
      </noscript>
      <div className="reveal-half reveal-half--top" aria-hidden="true" />
      <div className="reveal-half reveal-half--bottom" aria-hidden="true" />
      <span className="reveal-seam" aria-hidden="true" />
      <span className="reveal-glow" style={{ "--glow": TIER_GLOW[tier] } as CSSProperties} aria-hidden="true" />
      {landed && <ImpactBurst tier={tier} />}

      <div className={cn("reveal-content flex flex-col items-center gap-5 px-4 text-center", landed && "reveal-shake")}>
        <div className="space-y-2">
          <p className="reveal-type font-bold font-mono text-mint text-sm uppercase tracking-[0.3em] sm:text-base">
            Pengumuman peringkat
          </p>
          <p
            className="reveal-rise font-mono text-white/70 text-xs uppercase tracking-[0.25em]"
            style={{ "--delay": "0.8s" } as CSSProperties}
          >
            {eventName} · Web Development
          </p>
        </div>

        <div className="grid min-h-36 place-items-center sm:min-h-44">
          {phase === "drum" && (
            <div className="reveal-rise flex flex-col items-center gap-4">
              <span className="reveal-heartbeat grid size-20 place-items-center rounded-full border-4 border-mint/70">
                <span className="hex size-8 bg-mint" />
              </span>
              <p className="flex items-center gap-1 font-mono text-sm text-white/80 uppercase tracking-[0.2em]">
                Menghitung nilai akhir
                {[0, 0.15, 0.3].map((d) => (
                  <span key={d} className="reveal-dot inline-block" style={{ "--delay": `${d}s` } as CSSProperties}>
                    .
                  </span>
                ))}
              </p>
            </div>
          )}
          {rolling && <SlotNumber rank={own.rank} tier={tier} onLanded={handleLanded} />}
        </div>

        <div className="grid min-h-24 place-items-center gap-3">
          {landed && stamp && (
            <span
              className={cn("team-stamp text-xl sm:text-2xl", accent && `team-stamp--${accent}`)}
              style={{ animationDelay: "0.35s" }}
            >
              {stamp}
            </span>
          )}
          {landed && (
            <p
              className="reveal-rise max-w-md break-words font-display font-bold text-lg text-white sm:text-xl"
              style={{ "--delay": "0.9s" } as CSSProperties}
            >
              {own.team_name}
            </p>
          )}
        </div>

        <p className="sr-only" aria-live="polite">
          {landed ? `Tim Anda berada di peringkat ${own.rank}${stamp ? `, ${stamp}` : ""}.` : ""}
        </p>
        <button
          ref={skipRef}
          type="button"
          onClick={open}
          className="mt-2 rounded-full border-2 border-white/60 px-5 py-2 font-semibold text-sm text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
        >
          Lewati
        </button>
      </div>
    </div>
  );
}

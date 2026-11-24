"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import type { RankTier } from "./ranking-tier";

/** Deterministic PRNG so server and client render identical particles (no hydration mismatch). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PieceKind = "rank-confetti" | "rank-spark" | "rank-ember";

interface PieceSpec {
  kind: PieceKind;
  count: number;
  colors: string[];
  size: [number, number];
  duration: [number, number];
  drift: number;
}

const PIECES: Partial<Record<RankTier, PieceSpec>> = {
  gold: {
    kind: "rank-confetti",
    count: 24,
    colors: ["var(--medal-gold)", "var(--safe)", "var(--guardian-accent)", "var(--medal-gold)"],
    size: [7, 13],
    duration: [6, 10],
    drift: 60,
  },
  silver: {
    kind: "rank-spark",
    count: 12,
    colors: ["var(--medal-silver)", "var(--guardian-accent)"],
    size: [5, 10],
    duration: [5, 8],
    drift: 40,
  },
  bronze: {
    kind: "rank-ember",
    count: 12,
    colors: ["var(--medal-bronze)", "var(--medal-gold)"],
    size: [3, 6],
    duration: [4, 7],
    drift: 30,
  },
  finalist: {
    kind: "rank-spark",
    count: 8,
    colors: ["var(--safe)"],
    size: [4, 8],
    duration: [6, 9],
    drift: 30,
  },
};

const TIER_SEED: Record<RankTier, number> = {
  gold: 11,
  silver: 22,
  bronze: 33,
  finalist: 44,
  top10: 55,
  top25: 66,
  base: 77,
};

function usePieces(tier: RankTier) {
  return useMemo(() => {
    const spec = PIECES[tier];
    if (!spec) return [];
    const rand = seeded(TIER_SEED[tier]);
    const between = ([min, max]: [number, number]) => min + rand() * (max - min);
    return Array.from({ length: spec.count }, (_, i) => {
      const duration = between(spec.duration);
      return {
        key: i,
        className: `rank-piece ${spec.kind}`,
        style: {
          "--x": `${(rand() * 100).toFixed(2)}%`,
          "--s": `${between(spec.size).toFixed(1)}px`,
          "--c": spec.colors[i % spec.colors.length],
          "--dur": `${duration.toFixed(2)}s`,
          // Negative delays spread pieces across the cycle immediately instead of starting all at once.
          "--delay": `${(-rand() * duration).toFixed(2)}s`,
          "--drift": `${((rand() - 0.5) * 2 * spec.drift).toFixed(1)}px`,
          "--rot": `${Math.round(360 + rand() * 360)}deg`,
        } as CSSProperties,
      };
    });
  }, [tier]);
}

/** Finalist circuit traces (stroke colour from .rank-circuit). */
function CircuitTraces() {
  const paths = [
    "M0 30 H120 L150 60 H260",
    "M0 140 H60 L90 110 H210 L240 140 H320",
    "M400 20 V70 L430 100 H520",
    "M380 170 H460 L490 140 H600",
  ];
  return (
    <svg
      className="rank-circuit absolute inset-0 h-full w-full"
      viewBox="0 0 600 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={d} d={d} pathLength={1} style={{ "--delay": `${0.2 + i * 0.25}s` } as CSSProperties} />
      ))}
    </svg>
  );
}

/**
 * Decorative effect layer for the hero, per tier. Sits absolutely behind the content, ignores pointer
 * events, is hidden from assistive tech, and pauses its animations while scrolled out of view.
 * Reduced motion: particles are hidden and the remaining layers are static (globals.css).
 */
export function CelebrationLayer({ tier, active = true }: { tier: RankTier; active?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const pieces = usePieces(tier);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (tier === "base") return null;

  return (
    <div ref={ref} className="rank-layer" data-paused={!active || !visible} aria-hidden="true">
      {(tier === "top10" || tier === "top25") && <span className="rank-grain" />}
      {tier === "gold" && (
        <>
          <span className="rank-glow" style={{ "--glow": "var(--medal-gold)" } as CSSProperties} />
          <span className="rank-rays" />
        </>
      )}
      {tier === "silver" && (
        <>
          <span className="rank-glow" style={{ "--glow": "var(--medal-silver)" } as CSSProperties} />
          <span className="rank-sheen" />
        </>
      )}
      {tier === "bronze" && <span className="rank-glow" style={{ "--glow": "var(--medal-bronze)" } as CSSProperties} />}
      {tier === "finalist" && <CircuitTraces />}
      {tier === "top10" && (
        <span className="rank-glow" style={{ "--glow": "var(--safe)", "--glow-x": "14%" } as CSSProperties} />
      )}
      {active && pieces.map((p) => <span key={p.key} className={p.className} style={p.style} />)}
    </div>
  );
}

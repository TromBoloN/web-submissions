"use client";

import { useEffect, useState } from "react";

interface CountUpOptions {
  /** Start value (default 0). */
  from?: number;
  durationMs?: number;
  delayMs?: number;
  /** Start only when true (e.g. after the reveal intro). */
  enabled?: boolean;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Animates a number from `from` to `target` with requestAnimationFrame.
 * Renders the final value on the server and without JS; under reduced motion it never animates.
 * Callers hide the first frame with `.rank-fade-in` so the reset to `from` is not visible.
 */
export function useCountUp(
  target: number,
  { from = 0, durationMs = 1200, delayMs = 0, enabled = true }: CountUpOptions = {},
) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (!enabled || from === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start: number | null = null;
    setValue(from);

    const step = (now: number) => {
      if (start === null) start = now + delayMs;
      const elapsed = now - start;
      if (elapsed < 0) {
        frame = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(elapsed / durationMs, 1);
      setValue(from + (target - from) * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, from, durationMs, delayMs, enabled]);

  return value;
}

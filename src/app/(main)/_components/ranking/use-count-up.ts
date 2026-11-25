"use client";

import { useEffect, useState } from "react";

interface CountUpOptions {
  /** Start value (default 0). */
  from?: number;
  durationMs?: number;
  delayMs?: number;
  /** Start only when true (e.g. after the reveal intro). */
  enabled?: boolean;
  /**
   * First render shows `from` instead of `target`. Only for components that are never server-rendered
   * (e.g. mounted mid-animation), otherwise the no-JS view would show the start value.
   */
  startAtFrom?: boolean;
  /**
   * While not enabled, sit at `from` instead of `target` (set after mount only, so the server/no-JS view
   * still shows the final value). Used under the reveal curtain so the count starts cleanly when it opens.
   */
  holdAtFrom?: boolean;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Animates a number from `from` to `target` with requestAnimationFrame.
 * Renders the final value on the server and without JS; under reduced motion it never animates.
 * Callers hide the first frame with `.rank-fade-in` so the reset to `from` is not visible.
 */
export function useCountUp(
  target: number,
  {
    from = 0,
    durationMs = 1200,
    delayMs = 0,
    enabled = true,
    startAtFrom = false,
    holdAtFrom = false,
  }: CountUpOptions = {},
) {
  const [value, setValue] = useState(startAtFrom ? from : target);

  useEffect(() => {
    if (from === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    if (!enabled) {
      setValue(holdAtFrom ? from : target);
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
  }, [target, from, durationMs, delayMs, enabled, holdAtFrom]);

  return value;
}

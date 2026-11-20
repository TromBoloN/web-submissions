"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Dices, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { FinalistTeamItem } from "./finalis-client";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TICK_MS = 60;
const WARMUP_MS = 1500;
const TOTAL_MS = 9000;
const MAX_STEP_MS = 1400;

/** Unbiased random integer in [0, max) using the Web Crypto API. */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function scramble(length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  return s;
}

type Phase = "idle" | "running" | "done";

const BUTTON_LABEL: Record<Phase, string> = { idle: "Acak Urutan", running: "Mengacak...", done: "Acak Ulang" };

export function PresentationOrder({ finalists }: { finalists: FinalistTeamItem[] }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [order, setOrder] = useState<FinalistTeamItem[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [noise, setNoise] = useState<{ code: string; name: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = finalists.length;
  // Same scramble width for every row so the animation never hints at which team lands where.
  const codeLen = Math.max(3, ...finalists.map((t) => t.team_code.length));
  const nameLen = Math.min(28, Math.max(8, ...finalists.map((t) => t.team_name.length)));

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = () => {
    if (count < 2 || phase === "running") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const result = shuffle(finalists);
    setOrder(result);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setLockedCount(result.length);
      setPhase("done");
      return;
    }

    const step = Math.min(MAX_STEP_MS, (TOTAL_MS - WARMUP_MS) / result.length);
    const startedAt = performance.now();
    setLockedCount(0);
    setPhase("running");

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const locked = elapsed < WARMUP_MS ? 0 : Math.min(result.length, Math.floor((elapsed - WARMUP_MS) / step) + 1);
      setLockedCount(locked);
      setNoise(result.map(() => ({ code: scramble(codeLen), name: scramble(nameLen) })));
      if (locked >= result.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setPhase("done");
      }
    };

    tick();
    timerRef.current = setInterval(tick, TICK_MS);
  };

  const showRows = phase !== "idle";
  const placeholderRows = Array.from({ length: count }, (_, i) => i);

  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dices className="size-4 text-primary" />
            Urutan Presentasi Final
          </CardTitle>
          <CardDescription>
            Acak urutan tampil tim finalis secara adil. Hasil tidak disimpan; catat atau tangkap layar setelah diundi.
          </CardDescription>
        </div>
        <Button type="button" size="sm" className="gap-1.5" disabled={count < 2 || phase === "running"} onClick={start}>
          <Shuffle className={cn("size-4", phase === "running" && "animate-spin")} />
          {BUTTON_LABEL[phase]}
        </Button>
      </CardHeader>
      <CardContent>
        {count < 2 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
            Minimal 2 tim finalis diperlukan untuk mengacak urutan presentasi.
          </div>
        ) : (
          <ol className="space-y-2" aria-busy={phase === "running"}>
            {placeholderRows.map((i) => {
              const team = order[i];
              const isLocked = showRows && i < lockedCount && team;
              const rowNoise = noise[i];
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors duration-300",
                    isLocked ? "border-primary/40 bg-primary/5" : "bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full font-semibold text-sm tabular-nums transition-colors duration-300",
                      isLocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  {isLocked ? (
                    <div className="fade-in zoom-in-95 min-w-0 animate-in duration-300">
                      <p className="truncate font-medium text-sm">
                        <span className="mr-2 font-mono font-semibold text-xs">{team.team_code}</span>
                        {team.team_name}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">{team.institution}</p>
                    </div>
                  ) : (
                    <p className="min-w-0 truncate font-mono text-muted-foreground text-sm" aria-hidden="true">
                      {showRows && rowNoise ? (
                        <>
                          <span className="mr-2 text-xs">{rowNoise.code}</span>
                          {rowNoise.name}
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="sr-only" aria-live="polite">
          {phase === "done" ? `Urutan presentasi: ${order.map((t, i) => `${i + 1}. ${t.team_name}`).join(", ")}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

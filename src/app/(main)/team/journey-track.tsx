import { Fragment } from "react";

import { cn } from "cn";
import { Check } from "lucide-react";

import { TEAM_SCHEDULE, toWitaDateKey } from "./team-schedule";

type StepState = "past" | "current" | "future";

function formatTodayLabel(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

const STATE_LABEL: Record<StepState, string> = {
  past: "selesai",
  current: "sedang berlangsung",
  future: "akan datang",
};

function HexNode({ state, index, size = "md" }: { state: StepState; index: number; size?: "sm" | "md" }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center", size === "md" ? "size-12" : "size-9")}>
      {state === "current" && <span className="hex hex-pulse absolute inset-0 bg-mint" aria-hidden="true" />}
      {/* Outer hex is the ink "border", inner hex the fill. */}
      <span className="hex absolute inset-0 bg-ink" aria-hidden="true" />
      <span
        className={cn(
          "hex absolute inset-[3px] grid place-items-center font-bold font-mono",
          size === "md" ? "text-sm" : "text-xs",
          state === "past" && "bg-ink text-ink-foreground",
          state === "current" && "bg-mint text-ink dark:text-ink-foreground",
          state === "future" && "bg-card text-ink",
        )}
        aria-hidden="true"
      >
        {state === "past" ? <Check className="size-4" strokeWidth={3} /> : index + 1}
      </span>
    </span>
  );
}

function TodayChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-ink bg-card px-2 py-0.5 font-bold font-mono text-[10px] text-ink uppercase tracking-wider shadow-brutal-sm">
      <span className="size-1.5 rounded-full bg-guardian-accent" aria-hidden="true" />
      {label}
    </span>
  );
}

export function JourneyTrack({ serverNowIso }: { serverNowIso: string }) {
  const today = toWitaDateKey(serverNowIso);
  const todayLabel = `Hari ini · ${formatTodayLabel(serverNowIso)}`;

  const steps = TEAM_SCHEDULE.map((step) => {
    let state: StepState = "future";
    if (step.end < today) state = "past";
    else if (step.start <= today) state = "current";
    return { ...step, state };
  });

  const hasCurrent = steps.some((step) => step.state === "current");
  // Without an active step, today falls in a gap: after step `gapAfter`, before the next one.
  const lastPastIndex = steps.reduce((last, step, index) => (step.state === "past" ? index : last), -1);
  const gapAfter = !hasCurrent && lastPastIndex >= 0 && lastPastIndex < steps.length - 1 ? lastPastIndex : null;
  const todayOffTrack = !hasCurrent && gapAfter === null;

  return (
    <section aria-labelledby="journey-title" className="surface-loud p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 id="journey-title" className="font-display font-extrabold text-ink text-lg uppercase tracking-tight">
          Perjalanan Tim
        </h2>
        {todayOffTrack && <TodayChip label={todayLabel} />}
      </div>

      {/* Desktop: horizontal track */}
      <ol className="hidden grid-cols-5 md:grid" aria-label="Linimasa kompetisi">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const nextReached = !isLast && steps[index + 1].state !== "future";

          return (
            <li
              key={step.id}
              className="relative flex flex-col items-center px-2 text-center"
              aria-current={step.state === "current" ? "step" : undefined}
            >
              {!isLast && (
                <span
                  className={cn(
                    "absolute top-6 left-[calc(50%+1.75rem)] right-[calc(-50%+1.75rem)] border-ink border-t-2",
                    nextReached ? "border-solid" : "border-dashed opacity-60",
                  )}
                  aria-hidden="true"
                />
              )}
              {gapAfter === index && (
                <span className="absolute top-6 left-full z-10 -translate-x-1/2 -translate-y-1/2">
                  <TodayChip label={todayLabel} />
                </span>
              )}
              <HexNode state={step.state} index={index} />
              <span className="mt-3 font-mono text-[11px] text-muted-foreground tabular-nums">{step.dates}</span>
              <span
                className={cn(
                  "mt-0.5 font-semibold text-sm leading-tight",
                  step.state === "past" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.title}
              </span>
              <span className="sr-only">, {STATE_LABEL[step.state]}</span>
              {step.state === "current" && (
                <span className="mt-2">
                  <TodayChip label="Hari ini" />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical list */}
      <ol className="relative space-y-4 md:hidden" aria-label="Linimasa kompetisi">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const nextReached = !isLast && steps[index + 1].state !== "future";

          return (
            <Fragment key={step.id}>
              <li
                className="relative flex items-start gap-3"
                aria-current={step.state === "current" ? "step" : undefined}
              >
                {!isLast && (
                  <span
                    className={cn(
                      "absolute top-10 -bottom-4 left-[1.0625rem] border-ink border-l-2",
                      nextReached ? "border-solid" : "border-dashed opacity-60",
                    )}
                    aria-hidden="true"
                  />
                )}
                <HexNode state={step.state} index={index} size="sm" />
                <div className="min-w-0 pt-1">
                  <p className="font-mono text-[11px] text-muted-foreground tabular-nums">{step.dates}</p>
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      step.state === "past" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {step.title}
                    <span className="sr-only">, {STATE_LABEL[step.state]}</span>
                  </p>
                  {step.state !== "past" && <p className="mt-0.5 text-muted-foreground text-xs">{step.desc}</p>}
                  {step.state === "current" && (
                    <span className="mt-2 inline-block">
                      <TodayChip label="Hari ini" />
                    </span>
                  )}
                </div>
              </li>
              {gapAfter === index && (
                <li className="relative pl-12">
                  <TodayChip label={todayLabel} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </section>
  );
}

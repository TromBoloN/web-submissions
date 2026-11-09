"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ArrowUpRight, Code2, ExternalLink, Play } from "lucide-react";

export type ShowcaseCardData = {
  teamName: string;
  title: string;
  description: string;
  imageUrl: string | null;
  githubUrl: string;
  liveDemoUrl: string;
  videoUrl: string;
  winnerRank?: number;
  winnerScore?: number;
};

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function getPlaceholderClass(value: string): string {
  const hash = Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
  return [
    "from-signal/30 via-card to-brand-green/20",
    "from-brand-purple/30 via-card to-signal/20",
    "from-brand-green/30 via-card to-brand-purple/20",
  ][hash % 3];
}

function getDomainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Tautan";
  }
}

function ScoreCountUp({ target, active }: { target: number; active: boolean }) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!active) return;
    const duration = 700;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      setScore(progress * target);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return <>{score.toFixed(2)}</>;
}

function ActionLink({
  href,
  label,
  icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
        primary
          ? "bg-signal text-primary-foreground hover:bg-signal/85"
          : "border border-border bg-card/60 text-card-foreground hover:border-signal/50 hover:bg-accent"
      }`}
    >
      {icon}
      <span>{label}</span>
      <ArrowUpRight className="size-3 opacity-60" />
    </a>
  );
}

export function ShowcaseCard({
  data,
  variant = "default",
}: {
  data: ShowcaseCardData;
  variant?: "default" | "winner";
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const placeholderClass = useMemo(() => getPlaceholderClass(data.teamName), [data.teamName]);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={cardRef}
      style={
        variant === "winner" ? { transitionDelay: `${Math.max(0, 3 - (data.winnerRank ?? 3)) * 180}ms` } : undefined
      }
      className={`karya-card group flex h-full flex-col overflow-hidden border border-border bg-card shadow-2xl shadow-black/10 transition-[border-color,background-color,transform,opacity] duration-700 ease-out motion-reduce:transition-none ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } hover:-translate-y-1 hover:border-signal/60 hover:bg-accent`}
    >
      <div
        className={`relative isolate overflow-hidden bg-muted ${variant === "winner" ? "aspect-[16/9]" : "aspect-[16/10]"}`}
      >
        {data.imageUrl ? (
          // biome-ignore lint/performance/noImgElement: public storage images are not configured as Next image domains
          <img
            src={data.imageUrl}
            alt={`Pratinjau karya ${data.teamName}`}
            loading="lazy"
            width={1600}
            height={1000}
            className="block size-full object-cover"
          />
        ) : (
          <div className={`flex size-full items-center justify-center bg-gradient-to-br ${placeholderClass}`}>
            <span className="font-display font-semibold text-6xl text-foreground/85 tracking-tight">
              {getInitials(data.teamName)}
            </span>
            <span className="sr-only">Tidak ada gambar pratinjau</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        {variant === "winner" && data.winnerRank && (
          <div className="flex items-center justify-between border-cyan-300/30 border-b pb-3">
            <p className="font-display font-semibold text-signal text-sm uppercase tracking-[0.18em]">
              Peringkat {data.winnerRank}
            </p>
            <p className="font-display font-semibold text-foreground">
              {data.winnerScore === undefined ? "-" : <ScoreCountUp target={data.winnerScore} active={isVisible} />}
            </p>
          </div>
        )}
        <div>
          <p className="mb-1 text-signal/80 text-xs uppercase tracking-[0.18em]">{data.teamName}</p>
          <h2 className="font-display font-semibold text-xl text-foreground tracking-tight">
            {data.title || data.teamName}
          </h2>
        </div>
        <p className="line-clamp-3 min-h-[4.5rem] text-muted-foreground text-sm leading-6">
          {data.description || "\u00a0"}
        </p>
        <div className="mt-auto grid gap-2">
          <ActionLink
            href={data.liveDemoUrl}
            label={data.liveDemoUrl ? `Buka Demo · ${getDomainLabel(data.liveDemoUrl)}` : "Buka Demo"}
            icon={<Play className="size-3.5 fill-current" />}
            primary
          />
          <div className="grid grid-cols-2 gap-2">
            <ActionLink href={data.githubUrl} label="GitHub" icon={<Code2 className="size-3.5" />} />
            <ActionLink href={data.videoUrl} label="Video" icon={<ExternalLink className="size-3.5" />} />
          </div>
        </div>
      </div>
    </article>
  );
}

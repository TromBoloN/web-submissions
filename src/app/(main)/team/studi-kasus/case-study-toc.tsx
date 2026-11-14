"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";

export type TocItem = { id: string; level: number; title: string };

/** Offset (px) under which a heading counts as "being read". */
const ACTIVE_OFFSET = 120;

/**
 * Table of contents with reading progress for the element with `articleId`.
 * Listens to scroll in the capture phase so it works whether the window or an inner panel scrolls.
 */
export function CaseStudyToc({ items, articleId }: { items: TocItem[]; articleId: string }) {
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const article = document.getElementById(articleId);
      if (!article) return;

      const rect = article.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      // Article shorter than the viewport: done once its top has scrolled past.
      let next = rect.top <= 0 ? 1 : 0;
      if (scrollable > 0) next = Math.min(Math.max(-rect.top / scrollable, 0), 1);
      setProgress(next);

      let current: string | null = null;
      for (const item of items) {
        const heading = document.getElementById(item.id);
        if (heading && heading.getBoundingClientRect().top <= ACTIVE_OFFSET) current = item.id;
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [articleId, items]);

  const percent = Math.round(progress * 100);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>Progres membaca</span>
          <span className="font-mono tabular-nums">{percent}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progres membaca studi kasus"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full origin-left rounded-full bg-primary transition-transform duration-150 motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </div>

      <nav aria-label="Daftar isi studi kasus">
        <ul className="space-y-1 border-border border-l text-sm">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1 pr-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    item.level === 3 ? "pl-6" : "pl-3",
                    isActive
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-primary",
                  )}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

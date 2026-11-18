"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { ActionButtons, CardThumbnail, DemoOkMark, type KaryaItem } from "./karya-card";

const ROTATE_MS = 6000;

/**
 * "Sorotan": a small carousel of projects picked at random on every visit (page.tsx), never by score.
 * Auto-rotates unless the visitor hovers, focuses inside, has the tab hidden, or prefers reduced motion.
 */
export function SpotlightCarousel({ items, onOpen }: { items: KaryaItem[]; onOpen: (item: KaryaItem) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const touchX = useRef<number | null>(null);
  const count = items.length;

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || count < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, count]);

  if (count === 0) return null;
  const item = items[Math.min(index, count - 1)];
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <section
      id="spot"
      className="mt-8"
      aria-roledescription="carousel"
      aria-label="Sorotan"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-2xl tracking-tight sm:text-3xl">Sorotan</h2>
          <p className="muted mt-1 text-sm">Pilihan acak yang berganti setiap kunjungan, bukan berdasarkan nilai.</p>
        </div>
        {count > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" className="btn ico" aria-label="Sorotan sebelumnya" onClick={() => go(-1)}>
              <ChevronLeft aria-hidden="true" />
            </button>
            <button type="button" className="btn ico" aria-label="Sorotan berikutnya" onClick={() => go(1)}>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div
        className="spot box"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start === null || end === undefined || Math.abs(end - start) < 50) return;
          go(end < start ? 1 : -1);
        }}
      >
        <article
          key={item.teamName}
          className="spot-slide"
          aria-roledescription="slide"
          aria-label={`${index + 1} dari ${count}: ${item.title}`}
        >
          <button
            type="button"
            className="thumb spot-thumb"
            onClick={() => onOpen(item)}
            aria-label={`Buka detail ${item.title}`}
          >
            <CardThumbnail item={item} />
          </button>
          <div className="spot-body">
            <p className="mono muted flex flex-wrap items-center gap-2 text-xs">
              Sorotan {index + 1}/{count} · Oleh {item.teamName}
              {item.demoOk && <DemoOkMark />}
            </p>
            <h3 className="spot-title">
              <button type="button" className="tt" onClick={() => onOpen(item)}>
                {item.title}
              </button>
            </h3>
            <p className="spot-desc">{item.description}</p>
            <div className="act">
              <ActionButtons item={item} />
            </div>
            <button type="button" className="btn mt-1 w-full sm:w-auto" onClick={() => onOpen(item)}>
              Lihat detail
            </button>
          </div>
        </article>
      </div>

      {count > 1 && (
        <div className="spot-dots" role="tablist" aria-label="Pilih sorotan">
          {items.map((dot, i) => (
            <button
              key={dot.teamName}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Sorotan ${i + 1}: ${dot.title}`}
              className={i === index ? "on" : ""}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

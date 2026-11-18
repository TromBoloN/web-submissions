"use client";

import { useEffect, useRef, useState } from "react";

import { Bookmark, BookmarkCheck, Eye } from "lucide-react";

// Public gallery card, shared by /karya and the editor previews (team "Atur Tampilan", admin finalist cards).
// Styles live under .karya-page in globals.css; KaryaCardPreview provides that wrapper outside /karya.

/** Shown when a team left the description empty (same text on /karya and in previews). */
export const KARYA_DESCRIPTION_FALLBACK = "Solusi inovatif ruang digital.";

export type KaryaItem = {
  teamName: string;
  title: string;
  description: string;
  imageUrl: string | null;
  githubUrl: string;
  liveDemoUrl: string;
  videoUrl: string;
  /** Last admin link check found the demo reachable (only when the link is shown). */
  demoOk?: boolean;
  isFinalist?: boolean;
  winnerRank?: number;
  winnerScore?: number;
};

const PALETTES = [
  ["#5b3fd0", "#4aa3e8"],
  ["#2f4fd0", "#3fc8a0"],
  ["#1f8a70", "#2f4fd0"],
  ["#2b2f8f", "#22d395"],
  ["#3a7bd5", "#3fc8a0"],
  ["#6a4df0", "#3fc8a0"],
  ["#2f4fd0", "#4aa3e8"],
  ["#2b2f8f", "#6f86ee"],
  ["#8a3fd0", "#e8734a"],
  ["#1f8a70", "#4aa3e8"],
];

export function getPalette(name: string): [string, string] {
  const hash = Array.from(name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const pair = PALETTES[hash % PALETTES.length];
  return [pair[0], pair[1]];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}

// Icons
export const GhIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-4"
  >
    <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
  </svg>
);

export const VidIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export function CardThumbnail({ item }: { item: KaryaItem }) {
  const [c1, c2] = getPalette(item.teamName);
  const initials = getInitials(item.teamName);
  // A missing or broken image falls back to the gradient placeholder instead of a broken icon.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // onError can fire before hydration (server-rendered <img>), so also check once after mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0 && item.imageUrl) setFailedUrl(item.imageUrl);
  }, [item.imageUrl]);

  if (item.imageUrl && failedUrl !== item.imageUrl) {
    const onError = () => setFailedUrl(item.imageUrl);
    // The whole image is always visible (contain). Images that are not 16:10 sit on a blurred,
    // zoomed copy of themselves instead of being cropped. Same URL, so it downloads once.
    return (
      <>
        {/* biome-ignore lint/performance/noImgElement: public storage image */}
        <img src={item.imageUrl} alt="" aria-hidden="true" loading="lazy" className="thumb-bg" />
        {/* biome-ignore lint/performance/noImgElement: public storage image */}
        <img
          ref={imgRef}
          src={item.imageUrl}
          alt={`Pratinjau karya ${item.title}`}
          loading="lazy"
          className="thumb-fg"
          onError={onError}
        />
      </>
    );
  }

  return (
    <div className="fb size-full" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <span className="chip" aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}

export function ActionButtons({ item, isModal = false }: { item: KaryaItem; isModal?: boolean }) {
  return (
    <>
      {item.liveDemoUrl ? (
        <a
          href={item.liveDemoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn pri"
          style={isModal ? { flex: "none" } : undefined}
        >
          Buka demo
        </a>
      ) : (
        <span className="btn pri off" style={isModal ? { flex: "none" } : undefined}>
          Buka demo
        </span>
      )}

      {item.githubUrl ? (
        <a
          href={item.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn ico"
          title="Kode GitHub"
          aria-label={`Kode GitHub ${item.title}`}
        >
          <GhIcon />
        </a>
      ) : (
        <span className="btn ico off" title="Kode GitHub tidak tersedia">
          <GhIcon />
        </span>
      )}

      {item.videoUrl ? (
        <a
          href={item.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn ico"
          title="Video demo"
          aria-label={`Video demo ${item.title}`}
        >
          <VidIcon />
        </a>
      ) : (
        <span className="btn ico off" title="Video tidak tersedia">
          <VidIcon />
        </span>
      )}
    </>
  );
}

/** "Simpan" toggle (visitor's own shortlist, stored in their browser). */
export function SaveButton({
  item,
  saved,
  onToggle,
  className = "",
}: {
  item: KaryaItem;
  saved: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const label = saved ? `Hapus ${item.title} dari Favoritku` : `Simpan ${item.title} ke Favoritku`;
  return (
    <button
      type="button"
      className={`savebtn ${saved ? "on" : ""} ${className}`}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Tersimpan di Favoritku" : "Simpan ke Favoritku"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {saved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
    </button>
  );
}

/** "Demo aktif": the last committee link check reached this demo. */
export function DemoOkMark() {
  return (
    <span className="demook mono" title="Tautan demo berhasil diakses saat pemeriksaan terakhir panitia">
      <i aria-hidden="true" />
      Demo aktif
    </span>
  );
}

/** Small "Dilihat" mark for projects this visitor already opened. */
export function SeenMark() {
  return (
    <span className="seenmark mono">
      <Eye aria-hidden="true" />
      Dilihat
    </span>
  );
}

export function CardView({
  item,
  isFinalistBadge = false,
  podiumRank,
  orderClass,
  onOpenModal,
  saved,
  seen = false,
  onToggleSave,
}: {
  item: KaryaItem;
  isFinalistBadge?: boolean;
  podiumRank?: number;
  orderClass?: string;
  onOpenModal: () => void;
  /** Visitor features; omitted in editor previews. */
  saved?: boolean;
  seen?: boolean;
  onToggleSave?: () => void;
}) {
  return (
    <article className={`card box ${orderClass ?? ""}`}>
      {isFinalistBadge && (
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <span className="mono muted text-xs">Finalis</span>
          <span className="pill mono" style={{ boxShadow: "none", padding: "2px 10px" }}>
            Top 5
          </span>
        </div>
      )}

      {podiumRank && (
        <div className="flex items-end justify-between px-5 pt-3 pb-2">
          <span className="mono muted text-xs">Juara {podiumRank}</span>
          <span className="rank" aria-hidden="true">
            0{podiumRank}
          </span>
        </div>
      )}

      <div className="thumb">
        <CardThumbnail item={item} />
        {seen && <SeenMark />}
        {onToggleSave && <SaveButton item={item} saved={Boolean(saved)} onToggle={onToggleSave} />}
      </div>

      <div className="cb">
        <p className="mono tm">
          Oleh {item.teamName}
          {item.demoOk && <DemoOkMark />}
        </p>
        <h3>
          <button type="button" className="tt" onClick={onOpenModal}>
            {item.title}
          </button>
        </h3>
        <p className="ds">{item.description}</p>
        <div className="act">
          <ActionButtons item={item} />
        </div>
      </div>
    </article>
  );
}

/** One gallery card exactly as /karya renders it, for previews inside the app. */
export function KaryaCardPreview({ item }: { item: KaryaItem }) {
  return (
    <div className="karya-page karya-preview">
      <CardView
        item={{
          ...item,
          title: item.title.trim() || item.teamName,
          description: item.description.trim() || KARYA_DESCRIPTION_FALLBACK,
        }}
        isFinalistBadge={item.isFinalist}
        onOpenModal={() => undefined}
      />
    </div>
  );
}

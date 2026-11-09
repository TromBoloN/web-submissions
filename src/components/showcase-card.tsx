"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowUpRight,
  Code2,
  ExternalLink,
  GraduationCap,
  Info,
  Play,
  Quote,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export type GuardianMember = {
  name: string;
  role?: string;
  avatarUrl?: string;
};

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
  protects?: string;
  threat?: string;
  campus?: string;
  teamMembers?: GuardianMember[];
  quote?: string;
  committeeNote?: string;
  story?: {
    problem: string;
    howItWorks: string[];
    whyWeMadeThis: string;
  };
  category?: string;
  isFeatured?: boolean;
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

const PLACEHOLDER_PALETTES = [
  "from-[#262470] via-[#3a4188] to-[#6F8FD0]",
  "from-[#1b3a57] via-[#2FBF71]/80 to-[#3FA9D9]",
  "from-[#382670] via-[#5B4FC9] to-[#8c7ee8]",
  "from-[#262470] via-[#3FA9D9] to-[#2FBF71]",
];

function getPlaceholderGradient(value: string): string {
  const hash = Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
  return PLACEHOLDER_PALETTES[hash % PLACEHOLDER_PALETTES.length];
}

function AvatarStack({ members }: { members?: GuardianMember[] }) {
  if (!members || members.length === 0) return null;

  const visibleMembers = members.slice(0, 3);
  const remaining = members.length - visibleMembers.length;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden" title="Anggota Tim">
      {visibleMembers.map((member, idx) => (
        <div
          key={member.name}
          title={`${member.name}${member.role ? ` (${member.role})` : ""}`}
          className={`flex size-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white shadow-sm dark:border-slate-900 ${
            ["bg-[#262470]", "bg-[#2FBF71]", "bg-[#3FA9D9]", "bg-[#5B4FC9]"][idx % 4]
          }`}
        >
          {getInitials(member.name)}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-700 shadow-sm dark:border-slate-900 dark:bg-slate-700 dark:text-slate-200">
          +{remaining}
        </div>
      )}
    </div>
  );
}

function ActionButton({
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
      className={
        primary
          ? "guardian-btn-primary px-3.5 py-1.5 text-xs gap-1.5 flex-1"
          : "guardian-btn-secondary px-3 py-1.5 text-xs gap-1 flex-1"
      }
    >
      {icon}
      <span className="truncate">{label}</span>
      <ArrowUpRight className="size-3 opacity-70 shrink-0" aria-hidden="true" />
    </a>
  );
}

export function ShowcaseCard({
  data,
  variant = "default",
  onOpenDetail,
}: {
  data: ShowcaseCardData;
  variant?: "default" | "winner";
  onOpenDetail?: (card: ShowcaseCardData) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const placeholderGradient = useMemo(() => getPlaceholderGradient(data.teamName), [data.teamName]);

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
      className={`guardian-card group flex h-full flex-col overflow-hidden transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {/* 1. Cover image or team sticker illustration */}
      <button
        type="button"
        onClick={() => onOpenDetail?.(data)}
        aria-label={`Buka detail karya ${data.title || data.teamName}`}
        className="relative isolate w-full overflow-hidden bg-muted cursor-pointer aspect-[16/10] text-left p-0 border-none"
      >
        {data.imageUrl ? (
          // biome-ignore lint/performance/noImgElement: public storage images
          <img
            src={data.imageUrl}
            alt={`Pratinjau karya ${data.teamName}`}
            loading="lazy"
            width={1200}
            height={750}
            className="block size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex size-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br ${placeholderGradient} transition-transform duration-500 group-hover:scale-105`}
          >
            <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-white/80 bg-white/20 text-white shadow-[3px_3px_0_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <span className="font-display font-black text-2xl tracking-tight">{getInitials(data.teamName)}</span>
            </div>
            <p className="mt-2.5 font-bold text-xs uppercase tracking-wider text-white/95">{data.teamName}</p>
          </div>
        )}

        {/* Floating Category Tag */}
        {data.category && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#262470] bg-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#262470] shadow-[2px_2px_0_#262470]">
              <Sparkles className="size-2.5 text-[#2FBF71]" aria-hidden="true" />
              {data.category}
            </span>
          </div>
        )}

        {/* Winner Rank Badge (If winner) */}
        {variant === "winner" && data.winnerRank && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#262470] bg-[#2FBF71] px-3 py-1 font-mono text-xs font-black uppercase text-[#262470] shadow-[3px_3px_0_#262470]">
              RANK 0{data.winnerRank}
            </span>
          </div>
        )}
      </button>

      {/* Content Container */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Committee Note for Winners (Replacing numeric score) */}
        {variant === "winner" && data.committeeNote && (
          <div className="mb-4 rounded-xl border-2 border-[#262470] bg-[#F7F9FF] p-3 text-xs leading-relaxed text-[#262470] shadow-[2px_2px_0_#262470] dark:bg-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#262470] dark:text-[#3FA9D9] mb-1">
              <Quote className="size-3 fill-current" aria-hidden="true" />
              <span>Catatan Dewan Juri</span>
            </div>
            <p className="italic font-medium">"{data.committeeNote}"</p>
          </div>
        )}

        {/* 3 & 4. Title, Team name & Campus, Avatar stack */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#262470] dark:text-[#6F8FD0]">
              <GraduationCap className="size-3.5 text-[#3FA9D9]" aria-hidden="true" />
              <span className="truncate max-w-[200px]">{data.campus ?? "Finalis MIT-WEEK 2026"}</span>
            </div>
            <AvatarStack members={data.teamMembers} />
          </div>

          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">
            <button
              type="button"
              onClick={() => onOpenDetail?.(data)}
              className="text-left hover:text-[#262470] dark:hover:text-[#6F8FD0] transition-colors"
            >
              {data.title || data.teamName}
            </button>
          </h2>

          <p className="font-mono text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Oleh: {data.teamName}
          </p>
        </div>

        {/* Description */}
        <p className="my-3.5 line-clamp-3 min-h-[4.25rem] text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {data.description || "Solusi inovatif untuk menciptakan ruang digital yang aman dan terlindung."}
        </p>

        {/* 8. One-line team quote */}
        {data.quote && (
          <div className="mt-3 pt-2.5 border-t border-[#262470]/10 flex items-start gap-1.5 text-[11px] italic text-[#262470]/80 dark:text-slate-300">
            <Quote className="size-2.5 shrink-0 fill-current opacity-60 mt-0.5" aria-hidden="true" />
            <p className="line-clamp-1">"{data.quote}"</p>
          </div>
        )}

        {/* 7. Action Buttons */}
        <div className="mt-auto pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <ActionButton
              href={data.liveDemoUrl}
              label={data.liveDemoUrl ? "Buka Demo" : "Demo"}
              icon={<Play className="size-3 fill-current" />}
              primary
            />
            <button
              type="button"
              onClick={() => onOpenDetail?.(data)}
              className="guardian-btn-secondary px-3 py-1.5 text-xs gap-1"
            >
              <Info className="size-3" aria-hidden="true" />
              <span>Detail</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ActionButton href={data.githubUrl} label="Kode GitHub" icon={<Code2 className="size-3" />} />
            <ActionButton href={data.videoUrl} label="Video" icon={<ExternalLink className="size-3" />} />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Section 6: Detail View Modal
 * Displays deep information, problem statement, defense mechanism, team quote, and links.
 */
export function ShowcaseDetailModal({ card, onClose }: { card: ShowcaseCardData | null; onClose: () => void }) {
  const [shieldUnlocked, setShieldUnlocked] = useState(false);

  useEffect(() => {
    if (!card) return;
    setShieldUnlocked(false);
    const timer = setTimeout(() => setShieldUnlocked(true), 300);
    return () => clearTimeout(timer);
  }, [card]);

  useEffect(() => {
    if (!card) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <button
        type="button"
        aria-label="Tutup pratinjau modal"
        onClick={onClose}
        className="fixed inset-0 -z-10 bg-transparent border-none p-0 cursor-default"
      />

      <div className="guardian-card relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-8 dark:bg-slate-900 border-2 border-[#262470] shadow-[8px_8px_0_#262470]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Detail"
          className="guardian-btn-secondary absolute top-4 right-4 size-9 p-0 rounded-full"
        >
          <X className="size-4" />
        </button>

        {/* Shield Unlock Header Animation */}
        <div className="mb-6 flex items-center gap-3 border-b-2 border-[#262470]/20 pb-4">
          <div
            className={`flex size-12 items-center justify-center rounded-2xl border-2 border-[#262470] transition-all duration-500 shadow-[3px_3px_0_#262470] ${
              shieldUnlocked ? "bg-[#2FBF71] text-[#262470]" : "bg-[#262470] text-white"
            }`}
          >
            {shieldUnlocked ? (
              <ShieldCheck className="size-6 animate-in zoom-in-75 duration-300" />
            ) : (
              <Shield className="size-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-extrabold tracking-wider uppercase text-[#262470] dark:text-[#3FA9D9]">
                {shieldUnlocked ? "RUANG PERLINDUNGAN TERBUKA" : "MEMBUKA BRANKAS KARYA..."}
              </span>
              {card.category && (
                <span className="rounded-full bg-[#2FBF71]/20 px-2 py-0.5 text-[9px] font-bold text-[#262470] dark:text-[#2FBF71]">
                  {card.category}
                </span>
              )}
            </div>
            <h1 id="modal-title" className="font-display font-black text-2xl sm:text-3xl text-foreground">
              {card.title || card.teamName}
            </h1>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          {/* Metadata pill strip */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="guardian-pill px-3 py-1 text-xs font-bold text-[#262470]">Tim: {card.teamName}</span>
            <span className="guardian-pill px-3 py-1 text-xs font-bold text-[#262470]">
              Kampus: {card.campus ?? "Finalis MIT-WEEK 2026"}
            </span>
          </div>

          {/* Section: Tentang Karya */}
          <div className="rounded-2xl border-2 border-[#262470] bg-[#F7F9FF] p-4 sm:p-5 shadow-[3px_3px_0_#262470] dark:bg-slate-800">
            <h2 className="font-display font-extrabold text-base uppercase text-[#262470] dark:text-[#3FA9D9] mb-1.5">
              Tentang Karya
            </h2>
            <p className="text-sm text-foreground/90 leading-relaxed font-medium">
              {card.description || "Solusi inovatif untuk menciptakan ruang digital yang aman dan terlindung."}
            </p>
          </div>

          {/* Section: Cara Kerjanya */}
          <div className="rounded-2xl border-2 border-[#262470] bg-white p-4 sm:p-5 shadow-[3px_3px_0_#262470] dark:bg-slate-900">
            <h2 className="font-display font-extrabold text-base uppercase text-[#262470] dark:text-[#3FA9D9] mb-2.5">
              2. Cara Solusi Ini Melindungi Pengguna
            </h2>
            <ul className="space-y-2 text-sm text-foreground/90 font-medium">
              {(
                card.story?.howItWorks ?? [
                  "Menganalisis potensi ancaman secara proaktif saat pengguna beraktivitas online.",
                  "Memberikan edukasi visual yang transparan mengenai indikasi bahaya.",
                  "Menyediakan panduan langkah pengamanan mandiri yang mudah diterapkan.",
                ]
              ).map((point, idx) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#262470] bg-[#2FBF71] text-[10px] font-black text-[#262470]">
                    {idx + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section: Kenapa kami bikin ini (Team Quote) */}
          <div className="rounded-2xl border-2 border-[#262470] bg-[#262470] p-4 sm:p-5 text-white shadow-[3px_3px_0_#5B4FC9]">
            <h2 className="font-display font-extrabold text-base uppercase text-[#2FBF71] mb-1.5 flex items-center gap-1.5">
              <Quote className="size-4 fill-current" />
              <span>Kenapa Kami Bikin Ini</span>
            </h2>
            <p className="italic text-sm text-white/95 leading-relaxed font-medium">
              "
              {card.story?.whyWeMadeThis ??
                card.quote ??
                "Kami ingin menciptakan ruang digital yang aman dan inklusif untuk siapa saja."}
              "
            </p>
          </div>

          {/* Team Members List */}
          {card.teamMembers && card.teamMembers.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-sm uppercase text-foreground mb-3 flex items-center gap-2">
                <Users className="size-4 text-[#3FA9D9]" />
                <span>Para Penjaga Di Balik Karya</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {card.teamMembers.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-2.5 rounded-xl border-2 border-[#262470] bg-white p-2.5 shadow-[2px_2px_0_#262470] dark:bg-slate-800"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#262470] font-bold text-xs text-white">
                      {getInitials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-xs text-foreground">{member.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{member.role || "Anggota Tim"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Links */}
          <div className="pt-4 border-t-2 border-[#262470]/20 flex flex-wrap items-center justify-end gap-3">
            {card.liveDemoUrl && (
              <a
                href={card.liveDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="guardian-btn-primary px-5 py-2.5 text-sm gap-2"
              >
                <Play className="size-4 fill-current" />
                <span>Buka Demo Langsung</span>
                <ArrowUpRight className="size-4" />
              </a>
            )}
            {card.githubUrl && (
              <a
                href={card.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="guardian-btn-secondary px-4 py-2 text-sm gap-1.5"
              >
                <Code2 className="size-4" />
                <span>Lihat Kode GitHub</span>
              </a>
            )}
            {card.videoUrl && (
              <a
                href={card.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="guardian-btn-secondary px-4 py-2 text-sm gap-1.5"
              >
                <ExternalLink className="size-4" />
                <span>Tonton Video</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BellRing,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Share2,
  Shuffle,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useEventInfo } from "@/components/event-info-provider";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import {
  ActionButtons,
  CardThumbnail,
  CardView,
  DemoOkMark,
  GhIcon,
  type KaryaItem,
  SaveButton,
  SeenMark,
  VidIcon,
} from "./karya-card";
import { KARYA_DATES } from "./karya-constants";
import { KaryaLogo } from "./karya-logo";
import { SpotlightCarousel } from "./karya-spotlight";
import { findSimilar, getVideoEmbed, karyaSlug, winnersCalendarIcs, winnersGoogleCalendarUrl } from "./karya-utils";
import { hasSeenIntro, hasShownFinish, rememberFinishShown, rememberIntroSeen, useKaryaVisitor } from "./karya-visitor";

export type { KaryaItem } from "./karya-card";

const TITLE_LETTERS = [
  { id: "letter-g", ch: "G", i: 0 },
  { id: "letter-u", ch: "U", i: 1 },
  { id: "letter-a1", ch: "A", i: 2 },
  { id: "letter-r", ch: "R", i: 3 },
  { id: "letter-d", ch: "D", i: 4 },
  { id: "letter-i", ch: "I", i: 5 },
  { id: "letter-a2", ch: "A", i: 6 },
  { id: "letter-n", ch: "N", i: 7 },
  { id: "letter-s", ch: "S", i: 8 },
];

const STAGE_LABELS = {
  done: "Selesai",
  now: "Sekarang",
  next: "Selanjutnya",
  later: "Nanti",
} as const;

type StageStatus = keyof typeof STAGE_LABELS;

const TIMELINE_STAGES = [
  { label: KARYA_DATES.stage1Label, description: KARYA_DATES.stage1Desc },
  { label: KARYA_DATES.stage2Label, description: KARYA_DATES.stage2Desc },
  { label: KARYA_DATES.stage3Label, description: KARYA_DATES.stage3Desc },
] as const;

function getStageStatus(index: number, activeIndex: number): StageStatus {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "now";
  if (index === activeIndex + 1) return "next";
  return "later";
}

// Floating list preview: 270px wide, 16:10 image. Kept fully inside the viewport.
const FP_WIDTH = 270;
const FP_HEIGHT = Math.round(FP_WIDTH / 1.6);
const FP_MARGIN = 8;
function floatX(pointerX: number): number {
  const vw = window.innerWidth;
  const right = pointerX + 28;
  const x = right + FP_WIDTH + FP_MARGIN > vw ? pointerX - FP_WIDTH - 28 : right;
  return Math.min(Math.max(x, FP_MARGIN), vw - FP_WIDTH - FP_MARGIN);
}
function floatY(pointerY: number): number {
  const vh = window.innerHeight;
  return Math.min(Math.max(pointerY - FP_HEIGHT / 2, FP_MARGIN), vh - FP_HEIGHT - FP_MARGIN);
}

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-6 text-foreground"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export function KaryaClient({
  initialState,
  cards,
  winners,
  finalists,
  spotlightNames,
  initialKarya,
  initialQuery,
}: {
  initialState: "locked" | "open" | "win";
  cards: KaryaItem[];
  winners: KaryaItem[];
  finalists: KaryaItem[];
  /** Team names for "Sorotan hari ini", picked on the server per WITA day. */
  spotlightNames: string[];
  /** Slug from ?karya= in a shared project link. */
  initialKarya: string | null;
  /** ?q= from the address bar, so a search can be shared. */
  initialQuery: string;
}) {
  const { event_name, event_track } = useEventInfo();
  const state = initialState;
  const isLocked = state === "locked";
  const isWin = state === "win";

  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState(initialQuery);
  const [sortMode, setSortMode] = useState<"acak" | "unseen" | "az">("acak");
  // Opened project plus the list it was opened from, so previous/next follow that list.
  const [modal, setModal] = useState<{ list: KaryaItem[]; index: number } | null>(null);
  const activeModalItem = modal ? (modal.list[modal.index] ?? null) : null;
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const { saved, seen, ready: visitorReady, toggleSaved, markSeen } = useKaryaVisitor();

  // Floating thumbnail preview in list view
  const [hoveredItem, setHoveredItem] = useState<KaryaItem | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // The floating preview is a desktop flourish: mouse + hover + at least 768px wide.
  const [canFloatPreview, setCanFloatPreview] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
    const update = () => setCanFloatPreview(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Theme store
  const themeMode = usePreferencesStore((s) => s.values.theme_mode);
  const setPreference = usePreferencesStore((s) => s.setPreference);
  const isDark = themeMode === "dark";
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const [themeSpin, setThemeSpin] = useState(false);

  // Intro animation: first visit in this browser only, and never when arriving through a project link.
  const [showLoader, setShowLoader] = useState(false);
  const [loaderOpen, setLoaderOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || hasSeenIntro() || initialKarya) {
      setEntered(true);
      return;
    }

    // Remember the intro only once it has played: marking it before the timers would leave the
    // loader stuck if this effect is cleaned up and re-run (React dev double-run, fast navigation).
    setShowLoader(true);
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const openTimer = setTimeout(() => {
      setLoaderOpen(true);
      hideTimer = setTimeout(() => {
        rememberIntroSeen();
        setShowLoader(false);
        setEntered(true);
      }, 900);
    }, 1500);

    return () => {
      clearTimeout(openTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [initialKarya]);

  const handleDismissLoader = () => {
    rememberIntroSeen();
    setLoaderOpen(true);
    setTimeout(() => {
      setShowLoader(false);
      setEntered(true);
    }, 300);
  };

  // Lens tracking on desktop, eased and throttled to animation frames
  const lensRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lens = lensRef.current;
    if (!lens) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let targetX = window.innerWidth * 0.6;
    let targetY = window.innerHeight * 0.4;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) < 0.5) return;
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      lens.style.setProperty("--mx", `${currentX.toFixed(0)}px`);
      lens.style.setProperty("--my", `${currentY.toFixed(0)}px`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  // Filtered rest of cards (non-finalists / general participants)
  const restCards = useMemo(() => {
    const finalistNames = new Set(finalists.map((f) => f.teamName));
    const winnerNames = new Set(winners.map((w) => w.teamName));
    return cards.filter((c) => !finalistNames.has(c.teamName) && !winnerNames.has(c.teamName));
  }, [cards, finalists, winners]);

  // Every project visible in this phase (winners, finalists, others), without duplicates.
  const allVisible = useMemo(() => {
    const names = new Set<string>();
    const out: KaryaItem[] = [];
    for (const item of [...winners, ...finalists, ...cards]) {
      if (names.has(item.teamName)) continue;
      names.add(item.teamName);
      out.push(item);
    }
    return out;
  }, [winners, finalists, cards]);

  const spotlightItems = useMemo(() => {
    const byName = new Map(allVisible.map((item) => [item.teamName, item]));
    return spotlightNames.map((name) => byName.get(name)).filter((item): item is KaryaItem => Boolean(item));
  }, [allVisible, spotlightNames]);

  const savedItems = useMemo(
    () => allVisible.filter((item) => saved.has(karyaSlug(item.teamName))),
    [allVisible, saved],
  );
  const seenCount = useMemo(
    () => allVisible.filter((item) => seen.has(karyaSlug(item.teamName))).length,
    [allVisible, seen],
  );

  // The works list: "Favoritku" (saved projects from any section) or the other projects, then search.
  const filteredRestCards = useMemo(() => {
    const source = showSavedOnly ? savedItems : restCards;
    // "acak" keeps the server order (random per team); the others re-sort a copy.
    let base = source;
    if (sortMode === "az") base = [...source].sort((a, b) => a.title.localeCompare(b.title, "id"));
    else if (sortMode === "unseen") {
      const isSeen = (item: KaryaItem) => seen.has(karyaSlug(item.teamName));
      base = [...source.filter((item) => !isSeen(item)), ...source.filter(isSeen)];
    }
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (c) =>
        c.teamName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [restCards, savedItems, showSavedOnly, query, sortMode, seen]);

  // Remaining 2 finalists in winner release
  const remainingFinalists = useMemo(() => {
    if (!isWin) return finalists;
    const winnerNames = new Set(winners.map((w) => w.teamName));
    return finalists.filter((f) => !winnerNames.has(f.teamName));
  }, [finalists, winners, isWin]);

  // Podium order: Juara 2 (kiri), Juara 1 (tengah naik), Juara 3 (kanan)
  const podiumWinners = useMemo(() => {
    const r1 = winners.find((w) => w.winnerRank === 1);
    const r2 = winners.find((w) => w.winnerRank === 2);
    const r3 = winners.find((w) => w.winnerRank === 3);
    return [
      { item: r2, rank: 2, orderClass: "p2" },
      { item: r1, rank: 1, orderClass: "p1" },
      { item: r3, rank: 3, orderClass: "p3" },
    ].filter((p): p is { item: KaryaItem; rank: number; orderClass: string } => Boolean(p.item));
  }, [winners]);

  const visitorProps = (item: KaryaItem) => {
    const slug = karyaSlug(item.teamName);
    return { saved: saved.has(slug), seen: visitorReady && seen.has(slug), onToggleSave: () => toggleSaved(slug) };
  };

  // Keep ?karya=<slug> in the address bar in step with the opened project, so it can be copied and shared.
  const syncUrl = useCallback((item: KaryaItem | null) => {
    try {
      const url = new URL(window.location.href);
      if (item) url.searchParams.set("karya", karyaSlug(item.teamName));
      else url.searchParams.delete("karya");
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // URL sync is a convenience only.
    }
  }, []);

  const showItem = useCallback(
    (list: KaryaItem[], index: number) => {
      const item = list[index];
      if (!item) return;
      setModal({ list, index });
      markSeen(karyaSlug(item.teamName));
      syncUrl(item);
    },
    [markSeen, syncUrl],
  );

  const openModal = useCallback(
    (item: KaryaItem, list: KaryaItem[]) => {
      const index = list.findIndex((entry) => entry.teamName === item.teamName);
      if (index === -1) showItem([item], 0);
      else showItem(list, index);
    },
    [showItem],
  );

  const closeModal = useCallback(() => {
    setModal(null);
    syncUrl(null);
  }, [syncUrl]);

  const stepModal = useCallback(
    (delta: number) => {
      if (!modal || modal.list.length < 2) return;
      const n = modal.list.length;
      showItem(modal.list, (modal.index + delta + n) % n);
    },
    [modal, showItem],
  );

  // Random project, preferring ones this visitor has not opened yet.
  const openRandom = useCallback(() => {
    const currentName = activeModalItem?.teamName;
    const others = allVisible.filter((item) => item.teamName !== currentName);
    if (others.length === 0) return;
    const unseen = others.filter((item) => !seen.has(karyaSlug(item.teamName)));
    const pool = unseen.length > 0 ? unseen : others;
    openModal(pool[Math.floor(Math.random() * pool.length)], allVisible);
  }, [activeModalItem, allVisible, seen, openModal]);

  // Shared link: open that project once. A slug that is not visible (yet) just shows the gallery.
  const openedInitial = useRef(false);
  useEffect(() => {
    if (openedInitial.current || !initialKarya) return;
    openedInitial.current = true;
    const item = allVisible.find((entry) => karyaSlug(entry.teamName) === initialKarya);
    if (item) openModal(item, allVisible);
    else syncUrl(null);
  }, [initialKarya, allVisible, openModal, syncUrl]);

  // Keyboard: arrows move between projects, Escape closes.
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      else if (e.key === "ArrowRight") stepModal(1);
      else if (e.key === "ArrowLeft") stepModal(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, closeModal, stepModal]);

  // Move focus into the dialog when it opens.
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isModalOpen = modal !== null;
  useEffect(() => {
    if (isModalOpen) closeButtonRef.current?.focus();
  }, [isModalOpen]);

  const modalTouchX = useRef<number | null>(null);

  // Switching project inside the dialog (next/previous, similar, random) starts at the top,
  // otherwise the next project opens scrolled to its buttons instead of its image and title.
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const activeModalKey = activeModalItem?.teamName ?? null;
  useEffect(() => {
    if (activeModalKey !== null) modalPanelRef.current?.scrollTo({ top: 0 });
  }, [activeModalKey]);

  // Opened project extras: similar projects, video player, neighbouring images preloaded.
  const similarItems = useMemo(
    () => (activeModalItem ? findSimilar(allVisible, activeModalItem, 3) : []),
    [activeModalItem, allVisible],
  );
  const videoEmbed = activeModalItem ? getVideoEmbed(activeModalItem.videoUrl) : null;
  const [playingVideoFor, setPlayingVideoFor] = useState<string | null>(null);
  const isVideoPlaying = Boolean(videoEmbed && activeModalItem && playingVideoFor === activeModalItem.teamName);

  useEffect(() => {
    if (!modal || modal.list.length < 2) return;
    const n = modal.list.length;
    for (const offset of [1, -1]) {
      const url = modal.list[(modal.index + offset + n) % n]?.imageUrl;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }
  }, [modal]);

  // Search text lives in ?q= so a search can be shared (debounced, replaces history).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const url = new URL(window.location.href);
        const q = query.trim();
        if (q) url.searchParams.set("q", q);
        else url.searchParams.delete("q");
        if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
      } catch {
        // convenience only
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Shortcuts: "/" focuses search, "R" opens a random project (ignored while typing).
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isLocked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.key === "/") {
        e.preventDefault();
        if (modal) closeModal();
        searchRef.current?.focus();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        openRandom();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLocked, modal, closeModal, openRandom]);

  // "Ingatkan saya": winners announcement on 25 Nov (no gallery changes are planned before then).
  const [reminderOpen, setReminderOpen] = useState(false);
  const downloadReminder = () => {
    const galleryUrl = `${window.location.origin}/karya`;
    const blob = new Blob([winnersCalendarIcs(galleryUrl)], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "pengumuman-juara-mitweek-2026.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    setReminderOpen(false);
    toast.success("Pengingat 25 November disimpan. Buka berkasnya untuk menambah ke kalender.");
  };
  const googleCalendarHref = () => winnersGoogleCalendarUrl(`${window.location.origin}/karya`);

  // Finish moment: the first time this visitor has opened every visible project.
  const [showFinish, setShowFinish] = useState(false);
  const prevSeenCount = useRef<number | null>(null);
  useEffect(() => {
    if (!visitorReady || allVisible.length === 0) return;
    const before = prevSeenCount.current;
    prevSeenCount.current = seenCount;
    if (before !== null && before < allVisible.length && seenCount >= allVisible.length && !hasShownFinish()) {
      rememberFinishShown();
      setShowFinish(true);
    }
  }, [visitorReady, seenCount, allVisible.length]);

  const shareGallery = useCallback(async () => {
    const url = `${window.location.origin}/karya`;
    if (window.matchMedia("(pointer: coarse)").matches && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `GUARDIANS · Galeri Karya ${event_name}`, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tautan galeri disalin.");
    } catch {
      toast.error("Tautan gagal disalin. Salin dari bilah alamat browser.");
    }
  }, [event_name]);

  const shareItem = useCallback(
    async (item: KaryaItem) => {
      const url = `${window.location.origin}/karya?karya=${karyaSlug(item.teamName)}`;
      if (window.matchMedia("(pointer: coarse)").matches && typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: `${item.title} · Galeri Karya ${event_name}`,
            text: `Lihat karya ${item.teamName} di galeri ${event_name}.`,
            url,
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Tautan karya disalin.");
      } catch {
        toast.error("Tautan gagal disalin. Salin dari bilah alamat browser.");
      }
    },
    [event_name],
  );

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setThemeSpin(false);
    requestAnimationFrame(() => setThemeSpin(true));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      setPreference("theme_mode", next);
      return;
    }

    const rect = themeButtonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight - 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => {
      setPreference("theme_mode", next);
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
          },
          {
            duration: 700,
            easing: "cubic-bezier(.65,0,.25,1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        // View transitions are progressive enhancement; ignore unsupported setups.
      });
  };

  let activeStage = 0;
  if (isLocked) {
    activeStage = -1;
  } else if (isWin) {
    activeStage = 2;
  }
  const showFinalists = isLocked || (isWin ? remainingFinalists.length > 0 : finalists.length > 0);

  let fnoteText = "Lima karya terbaik yang melaju ke presentasi final 21 November 2026.";
  if (isLocked) {
    fnoteText = "Diumumkan 18 November 2026, bersamaan dengan dibukanya galeri.";
  } else if (isWin) {
    fnoteText = "Finalis yang belum meraih posisi juara.";
  }

  let worksNoteText = "Karya tampil atas persetujuan tim, dalam urutan acak. Pemenang diumumkan 25 November 2026.";
  if (isLocked) {
    worksNoteText =
      "Galeri belum dibuka. Tampilan di bawah hanya contoh (grid dan list); jumlah karya yang tampil tergantung persetujuan tiap tim.";
  } else if (isWin) {
    worksNoteText = "Karya lainnya tampil dalam urutan acak.";
  }

  let worksTitle = isLocked ? "Karya peserta" : "Karya lainnya";
  if (showSavedOnly) worksTitle = "Favoritku";

  // Full schedule: always shown while locked, behind "Lihat jadwal" once the gallery is open.
  const timelineSection = (
    <section id="tl" className="mt-10" aria-label="Jadwal">
      <p className="mono muted mb-3 text-xs">
        Jadwal · {event_track} Competition {event_name}
      </p>
      <ol id="tlist" className="grid w-full gap-6 md:grid-cols-3">
        {TIMELINE_STAGES.map((stage, index) => {
          const status = getStageStatus(index, activeStage);
          const isDone = status === "done";
          const isNow = status === "now";

          return (
            <li key={stage.label} className="box relative p-5">
              <div className="flex items-center gap-3">
                <svg width="30" height="34" viewBox="0 0 38 42" aria-hidden="true">
                  <polygon
                    points="19,2 36,11 36,31 19,40 2,31 2,11"
                    fill={isNow ? "var(--acc)" : "var(--card)"}
                    stroke="var(--line)"
                    strokeWidth="3"
                  />
                  {isDone && (
                    <path d="M12 22l5 5 9-11" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
                  )}
                  {isNow && <circle cx="19" cy="21" r="4.5" fill="#06150d" />}
                  {!isDone && !isNow && index === 0 && (
                    <>
                      <rect
                        x="12"
                        y="20"
                        width="14"
                        height="10"
                        rx="2"
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth="2.6"
                      />
                      <path d="M15 20v-3a4 4 0 0 1 8 0v3" fill="none" stroke="var(--ink)" strokeWidth="2.6" />
                    </>
                  )}
                  {!isDone && !isNow && index !== 0 && <circle cx="19" cy="21" r="2.5" fill="var(--ink)" />}
                </svg>
                <span className="mono muted text-xs">TAHAP 0{index + 1}</span>
                <span className={`st ${status}`}>{STAGE_LABELS[status]}</span>
              </div>
              <h3 className="mt-3 font-extrabold leading-tight">{stage.label}</h3>
              {isLocked && <p className="tdesc muted mt-1 text-sm leading-relaxed">{stage.description}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );

  return (
    <div className={`karya-page${isDark ? " dark" : ""}${entered ? " go" : ""}`} data-theme={isDark ? "dark" : "light"}>
      {/* Background Atmosphere */}
      <div className="bgfx" aria-hidden="true">
        <svg
          viewBox="0 0 1600 1000"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          stroke="var(--line)"
          strokeWidth="1.2"
        >
          <title>Latar belakang atmosferik</title>
          <g className="g1">
            <circle cx="1180" cy="330" r="300" />
            <circle cx="1180" cy="330" r="470" strokeDasharray="3 11" />
          </g>
          <g className="g2">
            <circle cx="260" cy="760" r="240" />
            <circle cx="260" cy="760" r="380" strokeDasharray="2 9" />
          </g>
          <path d="M0 500H1600M800 0V1000" strokeOpacity=".5" />
        </svg>
      </div>
      <div className="lens" ref={lensRef} id="lens" aria-hidden="true" />

      {/* Interactive Loader (Every refresh or entry, click to skip) */}
      {showLoader && (
        <button
          type="button"
          className={`ld ${loaderOpen ? "open" : ""}`}
          onClick={handleDismissLoader}
          aria-label="Tutup loader"
        >
          <div className="ld-p ld-t" />
          <div className="ld-p ld-b" />
          <div className="ld-c">
            <div className="ld-mark">
              <svg className="ld-ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle className="dr" cx="60" cy="60" r="55" pathLength="1" />
                <polygon className="dr h" points="60,14 100,37 100,83 60,106 20,83 20,37" pathLength="1" />
              </svg>
              <KaryaLogo className="ld-logo-mark" />
            </div>
            <p className="mono font-semibold">Menyiapkan ruang yang aman</p>
          </div>
        </button>
      )}

      {/* Header */}
      <header className="mx-auto flex max-w-[1360px] items-center gap-3 px-4 pt-5 sm:px-6">
        <KaryaLogo className="size-9 shrink-0" spin={false} />
        <span className="font-extrabold text-base tracking-tight sm:text-lg">{event_name}</span>
        {/* Wrapper carries the breakpoint: .pill sets display itself, which would override "hidden". */}
        <span className="ml-1 hidden sm:inline-flex">
          <span className="pill mono">{event_track} Competition</span>
        </span>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1360px] px-4 pb-28 sm:px-6">
        {isLocked ? (
          <>
            <section
              id="hero"
              className={`hero mt-6 grid items-center gap-8 p-6 sm:p-10 lg:mt-10 lg:grid-cols-12 lg:p-14 ${
                !isLocked ? "compact" : ""
              }`}
            >
              <div className="lg:col-span-8">
                <span className="pill mono rise" style={{ "--e": ".2s" } as React.CSSProperties}>
                  Galeri karya · {event_track} Competition
                </span>
                <h1 className="ttl mt-5" aria-label="GUARDIANS">
                  {TITLE_LETTERS.map((item) => (
                    <span key={item.id} className="lw" aria-hidden="true">
                      <span className="ltr" style={{ "--i": item.i } as React.CSSProperties}>
                        {item.ch}
                      </span>
                    </span>
                  ))}
                </h1>
                <p
                  className="mt-4 font-extrabold text-xl tracking-tight sm:text-3xl rise"
                  style={{ "--e": ".9s" } as React.CSSProperties}
                >
                  Kenalan sama para penjaga digital.
                </p>
                <div className="hx">
                  <p
                    className="muted mt-4 max-w-xl text-base leading-relaxed sm:text-lg rise"
                    style={{ "--e": "1.1s" } as React.CSSProperties}
                  >
                    Ruang pameran karya peserta {event_track} Competition, salah satu kompetisi di {event_name}.
                    Jelajahi ide, eksperimen, dan solusi nyata dari teman-temanmu yang menjaga ruang digital kita tetap
                    aman, inklusif, dan bersahabat.
                  </p>
                </div>
              </div>

              <div
                className="hx flex flex-col items-center gap-4 lg:col-span-4 rise"
                style={{ "--e": "1.1s" } as React.CSSProperties}
              >
                <KaryaLogo className="size-36 sm:size-44" />
                <span className="pill mono">
                  {event_name} · {event_track}
                </span>
              </div>
            </section>
            {timelineSection}
          </>
        ) : (
          <>
            {/* Slim hero once the gallery is open: projects come first */}
            <section id="hero" className="hero slim mt-6 p-5 sm:p-6">
              <div className="slim-row">
                <div className="min-w-0">
                  <span className="pill mono">Galeri karya · {event_track} Competition</span>
                  <h1 className="slim-ttl mt-3">GUARDIANS</h1>
                  <p className="muted mt-1 text-sm sm:text-base">
                    Kenalan sama para penjaga digital · {allVisible.length} karya
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn pri slim-cta"
                    onClick={openRandom}
                    disabled={allVisible.length === 0}
                  >
                    <Shuffle aria-hidden="true" className="size-4" />
                    Acak karya
                  </button>
                  <button
                    type="button"
                    className="btn"
                    aria-expanded={showSchedule}
                    aria-controls="tl"
                    onClick={() => setShowSchedule((v) => !v)}
                  >
                    <CalendarDays aria-hidden="true" className="size-4" />
                    {showSchedule ? "Tutup jadwal" : "Lihat jadwal"}
                  </button>
                  {!isWin && (
                    <div className="relative">
                      <button
                        type="button"
                        className="btn"
                        aria-expanded={reminderOpen}
                        aria-haspopup="true"
                        onClick={() => setReminderOpen((v) => !v)}
                      >
                        <BellRing aria-hidden="true" className="size-4" />
                        Ingatkan saya
                      </button>
                      {reminderOpen && (
                        <div className="remind box" role="menu" aria-label="Pengingat pengumuman juara">
                          <p className="mono muted px-1 pb-1 text-xs">Pengumuman juara · 25 Nov 2026</p>
                          <button type="button" role="menuitem" className="btn w-full" onClick={downloadReminder}>
                            Simpan ke kalender (.ics)
                          </button>
                          <a
                            role="menuitem"
                            className="btn w-full"
                            href={googleCalendarHref()}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setReminderOpen(false)}
                          >
                            Google Calendar
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className="mono muted mt-4 text-xs">{`Galeri dibuka 18 Nov 2026 · Final ${KARYA_DATES.stage2Date} · Juara ${KARYA_DATES.stage3Date}`}</p>
            </section>
            {showSchedule && timelineSection}
            <SpotlightCarousel items={spotlightItems} onOpen={(item) => openModal(item, spotlightItems)} />
          </>
        )}

        {/* Works Section */}
        <section id="works" className="mt-12" aria-labelledby="h-works">
          {/* Winner Podium (Visible only in 'win' release) */}
          {isWin && (
            <div id="podium" className="mb-16">
              <h2 className="font-extrabold text-3xl tracking-tight sm:text-4xl">Juara {event_name}</h2>
              <p className="muted mt-2">Diumumkan pada 25 November 2026.</p>
              <div id="pgrid" className="mt-8 grid items-start gap-7 md:grid-cols-3">
                {podiumWinners.map(({ item, rank, orderClass }) => (
                  <CardView
                    key={item.teamName}
                    item={item}
                    podiumRank={rank}
                    orderClass={orderClass}
                    onOpenModal={() =>
                      openModal(
                        item,
                        podiumWinners.map((p) => p.item),
                      )
                    }
                    {...visitorProps(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Finalists Section */}
          {showFinalists && (
            <div id="finals" className="mb-16">
              <h2 id="h-fin" className="font-extrabold text-3xl tracking-tight sm:text-4xl">
                {isWin ? "Finalis lainnya" : "Top 5 finalis"}
              </h2>
              <p id="fnote" className="muted mt-2">
                {fnoteText}
              </p>

              {/* Skeletons when locked */}
              {isLocked && (
                <div className="fin mt-8">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
                    <SkeletonCard key={`skel-fin-${idx}`} />
                  ))}
                </div>
              )}

              {/* When WIN: remaining finalists, centered and evenly sized */}
              {!isLocked && isWin && remainingFinalists.length > 0 && (
                <div className={`fin mt-8${remainingFinalists.length > 1 ? " n2" : ""}`}>
                  {remainingFinalists.map((item) => (
                    <CardView
                      key={item.teamName}
                      item={item}
                      isFinalistBadge
                      onOpenModal={() => openModal(item, remainingFinalists)}
                      {...visitorProps(item)}
                    />
                  ))}
                </div>
              )}

              {/* When OPEN (18 Nov): 5 finalists in balanced grid */}
              {!isLocked && !isWin && finalists.length > 0 && (
                <div className="fin mt-8">
                  {finalists.map((item) => (
                    <CardView
                      key={item.teamName}
                      item={item}
                      isFinalistBadge
                      onOpenModal={() => openModal(item, finalists)}
                      {...visitorProps(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Participant Works Header & Controls */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 id="h-works" className="font-extrabold text-3xl tracking-tight sm:text-4xl">
                {worksTitle}
              </h2>
              <p id="note" className="muted mt-2 max-w-xl" aria-live="polite">
                {showSavedOnly ? "Karya yang kamu simpan. Tersimpan di browser ini saja." : worksNoteText}
              </p>
              {!isLocked && visitorReady && allVisible.length > 0 && (
                <div className="prog mt-3">
                  <div
                    className="prog-bar"
                    role="progressbar"
                    aria-label="Karya yang sudah kamu jelajahi"
                    aria-valuemin={0}
                    aria-valuemax={allVisible.length}
                    aria-valuenow={seenCount}
                  >
                    <i style={{ width: `${Math.round((seenCount / allVisible.length) * 100)}%` }} />
                  </div>
                  <span className="mono text-xs">
                    {seenCount >= allVisible.length
                      ? `Kamu sudah menjelajah semua ${allVisible.length} karya. Mantap!`
                      : `Kamu sudah menjelajah ${seenCount} dari ${allVisible.length} karya`}
                  </span>
                </div>
              )}
            </div>

            <div id="tools" className="flex flex-wrap items-center gap-3">
              <fieldset className="flex gap-2 border-0 p-0 m-0" aria-label="Tampilan karya">
                <button
                  type="button"
                  className="btn ico"
                  aria-pressed={view === "grid"}
                  aria-label="Tampilan grid"
                  title="Tampilan grid"
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn ico"
                  aria-pressed={view === "list"}
                  aria-label="Tampilan list"
                  title="Tampilan list"
                  onClick={() => setView("list")}
                >
                  <List aria-hidden="true" />
                </button>
              </fieldset>
              {!isLocked && (
                <>
                  <button
                    type="button"
                    className="btn"
                    aria-pressed={showSavedOnly}
                    onClick={() => setShowSavedOnly((v) => !v)}
                  >
                    <Bookmark aria-hidden="true" className="size-4" />
                    Favoritku{visitorReady && savedItems.length > 0 ? ` (${savedItems.length})` : ""}
                  </button>
                  <label className="sr-only" htmlFor="sort">
                    Urutkan karya
                  </label>
                  <select
                    id="sort"
                    className="btn sortsel"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as "acak" | "unseen" | "az")}
                  >
                    <option value="acak">Urutan acak</option>
                    <option value="unseen">Belum dilihat dulu</option>
                    <option value="az">Judul A–Z</option>
                  </select>
                  <label className="sr-only" htmlFor="q">
                    Cari nama tim atau judul karya
                  </label>
                  <div className="relative w-full md:w-64">
                    <input
                      ref={searchRef}
                      id="q"
                      type="search"
                      placeholder="Cari nama tim atau judul..."
                      title="Tekan / untuk mencari, R untuk karya acak"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-keyshortcuts="/"
                      className="box w-full px-4 py-2.5 pr-10 text-base"
                    />
                    {!query && (
                      <span className="kbdhint mono" aria-hidden="true">
                        /
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Locked State Grid Skeletons */}
          {isLocked && view === "grid" && (
            <div className="view-anim works-grid mt-8">
              {Array.from({ length: 6 }).map((_, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
                <SkeletonCard key={`skel-all-${idx}`} />
              ))}
            </div>
          )}

          {/* Locked State List Skeletons */}
          {isLocked && view === "list" && (
            <div className="view-anim list">
              {Array.from({ length: 6 }).map((_, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
                <SkeletonRow key={`skel-row-${idx}`} />
              ))}
            </div>
          )}

          {/* Released State Grid View */}
          {!isLocked && view === "grid" && (
            <div className="view-anim works-grid mt-8">
              {filteredRestCards.map((item) => (
                <CardView
                  key={item.teamName}
                  item={item}
                  isFinalistBadge={showSavedOnly && item.isFinalist}
                  onOpenModal={() => openModal(item, filteredRestCards)}
                  {...visitorProps(item)}
                />
              ))}
            </div>
          )}

          {/* Released State List View */}
          {!isLocked && view === "list" && (
            <div
              className="view-anim list"
              onPointerMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
              onPointerLeave={() => setHoveredItem(null)}
            >
              {filteredRestCards.map((item) => (
                <article key={`row-${item.teamName}`} className="row" onPointerEnter={() => setHoveredItem(item)}>
                  <div className="thumb">
                    <CardThumbnail item={item} />
                    {visitorProps(item).seen && <SeenMark compact />}
                  </div>
                  <div className="min-w-0">
                    <p className="mono tm">
                      Oleh {item.teamName}
                      {item.demoOk && <DemoOkMark />}
                    </p>
                    <h3>
                      <button type="button" className="tt" onClick={() => openModal(item, filteredRestCards)}>
                        {item.title}
                      </button>
                    </h3>
                  </div>
                  <div className="act">
                    <SaveButton
                      item={item}
                      saved={visitorProps(item).saved}
                      onToggle={visitorProps(item).onToggleSave}
                      className="inrow"
                    />
                    <ActionButtons item={item} />
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Empty search notice */}
          {!isLocked && filteredRestCards.length === 0 && (
            <p className="box mt-6 p-6 font-semibold">
              {showSavedOnly && savedItems.length === 0
                ? "Belum ada karya yang kamu simpan. Tekan ikon simpan di pojok gambar karya."
                : "Tidak ada karya yang cocok. Coba nama tim atau judul lain."}
            </p>
          )}
        </section>
      </main>

      {/* Floating Thumbnail Preview following mouse on List View (Desktop) */}
      {hoveredItem && view === "list" && canFloatPreview && (
        <div
          id="fp"
          className="box on"
          style={{ transform: `translate(${floatX(mousePos.x)}px, ${floatY(mousePos.y)}px) rotate(-3deg)` }}
          aria-hidden="true"
        >
          <div className="thumb">
            <CardThumbnail item={hoveredItem} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-[1360px] px-4 pb-28 sm:px-6">
        <div className="border-t pt-6" style={{ borderColor: "color-mix(in srgb, var(--line) 22%, transparent)" }}>
          <p className="font-extrabold">
            {event_name} · {event_track} Competition
          </p>
          <p className="muted mt-1 text-sm">
            Galeri ini hanya memuat karya {event_track} Competition; kompetisi {event_name} lainnya tidak ditampilkan di
            sini. Karya tampil atas persetujuan tim, tanpa skor numerik.
          </p>
          <p className="mt-2 font-semibold text-sm">
            Untuk permintaan penghapusan karya atau pembaruan tautan, silakan hubungi panitia {event_name}.
          </p>
        </div>
      </footer>

      {/* Floating Theme Button (FAB) */}
      <button
        id="theme"
        ref={themeButtonRef}
        type="button"
        onClick={toggleTheme}
        onAnimationEnd={() => setThemeSpin(false)}
        className={`fab box${themeSpin ? " spin" : ""}`}
        aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      >
        {isDark ? (
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
      </button>

      {/* Detail Modal Dialog */}
      {activeModalItem && modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeModalItem.title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            className="mback fixed inset-0 bg-black/65 backdrop-blur-xs cursor-default border-0"
            aria-label="Tutup"
            tabIndex={-1}
            onClick={closeModal}
          />
          <div
            ref={modalPanelRef}
            className="mpanel box relative z-10 max-h-[90vh] w-full max-w-[640px] overflow-y-auto"
            onTouchStart={(e) => {
              modalTouchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const startX = modalTouchX.current;
              const endX = e.changedTouches[0]?.clientX;
              modalTouchX.current = null;
              if (startX === null || endX === undefined || Math.abs(endX - startX) < 60) return;
              stepModal(endX < startX ? 1 : -1);
            }}
          >
            {isVideoPlaying && videoEmbed ? (
              <div className="vidframe">
                <iframe
                  src={videoEmbed.embedUrl}
                  title={`Video demo ${activeModalItem.title}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : (
              <div className="thumb" key={activeModalItem.teamName}>
                <CardThumbnail item={activeModalItem} />
                {videoEmbed && (
                  <button
                    type="button"
                    className="playbtn"
                    onClick={() => setPlayingVideoFor(activeModalItem.teamName)}
                  >
                    <VidIcon />
                    Putar video demo
                  </button>
                )}
              </div>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              className="btn ico mclose"
              aria-label="Tutup"
              title="Tutup (Esc)"
              onClick={closeModal}
            >
              <X aria-hidden="true" />
            </button>
            <div className="dbody p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="mono muted flex flex-wrap items-center gap-2 text-xs">
                  Oleh {activeModalItem.teamName}
                  {activeModalItem.demoOk && <DemoOkMark />}
                </p>
                {modal.list.length > 1 && (
                  <span className="mono muted text-xs" aria-live="polite">
                    {modal.index + 1} / {modal.list.length}
                  </span>
                )}
              </div>
              <h3 className="mt-1 font-extrabold text-2xl tracking-tight">{activeModalItem.title}</h3>
              <p className="mt-3 leading-relaxed text-sm sm:text-base">{activeModalItem.description}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <ActionButtons item={activeModalItem} isModal />
                <button type="button" className="btn" onClick={() => void shareItem(activeModalItem)}>
                  <Share2 aria-hidden="true" className="size-4" />
                  Bagikan
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-pressed={visitorProps(activeModalItem).saved}
                  onClick={visitorProps(activeModalItem).onToggleSave}
                >
                  <Bookmark aria-hidden="true" className="size-4" />
                  {visitorProps(activeModalItem).saved ? "Tersimpan" : "Simpan"}
                </button>
              </div>
              {similarItems.length > 0 && (
                <div className="similar mt-6">
                  <p className="mono muted mb-2 text-xs">Karya serupa</p>
                  <ul className="grid grid-cols-3 gap-2">
                    {similarItems.map((item) => (
                      <li key={item.teamName} className="min-w-0">
                        <button type="button" className="simcard" onClick={() => openModal(item, allVisible)}>
                          <span className="thumb">
                            <CardThumbnail item={item} />
                          </span>
                          <span className="simtitle">{item.title}</span>
                          <span className="mono muted simteam">{item.teamName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mnav mt-5">
                <button
                  type="button"
                  className="btn"
                  onClick={() => stepModal(-1)}
                  disabled={modal.list.length < 2}
                  aria-label="Karya sebelumnya"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>
                <button type="button" className="btn" onClick={openRandom} disabled={allVisible.length < 2}>
                  <Shuffle aria-hidden="true" className="size-4" />
                  Acak
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => stepModal(1)}
                  disabled={modal.list.length < 2}
                  aria-label="Karya berikutnya"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finish moment: shown once, when the visitor has opened every project */}
      {showFinish && (
        <div className="finish box" role="status">
          <p className="font-extrabold text-lg leading-tight">Kamu sudah menjelajah semua {allVisible.length} karya!</p>
          <p className="muted mt-1 text-sm">
            Terima kasih sudah mengenal para penjaga digital. Ajak temanmu ikut menjelajah.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn pri slim-cta" onClick={() => void shareGallery()}>
              <Share2 aria-hidden="true" className="size-4" />
              Bagikan galeri
            </button>
            {!isWin && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  downloadReminder();
                  setShowFinish(false);
                }}
              >
                <BellRing aria-hidden="true" className="size-4" />
                Ingatkan saya 25 Nov
              </button>
            )}
            <button type="button" className="btn" onClick={() => setShowFinish(false)}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents

function SkeletonCard() {
  return (
    <article className="card box sk">
      <div className="thumb hatch">
        <LockIcon />
      </div>
      <div className="cb">
        <i className="bar" style={{ width: "38%", height: "0.8rem" }} />
        <i className="bar" style={{ width: "80%", height: "1.3rem", marginTop: "8px" }} />
        <i className="bar" style={{ width: "100%", marginTop: "14px" }} />
        <i className="bar" style={{ width: "92%" }} />
        <i className="bar" style={{ width: "55%" }} />
        <div className="act">
          <span className="btn pri off">Buka demo</span>
          <span className="btn ico off">
            <GhIcon />
          </span>
          <span className="btn ico off">
            <VidIcon />
          </span>
        </div>
      </div>
    </article>
  );
}

function SkeletonRow() {
  return (
    <article className="row sk">
      <div className="thumb hatch">
        <LockIcon />
      </div>
      <div className="min-w-0">
        <i className="bar" style={{ width: "30%", height: "0.8rem" }} />
        <i className="bar" style={{ width: "70%", height: "1.4rem", marginTop: "8px" }} />
      </div>
      <div className="act">
        <span className="btn pri off">Buka demo</span>
        <span className="btn ico off">
          <GhIcon />
        </span>
        <span className="btn ico off">
          <VidIcon />
        </span>
      </div>
    </article>
  );
}

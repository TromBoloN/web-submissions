"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { FlaskConical } from "lucide-react";

import { RankingList } from "@/app/(main)/_components/ranking/ranking-list";
import { RankingPodium } from "@/app/(main)/_components/ranking/ranking-podium";
import { HERO_TITLE_ID, MAIN_ID, type RankingRow } from "@/app/(main)/_components/ranking/ranking-shared";
import { APP_CONFIG } from "@/config/app-config";
import { deleteClientCookie, setClientCookie } from "@/lib/cookie.client";

import { RankingHero } from "./ranking-hero";
import { MEDAL_COOKIE, MEDAL_TIERS, type ReleaseKey, rankTier, SEEN_COOKIE } from "./ranking-tier";
import { RevealIntro } from "./reveal-intro";
import { StickyOwnBar } from "./sticky-own-bar";

export type { RankingRow } from "@/app/(main)/_components/ranking/ranking-shared";

const COOKIE_DAYS = 365;

export function PeringkatClient({
  rows,
  provisional,
  playIntro,
  releaseKey,
  seenThisRelease,
}: {
  rows: RankingRow[];
  provisional: boolean;
  /** Server decision (cookie + tier): show the reveal intro on this load. */
  playIntro: boolean;
  releaseKey: ReleaseKey;
  /** The seen cookie already matched this release when the page was rendered. */
  seenThisRelease: boolean;
}) {
  const router = useRouter();
  const own = rows.find((row) => row.is_own_team);
  const tier = own ? rankTier(own, rows.length) : null;

  // Captured once: a later router.refresh() must not interrupt or restart a running intro.
  const [introPlaying, setIntroPlaying] = useState(playIntro && own !== undefined);
  const markedRef = useRef<boolean>(false);

  /** Presentation-only cookies for the sidebar (seen + medal); refresh once so the layout picks them up. */
  const markSeen = useCallback(() => {
    if (markedRef.current) return;
    markedRef.current = true;
    setClientCookie(SEEN_COOKIE, releaseKey, COOKIE_DAYS);
    if (tier && MEDAL_TIERS.has(tier)) setClientCookie(MEDAL_COOKIE, tier, COOKIE_DAYS);
    else deleteClientCookie(MEDAL_COOKIE);
    if (!seenThisRelease) router.refresh();
  }, [releaseKey, tier, seenThisRelease, router]);

  const handleIntroDone = useCallback(() => {
    setIntroPlaying(false);
    markSeen();
    requestAnimationFrame(() => document.getElementById(HERO_TITLE_ID)?.focus({ preventScroll: true }));
  }, [markSeen]);

  // No intro on this load: the page itself counts as seen.
  useEffect(() => {
    if (!playIntro) markSeen();
  }, [playIntro, markSeen]);

  const podium = rows.filter((row) => row.score !== null && row.rank <= 3).slice(0, 3);
  const podiumSet = new Set(podium);
  const rest = rows.filter((row) => !podiumSet.has(row));
  const finalists = rest.filter((row) => row.stage === "final");
  const others = rest.filter((row) => row.stage !== "final");

  return (
    <>
      {introPlaying && own && tier && (
        <RevealIntro own={own} tier={tier} eventName={APP_CONFIG.name} onDone={handleIntroDone} />
      )}

      <div id={MAIN_ID} className="space-y-8">
        <RankingHero own={own} rows={rows} provisional={provisional} revealDone={!introPlaying} />

        {provisional && (
          <p className="surface-calm flex items-start gap-2 p-3 text-muted-foreground text-xs">
            <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Ini peringkat sementara: hasil babak final belum dirilis resmi, sehingga urutan dapat berubah.
          </p>
        )}

        {rows.length === 0 ? (
          <p className="surface-calm p-6 text-center text-muted-foreground text-sm">Peringkat belum tersedia.</p>
        ) : (
          <>
            {podium.length > 0 && <RankingPodium rows={podium} all={rows} />}
            <RankingList title="Finalis · nilai babak final" rows={finalists} />
            <RankingList title="Babak awal · nilai babak awal" rows={others} />
            <p className="text-center text-muted-foreground text-xs italic">
              Nilai adalah rata-rata total berbobot dari dewan juri. Keputusan dewan juri bersifat mutlak sesuai Juknis.
            </p>
          </>
        )}

        {own && !introPlaying && <StickyOwnBar own={own} />}
      </div>
    </>
  );
}

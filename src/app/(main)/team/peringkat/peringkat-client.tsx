"use client";

import { FlaskConical } from "lucide-react";

import { RankingHero } from "./ranking-hero";
import { RankingList } from "./ranking-list";
import { RankingPodium } from "./ranking-podium";
import type { RankingRow } from "./ranking-shared";
import { StickyOwnBar } from "./sticky-own-bar";

export type { RankingRow } from "./ranking-shared";

export function PeringkatClient({ rows, provisional }: { rows: RankingRow[]; provisional: boolean }) {
  const own = rows.find((row) => row.is_own_team);
  const podium = rows.filter((row) => row.score !== null && row.rank <= 3).slice(0, 3);
  const podiumSet = new Set(podium);
  const rest = rows.filter((row) => !podiumSet.has(row));
  const finalists = rest.filter((row) => row.stage === "final");
  const others = rest.filter((row) => row.stage !== "final");

  return (
    <div className="space-y-8">
      <RankingHero own={own} rows={rows} provisional={provisional} />

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

      {own && <StickyOwnBar own={own} />}
    </div>
  );
}

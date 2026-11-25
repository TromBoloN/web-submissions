"use client";

import { FlaskConical } from "lucide-react";

import { RankingList } from "@/app/(main)/_components/ranking/ranking-list";
import { RankingPodium } from "@/app/(main)/_components/ranking/ranking-podium";
import { MAIN_ID, type RankingRow } from "@/app/(main)/_components/ranking/ranking-shared";
import type { Database } from "@/types/database";

import { JudgeRankingHero } from "./judge-ranking-hero";

export function JudgePeringkatClient({
  rows,
  provisional,
  judgeName,
  judgeStage,
  scoredPreliminary,
  scoredFinal,
}: {
  rows: RankingRow[];
  provisional: boolean;
  judgeName: string;
  judgeStage: Database["public"]["Enums"]["judge_stage_type"] | null;
  /** The judge's own submitted scores per stage; null when the count could not be loaded. */
  scoredPreliminary: number | null;
  scoredFinal: number | null;
}) {
  // A judge has no own team: highlight nothing, even if the RPC ever returned a truthy flag.
  const neutralRows = rows.map((row) => ({ ...row, is_own_team: false }));

  const podium = neutralRows.filter((row) => row.score !== null && row.rank <= 3).slice(0, 3);
  const podiumSet = new Set(podium);
  const rest = neutralRows.filter((row) => !podiumSet.has(row));
  const finalists = rest.filter((row) => row.stage === "final");
  const others = rest.filter((row) => row.stage !== "final");

  return (
    <div id={MAIN_ID} className="space-y-8">
      <JudgeRankingHero
        rows={neutralRows}
        provisional={provisional}
        judgeName={judgeName}
        judgeStage={judgeStage}
        scoredPreliminary={scoredPreliminary}
        scoredFinal={scoredFinal}
      />

      {provisional && (
        <p className="surface-calm flex items-start gap-2 p-3 text-muted-foreground text-xs">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Ini peringkat sementara: hasil babak final belum dirilis resmi, sehingga urutan dapat berubah.
        </p>
      )}

      {neutralRows.length === 0 ? (
        <p className="surface-calm p-6 text-center text-muted-foreground text-sm">Peringkat belum tersedia.</p>
      ) : (
        <>
          {podium.length > 0 && <RankingPodium rows={podium} all={neutralRows} />}
          <RankingList title="Finalis · nilai babak final" rows={finalists} />
          <RankingList title="Babak awal · nilai babak awal" rows={others} />
          <p className="text-center text-muted-foreground text-xs italic">
            Nilai adalah rata-rata total berbobot dari dewan juri. Keputusan dewan juri bersifat mutlak sesuai Juknis.
          </p>
        </>
      )}
    </div>
  );
}

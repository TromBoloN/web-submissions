import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRELIMINARY_RUBRIC } from "@/lib/rubric";

/** One anonymous preliminary score, as returned by get_preliminary_scores_for_final(). */
export interface PreliminaryReviewScore {
  judgeLabel: number;
  scores: Record<string, number | null>;
  totalWeightedScore: number | null;
  feedback: string | null;
}

function formatScore(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? "-" : value.toFixed(2);
}

/** Read-only panel for final judges: final-status preliminary scores and comments, judges anonymized. */
export function PreliminaryReview({ scores }: { scores: PreliminaryReviewScore[] }) {
  const totals = scores.map((s) => s.totalWeightedScore).filter((v): v is number => v !== null);
  const average = totals.length > 0 ? totals.reduce((sum, v) => sum + v, 0) / totals.length : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" aria-hidden="true" />
              Nilai Babak Awal
            </CardTitle>
            <CardDescription>
              Nilai final dan masukan dari juri babak awal (hanya baca). Identitas juri tidak ditampilkan.
            </CardDescription>
          </div>
          {average !== null && (
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Rata-rata</p>
              <p className="font-bold font-mono text-lg text-primary">{formatScore(average)}</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {scores.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-muted-foreground text-sm">
            Belum ada nilai final babak awal untuk tim ini.
          </p>
        ) : (
          <ul className="space-y-3">
            {scores.map((s) => (
              <li key={s.judgeLabel} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">Juri {s.judgeLabel}</p>
                  <Badge variant="secondary" className="font-mono">
                    Total {formatScore(s.totalWeightedScore)}
                  </Badge>
                </div>

                <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                  {PRELIMINARY_RUBRIC.map((criterion) => (
                    <div key={criterion.column} className="flex items-baseline justify-between gap-3">
                      <dt className="min-w-0 truncate text-muted-foreground">
                        {criterion.label} <span className="text-xs">({criterion.weight}%)</span>
                      </dt>
                      <dd className="shrink-0 font-mono">{formatScore(s.scores[criterion.column])}</dd>
                    </div>
                  ))}
                </dl>

                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground text-xs">Masukan</p>
                  {s.feedback?.trim() ? (
                    <p className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2.5 text-sm leading-relaxed">
                      {s.feedback}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">Tidak ada masukan.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

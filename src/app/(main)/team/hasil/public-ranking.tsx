import { cn } from "cn";
import { FlaskConical, ListOrdered } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type PublicRankingRow = {
  rank: number;
  team_name: string;
  institution: string;
  stage: string;
  score: number | null;
  is_own_team: boolean;
};

const scoreFormatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatScore(val: number | null): string {
  if (val === null || Number.isNaN(Number(val))) return "-";
  return scoreFormatter.format(Number(val));
}

export function PublicRanking({
  rows,
  provisional,
  failed,
}: {
  rows: PublicRankingRow[];
  provisional: boolean;
  failed: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ListOrdered className="size-4 text-primary" />
          Peringkat Akhir
          {provisional && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              <FlaskConical className="size-3" />
              Peringkat sementara
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Urutan seluruh tim dari pertama sampai terakhir. Finalis diurutkan berdasarkan nilai babak final, tim lainnya
          berdasarkan nilai babak awal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {failed && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            Gagal memuat peringkat. Silakan coba beberapa saat lagi.
          </p>
        )}
        {!failed && rows.length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
            Peringkat belum tersedia.
          </p>
        )}
        {!failed && rows.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Peringkat</TableHead>
                  <TableHead>Tim</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={`${row.rank}-${row.team_name}`}
                    className={cn(row.is_own_team && "bg-primary/5 hover:bg-primary/10")}
                    aria-current={row.is_own_team ? "true" : undefined}
                  >
                    <TableCell className="text-center font-semibold tabular-nums">{row.rank}</TableCell>
                    <TableCell className="max-w-0 whitespace-normal">
                      <p className="break-words font-medium text-sm">
                        {row.team_name}
                        {row.is_own_team && (
                          <Badge variant="outline" className="ml-2 border-primary/40 text-primary text-xs">
                            Tim Anda
                          </Badge>
                        )}
                      </p>
                      <p className="break-words text-muted-foreground text-xs">{row.institution}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="block font-semibold text-sm tabular-nums">{formatScore(row.score)}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.stage === "final" ? "Final" : "Babak awal"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

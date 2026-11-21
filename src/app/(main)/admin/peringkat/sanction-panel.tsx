"use client";

import { useId, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Gavel, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { getRubricForStage, type ScoringStage } from "@/lib/rubric";

import { addScoreSanction, removeScoreSanction } from "./actions";

export interface ScoreSanctionDetail {
  id: string;
  criterion: string;
  points: number;
  reason: string;
  created_at: string;
}

interface SanctionPanelProps {
  teamId: string;
  stage: ScoringStage;
  sanctions: ScoreSanctionDetail[];
  /** Average of final-status judge scores per criterion column (null when no scores yet). */
  criterionAverages: Record<string, number | null>;
  available: boolean;
}

const REASON_MAX = 1000;

function formatScore(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : value.toFixed(2);
}

function formatWita(iso: string): string {
  return `${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(new Date(iso))} WITA`;
}

/** Admin-only: deduct points from one criterion of a team's stage average, with a reason the team will read. */
export function SanctionPanel({ teamId, stage, sanctions, criterionAverages, available }: SanctionPanelProps) {
  const router = useRouter();
  const formId = useId();
  const rubric = getRubricForStage(stage);
  const [criterion, setCriterion] = useState(rubric[0]?.column ?? "");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const labelFor = (column: string) => rubric.find((c) => c.column === column)?.label ?? column;

  // Effective view per criterion: judges' average, total sanction points, and the result floored at 0.
  const pointsByCriterion = new Map<string, number>();
  for (const s of sanctions) {
    pointsByCriterion.set(s.criterion, (pointsByCriterion.get(s.criterion) ?? 0) + s.points);
  }
  const affected = rubric
    .filter((c) => pointsByCriterion.has(c.column))
    .map((c) => {
      const avg = criterionAverages[c.column] ?? null;
      const pts = pointsByCriterion.get(c.column) ?? 0;
      return { column: c.column, label: c.label, avg, pts, after: avg === null ? null : Math.max(avg - pts, 0) };
    });

  const parsedPoints = Number(points.replace(",", "."));
  const canSubmit =
    available &&
    !isPending &&
    criterion !== "" &&
    Number.isFinite(parsedPoints) &&
    parsedPoints > 0 &&
    parsedPoints <= 100 &&
    reason.trim().length >= 5;

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      const res = await addScoreSanction({ teamId, stage, criterion, points: parsedPoints, reason });
      if (res.ok) {
        toast.success("Sanksi diterapkan. Nilai dan peringkat diperbarui.");
        setPoints("");
        setReason("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleRemove(sanctionId: string) {
    startTransition(async () => {
      const res = await removeScoreSanction({ sanctionId });
      setConfirmingId(null);
      if (res.ok) {
        toast.success("Sanksi dihapus. Nilai dan peringkat diperbarui.");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Card className="border-destructive/30 shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gavel className="size-4 text-destructive" aria-hidden="true" />
          Sanksi Nilai
        </CardTitle>
        <CardDescription className="text-xs">
          Kurangi rata-rata nilai juri pada satu kriteria. Nilai kriteria paling rendah 0. Alasan akan ditampilkan
          kepada tim pada halaman hasil.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-2">
        {!available && (
          <p className="rounded-md border border-dashed p-3 text-muted-foreground text-xs">
            Fitur sanksi belum aktif. Terapkan migrasi basis data sanksi terlebih dahulu.
          </p>
        )}

        {affected.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {affected.map((a) => (
              <li key={a.column} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">{a.label}</span>
                <span className="shrink-0 font-mono">
                  {formatScore(a.avg)} <span className="text-destructive">−{formatScore(a.pts)}</span> ={" "}
                  <strong>{formatScore(a.after)}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}

        {sanctions.length > 0 && (
          <ul className="space-y-2">
            {sanctions.map((s) => (
              <li key={s.id} className="space-y-1.5 rounded-md border bg-muted/30 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Badge variant="destructive" className="font-mono text-[10px]">
                      −{formatScore(s.points)}
                    </Badge>
                    <span className="font-medium text-xs">{labelFor(s.criterion)}</span>
                    <span className="text-[11px] text-muted-foreground">{formatWita(s.created_at)}</span>
                  </div>
                  {confirmingId === s.id ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        disabled={isPending}
                        onClick={() => handleRemove(s.id)}
                      >
                        Ya, hapus
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={isPending}
                        onClick={() => setConfirmingId(null)}
                      >
                        Batal
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={!available || isPending}
                      onClick={() => setConfirmingId(s.id)}
                      aria-label={`Hapus sanksi ${labelFor(s.criterion)} −${formatScore(s.points)}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{s.reason}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="space-y-3 rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-criterion`} className="text-xs">
                Kriteria
              </Label>
              <NativeSelect
                id={`${formId}-criterion`}
                value={criterion}
                onChange={(e) => setCriterion(e.target.value)}
                disabled={!available || isPending}
                className="w-full"
              >
                {rubric.map((c) => (
                  <NativeSelectOption key={c.column} value={c.column}>
                    {c.label} ({c.weight}%) · rata-rata {formatScore(criterionAverages[c.column])}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-points`} className="text-xs">
                Poin dikurangi
              </Label>
              <Input
                id={`${formId}-points`}
                type="number"
                inputMode="decimal"
                min={0.01}
                max={100}
                step={0.01}
                placeholder="mis. 10"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                disabled={!available || isPending}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor={`${formId}-reason`} className="text-xs">
                Alasan (dibaca oleh tim)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {reason.trim().length}/{REASON_MAX}
              </span>
            </div>
            <Textarea
              id={`${formId}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REASON_MAX}
              rows={3}
              placeholder="Jelaskan pelanggaran dan dasar sanksi. Minimal 5 karakter."
              disabled={!available || isPending}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="destructive" disabled={!canSubmit}>
              {isPending ? "Menyimpan…" : "Terapkan sanksi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

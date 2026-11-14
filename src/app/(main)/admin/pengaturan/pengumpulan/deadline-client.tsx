"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { CalendarClock, Info } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDeadlineWita, toWitaDateTimeLocalString } from "@/lib/deadline";

import { updateCompetitionDeadline } from "../actions";
import { formatWitaTimestamp } from "../settings-utils";

export function DeadlineClient({
  currentClosesAt,
  updatedAt,
}: {
  currentClosesAt: string | null;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [deadlineInput, setDeadlineInput] = useState(() => toWitaDateTimeLocalString(currentClosesAt));
  const [deadlineError, setDeadlineError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const formattedUpdatedAt = formatWitaTimestamp(updatedAt);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeadlineError(undefined);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateCompetitionDeadline(form);
      if (!result.success) {
        setDeadlineError(result.error);
        return;
      }
      toast.success("Batas waktu pengiriman berhasil diperbarui.");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-5 shrink-0 text-primary" />
          Batas Akhir Pengiriman
        </CardTitle>
        <CardDescription>
          Atur menit terakhir penerimaan submission dari peserta. Semua waktu diinterpretasikan dalam WITA (UTC+8).
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs">Batas waktu aktif</p>
            <p className="font-semibold text-base sm:text-lg">{formatDeadlineWita(currentClosesAt)}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Batas akhir pengiriman (WITA)</Label>
            <Input
              id="deadline"
              name="deadline"
              type="datetime-local"
              value={deadlineInput}
              onChange={(event) => setDeadlineInput(event.target.value)}
              required
              aria-invalid={Boolean(deadlineError)}
              aria-describedby="deadline-hint"
              className="w-full font-mono sm:max-w-md"
            />
            <p id="deadline-hint" className="text-muted-foreground text-xs">
              Peserta tidak bisa mengirim atau mengubah submission setelah waktu ini.
            </p>
          </div>

          <Alert className="border-primary/20 bg-primary/5 text-foreground">
            <Info className="size-4 text-primary" />
            <AlertDescription className="text-xs">
              Waktu diinterpretasikan dalam <strong>Waktu Indonesia Tengah (WITA, UTC+8)</strong>. Menit yang Anda pilih
              merupakan menit terakhir yang masih diterima sistem.
            </AlertDescription>
          </Alert>

          {deadlineError && (
            <p role="alert" className="text-destructive text-sm">
              {deadlineError}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col-reverse items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {formattedUpdatedAt ? `Pengaturan diperbarui: ${formattedUpdatedAt}` : "Belum pernah diperbarui."}
          </p>
          <Button type="submit" disabled={isPending} className="press">
            {isPending ? "Menyimpan..." : "Simpan batas waktu"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

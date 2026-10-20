"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { CalendarClock, Clock, Info } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDeadlineWita, toWitaDateTimeLocalString } from "@/lib/deadline";

import { updateCompetitionDeadline } from "./actions";

type SettingsClientProps = {
  currentClosesAt: string | null;
  updatedAt: string | null;
};

function formatUpdatedAt(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "medium",
  }).format(date)} WITA`;
}

export function SettingsClient({ currentClosesAt, updatedAt }: SettingsClientProps) {
  const router = useRouter();
  const [deadlineInput, setDeadlineInput] = useState(() => toWitaDateTimeLocalString(currentClosesAt));
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const formattedCurrentDeadline = formatDeadlineWita(currentClosesAt);
  const formattedUpdatedAt = formatUpdatedAt(updatedAt);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateCompetitionDeadline(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Batas waktu pengiriman berhasil diperbarui.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola konfigurasi dan batas waktu kompetisi MIT-WEEK 2026.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-5 text-primary" />
                Batas Akhir Pengiriman (Submission)
              </CardTitle>
              <CardDescription>
                Atur waktu menit terakhir penerimaan submission dari peserta. Semua waktu diinterpretasikan dalam WITA
                (UTC+8).
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deadline">Batas akhir pengiriman (WITA)</Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="datetime-local"
                    value={deadlineInput}
                    onChange={(event) => setDeadlineInput(event.target.value)}
                    required
                    className="max-w-md font-mono"
                  />
                  <p className="text-muted-foreground text-xs">
                    Peserta tidak bisa mengirim atau mengubah submission setelah waktu ini.
                  </p>
                </div>

                <Alert className="border-primary/20 bg-primary/5 text-foreground">
                  <Info className="size-4 text-primary" />
                  <AlertDescription className="text-xs">
                    Waktu diinterpretasikan dalam <strong>Waktu Indonesia Tengah (WITA, UTC+8)</strong>. Menit yang Anda
                    pilih merupakan menit terakhir yang masih diterima sistem.
                  </AlertDescription>
                </Alert>

                {error && <p className="text-destructive text-sm">{error}</p>}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-muted-foreground" />
                Status Batas Waktu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Batas waktu aktif:</span>
                <p className="font-semibold text-foreground text-lg">{formattedCurrentDeadline}</p>
              </div>
              {formattedUpdatedAt && (
                <div className="border-t pt-2">
                  <span className="text-muted-foreground text-xs">Terakhir diperbarui:</span>
                  <p className="text-muted-foreground text-xs">{formattedUpdatedAt}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

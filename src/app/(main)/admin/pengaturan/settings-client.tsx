"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { BookOpen, CalendarClock, Clock, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDeadlineWita, toWitaDateTimeLocalString } from "@/lib/deadline";

import { updateCompetitionDeadline, updateJuknisUrl } from "./actions";

type SettingsClientProps = {
  currentClosesAt: string | null;
  currentJuknisUrl: string | null;
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

export function SettingsClient({ currentClosesAt, currentJuknisUrl, updatedAt }: SettingsClientProps) {
  const router = useRouter();
  const [deadlineInput, setDeadlineInput] = useState(() => toWitaDateTimeLocalString(currentClosesAt));
  const [deadlineError, setDeadlineError] = useState<string>();
  const [isDeadlinePending, startDeadlineTransition] = useTransition();

  const [juknisInput, setJuknisInput] = useState(currentJuknisUrl ?? "");
  const [juknisError, setJuknisError] = useState<string>();
  const [isJuknisPending, startJuknisTransition] = useTransition();

  const formattedCurrentDeadline = formatDeadlineWita(currentClosesAt);
  const formattedUpdatedAt = formatUpdatedAt(updatedAt);
  const canOpenSavedUrl = Boolean(currentJuknisUrl?.startsWith("https://"));

  const handleDeadlineSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeadlineError(undefined);
    const form = new FormData(event.currentTarget);

    startDeadlineTransition(async () => {
      const result = await updateCompetitionDeadline(form);
      if (!result.success) {
        setDeadlineError(result.error);
        return;
      }
      toast.success("Batas waktu pengiriman berhasil diperbarui.");
      router.refresh();
    });
  };

  const handleJuknisSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJuknisError(undefined);
    const form = new FormData(event.currentTarget);

    startJuknisTransition(async () => {
      const result = await updateJuknisUrl(form);
      if (!result.success) {
        setJuknisError(result.error);
        return;
      }
      toast.success("Tautan juknis berhasil diperbarui.");
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
        <div className="space-y-6 md:col-span-2">
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
            <form onSubmit={handleDeadlineSubmit}>
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

                {deadlineError && <p className="text-destructive text-sm">{deadlineError}</p>}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button type="submit" disabled={isDeadlinePending}>
                  {isDeadlinePending ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="size-5 text-primary" />
                    Tautan Juknis
                  </CardTitle>
                  <CardDescription>
                    Tautan dokumen petunjuk teknis kompetisi. Tautan yang tersimpan dapat dibuka oleh peserta dan juri.
                  </CardDescription>
                </div>
                {canOpenSavedUrl && currentJuknisUrl && (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <a href={currentJuknisUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 size-4" />
                      Buka tautan
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <form onSubmit={handleJuknisSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="juknis_url">Tautan Juknis (Google Drive)</Label>
                  <Input
                    id="juknis_url"
                    name="juknis_url"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={juknisInput}
                    onChange={(event) => setJuknisInput(event.target.value)}
                    maxLength={500}
                    className="font-mono text-sm"
                  />
                  <p className="text-muted-foreground text-xs">
                    Tempel tautan Google Drive. Pastikan akses diatur &apos;Siapa saja yang memiliki link&apos;.
                    Kosongkan untuk menghapus tautan.
                  </p>
                </div>

                {juknisError && <p className="text-destructive text-sm">{juknisError}</p>}
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
                <div className="text-muted-foreground text-xs">
                  {currentJuknisUrl ? (
                    <span className="block max-w-xs truncate font-mono md:max-w-sm" title={currentJuknisUrl}>
                      Tersimpan: {currentJuknisUrl}
                    </span>
                  ) : (
                    <span>Belum ada tautan tersimpan.</span>
                  )}
                </div>
                <Button type="submit" disabled={isJuknisPending}>
                  {isJuknisPending ? "Menyimpan..." : "Simpan"}
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
                Status Pengaturan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Batas waktu aktif:</span>
                <p className="font-semibold text-foreground text-lg">{formattedCurrentDeadline}</p>
              </div>
              <div className="border-t pt-3">
                <span className="text-muted-foreground text-xs">Tautan juknis aktif:</span>
                {canOpenSavedUrl && currentJuknisUrl ? (
                  <p className="mt-0.5 truncate font-mono text-foreground text-xs" title={currentJuknisUrl}>
                    {currentJuknisUrl}
                  </p>
                ) : (
                  <p className="mt-0.5 text-muted-foreground text-xs">Belum diatur</p>
                )}
              </div>
              {formattedUpdatedAt && (
                <div className="border-t pt-3">
                  <span className="text-muted-foreground text-xs">Terakhir diperbarui:</span>
                  <p className="mt-0.5 text-muted-foreground text-xs">{formattedUpdatedAt}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

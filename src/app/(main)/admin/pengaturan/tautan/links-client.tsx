"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { BookOpen, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";

import { updateContactWhatsapp, updateJuknisUrl } from "../actions";

function JuknisCard({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(currentUrl ?? "");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const canOpen = Boolean(currentUrl?.startsWith("https://"));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateJuknisUrl(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Tautan juknis berhasil diperbarui.");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5 shrink-0 text-primary" />
              Tautan Juknis
            </CardTitle>
            <CardDescription>Dokumen petunjuk teknis yang dapat dibuka peserta dan juri dari sidebar.</CardDescription>
          </div>
          {canOpen && currentUrl && (
            <Button asChild variant="outline" size="sm" className="w-fit shrink-0">
              <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-4" />
                Buka tautan
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="juknis_url">Tautan juknis (Google Drive)</Label>
            <Input
              id="juknis_url"
              name="juknis_url"
              type="url"
              placeholder="https://drive.google.com/..."
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={500}
              aria-describedby="juknis-hint"
              className="font-mono text-sm"
            />
            <p id="juknis-hint" className="text-muted-foreground text-xs">
              Pastikan akses diatur &apos;Siapa saja yang memiliki link&apos;. Kosongkan untuk menghapus tautan.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col-reverse items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate text-muted-foreground text-xs" title={currentUrl ?? undefined}>
            {currentUrl ? `Tersimpan: ${currentUrl}` : "Belum ada tautan tersimpan."}
          </p>
          <Button type="submit" disabled={isPending} className="press shrink-0">
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ContactCard({ currentNumber }: { currentNumber: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(currentNumber ?? "");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const formatted = formatWhatsAppNumber(currentNumber);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateContactWhatsapp(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Nomor WhatsApp panitia berhasil diperbarui.");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 shrink-0 text-primary" />
              Kontak Bantuan
            </CardTitle>
            <CardDescription>Nomor WhatsApp panitia di halaman masuk dan dasbor peserta.</CardDescription>
          </div>
          {currentNumber && (
            <Button asChild variant="outline" size="sm" className="w-fit shrink-0">
              <a href={toWhatsAppUrl(currentNumber)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-4" />
                Buka WhatsApp
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="contact_whatsapp">Nomor WhatsApp panitia</Label>
            <Input
              id="contact_whatsapp"
              name="contact_whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="6281234567890"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={30}
              aria-describedby="contact-hint"
              className="w-full font-mono text-sm sm:max-w-md"
            />
            <p id="contact-hint" className="text-muted-foreground text-xs">
              Format lokal <code>08...</code> atau internasional <code>628...</code>. Tanda +, spasi, titik, dan tanda
              hubung diperbolehkan. Kosongkan untuk menyembunyikan kontak bantuan.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col-reverse items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {formatted ? `Tersimpan: ${formatted}` : "Belum ada nomor tersimpan."}
          </p>
          <Button type="submit" disabled={isPending} className="press shrink-0">
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function LinksClient({
  currentJuknisUrl,
  currentContactWhatsapp,
}: {
  currentJuknisUrl: string | null;
  currentContactWhatsapp: string | null;
}) {
  return (
    <div className="space-y-6">
      <JuknisCard currentUrl={currentJuknisUrl} />
      <ContactCard currentNumber={currentContactWhatsapp} />
    </div>
  );
}

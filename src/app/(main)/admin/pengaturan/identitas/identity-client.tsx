"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Presentation, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { type ActionResult, updateEventIdentity, updateFinalPresentation } from "../actions";
import { formatWitaTimestamp } from "../settings-utils";

type Identity = {
  event_name: string;
  event_track: string;
  finalist_count: number;
  gallery_new_badge_days: number;
};

type FinalDetails = {
  presentation_minutes: number;
  qa_minutes: number;
  venue: string;
  meeting_url: string | null;
  note: string;
  logistics_published: boolean;
  updated_at: string;
};

/** Shared submit flow: FormData to a server action, inline error, toast and refresh on success. */
function useSettingsForm(action: (form: FormData) => Promise<ActionResult>, successMessage: string) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  };

  return { error, isPending, onSubmit };
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

function FormFooter({ isPending, note }: { isPending: boolean; note?: string }) {
  return (
    <CardFooter className="flex flex-col-reverse items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-xs">{note}</p>
      <Button type="submit" disabled={isPending} className="press w-full shrink-0 sm:w-auto">
        {isPending ? "Menyimpan..." : "Simpan"}
      </Button>
    </CardFooter>
  );
}

function IdentityCard({ identity }: { identity: Identity }) {
  const { error, isPending, onSubmit } = useSettingsForm(updateEventIdentity, "Identitas acara berhasil disimpan.");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
          Identitas Acara
        </CardTitle>
        <CardDescription>
          Nama acara tampil di judul halaman, sidebar, galeri, halaman masuk, dan kartu pencapaian.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <Field id="event_name" label="Nama acara" hint="Contoh: MIT-WEEK 2027. Maksimal 60 karakter.">
            <Input
              id="event_name"
              name="event_name"
              defaultValue={identity.event_name}
              required
              maxLength={60}
              aria-describedby="event_name-hint"
              className="w-full sm:max-w-md"
            />
          </Field>
          <Field id="event_track" label="Bidang lomba" hint="Contoh: Web Development.">
            <Input
              id="event_track"
              name="event_track"
              defaultValue={identity.event_track}
              required
              maxLength={60}
              aria-describedby="event_track-hint"
              className="w-full sm:max-w-md"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="finalist_count"
              label="Jumlah finalis"
              hint='Dipakai untuk teks seperti "Top 5". Finalis tetap dipilih manual.'
            >
              <Input
                id="finalist_count"
                name="finalist_count"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                defaultValue={identity.finalist_count}
                required
                aria-describedby="finalist_count-hint"
              />
            </Field>
            <Field
              id="gallery_new_badge_days"
              label='Label "Baru" di Galeri (hari)'
              hint="Lama label tampil setelah galeri terbit. 0 = tidak tampil."
            >
              <Input
                id="gallery_new_badge_days"
                name="gallery_new_badge_days"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                defaultValue={identity.gallery_new_badge_days}
                required
                aria-describedby="gallery_new_badge_days-hint"
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </CardContent>
        <FormFooter isPending={isPending} />
      </form>
    </Card>
  );
}

function FinalCard({ final }: { final: FinalDetails }) {
  const { error, isPending, onSubmit } = useSettingsForm(
    updateFinalPresentation,
    "Detail babak final berhasil disimpan.",
  );
  const [published, setPublished] = useState(final.logistics_published);
  const updatedAt = formatWitaTimestamp(final.updated_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Presentation className="size-5 shrink-0 text-primary" aria-hidden="true" />
          Babak Final
        </CardTitle>
        <CardDescription>
          Format dan logistik presentasi untuk tim finalis dan juri babak final. Tanggal final diatur di Jadwal.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="presentation_minutes" label="Durasi presentasi (menit)">
              <Input
                id="presentation_minutes"
                name="presentation_minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                defaultValue={final.presentation_minutes}
                required
              />
            </Field>
            <Field id="qa_minutes" label="Durasi tanya jawab (menit)">
              <Input
                id="qa_minutes"
                name="qa_minutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                defaultValue={final.qa_minutes}
                required
              />
            </Field>
          </div>
          <Field id="venue" label="Lokasi" hint="Kosongkan bila daring.">
            <Input
              id="venue"
              name="venue"
              defaultValue={final.venue}
              maxLength={160}
              aria-describedby="venue-hint"
              className="w-full sm:max-w-md"
            />
          </Field>
          <Field id="meeting_url" label="Tautan sesi daring" hint="Hanya https://. Kosongkan bila luring.">
            <Input
              id="meeting_url"
              name="meeting_url"
              type="url"
              placeholder="https://meet.google.com/..."
              defaultValue={final.meeting_url ?? ""}
              maxLength={500}
              aria-describedby="meeting_url-hint"
              className="w-full font-mono text-sm sm:max-w-md"
            />
          </Field>
          <Field id="note" label="Catatan untuk finalis" hint="Maksimal 500 karakter.">
            <Textarea
              id="note"
              name="note"
              defaultValue={final.note}
              maxLength={500}
              rows={3}
              aria-describedby="note-hint"
            />
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor="logistics_published">Tampilkan lokasi dan tautan</Label>
              <p id="logistics_published-hint" className="text-muted-foreground text-xs">
                Selama nonaktif, finalis dan juri hanya melihat format dan catatan.
              </p>
            </div>
            <Switch
              id="logistics_published"
              name="logistics_published"
              checked={published}
              onCheckedChange={setPublished}
              aria-describedby="logistics_published-hint"
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </CardContent>
        <FormFooter isPending={isPending} note={updatedAt ? `Terakhir diperbarui: ${updatedAt}` : undefined} />
      </form>
    </Card>
  );
}

export function IdentityClient({ identity, final }: { identity: Identity; final: FinalDetails }) {
  return (
    <div className="space-y-6">
      <IdentityCard identity={identity} />
      <FinalCard final={final} />
    </div>
  );
}

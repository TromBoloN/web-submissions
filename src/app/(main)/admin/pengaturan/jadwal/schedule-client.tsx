"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatStageDates } from "@/lib/competition-info";

import { deleteStage, saveStage } from "../actions";
import { formatWitaTimestamp } from "../settings-utils";

type Stage = {
  key: string;
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
  time_label: string;
  sort_order: number;
  show_on_track: boolean;
  status_override: string | null;
  is_system: boolean;
  updated_at: string;
};

/** What each built-in stage drives, so a non-developer knows what an edit changes. */
const SYSTEM_HINTS: Record<string, string> = {
  review: "Masa penilaian babak awal. Selama tanggal ini, tim melihat status “sedang dinilai”.",
  top5: "Hari pengumuman finalis.",
  gallery: "Hari galeri karya dibuka. Tanggalnya tampil pada label Galeri di sidebar.",
  final: "Hari presentasi babak final. Tim finalis melihat detail final mulai tanggal ini.",
  winners: "Hari pengumuman juara.",
};

const EMPTY_STAGE: Omit<Stage, "key" | "updated_at"> = {
  title: "",
  description: "",
  starts_on: "",
  ends_on: "",
  time_label: "",
  sort_order: 100,
  show_on_track: true,
  status_override: null,
  is_system: false,
};

function StageForm({
  stage,
  onDone,
}: {
  stage: Omit<Stage, "key" | "updated_at"> & { key?: string; updated_at?: string };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [showOnTrack, setShowOnTrack] = useState(stage.show_on_track);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = stage.key ?? "new";
  const updatedAt = stage.updated_at ? formatWitaTimestamp(stage.updated_at) : null;
  const submitLabel = stage.key ? "Simpan" : "Tambah tahap";

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveStage(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(stage.key ? "Tahap berhasil disimpan." : "Tahap baru ditambahkan.");
      onDone?.();
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!stage.key) return;
    const key = stage.key;
    startTransition(async () => {
      const result = await deleteStage(key);
      setConfirmDelete(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tahap dihapus.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit}>
      {stage.key && <input type="hidden" name="key" value={stage.key} />}
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${id}-title`}>Judul</Label>
            <Input
              id={`${id}-title`}
              name="title"
              defaultValue={stage.title}
              required
              maxLength={80}
              className="w-full sm:max-w-md"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${id}-description`}>Deskripsi singkat</Label>
            <Textarea
              id={`${id}-description`}
              name="description"
              defaultValue={stage.description}
              maxLength={240}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-starts_on`}>Tanggal mulai (WITA)</Label>
            <Input id={`${id}-starts_on`} name="starts_on" type="date" defaultValue={stage.starts_on} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-ends_on`}>Tanggal selesai (WITA)</Label>
            <Input
              id={`${id}-ends_on`}
              name="ends_on"
              type="date"
              defaultValue={stage.ends_on}
              required
              aria-describedby={`${id}-ends_on-hint`}
            />
            <p id={`${id}-ends_on-hint`} className="text-muted-foreground text-xs">
              Sama dengan tanggal mulai untuk acara satu hari.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-time_label`}>Keterangan waktu</Label>
            <Input
              id={`${id}-time_label`}
              name="time_label"
              defaultValue={stage.time_label}
              maxLength={40}
              placeholder="Contoh: 09.00 WITA"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-sort_order`}>Urutan</Label>
            <Input
              id={`${id}-sort_order`}
              name="sort_order"
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              defaultValue={stage.sort_order}
              required
              aria-describedby={`${id}-sort_order-hint`}
            />
            <p id={`${id}-sort_order-hint`} className="text-muted-foreground text-xs">
              Angka kecil tampil lebih dulu.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-status_override`}>Status</Label>
            <NativeSelect
              id={`${id}-status_override`}
              name="status_override"
              defaultValue={stage.status_override ?? "auto"}
              className="w-full"
              aria-describedby={`${id}-status-hint`}
            >
              <NativeSelectOption value="auto">Otomatis (ikuti tanggal)</NativeSelectOption>
              <NativeSelectOption value="upcoming">Paksa: akan datang</NativeSelectOption>
              <NativeSelectOption value="current">Paksa: sedang berlangsung</NativeSelectOption>
              <NativeSelectOption value="done">Paksa: selesai</NativeSelectOption>
            </NativeSelect>
            <p id={`${id}-status-hint`} className="text-muted-foreground text-xs">
              Pakai bila jadwal nyata berbeda dari tanggal, misalnya pengumuman tertunda.
            </p>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor={`${id}-show_on_track`}>Tampil di linimasa tim</Label>
              <p className="text-muted-foreground text-xs">Nonaktifkan untuk tahap yang hanya dipakai sistem.</p>
            </div>
            <Switch
              id={`${id}-show_on_track`}
              name="show_on_track"
              checked={showOnTrack}
              onCheckedChange={setShowOnTrack}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col-reverse items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">{updatedAt ? `Terakhir diperbarui: ${updatedAt}` : null}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {stage.key && !stage.is_system && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmDelete(true)}
              className="press w-full text-destructive sm:w-auto"
            >
              <Trash2 aria-hidden="true" />
              Hapus
            </Button>
          )}
          <Button type="submit" disabled={isPending} className="press w-full sm:w-auto">
            {isPending ? "Menyimpan..." : submitLabel}
          </Button>
        </div>
      </CardFooter>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tahap “{stage.title}”?</AlertDialogTitle>
            <AlertDialogDescription>Tahap ini akan hilang dari linimasa tim dan galeri.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={isPending}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export function ScheduleClient({ stages }: { stages: Stage[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Semua tanggal adalah hari kalender WITA. Batas pengumpulan karya diatur terpisah di{" "}
        <Link href="/admin/pengaturan/pengumpulan" className="font-medium text-foreground underline underline-offset-4">
          Pengumpulan
        </Link>
        .
      </p>

      {stages.map((stage) => (
        <Card key={stage.key}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 shrink-0 text-primary" aria-hidden="true" />
                {stage.title}
              </CardTitle>
              <Badge variant="outline">{formatStageDates(stage)}</Badge>
              <Badge variant={stage.is_system ? "secondary" : "outline"}>
                {stage.is_system ? "Bawaan" : "Tambahan"}
              </Badge>
            </div>
            <CardDescription>
              {SYSTEM_HINTS[stage.key] ?? "Tahap tambahan yang hanya tampil di linimasa."}
            </CardDescription>
          </CardHeader>
          <StageForm stage={stage} />
        </Card>
      ))}

      {adding ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5 shrink-0 text-primary" aria-hidden="true" />
              Tahap baru
            </CardTitle>
            <CardDescription>Contoh: technical meeting atau batas konfirmasi kehadiran finalis.</CardDescription>
          </CardHeader>
          <StageForm stage={EMPTY_STAGE} onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)} className="press w-full sm:w-auto">
          <Plus aria-hidden="true" />
          Tambah tahap
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { RotateCcw } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_FIELDS,
  CONTENT_GROUPS,
  CONTENT_KEYS,
  type ContentField,
  type ContentGroup,
  type ContentKey,
} from "@/lib/site-content";

import { resetSiteContent, saveSiteContent } from "../actions";
import { formatWitaTimestamp } from "../settings-utils";

type SavedRow = { key: string; value: string; updated_at: string };

function ContentFieldForm({
  contentKey,
  field,
  saved,
}: {
  contentKey: ContentKey;
  field: ContentField;
  saved: SavedRow | undefined;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  const id = `content-${contentKey.replaceAll(".", "-")}`;
  const hintId = `${id}-hint`;
  const value = saved?.value ?? field.default;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveSiteContent(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(`${field.label} disimpan.`);
      router.refresh();
    });
  };

  const onReset = () => {
    startTransition(async () => {
      const result = await resetSiteContent(contentKey);
      setConfirmReset(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${field.label} kembali ke teks bawaan.`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <input type="hidden" name="key" value={contentKey} />
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{field.label}</Label>
        <Badge variant={saved ? "secondary" : "outline"}>{saved ? "Diubah" : "Bawaan"}</Badge>
      </div>
      {field.kind === "text" ? (
        <Input
          id={id}
          name="value"
          defaultValue={value}
          maxLength={field.max}
          required
          aria-describedby={hintId}
          className="w-full sm:max-w-xl"
        />
      ) : (
        <Textarea
          id={id}
          name="value"
          defaultValue={value}
          maxLength={field.max}
          required
          rows={field.kind === "list" ? 7 : 3}
          aria-describedby={hintId}
        />
      )}
      <p id={hintId} className="text-muted-foreground text-xs">
        {field.hint} Maksimal {field.max} karakter.
        {field.placeholders && " Tulis {acara} untuk nama acara dan {bidang} untuk bidang lomba."}
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          {saved ? `Terakhir diperbarui: ${formatWitaTimestamp(saved.updated_at)}` : null}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {saved && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmReset(true)}
              className="press w-full sm:w-auto"
            >
              <RotateCcw aria-hidden="true" />
              Kembalikan ke bawaan
            </Button>
          )}
          <Button type="submit" disabled={isPending} className="press w-full sm:w-auto">
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan “{field.label}” ke bawaan?</AlertDialogTitle>
            <AlertDialogDescription>Teks yang Anda ubah akan dihapus dan diganti teks bawaan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onReset} disabled={isPending}>
              Kembalikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export function ContentClient({ saved }: { saved: SavedRow[] }) {
  const savedByKey = new Map(saved.map((row) => [row.key, row]));
  const groups = Object.keys(CONTENT_GROUPS) as ContentGroup[];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Semua teks di sini tampil untuk publik, termasuk pengunjung yang belum masuk. Jangan menulis data pribadi,
        email, atau tautan khusus finalis.
      </p>
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{CONTENT_GROUPS[group].title}</CardTitle>
            <CardDescription>{CONTENT_GROUPS[group].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CONTENT_KEYS.filter((key) => CONTENT_FIELDS[key].group === group).map((key) => {
              const row = savedByKey.get(key);
              // Remount on a new stored value so the uncontrolled field shows it after save or reset.
              return (
                <ContentFieldForm
                  key={`${key}:${row?.updated_at ?? "default"}`}
                  contentKey={key}
                  field={CONTENT_FIELDS[key]}
                  saved={row}
                />
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

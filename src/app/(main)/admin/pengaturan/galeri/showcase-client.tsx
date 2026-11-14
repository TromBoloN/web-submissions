"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, ImageIcon, Megaphone, RotateCcw } from "lucide-react";
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
import type { Json } from "@/types/database";

import { type ActionResult, publishShowcasePhase, publishShowcaseWinners, unpublishShowcasePhase } from "../actions";
import { formatWitaTimestamp, hasLinkWarning } from "../settings-utils";

export type ShowcaseTeam = {
  id: string;
  teamName: string;
  isFinalist: boolean;
  showcaseTitle: string;
  hasImage: boolean;
  linkCheck: Json | null;
};

function PhaseRow({
  title,
  description,
  publishedAt,
  publishLabel,
  unpublishLabel,
  canPublish,
  disabled,
  primary,
  onPublish,
  onUnpublish,
}: {
  title: string;
  description: string;
  publishedAt: string | null;
  publishLabel: string;
  unpublishLabel: string;
  canPublish: boolean;
  disabled: boolean;
  primary?: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        {publishedAt ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-emerald-600">Telah diterbitkan</Badge>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onUnpublish}>
              <RotateCcw className="mr-1 size-3.5" />
              {unpublishLabel}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={primary ? "default" : "outline"}
            disabled={disabled || !canPublish}
            onClick={onPublish}
            className="press w-full sm:w-auto"
          >
            {publishLabel}
          </Button>
        )}
      </div>
      {publishedAt && (
        <p className="text-muted-foreground text-xs">
          Diterbitkan: {formatWitaTimestamp(publishedAt) ?? "Waktu tidak tersedia"}
        </p>
      )}
    </div>
  );
}

export function ShowcaseClient({
  showcasePublishedAt,
  winnersPublishedAt,
  showcaseTeams,
}: {
  showcasePublishedAt: string | null;
  winnersPublishedAt: string | null;
  showcaseTeams: ShowcaseTeam[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [publishGalleryOpen, setPublishGalleryOpen] = useState(false);
  const [publishWinnersOpen, setPublishWinnersOpen] = useState(false);
  const [unpublishTarget, setUnpublishTarget] = useState<"gallery" | "winners" | null>(null);

  const withImage = showcaseTeams.filter((team) => team.hasImage).length;
  const withWarning = showcaseTeams.filter((team) => hasLinkWarning(team.linkCheck)).length;
  const stats = [
    { label: "Ikut pamer", value: String(showcaseTeams.length) },
    { label: "Dengan gambar", value: String(withImage) },
    { label: "Peringatan tautan", value: String(withWarning) },
    { label: "Pemenang", value: winnersPublishedAt ? "Terbit" : "Belum" },
  ];

  const run = (action: () => Promise<ActionResult>, success: string) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-5 shrink-0 text-primary" />
            Galeri Karya
          </CardTitle>
          <CardDescription>
            Tinjau karya yang bersedia dipamerkan dan terbitkan galeri dalam dua tahap. Pembatalan publikasi hanya
            menyembunyikan galeri; pilihan peserta tetap terkunci setelah publikasi tahap 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                <dd className="mt-1 font-semibold text-xl tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <PhaseRow
              title="Tahap 1 · Galeri & Finalis"
              description="Membuka galeri untuk umum dengan seluruh karya yang ikut pamer beserta finalis."
              publishedAt={showcasePublishedAt}
              publishLabel="Terbitkan galeri"
              unpublishLabel="Batalkan galeri"
              canPublish={showcaseTeams.length > 0}
              disabled={isPending}
              primary
              onPublish={() => setPublishGalleryOpen(true)}
              onUnpublish={() => setUnpublishTarget("gallery")}
            />
            <div className="border-t pt-4">
              <PhaseRow
                title="Tahap 2 · Pemenang"
                description="Menampilkan tiga pemenang beserta podium juara dan nilai akhir."
                publishedAt={winnersPublishedAt}
                publishLabel="Terbitkan pemenang"
                unpublishLabel="Batalkan pemenang"
                canPublish={Boolean(showcasePublishedAt)}
                disabled={isPending}
                onPublish={() => setPublishWinnersOpen(true)}
                onUnpublish={() => setUnpublishTarget("winners")}
              />
            </div>
          </div>

          <section aria-labelledby="showcase-list-title" className="space-y-3">
            <h2 id="showcase-list-title" className="font-semibold text-sm">
              Karya yang ikut pamer
            </h2>
            {showcaseTeams.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
                Belum ada submission terkirim yang memilih ikut galeri.
              </p>
            ) : (
              <ul className="space-y-2">
                {showcaseTeams.map((team) => (
                  <li key={team.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{team.showcaseTitle || team.teamName}</p>
                        <p className="truncate text-muted-foreground text-xs">
                          {team.teamName} · {team.isFinalist ? "Finalis" : "Non-finalis"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!team.hasImage && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-xs">
                            <ImageIcon className="mr-1 size-3" />
                            Tanpa gambar
                          </Badge>
                        )}
                        {hasLinkWarning(team.linkCheck) && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-xs">
                            <AlertTriangle className="mr-1 size-3" />
                            Tautan diperingatkan
                          </Badge>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      <AlertDialog open={publishGalleryOpen} onOpenChange={setPublishGalleryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan galeri karya & finalis?</AlertDialogTitle>
            <AlertDialogDescription>
              Karya tim yang memilih ikut pamer beserta finalis akan tampil di halaman publik. Status finalis dan
              pilihan pameran peserta akan dibekukan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                setPublishGalleryOpen(false);
                run(() => publishShowcasePhase("gallery"), "Galeri karya dan finalis berhasil diterbitkan.");
              }}
            >
              Ya, terbitkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publishWinnersOpen} onOpenChange={setPublishWinnersOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan pemenang?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiga tim teratas dan nilai akhir berbobotnya akan terlihat di halaman publik. Karya hanya menampilkan
              detail dan tautan jika tim tersebut memberikan persetujuan galeri.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                setPublishWinnersOpen(false);
                run(publishShowcaseWinners, "Pemenang berhasil diterbitkan.");
              }}
            >
              Ya, terbitkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(unpublishTarget)}
        onOpenChange={(open) => {
          if (!open) setUnpublishTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan publikasi galeri?</AlertDialogTitle>
            <AlertDialogDescription>
              {unpublishTarget === "gallery" ? "Tahap 1, galeri karya, dan finalis" : "Tahap 2 dan informasi pemenang"}{" "}
              akan disembunyikan dari halaman publik. Pilihan peserta tetap terkunci dan tidak akan terbuka kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Kembali</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                const target = unpublishTarget;
                setUnpublishTarget(null);
                if (!target) return;
                run(
                  () => unpublishShowcasePhase(target),
                  target === "gallery"
                    ? "Publikasi galeri dan finalis berhasil dibatalkan."
                    : "Publikasi pemenang berhasil dibatalkan.",
                );
              }}
            >
              Ya, batalkan publikasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

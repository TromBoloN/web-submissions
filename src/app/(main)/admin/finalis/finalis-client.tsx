"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Eye, EyeOff, Globe, Save, Trophy, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

import { publishFinalistNotice, unpublishFinalistNotice, updateFinalistNotice } from "./actions";

type FinalistNotice = Database["public"]["Tables"]["finalist_notice"]["Row"];

export type FinalistTeamItem = {
  id: string;
  team_code: string;
  team_name: string;
  institution: string;
};

interface FinalisClientProps {
  notice: FinalistNotice;
  finalists: FinalistTeamItem[];
}

function formatTimestampWita(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "medium",
  }).format(date)} WITA`;
}

export function FinalisClient({ notice, finalists }: FinalisClientProps) {
  const router = useRouter();
  const [finalistMessage, setFinalistMessage] = useState(notice.finalist_message);
  const [nonFinalistMessage, setNonFinalistMessage] = useState(notice.non_finalist_message);
  const [isPending, startTransition] = useTransition();

  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isUnpublishDialogOpen, setIsUnpublishDialogOpen] = useState(false);

  const isPublished = notice.is_published;

  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData();
    form.set("finalist_message", finalistMessage.trim());
    form.set("non_finalist_message", nonFinalistMessage.trim());

    startTransition(async () => {
      const res = await updateFinalistNotice(form);
      if (res.ok) {
        toast.success("Pesan pengumuman berhasil disimpan.");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      const res = await publishFinalistNotice();
      if (res.ok) {
        toast.success("Pengumuman finalis berhasil dipublikasikan ke seluruh tim peserta.");
        setIsPublishDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      const res = await unpublishFinalistNotice();
      if (res.ok) {
        toast.success("Pengumuman finalis berhasil ditarik kembali.");
        setIsUnpublishDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-semibold text-2xl">Pengumuman Finalis</h1>
            {isPublished ? (
              <Badge className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
                <CheckCircle2 className="size-3.5" />
                Dipublikasikan pada {formatTimestampWita(notice.published_at)}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 border-dashed text-muted-foreground">
                <Clock className="size-3.5" />
                Belum dipublikasikan
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Kelola rilis pengumuman tim yang lolos ke babak final beserta pesan arahan teknis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPublished ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => setIsUnpublishDialogOpen(true)}
              className="gap-1.5"
            >
              <EyeOff className="size-4" />
              Tarik kembali
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => setIsPublishDialogOpen(true)}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Globe className="size-4" />
              Publikasikan
            </Button>
          )}
        </div>
      </div>

      {isPublished && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <Eye className="size-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="font-medium">Pengumuman Sedang Publik</AlertTitle>
          <AlertDescription className="text-xs">
            Pengumuman saat ini aktif dan terlihat oleh seluruh tim peserta di dasbor mereka. Perubahan teks yang Anda
            simpan di bawah akan langsung terlihat oleh peserta.
          </AlertDescription>
        </Alert>
      )}

      {/* Card 1: Daftar Tim Finalis */}
      <Card>
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-amber-500" />
              Daftar Tim Finalis ({finalists.length})
            </CardTitle>
            <CardDescription>
              Tim yang berstatus finalis dan akan menerima pesan finalis ketika pengumuman dipublikasikan.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/admin/tim">
              <Users className="size-3.5" />
              <span>Kelola Tim di Menu Tim</span>
              <ArrowRight className="size-3.5 opacity-70" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {finalists.length !== 5 && (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="font-medium text-sm">Peringatan Kuota Finalis</AlertTitle>
              <AlertDescription className="text-xs">
                Jumlah finalis saat ini <strong>{finalists.length} tim</strong>. Ketentuan babak final umumnya
                menetapkan <strong>5 tim finalis</strong>. Anda tetap dapat mempublikasikan pengumuman ini, atau
                menyesuaikan status finalis melalui halaman <strong>Tim</strong>.
              </AlertDescription>
            </Alert>
          )}

          {finalists.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead className="w-28">Kode Tim</TableHead>
                    <TableHead>Nama Tim</TableHead>
                    <TableHead>Institusi / Sekolah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalists.map((team, idx) => (
                    <TableRow key={team.id}>
                      <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-mono font-semibold text-xs">{team.team_code}</TableCell>
                      <TableCell className="font-medium text-sm">{team.team_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{team.institution}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
              Belum ada tim yang ditandai sebagai finalis. Silakan buka menu <strong>Tim</strong> untuk menandai tim
              finalis.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Form Pesan Pengumuman */}
      <form onSubmit={handleSaveNotice}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pesan Pengumuman</CardTitle>
            <CardDescription>
              Tuliskan instruksi pelaksanaan babak final untuk tim finalis dan pesan penutup bagi tim yang belum lolos.
              Teks biasa (line break/Enter didukung, tanpa kode HTML).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="finalist_message" className="font-medium text-sm">
                  Pesan untuk Finalis <span className="text-destructive">*</span>
                </Label>
                <span className="text-muted-foreground text-xs">{finalistMessage.length} / 2.000 karakter</span>
              </div>
              <Textarea
                id="finalist_message"
                name="finalist_message"
                rows={6}
                maxLength={2000}
                value={finalistMessage}
                disabled={isPending}
                onChange={(e) => setFinalistMessage(e.target.value)}
                placeholder="Contoh: Selamat kepada tim yang lolos ke babak final! Presentasi akan dilaksanakan pada hari Sabtu pukul 09.00 WITA..."
                className="font-mono text-sm leading-relaxed"
              />
              <p className="text-muted-foreground text-xs">
                Pesan ini akan ditampilkan secara khusus kepada tim yang lolos sebagai finalis pada kartu banner hijau
                di halaman dasbor tim mereka.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="non_finalist_message" className="font-medium text-sm">
                  Pesan untuk Non-Finalis <span className="text-muted-foreground text-xs">(Opsional)</span>
                </Label>
                <span className="text-muted-foreground text-xs">{nonFinalistMessage.length} / 2.000 karakter</span>
              </div>
              <Textarea
                id="non_finalist_message"
                name="non_finalist_message"
                rows={4}
                maxLength={2000}
                value={nonFinalistMessage}
                disabled={isPending}
                onChange={(e) => setNonFinalistMessage(e.target.value)}
                placeholder="Contoh: Terima kasih atas partisipasi dan karya luar biasa yang telah dikirimkan. Tetap semangat dan sampai jumpa di kompetisi berikutnya!"
                className="font-mono text-sm leading-relaxed"
              />
              <p className="text-muted-foreground text-xs">
                Jika diisi, tim yang belum lolos akan melihat kartu pesan apresiasi ini. Jika dikosongkan, tim
                non-finalis tidak akan melihat pesan apa pun.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse justify-end gap-3 border-t pt-4 sm:flex-row">
            <Button type="submit" disabled={isPending} className="gap-1.5">
              <Save className="size-4" />
              {isPending ? "Menyimpan..." : "Simpan Pesan"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Confirmation Dialog: Publish */}
      <AlertDialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Globe className="size-5 text-emerald-600" />
              Publikasikan Pengumuman Finalis?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                Setelah dipublikasikan, seluruh tim peserta akan <strong>langsung dapat melihat</strong> status
                lolos/tidaknya tim mereka beserta pesan instruksi di halaman dasbor tim masing-masing.
              </p>
              {finalists.length !== 5 && (
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Catatan: Saat ini ada {finalists.length} tim finalis yang tercatat.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={handlePublish}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isPending ? "Mempublikasikan..." : "Ya, Publikasikan Sekarang"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Unpublish */}
      <AlertDialog open={isUnpublishDialogOpen} onOpenChange={setIsUnpublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <EyeOff className="size-5" />
              Tarik Kembali Pengumuman Finalis?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Pengumuman akan <strong>disembunyikan kembali</strong>. Tim peserta tidak akan dapat lagi melihat status
              lolos maupun pesan arahan finalis di dasbor mereka sampai Anda mempublikasikannya kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={handleUnpublish}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Menarik..." : "Ya, Tarik Kembali"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

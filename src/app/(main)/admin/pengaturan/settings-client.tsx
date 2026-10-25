"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  Clock,
  ExternalLink,
  FileText,
  Info,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

import { MarkdownContent } from "@/components/markdown-content";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";
import {
  formatDeadlineWita,
  parseWitaInputToUtcIso,
  toWitaDateTimeLocalString,
  toWitaDateTimeLocalStringExact,
} from "@/lib/deadline";

import { updateCaseStudy, updateCompetitionDeadline, updateContactWhatsapp, updateJuknisUrl } from "./actions";

type CaseStudyData = {
  title: string;
  contentMd: string;
  releaseAt: string | null;
  updatedAt: string | null;
};

type SettingsClientProps = {
  currentClosesAt: string | null;
  currentJuknisUrl: string | null;
  currentContactWhatsapp: string | null;
  updatedAt: string | null;
  caseStudy: CaseStudyData | null;
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

export function SettingsClient({
  currentClosesAt,
  currentJuknisUrl,
  currentContactWhatsapp,
  updatedAt,
  caseStudy,
}: SettingsClientProps) {
  const router = useRouter();
  const [deadlineInput, setDeadlineInput] = useState(() => toWitaDateTimeLocalString(currentClosesAt));
  const [deadlineError, setDeadlineError] = useState<string>();
  const [isDeadlinePending, startDeadlineTransition] = useTransition();

  const [juknisInput, setJuknisInput] = useState(currentJuknisUrl ?? "");
  const [juknisError, setJuknisError] = useState<string>();
  const [isJuknisPending, startJuknisTransition] = useTransition();

  const [contactInput, setContactInput] = useState(currentContactWhatsapp ?? "");
  const [contactError, setContactError] = useState<string>();
  const [isContactPending, startContactTransition] = useTransition();

  const [caseStudyTitle, setCaseStudyTitle] = useState(caseStudy?.title ?? "");
  const [caseStudyContent, setCaseStudyContent] = useState(caseStudy?.contentMd ?? "");
  const [caseStudyReleaseAt, setCaseStudyReleaseAt] = useState(() =>
    toWitaDateTimeLocalStringExact(caseStudy?.releaseAt ?? null),
  );
  const [caseStudyError, setCaseStudyError] = useState<string>();
  const [caseStudyWarning, setCaseStudyWarning] = useState<string>();
  const [isCaseStudyPending, startCaseStudyTransition] = useTransition();

  const formattedCurrentDeadline = formatDeadlineWita(currentClosesAt);
  const formattedUpdatedAt = formatUpdatedAt(updatedAt);
  const formattedCaseStudyUpdatedAt = formatUpdatedAt(caseStudy?.updatedAt ?? null);
  const canOpenSavedUrl = Boolean(currentJuknisUrl?.startsWith("https://"));
  const formattedCurrentContact = formatWhatsAppNumber(currentContactWhatsapp);

  const isReleaseAtInPast = Boolean(
    caseStudyReleaseAt &&
      (() => {
        const iso = parseWitaInputToUtcIso(caseStudyReleaseAt);
        return iso ? new Date(iso).getTime() <= Date.now() : false;
      })(),
  );

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

  const handleContactSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactError(undefined);
    const form = new FormData(event.currentTarget);

    startContactTransition(async () => {
      const result = await updateContactWhatsapp(form);
      if (!result.success) {
        setContactError(result.error);
        return;
      }
      toast.success("Nomor WhatsApp panitia berhasil diperbarui.");
      router.refresh();
    });
  };

  const handleCaseStudySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCaseStudyError(undefined);
    setCaseStudyWarning(undefined);
    const form = new FormData(event.currentTarget);

    startCaseStudyTransition(async () => {
      const result = await updateCaseStudy(form);
      if (!result.success) {
        setCaseStudyError(result.error);
        return;
      }
      if (result.warning) {
        setCaseStudyWarning(result.warning);
        toast.warning(result.warning);
      } else {
        toast.success("Studi kasus berhasil diperbarui.");
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola konfigurasi, tautan juknis, kontak bantuan, dan studi kasus MIT-WEEK 2026.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {/* 1. Batas Waktu Pengiriman */}
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

          {/* 2. Tautan Juknis */}
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

          {/* 3. Kontak Bantuan */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="size-5 text-primary" />
                    Kontak Bantuan
                  </CardTitle>
                  <CardDescription>
                    Nomor WhatsApp panitia yang ditampilkan di halaman masuk dan dasbor peserta.
                  </CardDescription>
                </div>
                {currentContactWhatsapp && (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <a href={toWhatsAppUrl(currentContactWhatsapp)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 size-4" />
                      Buka WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <form onSubmit={handleContactSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_whatsapp">Nomor WhatsApp Panitia</Label>
                  <Input
                    id="contact_whatsapp"
                    name="contact_whatsapp"
                    type="tel"
                    inputMode="tel"
                    placeholder="6281234567890"
                    value={contactInput}
                    onChange={(event) => setContactInput(event.target.value)}
                    maxLength={30}
                    className="max-w-md font-mono text-sm"
                  />
                  <p className="text-muted-foreground text-xs">
                    Format lokal <code>08...</code> atau internasional <code>628...</code>. Tanda +, spasi, titik, dan
                    tanda hubung diperbolehkan. Kosongkan untuk menyembunyikan kontak bantuan.
                  </p>
                </div>

                {contactError && <p className="text-destructive text-sm">{contactError}</p>}
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <div className="text-muted-foreground text-xs">
                  {formattedCurrentContact ? `Tersimpan: ${formattedCurrentContact}` : "Belum ada nomor tersimpan."}
                </div>
                <Button type="submit" disabled={isContactPending}>
                  {isContactPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* 4. Studi Kasus */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  Studi Kasus
                </CardTitle>
                <CardDescription>
                  {formattedCaseStudyUpdatedAt
                    ? `Terakhir diperbarui: ${formattedCaseStudyUpdatedAt}`
                    : "Belum pernah diperbarui"}
                </CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={handleCaseStudySubmit}>
              <CardContent className="space-y-4">
                {/* Judul */}
                <div className="space-y-1.5">
                  <Label htmlFor="title">Judul Studi Kasus</Label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    value={caseStudyTitle}
                    onChange={(event) => setCaseStudyTitle(event.target.value)}
                    maxLength={150}
                    required
                    placeholder="Judul studi kasus..."
                  />
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Judul utama studi kasus kompetisi.</span>
                    <span>{caseStudyTitle.length}/150</span>
                  </div>
                </div>

                {/* Tampil Mulai (WITA) */}
                <div className="space-y-1.5">
                  <Label htmlFor="release_at">Tampil Mulai (WITA) — Opsional</Label>
                  <Input
                    id="release_at"
                    name="release_at"
                    type="datetime-local"
                    value={caseStudyReleaseAt}
                    onChange={(event) => setCaseStudyReleaseAt(event.target.value)}
                    className="max-w-md font-mono"
                  />
                  <p className="text-muted-foreground text-xs">
                    Kosongkan jika studi kasus dapat langsung dilihat oleh peserta. Jika diisi, studi kasus
                    disembunyikan sampai waktu yang ditentukan.
                  </p>
                  {isReleaseAtInPast && (
                    <p className="flex items-center gap-1.5 text-amber-600 text-xs dark:text-amber-400">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      Perhatian: Waktu rilis yang dipilih sudah lewat di masa lalu. Studi kasus akan langsung terlihat
                      oleh peserta.
                    </p>
                  )}
                </div>

                {/* Isi Markdown dengan Tab Edit & Pratinjau */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content_md">Isi Studi Kasus (Markdown)</Label>
                    <span className="font-mono text-muted-foreground text-xs">
                      {caseStudyContent.length}/20.000 karakter
                    </span>
                  </div>

                  <Tabs defaultValue="edit" className="w-full">
                    <TabsList>
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="preview">Pratinjau</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit" className="space-y-2 pt-2">
                      <Textarea
                        id="content_md"
                        name="content_md"
                        value={caseStudyContent}
                        onChange={(event) => setCaseStudyContent(event.target.value)}
                        rows={14}
                        maxLength={20000}
                        required
                        placeholder="Tulis isi studi kasus menggunakan format Markdown..."
                        className="font-mono text-sm leading-relaxed"
                      />
                      <p className="text-muted-foreground text-xs">
                        Format Markdown: <code>## Judul Bagian</code>, <code>1. Daftar bernomor</code>,{" "}
                        <code>* Daftar poin</code>, <code>**Tebal**</code>, <code>*Miring*</code>,{" "}
                        <code>&gt; Kutipan</code>.
                      </p>
                    </TabsContent>
                    <TabsContent value="preview" className="pt-2">
                      <div className="max-h-[500px] min-h-[300px] overflow-y-auto rounded-md border bg-muted/20 p-4">
                        {caseStudyContent.trim() ? (
                          <MarkdownContent content={caseStudyContent} />
                        ) : (
                          <p className="text-muted-foreground text-sm italic">Belum ada konten untuk dipratinjau.</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {caseStudyError && <p className="text-destructive text-sm">{caseStudyError}</p>}
                {caseStudyWarning && (
                  <p className="flex items-center gap-1.5 text-amber-600 text-xs dark:text-amber-400">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    {caseStudyWarning}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button type="submit" disabled={isCaseStudyPending}>
                  {isCaseStudyPending ? "Menyimpan..." : "Perbarui studi kasus"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Panel Kanan: Status Pengaturan */}
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

              <div className="border-t pt-3">
                <span className="text-muted-foreground text-xs">Kontak bantuan aktif:</span>
                {formattedCurrentContact ? (
                  <p className="mt-0.5 font-mono text-foreground text-xs">{formattedCurrentContact}</p>
                ) : (
                  <p className="mt-0.5 text-muted-foreground text-xs">Belum diatur</p>
                )}
              </div>

              <div className="border-t pt-3">
                <span className="text-muted-foreground text-xs">Status Studi Kasus:</span>
                {caseStudy ? (
                  <div className="mt-1 space-y-1">
                    <p className="truncate font-medium text-foreground text-sm" title={caseStudy.title}>
                      {caseStudy.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {caseStudy.releaseAt
                        ? `Rilis: ${formatUpdatedAt(caseStudy.releaseAt)}`
                        : "Terlihat langsung (tanpa jadwal)"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-0.5 text-muted-foreground text-xs">Belum ada studi kasus</p>
                )}
              </div>

              {formattedUpdatedAt && (
                <div className="border-t pt-3">
                  <span className="text-muted-foreground text-xs">Pengaturan diperbarui:</span>
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

"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  ImageIcon,
  Info,
  Megaphone,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { MarkdownContent } from "@/components/markdown-content";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";
import {
  formatDeadlineWita,
  parseWitaInputToUtcIso,
  toWitaDateTimeLocalString,
  toWitaDateTimeLocalStringExact,
} from "@/lib/deadline";
import type { Json } from "@/types/database";

import {
  publishShowcasePhase,
  unpublishShowcasePhase,
  updateCaseStudy,
  updateCompetitionDeadline,
  updateContactWhatsapp,
  updateJuknisUrl,
  updateResultsRelease,
} from "./actions";

type CaseStudyData = {
  title: string;
  contentMd: string;
  releaseAt: string | null;
  updatedAt: string | null;
};

export type StageJudgingProgress = {
  totalJudges: number;
  completedJudges: number;
  incompleteJudges: number;
  totalExpectedScores: number;
  completedScores: number;
  isAllCompleted: boolean;
  eligibleTeamsCount: number;
};

export type JudgingProgressStats = {
  preliminary: StageJudgingProgress;
  final: StageJudgingProgress;
};

type SettingsClientProps = {
  currentClosesAt: string | null;
  currentJuknisUrl: string | null;
  currentContactWhatsapp: string | null;
  updatedAt: string | null;
  preliminaryResultsReleased: boolean;
  finalResultsReleased: boolean;
  showcasePublishedAt: string | null;
  showcaseFinalistsPublishedAt: string | null;
  showcaseTeams: {
    id: string;
    teamName: string;
    isFinalist: boolean;
    showcaseTitle: string;
    showcaseDescription: string;
    showcaseImagePath: string | null;
    linkCheck: Json | null;
    links: { github: string; liveDemo: string; video: string };
  }[];
  judgingStats: JudgingProgressStats;
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

function hasLinkWarning(linkCheck: Json | null): boolean {
  if (!linkCheck || typeof linkCheck !== "object" || Array.isArray(linkCheck)) return false;
  return Object.values(linkCheck).some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item) &&
      "status" in item &&
      item.status === "warning",
  );
}

export function SettingsClient({
  currentClosesAt,
  currentJuknisUrl,
  currentContactWhatsapp,
  updatedAt,
  preliminaryResultsReleased,
  finalResultsReleased,
  showcasePublishedAt,
  showcaseFinalistsPublishedAt,
  showcaseTeams,
  judgingStats,
  caseStudy,
}: SettingsClientProps) {
  const router = useRouter();
  const [deadlineInput, setDeadlineInput] = useState(() => toWitaDateTimeLocalString(currentClosesAt));
  const [deadlineError, setDeadlineError] = useState<string>();
  const [isDeadlinePending, startDeadlineTransition] = useTransition();

  const [isReleasePending, startReleaseTransition] = useTransition();
  const [isShowcasePending, startShowcaseTransition] = useTransition();
  const [showcaseConfirm, setShowcaseConfirm] = useState<"initial" | "finalists" | null>(null);
  const [showcaseUnpublishConfirm, setShowcaseUnpublishConfirm] = useState<"initial" | "finalists" | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    stage: "preliminary" | "final";
    targetState: boolean;
  } | null>(null);

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

  const handleRequestToggle = (stage: "preliminary" | "final", targetState: boolean) => {
    setConfirmDialog({ stage, targetState });
  };

  const handleConfirmToggle = () => {
    if (!confirmDialog) return;
    const { stage, targetState } = confirmDialog;
    setConfirmDialog(null);

    startReleaseTransition(async () => {
      const result = await updateResultsRelease(stage, targetState);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const stageLabel = stage === "preliminary" ? "Babak awal" : "Babak final";
      if (targetState) {
        toast.success(`Hasil penilaian ${stageLabel} berhasil dirilis.`);
      } else {
        toast.success(`Hasil penilaian ${stageLabel} berhasil dinonaktifkan.`);
      }
      router.refresh();
    });
  };

  const handlePublishShowcase = () => {
    if (!showcaseConfirm) return;
    const phase = showcaseConfirm;
    setShowcaseConfirm(null);
    startShowcaseTransition(async () => {
      const result = await publishShowcasePhase(phase);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        phase === "initial" ? "Galeri tahap awal berhasil diterbitkan." : "Karya finalis berhasil diterbitkan.",
      );
      router.refresh();
    });
  };

  const handleUnpublishShowcase = () => {
    if (!showcaseUnpublishConfirm) return;
    const phase = showcaseUnpublishConfirm;
    setShowcaseUnpublishConfirm(null);
    startShowcaseTransition(async () => {
      const result = await unpublishShowcasePhase(phase);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Publikasi galeri berhasil dibatalkan.");
      router.refresh();
    });
  };

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

          {/* Rilis Hasil Penilaian */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="size-5 text-primary" />
                Rilis Hasil Penilaian
              </CardTitle>
              <CardDescription>
                Buka akses pengumuman nilai, kriteria, dan masukan anonim juri kepada tim peserta. Setiap perubahan
                status wajib melalui dialog konfirmasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Switch 1: Babak Awal */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="switch-prelim-release" className="cursor-pointer font-semibold text-base">
                        Babak Awal
                      </Label>
                      {preliminaryResultsReleased ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs"
                        >
                          Dirilis
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted text-muted-foreground text-xs">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Peserta dapat melihat rata-rata nilai kriteria, total nilai, dan masukan anonim babak awal.
                    </p>
                  </div>
                  <Switch
                    id="switch-prelim-release"
                    checked={preliminaryResultsReleased}
                    onCheckedChange={(checked) => handleRequestToggle("preliminary", checked)}
                    disabled={isReleasePending}
                  />
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progres Penilaian Juri:</span>
                    <span className="font-medium font-mono">
                      {judgingStats.preliminary.completedScores} / {judgingStats.preliminary.totalExpectedScores}{" "}
                      penilaian ({judgingStats.preliminary.completedJudges} dari {judgingStats.preliminary.totalJudges}{" "}
                      juri selesai)
                    </span>
                  </div>
                  <Progress
                    value={
                      judgingStats.preliminary.totalExpectedScores > 0
                        ? Math.round(
                            (judgingStats.preliminary.completedScores / judgingStats.preliminary.totalExpectedScores) *
                              100,
                          )
                        : 0
                    }
                    className="h-2"
                  />
                  {judgingStats.preliminary.incompleteJudges > 0 ? (
                    <div className="flex items-start gap-1.5 text-amber-600 text-xs dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        Peringatan: {judgingStats.preliminary.incompleteJudges} juri belum menyelesaikan penilaian babak
                        awal. Anda tetap dapat merilis hasil tanpa diblokir.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Seluruh juri babak awal telah menyelesaikan penilaian.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Switch 2: Final */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="switch-final-release" className="cursor-pointer font-semibold text-base">
                        Babak Final
                      </Label>
                      {finalResultsReleased ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs"
                        >
                          Dirilis
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted text-muted-foreground text-xs">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Finalis dapat melihat rata-rata nilai kriteria, total nilai, dan masukan anonim babak final.
                    </p>
                  </div>
                  <Switch
                    id="switch-final-release"
                    checked={finalResultsReleased}
                    onCheckedChange={(checked) => handleRequestToggle("final", checked)}
                    disabled={isReleasePending}
                  />
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progres Penilaian Juri:</span>
                    <span className="font-medium font-mono">
                      {judgingStats.final.completedScores} / {judgingStats.final.totalExpectedScores} penilaian (
                      {judgingStats.final.completedJudges} dari {judgingStats.final.totalJudges} juri selesai)
                    </span>
                  </div>
                  <Progress
                    value={
                      judgingStats.final.totalExpectedScores > 0
                        ? Math.round(
                            (judgingStats.final.completedScores / judgingStats.final.totalExpectedScores) * 100,
                          )
                        : 0
                    }
                    className="h-2"
                  />
                  {judgingStats.final.incompleteJudges > 0 ? (
                    <div className="flex items-start gap-1.5 text-amber-600 text-xs dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        Peringatan: {judgingStats.final.incompleteJudges} juri belum menyelesaikan penilaian babak
                        final. Anda tetap dapat merilis hasil tanpa diblokir.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Seluruh juri babak final telah menyelesaikan penilaian.</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
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

          {/* 4. Galeri Karya */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="size-5 text-primary" />
                Galeri Karya
              </CardTitle>
              <CardDescription>
                Tinjau karya yang bersedia dipamerkan dan terbitkan galeri dalam dua tahap. Pembatalan publikasi hanya
                menyembunyikan galeri; pilihan peserta tetap terkunci setelah publikasi tahap 1.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Ikut pamer</p>
                  <p className="mt-1 font-semibold text-xl">{showcaseTeams.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Dengan gambar</p>
                  <p className="mt-1 font-semibold text-xl">
                    {showcaseTeams.filter((team) => team.showcaseImagePath).length}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Peringatan tautan</p>
                  <p className="mt-1 font-semibold text-xl">
                    {showcaseTeams.filter((team) => hasLinkWarning(team.linkCheck)).length}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {showcaseTeams.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
                    Belum ada submission terkirim yang memilih ikut galeri.
                  </p>
                ) : (
                  showcaseTeams.map((team) => (
                    <div key={team.id} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{team.showcaseTitle || team.teamName}</p>
                          <p className="text-muted-foreground text-xs">
                            {team.teamName} · {team.isFinalist ? "Finalis" : "Non-finalis"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {!team.showcaseImagePath && (
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
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-sm">Tahap 1 · Non-finalis</p>
                    <p className="text-muted-foreground text-xs">
                      Menampilkan karya ikut pamer selain finalis dan membekukan status finalis serta pilihan peserta.
                    </p>
                  </div>
                  {showcasePublishedAt ? (
                    <div className="flex items-center gap-2">
                      <Badge className="w-fit bg-emerald-600">Telah diterbitkan</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isShowcasePending}
                        onClick={() => setShowcaseUnpublishConfirm("initial")}
                      >
                        <RotateCcw className="mr-1 size-3.5" />
                        Batalkan
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isShowcasePending || showcaseTeams.length === 0}
                      onClick={() => setShowcaseConfirm("initial")}
                    >
                      Terbitkan tahap 1
                    </Button>
                  )}
                </div>
                {showcasePublishedAt && (
                  <p className="text-muted-foreground text-xs">
                    Diterbitkan: {formatUpdatedAt(showcasePublishedAt) ?? "Waktu tidak tersedia"}
                  </p>
                )}
                <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-sm">Tahap 2 · Finalis</p>
                    <p className="text-muted-foreground text-xs">
                      Menambahkan karya finalis yang ikut pamer setelah pengumuman pemenang.
                    </p>
                  </div>
                  {showcaseFinalistsPublishedAt ? (
                    <div className="flex items-center gap-2">
                      <Badge className="w-fit bg-emerald-600">Telah diterbitkan</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isShowcasePending}
                        onClick={() => setShowcaseUnpublishConfirm("finalists")}
                      >
                        <RotateCcw className="mr-1 size-3.5" />
                        Batalkan
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isShowcasePending || !showcasePublishedAt}
                      onClick={() => setShowcaseConfirm("finalists")}
                    >
                      Terbitkan finalis
                    </Button>
                  )}
                </div>
                {showcaseFinalistsPublishedAt && (
                  <p className="text-muted-foreground text-xs">
                    Diterbitkan: {formatUpdatedAt(showcaseFinalistsPublishedAt) ?? "Waktu tidak tersedia"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5. Studi Kasus */}
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

              <div className="border-t pt-3">
                <span className="text-muted-foreground text-xs">Status Rilis Babak Awal:</span>
                <p className="mt-0.5 font-medium text-xs">
                  {preliminaryResultsReleased ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Telah Dirilis</span>
                  ) : (
                    <span className="text-muted-foreground">Belum Dirilis (Nonaktif)</span>
                  )}
                </p>
              </div>

              <div className="border-t pt-3">
                <span className="text-muted-foreground text-xs">Status Rilis Babak Final:</span>
                <p className="mt-0.5 font-medium text-xs">
                  {finalResultsReleased ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Telah Dirilis</span>
                  ) : (
                    <span className="text-muted-foreground">Belum Dirilis (Nonaktif)</span>
                  )}
                </p>
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

      <AlertDialog
        open={Boolean(showcaseConfirm)}
        onOpenChange={(open) => {
          if (!open) setShowcaseConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showcaseConfirm === "initial" ? "Terbitkan galeri tahap 1?" : "Terbitkan karya finalis?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showcaseConfirm === "initial"
                ? "Karya non-finalis yang telah memilih ikut pamer akan terlihat di halaman publik. Status finalis dan pilihan pameran akan dibekukan."
                : "Karya finalis yang telah memilih ikut pamer akan ditambahkan ke halaman publik."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isShowcasePending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishShowcase} disabled={isShowcasePending}>
              {isShowcasePending ? "Menerbitkan..." : "Ya, terbitkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(showcaseUnpublishConfirm)}
        onOpenChange={(open) => {
          if (!open) setShowcaseUnpublishConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan publikasi galeri?</AlertDialogTitle>
            <AlertDialogDescription>
              Tahap {showcaseUnpublishConfirm === "initial" ? "1 dan karya non-finalis" : "2 dan karya finalis"} akan
              disembunyikan dari halaman publik. Pilihan peserta tetap terkunci dan tidak akan terbuka kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isShowcasePending}>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpublishShowcase} disabled={isShowcasePending}>
              {isShowcasePending ? "Membatalkan..." : "Ya, batalkan publikasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Results Release */}
      <AlertDialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.targetState
                ? `Rilis Hasil Penilaian ${confirmDialog?.stage === "preliminary" ? "Babak Awal" : "Babak Final"}?`
                : `Sembunyikan Hasil Penilaian ${confirmDialog?.stage === "preliminary" ? "Babak Awal" : "Babak Final"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-muted-foreground text-sm">
                {confirmDialog?.targetState ? (
                  <>
                    <p>
                      Tindakan ini akan mengaktifkan visibilitas hasil penilaian{" "}
                      <strong className="text-foreground">
                        {confirmDialog.stage === "preliminary" ? "Babak Awal" : "Babak Final"}
                      </strong>{" "}
                      kepada seluruh tim peserta {confirmDialog.stage === "final" ? "(khusus finalis)" : ""}.
                    </p>
                    <div className="space-y-1.5 rounded-md border bg-muted/40 p-3 text-foreground text-xs">
                      <p className="font-semibold">Informasi yang akan dapat dilihat tim:</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                        <li>
                          Nilai rata-rata kriteria (
                          {confirmDialog.stage === "preliminary"
                            ? "Fungsionalitas, Kesesuaian studi kasus, UI/UX, Kualitas kode, Dokumentasi"
                            : "Fungsionalitas, Kesesuaian studi kasus, UI/UX, Kualitas kode, Dokumentasi, Presentasi & Tanya Jawab"}
                          )
                        </li>
                        <li>Total nilai akhir berbobot</li>
                        <li>Jumlah juri yang telah memberikan nilai</li>
                        <li>Masukan tertulis (feedback) dari juri secara anonim tanpa identitas</li>
                      </ul>
                    </div>
                    {confirmDialog && judgingStats[confirmDialog.stage].incompleteJudges > 0 && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 text-xs dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <strong>Peringatan progres juri:</strong> Masih ada{" "}
                          {judgingStats[confirmDialog.stage].incompleteJudges} juri yang belum menyelesaikan penilaian
                          (baru {judgingStats[confirmDialog.stage].completedScores} dari{" "}
                          {judgingStats[confirmDialog.stage].totalExpectedScores} penilaian masuk). Tim akan melihat
                          rata-rata dari nilai yang sudah masuk.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p>
                    Hasil penilaian{" "}
                    <strong className="text-foreground">
                      {confirmDialog?.stage === "preliminary" ? "Babak Awal" : "Babak Final"}
                    </strong>{" "}
                    akan dinonaktifkan kembali. Tim peserta tidak akan dapat melihat nilai maupun masukan juri sampai
                    hasil dirilis ulang oleh panitia.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReleasePending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              disabled={isReleasePending}
              className={
                confirmDialog?.targetState ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {(() => {
                if (isReleasePending) return "Menyimpan...";
                return confirmDialog?.targetState ? "Ya, Rilis Hasil" : "Ya, Sembunyikan Hasil";
              })()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

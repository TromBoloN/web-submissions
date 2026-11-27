"use client";

import { useEffect, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Code2, Globe, RotateCw, StickyNote, Video } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LinkCheckResult } from "@/lib/link-check";
import type { Database } from "@/types/database";

import { checkMyLinks, saveSubmission } from "./actions";
import { LinkField } from "./submission-link-field";
import { type SubmissionLinkErrors, validateSubmissionLinks } from "./submission-rules";

type Submission = Database["public"]["Tables"]["submissions"]["Row"];

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

/**
 * Submission form state: field values, validation, saving and link checks.
 * Lives in SubmissionClient because the hero's live checklist reads the values while the team types.
 */
export function useSubmissionForm(submission: Submission | null) {
  const router = useRouter();
  const isSubmitted = submission?.status === "submitted";
  const [githubUrl, setGithubUrl] = useState(submission?.github_url ?? "");
  const [liveDemoUrl, setLiveDemoUrl] = useState(submission?.live_demo_url ?? "");
  const [videoUrl, setVideoUrl] = useState(submission?.video_url ?? "");
  const [notesForJudges, setNotesForJudges] = useState(submission?.notes_for_judges ?? "");

  const [fieldErrors, setFieldErrors] = useState<SubmissionLinkErrors>({});

  const [serverError, setServerError] = useState<string>();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [linkCheck, setLinkCheck] = useState<LinkCheckResult | null>(
    (submission?.link_check as unknown as LinkCheckResult | null) ?? null,
  );
  const [linkCheckedAt, setLinkCheckedAt] = useState<string | null>(submission?.link_checked_at ?? null);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  useEffect(() => {
    if (submission?.link_check) {
      setLinkCheck(submission.link_check as unknown as LinkCheckResult);
    }
    if (submission?.link_checked_at) {
      setLinkCheckedAt(submission.link_checked_at);
    }
  }, [submission?.link_check, submission?.link_checked_at]);

  const hasUnsavedChanges =
    githubUrl.trim() !== (submission?.github_url ?? "").trim() ||
    liveDemoUrl.trim() !== (submission?.live_demo_url ?? "").trim() ||
    videoUrl.trim() !== (submission?.video_url ?? "").trim() ||
    notesForJudges.trim() !== (submission?.notes_for_judges ?? "").trim();
  const clearFieldError = (field: keyof SubmissionLinkErrors) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const runLinkCheck = async (showToast = false) => {
    setIsCheckingLinks(true);
    try {
      const res = await checkMyLinks();
      if (res.ok) {
        setLinkCheck(res.data);
        setLinkCheckedAt(res.checkedAt);
        if (showToast) {
          toast.success("Pemeriksaan tautan selesai.");
        }
      } else {
        if (res.data) setLinkCheck(res.data);
        if (res.checkedAt) setLinkCheckedAt(res.checkedAt);
        if (showToast) {
          toast.info(res.message);
        }
      }
    } catch {
      if (showToast) {
        toast.error("Gagal memeriksa tautan. Coba lagi beberapa saat.");
      }
    } finally {
      setIsCheckingLinks(false);
    }
  };

  const validate = (mode: "draft" | "submit") => {
    const errors = validateSubmissionLinks(
      { github_url: githubUrl, live_demo_url: liveDemoUrl, video_url: videoUrl },
      mode,
    );
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExecuteSave = (intent: "draft" | "submit") => {
    setServerError(undefined);
    const form = new FormData();
    form.set("github_url", githubUrl.trim());
    form.set("live_demo_url", liveDemoUrl.trim());
    form.set("video_url", videoUrl.trim());
    form.set("notes_for_judges", notesForJudges.trim());
    form.set("intent", intent);

    startTransition(async () => {
      const result = await saveSubmission(form);
      if (!result.ok) {
        setServerError(result.message);
        toast.error(result.message);
        return;
      }

      if (intent === "submit") {
        toast.success(isSubmitted ? "Submission berhasil diperbarui." : "Submission berhasil dikirim!");
      } else {
        toast.success("Draf submission berhasil disimpan.");
      }
      setIsConfirmOpen(false);
      router.refresh();

      // Trigger background link check without blocking save
      void runLinkCheck(false);
    });
  };

  const handleSaveDraftClick = () => {
    if (!validate("draft")) return;
    handleExecuteSave("draft");
  };

  const handleSubmitClick = () => {
    if (!validate("submit")) return;
    setIsConfirmOpen(true);
  };

  return {
    githubUrl,
    setGithubUrl,
    liveDemoUrl,
    setLiveDemoUrl,
    videoUrl,
    setVideoUrl,
    notesForJudges,
    setNotesForJudges,
    fieldErrors,
    clearFieldError,
    serverError,
    isPending,
    linkCheck,
    linkCheckedAt,
    isCheckingLinks,
    runLinkCheck,
    isConfirmOpen,
    setIsConfirmOpen,
    handleExecuteSave,
    handleSaveDraftClick,
    handleSubmitClick,
    hasUnsavedChanges,
  };
}

export type SubmissionFormState = ReturnType<typeof useSubmissionForm>;

/** The form card and its submit confirmation. */
export function SubmissionForm({
  form,
  isReadOnly,
  isSubmitted,
  hasSubmissionRow,
}: {
  form: SubmissionFormState;
  isReadOnly: boolean;
  isSubmitted: boolean;
  hasSubmissionRow: boolean;
}) {
  const {
    githubUrl,
    setGithubUrl,
    liveDemoUrl,
    setLiveDemoUrl,
    videoUrl,
    setVideoUrl,
    notesForJudges,
    setNotesForJudges,
    fieldErrors,
    clearFieldError,
    serverError,
    isPending,
    linkCheck,
    linkCheckedAt,
    isCheckingLinks,
    runLinkCheck,
    isConfirmOpen,
    setIsConfirmOpen,
    handleExecuteSave,
    handleSaveDraftClick,
    handleSubmitClick,
  } = form;

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="p-4">
          <CardTitle className="text-lg">Formulir Pengiriman Berkas</CardTitle>
          <CardDescription>
            Masukkan tautan repositori GitHub, URL live demo aplikasi, dan video presentasi proyek tim Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4">
          <LinkField
            id="github_url"
            label="Repositori GitHub"
            icon={Code2}
            value={githubUrl}
            setValue={setGithubUrl}
            onUserInput={() => clearFieldError("github_url")}
            error={fieldErrors.github_url}
            placeholder="https://github.com/organisasi/nama-proyek"
            pasteLabel="Tempel URL GitHub"
            help={
              <>
                Tautan repositori publik GitHub yang berisi kode sumber proyek. Wajib diawali{" "}
                <code>https://github.com/</code>.
              </>
            }
            checkItem={linkCheck?.github}
            isChecking={isCheckingLinks}
            readOnly={isReadOnly}
            disabled={isPending}
          />

          <LinkField
            id="live_demo_url"
            label="URL Live Demo"
            icon={Globe}
            value={liveDemoUrl}
            setValue={setLiveDemoUrl}
            onUserInput={() => clearFieldError("live_demo_url")}
            error={fieldErrors.live_demo_url}
            placeholder="https://proyek-mitweek.vercel.app"
            pasteLabel="Tempel URL live demo"
            help="Tautan aplikasi web yang sudah di-deploy dan dapat diuji secara langsung oleh publik (Vercel, Netlify, dsb)."
            checkItem={linkCheck?.liveDemo}
            isChecking={isCheckingLinks}
            readOnly={isReadOnly}
            disabled={isPending}
          />

          <LinkField
            id="video_url"
            label="URL Video Demo"
            icon={Video}
            value={videoUrl}
            setValue={setVideoUrl}
            onUserInput={() => clearFieldError("video_url")}
            error={fieldErrors.video_url}
            placeholder="https://youtube.com/watch?v=... atau https://youtu.be/..."
            pasteLabel="Tempel URL video"
            help={
              <>
                Tautan video demonstrasi proyek berdurasi <strong>maksimal 5 menit</strong> (Juknis C.8). YouTube atau
                Google Drive dengan izin akses publik.
              </>
            }
            checkItem={linkCheck?.video}
            isChecking={isCheckingLinks}
            readOnly={isReadOnly}
            disabled={isPending}
          >
            {(videoUrl.includes("list=") || videoUrl.includes("start_radio")) && (
              <p className="font-medium text-amber-600 text-xs">
                Tips: Tautan video terdeteksi memuat parameter playlist (&list=...). Disarankan menggunakan tautan
                langsung video tunggal agar juri dapat langsung membuka.
              </p>
            )}
          </LinkField>

          <p className="text-muted-foreground text-xs italic">
            * Pemeriksaan tautan hanya peringatan dan tidak menghalangi pengiriman.
          </p>

          {/* Notes for judges */}
          <div className="space-y-2 border-t pt-5">
            <Label htmlFor="notes_for_judges" className="flex items-center gap-1.5 font-medium">
              <StickyNote className="size-4 text-muted-foreground" />
              Catatan untuk Juri
              <span className="font-normal text-muted-foreground text-xs">(opsional)</span>
            </Label>
            <Textarea
              id="notes_for_judges"
              name="notes_for_judges"
              rows={4}
              maxLength={1000}
              value={notesForJudges}
              disabled={isReadOnly || isPending}
              onChange={(e) => setNotesForJudges(e.target.value)}
              placeholder="Contoh: akun demo yang dapat dipakai juri, langkah pengujian utama, atau batasan yang perlu diketahui."
              className="min-h-24 resize-y"
            />
            <div className="flex items-start justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Ditampilkan kepada dewan juri dan panitia. Gunakan akun demo khusus, jangan bagikan kata sandi pribadi.
              </p>
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{notesForJudges.length}/1000</span>
            </div>
          </div>

          {serverError && <p className="text-destructive text-sm">{serverError}</p>}
        </CardContent>

        {!isReadOnly && (
          <CardFooter className="flex flex-col-reverse justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasSubmissionRow || isCheckingLinks || isPending}
                onClick={() => runLinkCheck(true)}
                className="gap-1.5"
                title={hasSubmissionRow ? undefined : "Simpan draf terlebih dahulu untuk memeriksa tautan."}
              >
                <RotateCw className={`size-3.5 ${isCheckingLinks ? "animate-spin" : ""}`} />
                {isCheckingLinks ? "Memeriksa tautan..." : "Periksa tautan"}
              </Button>
              {!hasSubmissionRow && (
                <span className="text-muted-foreground text-xs">Simpan draf dulu untuk memeriksa tautan.</span>
              )}
              {hasSubmissionRow && linkCheckedAt && (
                <span className="text-muted-foreground text-xs">Dicek: {formatTimestampWita(linkCheckedAt)}</span>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              {!isSubmitted && (
                <Button type="button" variant="outline" disabled={isPending} onClick={handleSaveDraftClick}>
                  Simpan draf
                </Button>
              )}
              <Button type="button" disabled={isPending} onClick={handleSubmitClick}>
                {isSubmitted ? "Perbarui submission" : "Kirim submission"}
              </Button>
            </div>
          </CardFooter>
        )}

        {isReadOnly && hasSubmissionRow && (
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCheckingLinks}
              onClick={() => runLinkCheck(true)}
              className="gap-1.5"
            >
              <RotateCw className={`size-3.5 ${isCheckingLinks ? "animate-spin" : ""}`} />
              {isCheckingLinks ? "Memeriksa tautan..." : "Periksa tautan"}
            </Button>
            {linkCheckedAt && (
              <span className="text-muted-foreground text-xs">Dicek: {formatTimestampWita(linkCheckedAt)}</span>
            )}
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSubmitted ? "Perbarui Submission?" : "Kirim Submission Sekarang?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSubmitted
                ? "Pastikan seluruh tautan terbaru yang Anda masukkan sudah benar dan dapat diakses publik oleh dewan juri."
                : "Pastikan seluruh tautan (repositori GitHub, live demo, video demo) sudah benar dan dapat diakses publik oleh dewan juri. Anda tetap dapat memperbaruinya sebelum batas waktu berakhir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleExecuteSave("submit");
              }}
            >
              {isPending && "Menyimpan..."}
              {!isPending && (isSubmitted ? "Perbarui Sekarang" : "Kirim Sekarang")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

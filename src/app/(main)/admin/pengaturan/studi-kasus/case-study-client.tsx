"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseWitaInputToUtcIso, toWitaDateTimeLocalStringExact } from "@/lib/deadline";

import { updateCaseStudy } from "../actions";
import { formatWitaTimestamp } from "../settings-utils";

type CaseStudyData = {
  title: string;
  contentMd: string;
  releaseAt: string | null;
  updatedAt: string | null;
};

export function CaseStudyClient({ caseStudy }: { caseStudy: CaseStudyData | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(caseStudy?.title ?? "");
  const [content, setContent] = useState(caseStudy?.contentMd ?? "");
  const [releaseAt, setReleaseAt] = useState(() => toWitaDateTimeLocalStringExact(caseStudy?.releaseAt ?? null));
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const formattedUpdatedAt = formatWitaTimestamp(caseStudy?.updatedAt ?? null);
  const releaseIso = releaseAt ? parseWitaInputToUtcIso(releaseAt) : null;
  // Admin-only hint; the server decides visibility from its own clock.
  const isReleaseAtInPast = Boolean(releaseIso && new Date(releaseIso).getTime() <= Date.now());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    setWarning(undefined);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateCaseStudy(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.warning) {
        setWarning(result.warning);
        toast.warning(result.warning);
      } else {
        toast.success("Studi kasus berhasil diperbarui.");
      }
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 shrink-0 text-primary" />
          Studi Kasus
        </CardTitle>
        <CardDescription>
          {formattedUpdatedAt ? `Terakhir diperbarui: ${formattedUpdatedAt}` : "Belum pernah diperbarui"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Judul studi kasus</Label>
            <Input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              required
              placeholder="Judul studi kasus..."
            />
            <div className="flex justify-between gap-3 text-muted-foreground text-xs">
              <span>Judul utama studi kasus kompetisi.</span>
              <span className="shrink-0 tabular-nums">{title.length}/150</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="release_at">Tampil mulai (WITA), opsional</Label>
            <Input
              id="release_at"
              name="release_at"
              type="datetime-local"
              value={releaseAt}
              onChange={(event) => setReleaseAt(event.target.value)}
              aria-describedby="release-at-hint"
              className="w-full font-mono sm:max-w-md"
            />
            <p id="release-at-hint" className="text-muted-foreground text-xs">
              Kosongkan agar studi kasus langsung terlihat. Jika diisi, studi kasus disembunyikan sampai waktu ini.
            </p>
            {isReleaseAtInPast && (
              <p className="flex items-start gap-1.5 text-amber-600 text-xs dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Waktu rilis sudah lewat, jadi studi kasus akan langsung terlihat oleh peserta.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="content_md">Isi studi kasus (Markdown)</Label>
              <span className="font-mono text-muted-foreground text-xs tabular-nums">
                {content.length}/20.000 karakter
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
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={16}
                  maxLength={20000}
                  required
                  placeholder="Tulis isi studi kasus menggunakan format Markdown..."
                  className="min-h-64 font-mono text-sm leading-relaxed"
                />
                <p className="text-muted-foreground text-xs">
                  Format Markdown: <code>## Judul Bagian</code>, <code>1. Daftar bernomor</code>,{" "}
                  <code>* Daftar poin</code>, <code>**Tebal**</code>, <code>*Miring*</code>, <code>&gt; Kutipan</code>.
                </p>
              </TabsContent>
              <TabsContent value="preview" className="pt-2">
                <div className="max-h-[32rem] min-h-64 overflow-y-auto rounded-md border bg-muted/20 p-4">
                  {content.trim() ? (
                    <MarkdownContent content={content} />
                  ) : (
                    <p className="text-muted-foreground text-sm italic">Belum ada konten untuk dipratinjau.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          {warning && (
            <p className="flex items-start gap-1.5 text-amber-600 text-xs dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {warning}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={isPending} className="press w-full sm:w-auto">
            {isPending ? "Menyimpan..." : "Perbarui studi kasus"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

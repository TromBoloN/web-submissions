"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import Link from "next/link";

import { ImageIcon, LoaderCircle, LockKeyhole, Save } from "lucide-react";
import { toast } from "sonner";

import { ShowcaseCard, type ShowcaseCardData } from "@/components/showcase-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

import { saveShowcaseDetails } from "./actions";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Submission = Pick<
  Database["public"]["Tables"]["submissions"]["Row"],
  "status" | "github_url" | "live_demo_url" | "video_url"
>;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;

function getPublicImageUrl(supabaseUrl: string, path: string | null): string | null {
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/web-showcase/${path}`;
}

async function resizeImage(file: File): Promise<{ blob: Blob; extension: string }> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Format gambar harus PNG, JPEG, atau WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Ukuran gambar maksimal 2 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.85));
  if (!blob || blob.size > MAX_IMAGE_BYTES) {
    throw new Error("Gambar terlalu besar setelah diproses. Gunakan gambar yang lebih kecil.");
  }

  return { blob, extension: file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] };
}

export function KaryaClient({
  team,
  submission,
  showcasePublishedAt,
  showcaseFinalistsPublishedAt,
  supabaseUrl,
}: {
  team: Team;
  submission: Submission | null;
  showcasePublishedAt: string | null;
  showcaseFinalistsPublishedAt: string | null;
  supabaseUrl: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(team.showcase_consent);
  const [title, setTitle] = useState(team.showcase_title);
  const [description, setDescription] = useState(team.showcase_description);
  const [imagePath, setImagePath] = useState(team.showcase_image_path);
  const [imageUrl, setImageUrl] = useState(getPublicImageUrl(supabaseUrl, team.showcase_image_path));
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSubmitted = submission?.status === "submitted";
  const isLocked = showcasePublishedAt !== null;
  const isFinalistWaiting = Boolean(team.showcase_is_finalist && showcasePublishedAt && !showcaseFinalistsPublishedAt);
  const cardData: ShowcaseCardData = {
    teamName: team.team_name,
    title,
    description,
    imageUrl,
    githubUrl: submission?.github_url ?? "",
    liveDemoUrl: submission?.live_demo_url ?? "",
    videoUrl: submission?.video_url ?? "",
  };

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    void resizeImage(file)
      .then(async ({ blob, extension }) => {
        const path = `showcase/${team.profile_id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("web-showcase").upload(path, blob, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error("Gambar gagal diunggah. Coba lagi.");
        const previousPath = imagePath;
        if (previousPath) {
          await supabase.storage.from("web-showcase").remove([previousPath]);
        }
        setImagePath(path);
        setImageUrl(getPublicImageUrl(supabaseUrl, path));
        toast.success("Gambar pratinjau diperbarui.");
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Gambar gagal diproses.");
      })
      .finally(() => setIsUploading(false));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveShowcaseDetails({ consent, title, description, imagePath });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Tampilan karya berhasil disimpan.");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Atur Tampilan Karya</h1>
        <p className="text-muted-foreground text-sm">
          Tentukan informasi yang akan ditampilkan bersama karya tim Anda di galeri.
        </p>
      </div>

      {!isSubmitted ? (
        <Card>
          <CardHeader>
            <CardTitle>Submission belum terkirim</CardTitle>
            <CardDescription>Kirim submission terlebih dahulu untuk mengatur tampilan karya.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {isLocked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" />
              <p>
                Tampilan karya telah dikunci karena galeri sudah diterbitkan.
                {isFinalistWaiting && " Karya finalis akan ditampilkan pada pengumuman pemenang."}
              </p>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            {!isLocked && (
              <Card>
                <CardHeader>
                  <CardTitle>Informasi galeri</CardTitle>
                  <CardDescription>
                    Galeri tidak menampilkan nilai atau peringkat. Pemenang diumumkan terpisah.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="showcase-consent-page"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                    />
                    <Label htmlFor="showcase-consent-page">
                      Saya bersedia karya, judul, deskripsi, dan gambar pratinjau tim saya ditampilkan di galeri.
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="showcase-title">Judul karya</Label>
                    <Input
                      id="showcase-title"
                      maxLength={80}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={team.team_name}
                    />
                    <p className="text-muted-foreground text-xs">{title.length}/80 karakter</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="showcase-description">Deskripsi singkat</Label>
                    <Textarea
                      id="showcase-description"
                      maxLength={300}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Jelaskan karya secara singkat."
                      rows={5}
                    />
                    <p className="text-muted-foreground text-xs">{description.length}/300 karakter</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="showcase-image">Gambar pratinjau</Label>
                    <Input
                      ref={fileInputRef}
                      id="showcase-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={isUploading || isPending}
                      onChange={(event) => handleImage(event.target.files?.[0])}
                    />
                    <p className="text-muted-foreground text-xs">PNG, JPEG, atau WebP. Maksimal 2 MB.</p>
                  </div>
                  <Button type="button" disabled={isUploading || isPending} onClick={handleSave} className="gap-2">
                    {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Simpan tampilan
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className={isLocked ? "lg:col-span-2" : ""}>
              <div className="mb-3 flex items-center gap-2 font-medium text-sm">
                <ImageIcon className="size-4 text-primary" />
                Pratinjau galeri
              </div>
              <ShowcaseCard data={cardData} />
            </div>
          </div>
          {isLocked && (
            <Button asChild variant="outline">
              <Link href="/karya">Lihat di halaman publik</Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}

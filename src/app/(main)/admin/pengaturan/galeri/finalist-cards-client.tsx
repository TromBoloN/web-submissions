"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { ImageUp, LoaderCircle, Save, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { KaryaCardPreview } from "@/app/karya/karya-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPublicImageUrl, resizeImage, SHOWCASE_BUCKET } from "@/lib/showcase-image";
import { createClient } from "@/lib/supabase/client";

import { saveFinalistShowcase } from "../actions";

export type FinalistCardTeam = {
  id: string;
  teamCode: string;
  teamName: string;
  rank: number | null;
  title: string;
  description: string;
  imagePath: string | null;
  consent: boolean;
  githubUrl: string;
  liveDemoUrl: string;
  videoUrl: string;
};

function FinalistCardEditor({ team, supabaseUrl }: { team: FinalistCardTeam; supabaseUrl: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(team.title);
  const [description, setDescription] = useState(team.description);
  const [imagePath, setImagePath] = useState(team.imagePath);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty = title !== team.title || description !== team.description || imagePath !== team.imagePath;

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    void resizeImage(file)
      .then(async ({ blob, extension }) => {
        const path = `showcase/admin/${team.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(SHOWCASE_BUCKET).upload(path, blob, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error("Gambar gagal diunggah. Coba lagi.");
        // Discard an earlier unsaved admin upload; saved images are cleaned up by the save action.
        if (imagePath && imagePath !== team.imagePath && imagePath.startsWith("showcase/admin/")) {
          await supabase.storage.from(SHOWCASE_BUCKET).remove([imagePath]);
        }
        setImagePath(path);
        toast.success("Gambar diunggah. Klik Simpan untuk menerapkan.");
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Gambar gagal diproses.");
      })
      .finally(() => {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveFinalistShowcase({ teamId: team.id, title, description, imagePath });
      if (res.success) {
        toast.success(`Kartu galeri ${team.teamCode} disimpan.`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {team.rank !== null && (
            <Badge variant="outline" className="font-mono">
              #{team.rank}
            </Badge>
          )}
          <span className="font-mono font-semibold text-sm">{team.teamCode}</span>
          <span className="min-w-0 text-muted-foreground text-sm">{team.teamName}</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {team.consent ? "Tautan ditampilkan" : "Tautan disembunyikan (tim belum setuju)"}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`title-${team.id}`}>Judul karya</Label>
            <span className="text-muted-foreground text-xs tabular-nums">{title.length}/80</span>
          </div>
          <Input
            id={`title-${team.id}`}
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul yang tampil di galeri"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`desc-${team.id}`}>Deskripsi</Label>
            <span className="text-muted-foreground text-xs tabular-nums">{description.length}/300</span>
          </div>
          <Textarea
            id={`desc-${team.id}`}
            value={description}
            maxLength={300}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ringkasan singkat karya"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleImage(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ImageUp className="mr-2 size-4" />}
            {imagePath ? "Ganti gambar" : "Unggah gambar"}
          </Button>
          {imagePath && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading || isPending}
              onClick={() => setImagePath(null)}
            >
              <Trash2 className="mr-2 size-4" />
              Hapus gambar
            </Button>
          )}
          <span className="text-muted-foreground text-xs">PNG, JPEG, atau WebP, maks. 2 MB. Dipotong 16:10.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={!isDirty || isPending || isUploading} onClick={handleSave}>
            <Save className="mr-2 size-4" />
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
          {isDirty && <span className="text-amber-700 text-xs dark:text-amber-400">Ada perubahan belum disimpan.</span>}
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-muted-foreground text-xs">Pratinjau di galeri</p>
        <KaryaCardPreview
          item={{
            teamName: team.teamName,
            title,
            description,
            imageUrl: getPublicImageUrl(supabaseUrl, imagePath),
            githubUrl: team.consent ? team.githubUrl : "",
            liveDemoUrl: team.consent ? team.liveDemoUrl : "",
            videoUrl: team.consent ? team.videoUrl : "",
            isFinalist: true,
          }}
        />
      </div>
    </div>
  );
}

export function FinalistCardsClient({ teams, supabaseUrl }: { teams: FinalistCardTeam[]; supabaseUrl: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          Kartu galeri finalis
        </CardTitle>
        <CardDescription>
          Tim finalis otomatis tampil di galeri finalis, termasuk yang belum memberi persetujuan. Tim tetap bisa
          mengubah kartunya sendiri sampai galeri finalis diterbitkan; perubahan terakhir yang disimpan yang dipakai.
          Tautan repositori, demo, dan video hanya tampil jika tim setuju.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {teams.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Belum ada tim finalis. Tetapkan finalis di halaman Peringkat terlebih dahulu.
          </p>
        ) : (
          teams.map((team) => (
            <FinalistCardEditor
              // Remount after a save so the editor picks up the stored values.
              key={`${team.id}:${team.title}:${team.description}:${team.imagePath ?? ""}`}
              team={team}
              supabaseUrl={supabaseUrl}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

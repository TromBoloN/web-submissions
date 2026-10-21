"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Check, ClipboardCheck, FileEdit, FileQuestion, Layers, Search, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/types/database";

export interface JudgeTeamItem {
  id: string;
  team_code: string;
  team_name: string;
  is_finalist: boolean;
  score: {
    total_weighted_score: number;
    updated_at: string;
  } | null;
}

interface JudgeDashboardClientProps {
  judgeName: string;
  judgeStage: Database["public"]["Enums"]["judge_stage_type"] | null;
  preliminaryTeams: JudgeTeamItem[];
  finalTeams: JudgeTeamItem[];
}

function formatTimestampWita(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)} WITA`;
}

function StageBadge({ stage }: { stage: Database["public"]["Enums"]["judge_stage_type"] | null }) {
  if (stage === "both") {
    return <Badge variant="secondary">Babak Awal & Final</Badge>;
  }
  if (stage === "final") {
    return <Badge className="bg-amber-600 text-white hover:bg-amber-600">Babak Final</Badge>;
  }
  return <Badge variant="outline">Babak Awal</Badge>;
}

function StageSection({
  stage,
  title,
  description,
  teams,
}: {
  stage: "preliminary" | "final";
  title: string;
  description: string;
  teams: JudgeTeamItem[];
}) {
  const [search, setSearch] = useState("");

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((item) => item.team_code.toLowerCase().includes(q) || item.team_name.toLowerCase().includes(q));
  }, [teams, search]);

  const totalCount = teams.length;
  const scoredCount = teams.filter((t) => t.score !== null).length;
  const progressPercentage = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0;

  let emptyTitle = "Tidak ada tim yang cocok dengan pencarian.";
  let emptyDescription = "Coba gunakan kata kunci pencarian yang lain.";
  if (teams.length === 0) {
    emptyTitle = "Belum ada submission yang dapat dinilai.";
    emptyDescription =
      stage === "final"
        ? "Tim finalis yang telah mengunggah submission akan muncul di sini."
        : "Tim peserta yang telah mengirimkan submission akan muncul di sini secara otomatis.";
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Progres: </span>
              <span className="font-semibold">
                {scoredCount} dari {totalCount} tim sudah dinilai
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Kelengkapan Penilaian</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode tim atau nama tim..."
                className="pl-9"
              />
            </div>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <FileQuestion className="size-10 text-muted-foreground opacity-60 mb-2" />
              <p className="font-medium text-sm">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">{emptyDescription}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Kode Tim</TableHead>
                    <TableHead>Nama Tim</TableHead>
                    <TableHead className="w-[180px]">Status Penilaian</TableHead>
                    <TableHead className="w-[140px]">Total Skor</TableHead>
                    <TableHead className="w-[200px]">Terakhir Disimpan</TableHead>
                    <TableHead className="w-[130px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((item) => {
                    const isScored = item.score !== null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.team_code}</TableCell>
                        <TableCell className="font-medium">{item.team_name}</TableCell>
                        <TableCell>
                          {isScored ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                              <Check className="size-3" />
                              Sudah dinilai
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-dashed text-muted-foreground">
                              Belum dinilai
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isScored ? (
                            <span className="font-semibold text-foreground">
                              {Number(item.score?.total_weighted_score).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestampWita(item.score?.updated_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant={isScored ? "outline" : "default"}>
                            <Link href={`/judge/nilai/${stage}/${item.id}`}>
                              {isScored ? (
                                <>
                                  <FileEdit className="mr-1.5 size-3.5" />
                                  Ubah nilai
                                </>
                              ) : (
                                <>
                                  <ClipboardCheck className="mr-1.5 size-3.5" />
                                  Nilai
                                </>
                              )}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function JudgeDashboardClient({
  judgeName,
  judgeStage,
  preliminaryTeams,
  finalTeams,
}: JudgeDashboardClientProps) {
  const stage = judgeStage ?? "preliminary";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-semibold text-2xl">Penilaian Karya</h1>
            <StageBadge stage={judgeStage} />
          </div>
          <p className="text-muted-foreground">
            Selamat bertugas, <span className="font-medium text-foreground">{judgeName}</span>. Berikan penilaian secara
            independen dan objektif.
          </p>
        </div>
      </div>

      {stage === "both" && (
        <Tabs defaultValue="preliminary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="preliminary" className="gap-2">
              <Layers className="size-4" />
              Babak Awal ({preliminaryTeams.filter((t) => t.score !== null).length}/{preliminaryTeams.length})
            </TabsTrigger>
            <TabsTrigger value="final" className="gap-2">
              <Trophy className="size-4" />
              Final ({finalTeams.filter((t) => t.score !== null).length}/{finalTeams.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preliminary">
            <StageSection
              stage="preliminary"
              title="Daftar Tim — Babak Awal"
              description="Seluruh tim dengan submission terkirim yang berhak dinilai pada babak penyisihan."
              teams={preliminaryTeams}
            />
          </TabsContent>

          <TabsContent value="final">
            <StageSection
              stage="final"
              title="Daftar Tim — Babak Final"
              description="Tim finalis resmi yang berhak dinilai pada babak final."
              teams={finalTeams}
            />
          </TabsContent>
        </Tabs>
      )}

      {stage === "final" && (
        <StageSection
          stage="final"
          title="Daftar Tim — Babak Final"
          description="Tim finalis resmi yang berhak dinilai pada babak final."
          teams={finalTeams}
        />
      )}

      {stage === "preliminary" && (
        <StageSection
          stage="preliminary"
          title="Daftar Tim — Babak Awal"
          description="Seluruh tim dengan submission terkirim yang berhak dinilai pada babak penyisihan."
          teams={preliminaryTeams}
        />
      )}
    </div>
  );
}

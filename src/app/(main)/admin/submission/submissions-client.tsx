"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { type ColumnDef, tableFeatures, useTable } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileQuestion,
  HelpCircle,
  History,
  Info,
  MoreVertical,
  Pencil,
  RotateCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { LinkCheckItem, LinkCheckResult } from "@/lib/link-check";

import { adminRecheckLinks, adminUpdateSubmission } from "./actions";

export type SubmissionRow = {
  team_id: string;
  team_code: string;
  team_name: string;
  institution: string;
  leader_name: string;
  members: string[];
  is_finalist: boolean;
  is_disqualified: boolean;
  submission_id: string | null;
  status: "unsubmitted" | "draft" | "submitted";
  github_url: string;
  live_demo_url: string;
  video_url: string;
  notes_for_judges: string;
  submitted_at: string | null;
  first_submitted_at: string | null;
  updated_at: string | null;
  link_check: LinkCheckResult | null;
  link_checked_at: string | null;
};

export type SubmissionHistoryItem = {
  id: number;
  submission_id: string;
  github_url: string;
  live_demo_url: string;
  video_url: string;
  notes_for_judges: string;
  status: string;
  changed_at: string;
  changed_by_name: string | null;
};

type SubmissionsClientProps = {
  rows: SubmissionRow[];
  history: SubmissionHistoryItem[];
};

const features = tableFeatures({});
const pageSize = 20;

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

function SubmissionLink({ url, label }: { url: string; label?: string }) {
  const trimmed = url.trim();
  if (!trimmed) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const isLink = /^https?:\/\//i.test(trimmed);
  if (!isLink) {
    return (
      <span className="inline-block max-w-[140px] truncate text-muted-foreground text-xs" title={trimmed}>
        {trimmed}
      </span>
    );
  }

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-[140px] items-center gap-1 truncate text-primary text-xs hover:underline"
      title={trimmed}
    >
      <span className="truncate">{label ?? trimmed}</span>
      <ExternalLink className="size-3 shrink-0 opacity-70" />
    </a>
  );
}

function getLinkCheckSummary(linkCheck: LinkCheckResult | null, linkCheckedAt: string | null) {
  if (!linkCheck || !linkCheckedAt) {
    return {
      status: "unverified" as const,
      label: "Belum diperiksa",
      warningsCount: 0,
    };
  }

  const items = [linkCheck.github, linkCheck.liveDemo, linkCheck.video].filter(Boolean);
  const warnings = items.filter((i) => i?.status === "warning");

  if (warnings.length > 0) {
    return {
      status: "warning" as const,
      label: `${warnings.length} peringatan`,
      warningsCount: warnings.length,
    };
  }

  const oks = items.filter((i) => i?.status === "ok");
  if (oks.length > 0) {
    return {
      status: "ok" as const,
      label: "Semua aman",
      warningsCount: 0,
    };
  }

  return {
    status: "unknown" as const,
    label: "Diperiksa",
    warningsCount: 0,
  };
}

function LinkCheckDetailDialog({
  row,
  open,
  onOpenChange,
  onRecheck,
  isRechecking,
}: {
  row: SubmissionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecheck: (teamId: string) => Promise<void>;
  isRechecking: boolean;
}) {
  if (!row) return null;

  const linkCheck = row.link_check;
  const items: { label: string; url: string; item?: LinkCheckItem }[] = [
    { label: "GitHub", url: row.github_url, item: linkCheck?.github },
    { label: "Live Demo", url: row.live_demo_url, item: linkCheck?.liveDemo },
    { label: "Video Demo", url: row.video_url, item: linkCheck?.video },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Pemeriksaan Tautan</DialogTitle>
          <DialogDescription>
            {row.team_code} — {row.team_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
            <span className="text-muted-foreground">Waktu pemeriksaan: </span>
            <span className="font-medium text-foreground">
              {row.link_checked_at ? formatTimestampWita(row.link_checked_at) : "Belum pernah diperiksa"}
            </span>
          </div>

          <div className="space-y-3">
            {items.map(({ label, url, item }) => (
              <div key={label} className="space-y-1.5 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-muted-foreground text-xs">{label}</span>
                  {item?.status === "ok" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="size-3" /> Aman
                    </Badge>
                  )}
                  {item?.status === "warning" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400"
                    >
                      <AlertTriangle className="size-3" /> Peringatan
                    </Badge>
                  )}
                  {item?.status === "unknown" && (
                    <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
                      <HelpCircle className="size-3" /> Info
                    </Badge>
                  )}
                  {!item && (
                    <Badge variant="outline" className="border-dashed text-[11px] text-muted-foreground">
                      Belum dicek
                    </Badge>
                  )}
                </div>

                <div className="truncate text-xs">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <span className="truncate">{url}</span>
                      <ExternalLink className="size-3 shrink-0 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">(Tautan belum diisi)</span>
                  )}
                </div>

                {item?.message && <p className="text-muted-foreground text-xs">{item.message}</p>}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          {row.submission_id ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRechecking}
              onClick={() => onRecheck(row.team_id)}
              className="gap-1.5"
            >
              <RotateCw className={`size-3.5 ${isRechecking ? "animate-spin" : ""}`} />
              {isRechecking ? "Memeriksa..." : "Periksa Ulang"}
            </Button>
          ) : (
            <div />
          )}
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm">
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="w-20 shrink-0 text-muted-foreground">{label}:</span>
      {value.trim() ? (
        <span className="break-all text-foreground">{value}</span>
      ) : (
        <span className="text-muted-foreground italic">kosong</span>
      )}
    </div>
  );
}

function SubmissionHistoryDialog({
  row,
  items,
  open,
  onOpenChange,
}: {
  row: SubmissionRow | null;
  items: SubmissionHistoryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            Riwayat Perubahan Submission
          </DialogTitle>
          <DialogDescription>
            {row.team_code} — {row.team_name}
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <History className="mx-auto mb-2 size-8 text-muted-foreground opacity-60" />
            <p className="font-medium text-sm">Belum ada riwayat tercatat.</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Riwayat dicatat otomatis setiap kali submission dibuat atau diubah.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground text-xs">{formatTimestampWita(item.changed_at)}</span>
                  {item.status === "submitted" ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Terkirim</Badge>
                  ) : (
                    <Badge variant="secondary">Draf</Badge>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Oleh: <span className="font-medium text-foreground">{item.changed_by_name ?? "Sistem"}</span>
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <HistoryField label="GitHub" value={item.github_url} />
                  <HistoryField label="Live Demo" value={item.live_demo_url} />
                  <HistoryField label="Video" value={item.video_url} />
                  {item.notes_for_judges.trim() && (
                    <div className="flex gap-1.5">
                      <span className="w-20 shrink-0 text-muted-foreground">Catatan juri:</span>
                      <span className="whitespace-pre-wrap break-words text-foreground">{item.notes_for_judges}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm">
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminEditSubmissionDialog({
  row,
  open,
  onOpenChange,
  onUpdated,
}: {
  row: SubmissionRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [githubUrl, setGithubUrl] = useState(row.github_url);
  const [liveDemoUrl, setLiveDemoUrl] = useState(row.live_demo_url);
  const [videoUrl, setVideoUrl] = useState(row.video_url);
  const [notesForJudges, setNotesForJudges] = useState(row.notes_for_judges);
  const [status, setStatus] = useState<"draft" | "submitted">(row.status === "submitted" ? "submitted" : "draft");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);

    const form = new FormData();
    form.set("team_id", row.team_id);
    form.set("github_url", githubUrl.trim());
    form.set("live_demo_url", liveDemoUrl.trim());
    form.set("video_url", videoUrl.trim());
    form.set("notes_for_judges", notesForJudges.trim());
    form.set("status", status);

    startTransition(async () => {
      const result = await adminUpdateSubmission(form);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success("Submission tim berhasil diperbarui.");
      onOpenChange(false);
      onUpdated();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ubah Submission Tim</DialogTitle>
          <DialogDescription>
            Ubah tautan dan status submission untuk tim {row.team_name} ({row.team_code}).
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-primary/20 bg-primary/5 text-foreground">
          <Info className="size-4 text-primary" />
          <AlertDescription className="text-xs">
            Perubahan oleh admin tidak dibatasi batas waktu. Jika Anda memilih status <strong>Terkirim</strong>, ketiga
            tautan wajib diisi.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-github_url">Repositori GitHub</Label>
            <Input
              id="admin-github_url"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/organisasi/nama-proyek"
            />
            <p className="text-muted-foreground text-xs">Wajib diawali https://github.com/ jika diisi.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-live_demo_url">URL Live Demo</Label>
            <Input
              id="admin-live_demo_url"
              type="url"
              value={liveDemoUrl}
              onChange={(e) => setLiveDemoUrl(e.target.value)}
              placeholder="https://proyek-mitweek.vercel.app"
            />
            <p className="text-muted-foreground text-xs">Wajib diawali http:// atau https:// jika diisi.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-video_url">URL Video Demo</Label>
            <Input
              id="admin-video_url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... atau Google Drive"
            />
            <p className="text-muted-foreground text-xs">Wajib diawali http:// atau https:// jika diisi.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-notes_for_judges">Catatan untuk Juri</Label>
              <span className="text-muted-foreground text-xs tabular-nums">{notesForJudges.length}/1000</span>
            </div>
            <Textarea
              id="admin-notes_for_judges"
              rows={4}
              maxLength={1000}
              value={notesForJudges}
              onChange={(e) => setNotesForJudges(e.target.value)}
              placeholder="Catatan opsional dari peserta untuk dewan juri..."
            />
            <p className="text-muted-foreground text-xs">Ditampilkan sebagai teks biasa di halaman penilaian juri.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Status Submission</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as "draft" | "submitted")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draf</SelectItem>
                <SelectItem value="submitted">Terkirim</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Status &quot;Terkirim&quot; mensyaratkan ketiga tautan di atas terisi lengkap.
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubmissionsClient({ rows, history }: SubmissionsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<SubmissionRow | null>(null);
  const [detailRow, setDetailRow] = useState<SubmissionRow | null>(null);
  const [historyRow, setHistoryRow] = useState<SubmissionRow | null>(null);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  // Summary counts
  const totalTeams = rows.length;
  const submittedCount = rows.filter((r) => r.status === "submitted").length;
  const draftCount = rows.filter((r) => r.status === "draft").length;
  const unsubmittedCount = rows.filter((r) => r.status === "unsubmitted").length;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || row.team_code.toLowerCase().includes(q) || row.team_name.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (linkFilter !== "all") {
        const summary = getLinkCheckSummary(row.link_check, row.link_checked_at);
        if (linkFilter === "warning" && summary.status !== "warning") return false;
        if (linkFilter === "ok" && summary.status !== "ok") return false;
        if (linkFilter === "unverified" && summary.status !== "unverified") return false;
      }

      return true;
    });
  }, [rows, search, statusFilter, linkFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleLinkFilterChange = (val: string) => {
    setLinkFilter(val);
    setPage(1);
  };

  const handleRecheck = async (teamId: string) => {
    setRecheckingId(teamId);
    try {
      const res = await adminRecheckLinks(teamId);
      if (res.ok) {
        toast.success("Pemeriksaan tautan berhasil diperbarui.");
        if (detailRow?.team_id === teamId) {
          setDetailRow((prev) =>
            prev
              ? {
                  ...prev,
                  link_check: res.data,
                  link_checked_at: res.checkedAt,
                }
              : null,
          );
        }
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Gagal melakukan pemeriksaan ulang tautan.");
    } finally {
      setRecheckingId(null);
    }
  };

  const columns: ColumnDef<typeof features, SubmissionRow>[] = [
    {
      accessorKey: "team_code",
      header: "Kode Tim",
      cell: ({ row }) => <span className="font-medium font-mono">{row.original.team_code}</span>,
    },
    {
      accessorKey: "team_name",
      header: "Nama Tim",
      cell: ({ row }) => <span className="font-medium">{row.original.team_name}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        if (s === "submitted") {
          return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Terkirim</Badge>;
        }
        if (s === "draft") {
          return <Badge variant="secondary">Draf</Badge>;
        }
        return (
          <Badge variant="outline" className="border-dashed text-muted-foreground">
            Belum dikirim
          </Badge>
        );
      },
    },
    {
      id: "link_check",
      header: "Tautan",
      cell: ({ row }) => {
        const summary = getLinkCheckSummary(row.original.link_check, row.original.link_checked_at);
        if (summary.status === "warning") {
          return (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
              onClick={() => setDetailRow(row.original)}
              title={`${summary.label}. Klik untuk detail.`}
            >
              <AlertTriangle className="size-3" />
              {summary.label}
            </Badge>
          );
        }
        if (summary.status === "ok") {
          return (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
              onClick={() => setDetailRow(row.original)}
              title="Semua tautan aman. Klik untuk detail."
            >
              <CheckCircle2 className="size-3" />
              Semua aman
            </Badge>
          );
        }
        if (summary.status === "unknown") {
          return (
            <Badge
              variant="outline"
              className="cursor-pointer gap-1 text-[11px] hover:bg-muted"
              onClick={() => setDetailRow(row.original)}
              title="Perlu verifikasi manual. Klik untuk detail."
            >
              <HelpCircle className="size-3" />
              Diperiksa
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className="cursor-pointer border-dashed text-[11px] text-muted-foreground hover:bg-muted"
            onClick={() => setDetailRow(row.original)}
            title="Belum diperiksa. Klik untuk detail atau periksa ulang."
          >
            Belum diperiksa
          </Badge>
        );
      },
    },
    {
      id: "github_url",
      header: "GitHub",
      cell: ({ row }) => <SubmissionLink url={row.original.github_url} label="GitHub" />,
    },
    {
      id: "live_demo_url",
      header: "Demo",
      cell: ({ row }) => <SubmissionLink url={row.original.live_demo_url} label="Live Demo" />,
    },
    {
      id: "video_url",
      header: "Video",
      cell: ({ row }) => <SubmissionLink url={row.original.video_url} label="Video Demo" />,
    },
    {
      id: "notes_for_judges",
      header: "Catatan Juri",
      cell: ({ row }) =>
        row.original.notes_for_judges.trim() ? (
          <span className="block max-w-[220px] truncate text-xs" title={row.original.notes_for_judges}>
            {row.original.notes_for_judges}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
    {
      id: "first_submitted_at",
      header: "Pertama Dikirim",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{formatTimestampWita(row.original.first_submitted_at)}</span>
      ),
    },
    {
      id: "submitted_at",
      header: "Pertama Disimpan",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{formatTimestampWita(row.original.submitted_at)}</span>
      ),
    },
    {
      id: "updated_at",
      header: "Terakhir Diubah",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{formatTimestampWita(row.original.updated_at)}</span>
      ),
    },
    {
      id: "is_disqualified",
      header: "Didiskualifikasi",
      cell: ({ row }) =>
        row.original.is_disqualified ? (
          <Badge variant="destructive">Didiskualifikasi</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 p-0">
              <span className="sr-only">Buka menu aksi</span>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailRow(row.original)}>
              <Info className="mr-2 size-4" />
              Detail tautan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingRow(row.original)}>
              <Pencil className="mr-2 size-4" />
              Ubah submission
            </DropdownMenuItem>
            {row.original.submission_id && (
              <DropdownMenuItem onClick={() => setHistoryRow(row.original)}>
                <History className="mr-2 size-4" />
                Riwayat perubahan
              </DropdownMenuItem>
            )}
            {row.original.submission_id && (
              <DropdownMenuItem
                disabled={recheckingId === row.original.team_id}
                onClick={() => void handleRecheck(row.original.team_id)}
              >
                <RotateCw className={`mr-2 size-4 ${recheckingId === row.original.team_id ? "animate-spin" : ""}`} />
                Periksa ulang tautan
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useTable({ features, data: paginatedRows, columns });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-semibold text-2xl">Submission</h1>
          <p className="text-muted-foreground">Pantau dan kelola berkas submission dari seluruh tim peserta.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/admin/submission/export" download>
            <Download className="mr-2 size-4" />
            Ekspor CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Tim</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{totalTeams}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Terkirim</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-emerald-600">{submittedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Draf</CardTitle>
            <Clock className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-amber-600">{draftCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Belum Dikirim</CardTitle>
            <FileQuestion className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-muted-foreground">{unsubmittedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Cari kode tim atau nama tim..."
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="submitted">Terkirim</SelectItem>
            <SelectItem value="draft">Draf</SelectItem>
            <SelectItem value="unsubmitted">Belum dikirim</SelectItem>
          </SelectContent>
        </Select>

        <Select value={linkFilter} onValueChange={handleLinkFilterChange}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Semua tautan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status tautan</SelectItem>
            <SelectItem value="warning">Ada peringatan tautan</SelectItem>
            <SelectItem value="ok">Semua tautan aman</SelectItem>
            <SelectItem value="unverified">Belum diperiksa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : undefined}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Tidak ada data submission yang sesuai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Halaman {page} dari {totalPages} ({filteredRows.length} tim)
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      </div>

      {editingRow && (
        <AdminEditSubmissionDialog
          key={editingRow.team_id}
          row={editingRow}
          open={editingRow !== null}
          onOpenChange={(open) => {
            if (!open) setEditingRow(null);
          }}
          onUpdated={() => router.refresh()}
        />
      )}

      {detailRow && (
        <LinkCheckDetailDialog
          key={detailRow.team_id}
          row={detailRow}
          open={detailRow !== null}
          onOpenChange={(open) => {
            if (!open) setDetailRow(null);
          }}
          onRecheck={handleRecheck}
          isRechecking={recheckingId === detailRow.team_id}
        />
      )}

      {historyRow && (
        <SubmissionHistoryDialog
          key={historyRow.team_id}
          row={historyRow}
          items={history.filter((item) => item.submission_id === historyRow.submission_id)}
          open={historyRow !== null}
          onOpenChange={(open) => {
            if (!open) setHistoryRow(null);
          }}
        />
      )}
    </div>
  );
}

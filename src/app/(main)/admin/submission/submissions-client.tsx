"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { type ColumnDef, tableFeatures, useTable } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileQuestion,
  Info,
  MoreVertical,
  Pencil,
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

import { adminUpdateSubmission } from "./actions";

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
  submitted_at: string | null;
  updated_at: string | null;
};

type SubmissionsClientProps = {
  rows: SubmissionRow[];
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

export function SubmissionsClient({ rows }: SubmissionsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<SubmissionRow | null>(null);

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

      return true;
    });
  }, [rows, search, statusFilter]);

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
            <DropdownMenuItem onClick={() => setEditingRow(row.original)}>
              <Pencil className="mr-2 size-4" />
              Ubah submission
            </DropdownMenuItem>
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
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="submitted">Terkirim</SelectItem>
            <SelectItem value="draft">Draf</SelectItem>
            <SelectItem value="unsubmitted">Belum dikirim</SelectItem>
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
    </div>
  );
}

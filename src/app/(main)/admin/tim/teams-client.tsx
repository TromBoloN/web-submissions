"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { type ColumnDef, tableFeatures, useTable } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, MoreVertical, ShieldAlert, Trophy, Users } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { toggleDisqualified, toggleFinalist } from "./actions";

export type TeamRow = {
  id: string;
  profile_id: string;
  team_code: string;
  team_name: string;
  institution: string;
  leader_name: string;
  members: string[];
  is_finalist: boolean;
  is_disqualified: boolean;
  created_at: string;
  email: string | null;
};

type TeamsClientProps = {
  rows: TeamRow[];
  finalistCount: number;
};

const features = tableFeatures({});

function FinalistStatusAlert({ finalistCount }: { finalistCount: number }) {
  if (finalistCount === 5) {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        <AlertTitle>Kuota finalis lengkap</AlertTitle>
        <AlertDescription>Tepat 5 tim telah ditetapkan sebagai finalis MIT-WEEK 2026.</AlertDescription>
      </Alert>
    );
  }

  let warningMessage = "";
  if (finalistCount < 5) {
    const sisa = 5 - finalistCount;
    warningMessage = `Saat ini terdapat ${finalistCount} tim finalis (target: 5 tim). Masih perlu memilih ${sisa} tim lagi untuk babak final.`;
  } else {
    const lebih = finalistCount - 5;
    warningMessage = `Saat ini terdapat ${finalistCount} tim finalis (target: 5 tim). Melebihi kuota target sebanyak ${lebih} tim.`;
  }

  return (
    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200">
      <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle>Perhatian kuota finalis</AlertTitle>
      <AlertDescription>{warningMessage}</AlertDescription>
    </Alert>
  );
}

function ConfirmFinalistDialog({
  target,
  open,
  onOpenChange,
  onConfirmed,
}: {
  target: { team: TeamRow; targetFinalist: boolean } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  if (!target) return null;

  const handleConfirm = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await toggleFinalist({
        teamId: target.team.id,
        targetFinalist: target.targetFinalist,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(
        target.targetFinalist
          ? `Tim ${target.team.team_name} berhasil dijadikan finalis.`
          : `Status finalis tim ${target.team.team_name} berhasil dibatalkan.`,
      );
      onOpenChange(false);
      onConfirmed();
    });
  };

  let actionText = "Batalkan Finalis";
  if (target.targetFinalist) {
    actionText = "Jadikan Finalis";
  }
  if (isPending) {
    actionText = "Menyimpan...";
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target.targetFinalist ? "Jadikan Finalis" : "Batalkan Status Finalis"}</AlertDialogTitle>
          <AlertDialogDescription>
            {target.targetFinalist
              ? `Apakah Anda yakin ingin menetapkan tim ${target.team.team_name} (${target.team.team_code}) sebagai finalis?`
              : `Apakah Anda yakin ingin membatalkan status finalis untuk tim ${target.team.team_name} (${target.team.team_code})?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            variant={target.targetFinalist ? "default" : "destructive"}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmDisqualifiedDialog({
  target,
  open,
  onOpenChange,
  onConfirmed,
}: {
  target: { team: TeamRow; targetDisqualified: boolean } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  if (!target) return null;

  const handleConfirm = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await toggleDisqualified({
        teamId: target.team.id,
        targetDisqualified: target.targetDisqualified,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(
        target.targetDisqualified
          ? `Tim ${target.team.team_name} berhasil didiskualifikasi.`
          : `Status diskualifikasi tim ${target.team.team_name} berhasil dibatalkan.`,
      );
      onOpenChange(false);
      onConfirmed();
    });
  };

  let actionText = "Batalkan Diskualifikasi";
  if (target.targetDisqualified) {
    actionText = "Diskualifikasi";
  }
  if (isPending) {
    actionText = "Menyimpan...";
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {target.targetDisqualified ? "Diskualifikasi Tim" : "Batalkan Diskualifikasi"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target.targetDisqualified
              ? `Apakah Anda yakin ingin mendiskualifikasi tim ${target.team.team_name} (${target.team.team_code})? Tim yang didiskualifikasi tidak akan dapat melanjutkan kompetisi.`
              : `Apakah Anda yakin ingin membatalkan status diskualifikasi untuk tim ${target.team.team_name} (${target.team.team_code})?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            variant={target.targetDisqualified ? "destructive" : "default"}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TeamsClient({ rows, finalistCount }: TeamsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [confirmFinalist, setConfirmFinalist] = useState<{
    team: TeamRow;
    targetFinalist: boolean;
  } | null>(null);

  const [confirmDisqualified, setConfirmDisqualified] = useState<{
    team: TeamRow;
    targetDisqualified: boolean;
  } | null>(null);

  const filteredRows = useMemo(() => {
    return rows.filter((team) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        team.team_code.toLowerCase().includes(q) ||
        team.team_name.toLowerCase().includes(q) ||
        team.institution.toLowerCase().includes(q) ||
        team.leader_name.toLowerCase().includes(q) ||
        (team.email?.toLowerCase().includes(q) ?? false);

      if (!matchesSearch) return false;

      if (statusFilter === "finalist") return team.is_finalist;
      if (statusFilter === "non_finalist") return !team.is_finalist;
      if (statusFilter === "disqualified") return team.is_disqualified;
      if (statusFilter === "active") return !team.is_disqualified;

      return true;
    });
  }, [rows, search, statusFilter]);

  const columns: ColumnDef<typeof features, TeamRow>[] = [
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
      accessorKey: "institution",
      header: "Institusi",
    },
    {
      accessorKey: "leader_name",
      header: "Ketua",
    },
    {
      id: "members",
      header: "Anggota",
      cell: ({ row }) => {
        const count = row.original.members.length;
        const memberList = row.original.members.join(", ");
        return (
          <span
            className="inline-flex cursor-help items-center gap-1 text-sm underline decoration-muted-foreground/40 underline-offset-4"
            title={`Anggota: ${memberList}`}
          >
            <Users className="size-3.5 text-muted-foreground" />
            {count} orang
          </span>
        );
      },
    },
    {
      id: "is_finalist",
      header: "Finalis",
      cell: ({ row }) =>
        row.original.is_finalist ? (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-600">Finalis</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      id: "is_disqualified",
      header: "Didiskualifikasi",
      cell: ({ row }) =>
        row.original.is_disqualified ? (
          <Badge variant="destructive">Didiskualifikasi</Badge>
        ) : (
          <Badge variant="secondary">Tidak</Badge>
        ),
    },
    {
      id: "email",
      header: "Email Akun",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email ?? "-"}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const team = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 p-0">
                <span className="sr-only">Buka menu aksi</span>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {team.is_finalist ? (
                <DropdownMenuItem
                  onClick={() => setConfirmFinalist({ team, targetFinalist: false })}
                  className="text-amber-600 focus:text-amber-600"
                >
                  <Trophy className="mr-2 size-4" />
                  Batalkan Finalis
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setConfirmFinalist({ team, targetFinalist: true })}>
                  <Trophy className="mr-2 size-4" />
                  Jadikan Finalis
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {team.is_disqualified ? (
                <DropdownMenuItem onClick={() => setConfirmDisqualified({ team, targetDisqualified: false })}>
                  <CheckCircle2 className="mr-2 size-4" />
                  Batalkan Diskualifikasi
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setConfirmDisqualified({ team, targetDisqualified: true })}
                  className="text-destructive focus:text-destructive"
                >
                  <ShieldAlert className="mr-2 size-4" />
                  Diskualifikasi
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useTable({ features, data: filteredRows, columns });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-2xl">Tim</h1>
            <Badge variant={finalistCount === 5 ? "default" : "secondary"}>Finalis: {finalistCount} / 5</Badge>
          </div>
          <p className="text-muted-foreground">Kelola tim peserta, status finalis, dan diskualifikasi.</p>
        </div>
      </div>

      <FinalistStatusAlert finalistCount={finalistCount} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari kode tim, nama tim, institusi, ketua, atau email..."
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="finalist">Finalis saja</SelectItem>
            <SelectItem value="non_finalist">Bukan finalis</SelectItem>
            <SelectItem value="disqualified">Didiskualifikasi</SelectItem>
            <SelectItem value="active">Aktif (tidak diskualifikasi)</SelectItem>
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
                  Tidak ada data tim yang sesuai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">
        Menampilkan {filteredRows.length} dari total {rows.length} tim terdaftar
      </div>

      <ConfirmFinalistDialog
        target={confirmFinalist}
        open={confirmFinalist !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmFinalist(null);
        }}
        onConfirmed={() => router.refresh()}
      />

      <ConfirmDisqualifiedDialog
        target={confirmDisqualified}
        open={confirmDisqualified !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDisqualified(null);
        }}
        onConfirmed={() => router.refresh()}
      />
    </div>
  );
}

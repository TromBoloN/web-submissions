"use client";

import { useState, useTransition } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { type ColumnDef, tableFeatures, useTable } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/types/database";

import { createAccount } from "./actions";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Role = Database["public"]["Enums"]["user_role_type"];

export type AccountRow = Profile & { teamName: string | null };

type AccountsClientProps = {
  rows: AccountRow[];
  total: number;
  page: number;
  pageSize: number;
  nextTeamCode: string;
};

const features = tableFeatures({});
const roleLabels: Record<Role, string> = { admin: "Admin", judge: "Juri", team: "Peserta" };
const stageLabels = { preliminary: "Preliminary", final: "Final", both: "Keduanya" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
  }).format(new Date(value));
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Tersalin" : "Salin"}
    </Button>
  );
}

function CreateAccountDialog({ nextTeamCode, onCreated }: { nextTeamCode: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("admin");
  const [members, setMembers] = useState([""]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setError(undefined);
      setCreated(null);
      setPassword("");
      setMembers([""]);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("role", role);
    form.set("password", password);
    if (role === "team") {
      form.set("members", JSON.stringify(members.filter(Boolean)));
    }
    setError(undefined);
    startTransition(async () => {
      const result = await createAccount(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCreated(result.account);
      onCreated();
    });
  };

  if (created !== null) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Akun berhasil dibuat</DialogTitle>
            <DialogDescription>
              Simpan kata sandi ini sekarang. Kata sandi tidak akan ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <div className="flex gap-2">
                <Input value={created.email} readOnly />
                <CopyButton value={created.email} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Kata sandi</Label>
              <div className="flex gap-2">
                <Input value={created.password} readOnly />
                <CopyButton value={created.password} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Selesai</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Buat Akun</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Akun</DialogTitle>
          <DialogDescription>Buat akun baru untuk admin, juri, atau peserta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nama lengkap</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Kata sandi</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                name="password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                Buat otomatis
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="judge">Juri</SelectItem>
                <SelectItem value="team">Peserta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "judge" && (
            <div className="space-y-1.5">
              <Label>Tahap juri</Label>
              <Select name="judge_stage" defaultValue="preliminary">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preliminary">Preliminary</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="both">Keduanya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "team" && (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="team_name">Nama tim</Label>
                <Input id="team_name" name="team_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institution">Institusi</Label>
                <Input id="institution" name="institution" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leader_name">Ketua tim</Label>
                <Input
                  id="leader_name"
                  name="leader_name"
                  required
                  onChange={(event) =>
                    setMembers((current) =>
                      current.map((member, memberIndex) => (memberIndex === 0 ? event.target.value : member)),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Anggota</Label>
                {members.map((member, index) => (
                  <div className="flex gap-2" key={member || "anggota-kosong"}>
                    <Input
                      value={member}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                        )
                      }
                      placeholder={index === 0 ? "Nama ketua tim" : "Nama anggota"}
                      required
                    />
                    {members.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMembers((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        Hapus
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setMembers((current) => [...current, ""])}>
                  Tambah anggota
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team_code">Kode tim</Label>
                <Input id="team_code" name="team_code" defaultValue={nextTeamCode} pattern="MIT-[0-9]{3}" required />
              </div>
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Buat Akun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountsClient({ rows, total, page, pageSize, nextTeamCode }: AccountsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [role, setRole] = useState(searchParams.get("role") ?? "all");
  const columns: ColumnDef<typeof features, AccountRow>[] = [
    { accessorKey: "full_name", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role", cell: ({ row }) => roleLabels[row.original.role] },
    {
      id: "judge_stage",
      header: "Tahap Juri",
      cell: ({ row }) =>
        row.original.role === "judge" && row.original.judge_stage ? stageLabels[row.original.judge_stage] : "-",
    },
    { accessorKey: "teamName", header: "Tim", cell: ({ row }) => row.original.teamName ?? "-" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    { accessorKey: "created_at", header: "Dibuat", cell: ({ row }) => formatDate(row.original.created_at) },
  ];
  const table = useTable({ features, data: rows, columns });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (role !== "all") params.set("role", role);
    params.set("page", "1");
    router.push(`/admin/akun?${params.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    router.push(`/admin/akun?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <form onSubmit={applyFilters} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau email..."
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Semua role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua role</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="judge">Juri</SelectItem>
              <SelectItem value="team">Peserta</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline">
            Cari
          </Button>
        </form>
        <CreateAccountDialog nextTeamCode={nextTeamCode} onCreated={() => router.refresh()} />
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
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Belum ada akun.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Halaman {page} dari {totalPages} ({total} akun)
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}

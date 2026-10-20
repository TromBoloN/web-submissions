"use client";

import { useState, useTransition } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { type ColumnDef, tableFeatures, useTable } from "@tanstack/react-table";
import { KeyRound, MoreVertical, Pencil, UserCheck, UserX } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/types/database";

import { createAccount, resetAccountPassword, toggleAccountActive, updateAccount } from "./actions";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TeamData = Database["public"]["Tables"]["teams"]["Row"];
type Role = Database["public"]["Enums"]["user_role_type"];
type JudgeStage = Database["public"]["Enums"]["judge_stage_type"];

export type AccountRow = Profile & {
  team: Pick<TeamData, "id" | "team_code" | "team_name" | "institution" | "leader_name" | "members"> | null;
  teamName: string | null;
};

type AccountsClientProps = {
  rows: AccountRow[];
  total: number;
  page: number;
  pageSize: number;
  nextTeamCode: string;
  currentUserId: string;
};

const features = tableFeatures({});
const roleLabels: Record<Role, string> = { admin: "Admin", judge: "Juri", team: "Peserta" };
const stageLabels: Record<JudgeStage, string> = { preliminary: "Preliminary", final: "Final", both: "Keduanya" };

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

type MemberItem = { id: string; name: string };

function CreateAccountDialog({ nextTeamCode, onCreated }: { nextTeamCode: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("admin");
  const [members, setMembers] = useState<MemberItem[]>([{ id: "initial-member", name: "" }]);
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
      setMembers([{ id: "initial-member", name: "" }]);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("role", role);
    form.set("password", password);
    if (role === "team") {
      form.set("members", JSON.stringify(members.map((m) => m.name).filter(Boolean)));
    }
    setError(undefined);
    startTransition(async () => {
      const result = await createAccount(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCreated(result.account);
      toast.success("Akun berhasil dibuat.");
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
                      current.map((item, memberIndex) =>
                        memberIndex === 0 ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Anggota</Label>
                {members.map((item, index) => (
                  <div className="flex gap-2" key={item.id}>
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((currentMember) =>
                            currentMember.id === item.id
                              ? { ...currentMember, name: event.target.value }
                              : currentMember,
                          ),
                        )
                      }
                      placeholder={index === 0 ? "Nama ketua tim" : "Nama anggota"}
                      required
                    />
                    {members.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setMembers((current) => current.filter((currentMember) => currentMember.id !== item.id))
                        }
                      >
                        Hapus
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setMembers((current) => [
                      ...current,
                      { id: `create-member-${Date.now()}-${current.length}`, name: "" },
                    ])
                  }
                >
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

function EditAccountDialog({
  account,
  open,
  onOpenChange,
  onUpdated,
}: {
  account: AccountRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [fullName, setFullName] = useState(account.full_name);
  const [judgeStage, setJudgeStage] = useState<JudgeStage>(account.judge_stage ?? "preliminary");
  const [teamName, setTeamName] = useState(account.team?.team_name ?? "");
  const [institution, setInstitution] = useState(account.team?.institution ?? "");
  const [leaderName, setLeaderName] = useState(account.team?.leader_name ?? "");
  const [members, setMembers] = useState<MemberItem[]>(() => {
    if (account.team?.members?.length) {
      return account.team.members.map((name, index) => ({ id: `edit-member-${index}-${name}`, name }));
    }
    return [{ id: "edit-initial-leader", name: account.team?.leader_name ?? "" }];
  });
  const [teamCode, setTeamCode] = useState(account.team?.team_code ?? "");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData();
    form.set("userId", account.id);
    form.set("role", account.role);
    form.set("full_name", fullName);

    if (account.role === "judge") {
      form.set("judge_stage", judgeStage);
    }

    if (account.role === "team") {
      form.set("team_name", teamName);
      form.set("institution", institution);
      form.set("leader_name", leaderName);
      form.set("members", JSON.stringify(members.map((m) => m.name).filter(Boolean)));
      form.set("team_code", teamCode);
    }

    setError(undefined);
    startTransition(async () => {
      const result = await updateAccount(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Akun berhasil diperbarui.");
      onOpenChange(false);
      onUpdated();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ubah Akun</DialogTitle>
          <DialogDescription>Ubah data akun {account.full_name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" value={account.email} disabled className="bg-muted text-muted-foreground" />
            <p className="text-muted-foreground text-xs">Email tidak dapat diubah.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <Input
              id="edit-role"
              value={roleLabels[account.role]}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-muted-foreground text-xs">Role tidak dapat diubah.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-full_name">Nama lengkap</Label>
            <Input id="edit-full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          {account.role === "judge" && (
            <div className="space-y-1.5">
              <Label>Tahap juri</Label>
              <Select value={judgeStage} onValueChange={(value) => setJudgeStage(value as JudgeStage)}>
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
          {account.role === "team" && (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-team_name">Nama tim</Label>
                <Input id="edit-team_name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-institution">Institusi</Label>
                <Input
                  id="edit-institution"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-leader_name">Ketua tim</Label>
                <Input
                  id="edit-leader_name"
                  value={leaderName}
                  required
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    const prevLeader = leaderName;
                    setLeaderName(nextVal);
                    setMembers((current) =>
                      current.map((member, idx) =>
                        idx === 0 && member.name === prevLeader ? { ...member, name: nextVal } : member,
                      ),
                    );
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Anggota</Label>
                {members.map((item, index) => (
                  <div className="flex gap-2" key={item.id}>
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        setMembers((current) =>
                          current.map((currentMember) =>
                            currentMember.id === item.id ? { ...currentMember, name: e.target.value } : currentMember,
                          ),
                        )
                      }
                      placeholder={index === 0 ? "Nama ketua tim" : "Nama anggota"}
                      required
                    />
                    {members.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setMembers((current) => current.filter((currentMember) => currentMember.id !== item.id))
                        }
                      >
                        Hapus
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setMembers((current) => [
                      ...current,
                      { id: `edit-member-${Date.now()}-${current.length}`, name: "" },
                    ])
                  }
                >
                  Tambah anggota
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-team_code">Kode tim</Label>
                <Input
                  id="edit-team_code"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  pattern="MIT-[0-9]{3}"
                  required
                />
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
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  account,
  open,
  onOpenChange,
}: {
  account: AccountRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setPassword("");
      setError(undefined);
      setResetResult(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await resetAccountPassword({
        userId: account.id,
        password,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setResetResult({ email: account.email, password: result.password });
      toast.success("Kata sandi berhasil direset.");
    });
  };

  if (resetResult !== null) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kata sandi berhasil direset</DialogTitle>
            <DialogDescription>
              Simpan kata sandi ini sekarang. Kata sandi tidak akan ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <div className="flex gap-2">
                <Input value={resetResult.email} readOnly />
                <CopyButton value={resetResult.email} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Kata sandi baru</Label>
              <div className="flex gap-2">
                <Input value={resetResult.password} readOnly />
                <CopyButton value={resetResult.password} />
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Kata Sandi</DialogTitle>
          <DialogDescription>
            Masukkan kata sandi baru untuk akun {account.full_name} ({account.email}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">Kata sandi baru</Label>
            <div className="flex gap-2">
              <Input
                id="reset-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                Buat otomatis
              </Button>
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Reset Kata Sandi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmToggleActiveDialog({
  target,
  open,
  onOpenChange,
  onConfirmed,
}: {
  target: { account: AccountRow; targetActive: boolean } | null;
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
      const result = await toggleAccountActive({
        userId: target.account.id,
        targetActive: target.targetActive,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(target.targetActive ? "Akun berhasil diaktifkan." : "Akun berhasil dinonaktifkan.");
      onOpenChange(false);
      onConfirmed();
    });
  };

  let actionText = target.targetActive ? "Aktifkan" : "Nonaktifkan";
  if (isPending) {
    actionText = "Menyimpan...";
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target.targetActive ? "Aktifkan Akun" : "Nonaktifkan Akun"}</AlertDialogTitle>
          <AlertDialogDescription>
            {target.targetActive
              ? `Apakah Anda yakin ingin mengaktifkan akun ${target.account.full_name}? Pengguna ini akan dapat masuk kembali ke sistem.`
              : `Apakah Anda yakin ingin menonaktifkan akun ${target.account.full_name}? Pengguna ini tidak akan dapat masuk ke sistem.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            variant={target.targetActive ? "default" : "destructive"}
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

export function AccountsClient({ rows, total, page, pageSize, nextTeamCode, currentUserId }: AccountsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [role, setRole] = useState(searchParams.get("role") ?? "all");

  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [resettingAccount, setResettingAccount] = useState<AccountRow | null>(null);
  const [confirmToggleTarget, setConfirmToggleTarget] = useState<{
    account: AccountRow;
    targetActive: boolean;
  } | null>(null);

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
    {
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const account = row.original;
        const isSelf = account.id === currentUserId;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 p-0">
                <span className="sr-only">Buka menu aksi</span>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingAccount(account)}>
                <Pencil className="mr-2 size-4" />
                Ubah
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResettingAccount(account)}>
                <KeyRound className="mr-2 size-4" />
                Reset kata sandi
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {account.is_active ? (
                <DropdownMenuItem
                  disabled={isSelf}
                  onClick={() => {
                    if (!isSelf) {
                      setConfirmToggleTarget({ account, targetActive: false });
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <UserX className="mr-2 size-4" />
                  Nonaktifkan
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setConfirmToggleTarget({ account, targetActive: true })}>
                  <UserCheck className="mr-2 size-4" />
                  Aktifkan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
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
                    <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : undefined}>
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

      {editingAccount && (
        <EditAccountDialog
          key={editingAccount.id}
          account={editingAccount}
          open={editingAccount !== null}
          onOpenChange={(open) => {
            if (!open) setEditingAccount(null);
          }}
          onUpdated={() => router.refresh()}
        />
      )}

      {resettingAccount && (
        <ResetPasswordDialog
          key={resettingAccount.id}
          account={resettingAccount}
          open={resettingAccount !== null}
          onOpenChange={(open) => {
            if (!open) setResettingAccount(null);
          }}
        />
      )}

      <ConfirmToggleActiveDialog
        target={confirmToggleTarget}
        open={confirmToggleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmToggleTarget(null);
        }}
        onConfirmed={() => router.refresh()}
      />
    </div>
  );
}

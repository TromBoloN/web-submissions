"use client";

import { type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  Building2,
  Crown,
  ExternalLink,
  FolderGit2,
  Globe,
  Mail,
  PlayCircle,
  RotateCw,
  Trophy,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { getTeamDetail, type TeamDetail } from "./actions";

// ---------------------------------------------------------------------------
// Row helpers: make a whole table row open the sheet without hijacking the
// buttons, links, menus and badges inside it.
// ---------------------------------------------------------------------------

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, [role="menuitem"], [role="checkbox"], [role="switch"], [data-row-ignore]';

function shouldIgnoreRowEvent(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return true;
  // Events from portaled content (menus, dialogs) bubble through React but are not inside the row.
  if (!event.currentTarget.contains(target)) return true;
  if (target !== event.currentTarget && target.closest(INTERACTIVE_SELECTOR)) return true;
  // Let people select text in a row without opening the sheet.
  if (event.type === "click" && (window.getSelection()?.toString() ?? "") !== "") return true;
  return false;
}

/** Add to the row's className (merge with `cn` when the row has its own classes). */
export const TEAM_ROW_CLASS =
  "cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

/** Spread onto a `<TableRow>` (with `TEAM_ROW_CLASS`) to open the team detail sheet on click, Enter or Space. */
export function teamRowProps(teamId: string, onOpen: (teamId: string) => void) {
  return {
    tabIndex: 0,
    title: "Klik untuk melihat detail tim",
    onClick: (event: MouseEvent<HTMLTableRowElement>) => {
      if (shouldIgnoreRowEvent(event)) return;
      onOpen(teamId);
    },
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      onOpen(teamId);
    },
  };
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

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

function safeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">{children}</h3>;
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border bg-muted/40 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="break-words text-sm [overflow-wrap:anywhere]">{children}</div>
      </div>
    </div>
  );
}

function LinkRow({ icon, label, url }: { icon: ReactNode; label: string; url: string }) {
  const safe = safeHttpUrl(url);
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="truncate text-muted-foreground text-xs" title={url.trim() || undefined}>
          {url.trim() || "Tidak diisi"}
        </p>
      </div>
      {safe && (
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
          <a href={safe} target="_blank" rel="noopener noreferrer">
            Buka
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      )}
    </div>
  );
}

function SubmissionStatusBadge({ status }: { status: string | null }) {
  if (status === "submitted") {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Terkirim</Badge>;
  }
  if (status === "draft") {
    return <Badge variant="secondary">Draf</Badge>;
  }
  return (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      Belum dikirim
    </Badge>
  );
}

function DetailBody({ team }: { team: TeamDetail }) {
  const sub = team.submission;
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle>Tim</SectionTitle>
        <InfoRow icon={<Building2 className="size-4" />} label="Institusi">
          {team.institution || "-"}
        </InfoRow>
        <InfoRow icon={<Crown className="size-4" />} label="Ketua">
          {team.leader_name || "-"}
        </InfoRow>
        <InfoRow icon={<Users className="size-4" />} label={`Anggota (${team.members.length})`}>
          {team.members.length > 0 ? (
            <ol className="list-decimal space-y-0.5 pl-4">
              {team.members.map((member, index) => (
                // Member names can repeat; position is part of their identity here.
                // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
                <li key={`${index}-${member}`}>{member}</li>
              ))}
            </ol>
          ) : (
            <span className="text-muted-foreground">Belum ada anggota tercatat</span>
          )}
        </InfoRow>
        <InfoRow icon={<Mail className="size-4" />} label="Email akun">
          {team.email ?? "-"}
        </InfoRow>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Submission</SectionTitle>
          <SubmissionStatusBadge status={sub?.status ?? null} />
        </div>
        {sub ? (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
              <div>
                <p className="text-muted-foreground">Pertama dikirim</p>
                <p className="font-medium">{formatTimestampWita(sub.first_submitted_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Terakhir diubah</p>
                <p className="font-medium">{formatTimestampWita(sub.updated_at)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <LinkRow icon={<FolderGit2 className="size-4" />} label="Repositori GitHub" url={sub.github_url} />
              <LinkRow icon={<Globe className="size-4" />} label="Live demo" url={sub.live_demo_url} />
              <LinkRow icon={<PlayCircle className="size-4" />} label="Video demo" url={sub.video_url} />
            </div>
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs">Catatan untuk juri</p>
              {sub.notes_for_judges.trim() ? (
                <p className="whitespace-pre-wrap break-words rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {sub.notes_for_judges}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">-</p>
              )}
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
            Tim ini belum membuat submission.
          </p>
        )}
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; team: TeamDetail };

export function TeamDetailSheet({
  teamId,
  onOpenChange,
}: {
  /** Team to show; `null` closes the sheet. */
  teamId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const cacheRef = useRef(new Map<string, TeamDetail>());
  // Only the latest request may update state (switching teams quickly, or closing mid-load).
  const requestRef = useRef(0);

  const load = useCallback((id: string) => {
    const request = ++requestRef.current;
    const cached = cacheRef.current.get(id);
    // Show the cached copy right away, then refresh it in the background.
    setState(cached ? { status: "ready", team: cached } : { status: "loading" });

    getTeamDetail(id)
      .then((result) => {
        if (request !== requestRef.current) return;
        if (result.success) {
          cacheRef.current.set(id, result.team);
          setState({ status: "ready", team: result.team });
        } else if (!cached) {
          setState({ status: "error", message: result.error });
        }
      })
      .catch(() => {
        if (request === requestRef.current && !cached) {
          setState({ status: "error", message: "Detail tim tidak dapat dimuat. Silakan coba lagi." });
        }
      });
  }, []);

  useEffect(() => {
    if (!teamId) return;
    load(teamId);
    return () => {
      requestRef.current += 1;
    };
  }, [teamId, load]);

  const team = state.status === "ready" ? state.team : null;

  return (
    <Sheet open={teamId !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-2 border-b pr-12">
          {team ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono font-semibold text-xs">
                  {team.team_code}
                </span>
                {team.is_finalist && (
                  <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                    <Trophy className="size-3" />
                    Finalis
                  </Badge>
                )}
                {team.is_disqualified && <Badge variant="destructive">Didiskualifikasi</Badge>}
              </div>
              <SheetTitle className="break-words font-semibold text-xl [overflow-wrap:anywhere]">
                {team.team_name}
              </SheetTitle>
              <SheetDescription className="break-words">{team.institution}</SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle>Detail Tim</SheetTitle>
              <SheetDescription>Informasi tim dan submission.</SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="p-4">
          {state.status === "loading" && <DetailSkeleton />}
          {state.status === "error" && (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <p className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {state.message}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => teamId && load(teamId)}>
                <RotateCw className="size-3.5" />
                Coba lagi
              </Button>
            </div>
          )}
          {team && <DetailBody team={team} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

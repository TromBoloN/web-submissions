import type { ReactNode } from "react";

import Link from "next/link";

import { ChevronRight } from "lucide-react";

import { formatWhatsAppNumber } from "@/lib/contact";
import { formatDeadlineWita } from "@/lib/deadline";
import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "./settings-load-error";
import { SETTINGS_SECTIONS } from "./settings-sections";
import { formatWitaTimestamp } from "./settings-utils";

type StatusLine = { label: string; value: ReactNode };

function released(value: boolean) {
  return value ? (
    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Dirilis</span>
  ) : (
    <span className="text-muted-foreground">Belum dirilis</span>
  );
}

function published(iso: string | null) {
  return iso ? (
    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Terbit</span>
  ) : (
    <span className="text-muted-foreground">Belum terbit</span>
  );
}

export default async function SettingsOverviewPage() {
  const supabase = await createClient();

  const [settingsRes, caseStudyRes] = await Promise.all([
    supabase
      .from("competition_settings")
      .select(
        "submission_closes_at, updated_at, juknis_url, contact_whatsapp, preliminary_results_released, final_results_released, showcase_published_at, winners_published_at",
      )
      .eq("id", true)
      .maybeSingle(),
    supabase.from("case_study").select("title, release_at").eq("id", true).maybeSingle(),
  ]);

  if (settingsRes.error) return <SettingsLoadError />;

  const s = settingsRes.data;
  const caseStudy = caseStudyRes.data;
  const contact = formatWhatsAppNumber(s?.contact_whatsapp ?? null);

  const statusByHref: Record<string, StatusLine[]> = {
    "/admin/pengaturan/pengumpulan": [
      { label: "Batas aktif", value: formatDeadlineWita(s?.submission_closes_at ?? null) },
    ],
    "/admin/pengaturan/hasil": [
      { label: "Babak awal", value: released(Boolean(s?.preliminary_results_released)) },
      { label: "Babak final", value: released(Boolean(s?.final_results_released)) },
    ],
    "/admin/pengaturan/galeri": [
      { label: "Galeri & finalis", value: published(s?.showcase_published_at ?? null) },
      { label: "Pemenang", value: published(s?.winners_published_at ?? null) },
    ],
    "/admin/pengaturan/studi-kasus": [
      { label: "Judul", value: caseStudy?.title || <span className="text-muted-foreground">Belum ada</span> },
      {
        label: "Tampil",
        value: caseStudy?.release_at ? (formatWitaTimestamp(caseStudy.release_at) ?? "-") : "Langsung terlihat",
      },
    ],
    "/admin/pengaturan/tautan": [
      {
        label: "Juknis",
        value: s?.juknis_url ? "Tersimpan" : <span className="text-muted-foreground">Belum diatur</span>,
      },
      { label: "WhatsApp", value: contact ?? <span className="text-muted-foreground">Belum diatur</span> },
    ],
  };

  const updatedAt = formatWitaTimestamp(s?.updated_at ?? null);

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_SECTIONS.slice(1).map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              prefetch={false}
              className="press group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-ink/30 text-ink">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{title}</p>
                  <p className="text-muted-foreground text-xs">{description}</p>
                </div>
                <ChevronRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </div>
              <dl className="mt-auto space-y-1.5 border-t pt-3 text-xs">
                {(statusByHref[href] ?? []).map((line) => (
                  <div key={line.label} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">{line.label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium">{line.value}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          </li>
        ))}
      </ul>
      {updatedAt && <p className="text-muted-foreground text-xs">Pengaturan kompetisi diperbarui: {updatedAt}</p>}
    </div>
  );
}

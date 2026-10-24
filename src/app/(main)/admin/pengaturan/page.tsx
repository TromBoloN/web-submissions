import { createClient } from "@/lib/supabase/server";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from("competition_settings")
    .select("submission_closes_at, updated_at, juknis_url")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-2xl">Pengaturan</h1>
          <p className="text-muted-foreground">Kelola konfigurasi dan batas waktu kompetisi MIT-WEEK 2026.</p>
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Pengaturan kompetisi tidak dapat dimuat. Silakan coba lagi.
        </p>
      </div>
    );
  }

  return (
    <SettingsClient
      currentClosesAt={settings?.submission_closes_at ?? null}
      currentJuknisUrl={settings?.juknis_url ?? null}
      updatedAt={settings?.updated_at ?? null}
    />
  );
}

import type { ReactNode } from "react";

import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">Kelola konfigurasi kompetisi MIT-WEEK 2026 per bagian.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

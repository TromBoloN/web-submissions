import { LogoutButton } from "@/components/logout-button";
import { requireRole } from "@/lib/auth";

export default async function JudgePage() {
  const profile = await requireRole("judge");
  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-2xl">Halaman juri segera hadir.</h1>
      <p className="text-muted-foreground">Halo, {profile.full_name}.</p>
      <LogoutButton />
    </div>
  );
}

import { LogoutButton } from "@/components/logout-button";
import { requireRole } from "@/lib/auth";

export default async function TeamPage() {
  const profile = await requireRole("team");
  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-2xl">Halaman peserta segera hadir.</h1>
      <p className="text-muted-foreground">Halo, {profile.full_name}.</p>
      <LogoutButton />
    </div>
  );
}

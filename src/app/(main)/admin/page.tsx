import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function formatDeadline(value: string | null) {
  if (!value) return "Belum diatur";

  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))} WITA`;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const [teams, judges, submissions, settings] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "judge"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("competition_settings").select("submission_closes_at").eq("id", true).maybeSingle(),
  ]);

  const queryError = teams.error ?? judges.error ?? submissions.error ?? settings.error;
  const stats = [
    { label: "Total tim", value: teams.count ?? 0 },
    { label: "Total juri", value: judges.count ?? 0 },
    { label: "Submission terkirim", value: submissions.count ?? 0 },
    { label: "Batas waktu", value: formatDeadline(settings.data?.submission_closes_at ?? null) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Dasbor</h1>
        <p className="text-muted-foreground">Ringkasan kompetisi MIT-WEEK 2026.</p>
      </div>
      {queryError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Data dasbor tidak dapat dimuat. Silakan coba lagi.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-2xl">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { requireRole } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { FinalisClient, type FinalistTeamItem } from "./finalis-client";

export default async function AdminFinalisPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [noticeRes, finalistsRes] = await Promise.all([
    supabase.from("finalist_notice").select("*").eq("id", true).maybeSingle(),
    supabase
      .from("teams")
      .select("id, team_code, team_name, institution")
      .eq("is_finalist", true)
      .eq("is_disqualified", false)
      .order("team_code", { ascending: true }),
  ]);

  let notice = noticeRes.data;

  // Ensure single row exists
  if (!notice) {
    const { data: inserted } = await adminClient
      .from("finalist_notice")
      .upsert({ id: true, finalist_message: "", non_finalist_message: "", is_published: false })
      .select()
      .single();
    if (inserted) {
      notice = inserted;
    }
  }

  if (!notice) {
    return (
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl">Pengumuman Finalis</h1>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Gagal memuat pengaturan pengumuman finalis. Silakan coba beberapa saat lagi.
        </p>
      </div>
    );
  }

  const finalists: FinalistTeamItem[] = finalistsRes.data ?? [];

  return <FinalisClient notice={notice} finalists={finalists} />;
}

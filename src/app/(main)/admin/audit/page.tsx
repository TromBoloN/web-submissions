import { createClient } from "@/lib/supabase/server";

const actionLabels: Record<string, string> = {
  account_activated: "Mengaktifkan akun",
  account_created: "Membuat akun",
  account_deactivated: "Menonaktifkan akun",
  account_password_reset: "Mereset kata sandi",
  account_updated: "Memperbarui akun",
  finalist_selected: "Memilih finalis",
  finalist_showcase_updated: "Mengubah kartu galeri finalis",
  score_feedback_replaced: "Mengganti masukan juri",
  finalist_unselected: "Membatalkan finalis",
  results_released: "Merilis hasil",
  results_unreleased: "Menarik rilis hasil",
  ranking_published: "Memublikasikan peringkat",
  ranking_unpublished: "Menarik publikasi peringkat",
  score_changed: "Mengubah nilai",
  score_locked: "Mengunci nilai",
  team_disqualified: "Mendiskualifikasi tim",
  team_disqualification_removed: "Membatalkan diskualifikasi",
  deadline_updated: "Mengubah batas pengumpulan",
  juknis_url_updated: "Mengubah tautan juknis",
  contact_whatsapp_updated: "Mengubah WhatsApp panitia",
  case_study_updated: "Mengubah studi kasus",
  event_identity_updated: "Mengubah identitas acara",
  final_presentation_updated: "Mengubah detail babak final",
  stage_created: "Menambah tahap jadwal",
  stage_updated: "Mengubah tahap jadwal",
  stage_deleted: "Menghapus tahap jadwal",
  site_content_updated: "Mengubah teks halaman",
  site_content_reset: "Mengembalikan teks bawaan",
  showcase_phase_one_published: "Menerbitkan galeri awal",
  showcase_phase_two_published: "Menerbitkan galeri finalis",
  showcase_gallery_published: "Menerbitkan galeri",
  showcase_gallery_unpublished: "Menarik galeri",
  showcase_phase_one_unpublished: "Menarik galeri awal",
  showcase_phase_two_unpublished: "Menarik galeri finalis",
  showcase_winners_published: "Menerbitkan pemenang galeri",
  showcase_winners_unpublished: "Menarik pemenang galeri",
};

function formatTimestamp(value: string) {
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))} WITA`;
}

function formatTarget(targetType: string) {
  const labels: Record<string, string> = {
    competition_settings: "Pengaturan kompetisi",
    final_score: "Nilai final",
    preliminary_score: "Nilai babak awal",
    profile: "Akun",
    team: "Tim",
    case_study: "Studi kasus",
    competition_stages: "Jadwal",
    final_presentation: "Babak final",
    site_content: "Konten halaman",
  };
  return labels[targetType] ?? targetType;
}

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const actorIds = [...new Set((logs ?? []).map((log) => log.actor_id))];
  const { data: actors } =
    actorIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const actorNames = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Audit</h1>
        <p className="text-muted-foreground">Riwayat tindakan sensitif dalam sistem.</p>
      </div>
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          Riwayat audit tidak dapat dimuat. Silakan coba lagi.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Pelaku</th>
                <th className="px-4 py-3 font-medium">Tindakan</th>
                <th className="px-4 py-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => (
                <tr className="border-b last:border-0" key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatTimestamp(log.created_at)}
                  </td>
                  <td className="px-4 py-3">{actorNames.get(log.actor_id) ?? "Akun tidak ditemukan"}</td>
                  <td className="px-4 py-3">{actionLabels[log.action] ?? log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatTarget(log.target_type)}</td>
                </tr>
              ))}
              {(logs ?? []).length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                    Belum ada aktivitas tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

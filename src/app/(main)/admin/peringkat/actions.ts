"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { logAuditEvent } from "@/lib/audit";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SetTopFinalistsResult = { ok: true; added: number; removed: number } | { ok: false; message: string };

/** Number of finalists taken from the preliminary ranking (matches the "Top 5" shown across the app). */
const FINALIST_SLOTS = 5;

const inputSchema = z.object({
  expectedTeamIds: z.array(z.string().uuid()).length(FINALIST_SLOTS),
});

/**
 * Marks the 5 highest preliminary averages as finalists and clears every other finalist flag.
 * The top 5 is recomputed here from `preliminary_ranking`; the client list is only used to
 * detect that the ranking changed after the admin opened the confirmation.
 */
export async function setTopFinalists(input: { expectedTeamIds: string[] }): Promise<SetTopFinalistsResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Data finalis tidak valid. Muat ulang halaman lalu coba lagi." };
  }

  const supabase = await createClient();

  const { data: ranking, error: rankingError } = await supabase
    .from("preliminary_ranking")
    .select("team_id, rank, avg_score")
    .order("rank", { ascending: true })
    .order("team_code", { ascending: true });

  if (rankingError || !ranking) {
    console.error("Failed to load preliminary ranking", rankingError);
    return { ok: false, message: "Gagal memuat peringkat babak awal." };
  }

  const ranked = ranking.filter((r) => r.team_id && r.rank !== null);
  if (ranked.length < FINALIST_SLOTS) {
    return { ok: false, message: `Baru ${ranked.length} tim yang memiliki nilai final. Dibutuhkan minimal 5.` };
  }

  const cutoff = ranked[FINALIST_SLOTS - 1];
  const next = ranked[FINALIST_SLOTS];
  const inTopRanks = ranked.filter((r) => (r.rank ?? Infinity) <= (cutoff.rank ?? 0)).length;
  if (inTopRanks > FINALIST_SLOTS || (next && next.avg_score === cutoff.avg_score)) {
    return {
      ok: false,
      message: "Ada nilai seri di batas peringkat 5. Tetapkan finalis secara manual di halaman Tim.",
    };
  }

  const topIds = ranked.slice(0, FINALIST_SLOTS).map((r) => r.team_id as string);
  const sameAsExpected = [...topIds].sort().join(",") === [...parsed.data.expectedTeamIds].sort().join(",");
  if (!sameAsExpected) {
    return { ok: false, message: "Peringkat berubah sejak halaman dimuat. Muat ulang halaman lalu coba lagi." };
  }

  const { data: currentFinalists, error: currentError } = await supabase
    .from("teams")
    .select("id")
    .eq("is_finalist", true);

  if (currentError || !currentFinalists) {
    console.error("Failed to load current finalists", currentError);
    return { ok: false, message: "Gagal memuat daftar finalis saat ini." };
  }

  const currentIds = new Set(currentFinalists.map((t) => t.id));
  const topSet = new Set(topIds);
  const toRemove = [...currentIds].filter((id) => !topSet.has(id));
  const toAdd = topIds.filter((id) => !currentIds.has(id));

  if (toRemove.length > 0) {
    const { data, error } = await supabase.from("teams").update({ is_finalist: false }).in("id", toRemove).select("id");
    if (error || !data || data.length !== toRemove.length) {
      console.error("Failed to clear finalists", error);
      return { ok: false, message: "Gagal melepas status finalis lama. Tidak ada finalis baru yang ditetapkan." };
    }
  }

  if (toAdd.length > 0) {
    const { data, error } = await supabase.from("teams").update({ is_finalist: true }).in("id", toAdd).select("id");
    if (error || !data || data.length !== toAdd.length) {
      console.error("Failed to set finalists", error);
      return {
        ok: false,
        message: "Finalis lama sudah dilepas, tetapi gagal menetapkan finalis baru. Coba lagi.",
      };
    }
  }

  const metadata = { source: "top5_preliminary" };
  await Promise.all([
    ...toAdd.map((id) =>
      logAuditEvent({ actorId: caller.id, action: "finalist_selected", targetType: "team", targetId: id, metadata }),
    ),
    ...toRemove.map((id) =>
      logAuditEvent({ actorId: caller.id, action: "finalist_unselected", targetType: "team", targetId: id, metadata }),
    ),
  ]);

  for (const path of ["/admin", "/admin/peringkat", "/admin/tim", "/admin/finalis", "/team"]) {
    revalidatePath(path);
  }

  return { ok: true, added: toAdd.length, removed: toRemove.length };
}

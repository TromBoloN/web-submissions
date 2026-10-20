"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { success: true } | { success: false; error: string };

const toggleFinalistSchema = z.object({
  teamId: z.string().uuid("ID tim tidak valid."),
  targetFinalist: z.boolean(),
});

const toggleDisqualifiedSchema = z.object({
  teamId: z.string().uuid("ID tim tidak valid."),
  targetDisqualified: z.boolean(),
});

export async function toggleFinalist(input: { teamId: string; targetFinalist: boolean }): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = toggleFinalistSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ is_finalist: parsed.data.targetFinalist })
    .eq("id", parsed.data.teamId);

  if (error) {
    console.error("Failed to update finalist status", error);
    return { success: false, error: "Gagal memperbarui status finalis. Coba lagi." };
  }

  revalidatePath("/admin/tim");
  return { success: true };
}

export async function toggleDisqualified(input: {
  teamId: string;
  targetDisqualified: boolean;
}): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = toggleDisqualifiedSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ is_disqualified: parsed.data.targetDisqualified })
    .eq("id", parsed.data.teamId);

  if (error) {
    console.error("Failed to update disqualified status", error);
    return { success: false, error: "Gagal memperbarui status diskualifikasi. Coba lagi." };
  }

  revalidatePath("/admin/tim");
  return { success: true };
}

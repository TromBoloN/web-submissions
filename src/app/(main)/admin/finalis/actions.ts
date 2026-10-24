"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FinalistActionResponse = { ok: true } | { ok: false; message: string };

const noticeSchema = z.object({
  finalist_message: z.string().max(2000, "Pesan untuk finalis maksimal 2.000 karakter."),
  non_finalist_message: z.string().max(2000, "Pesan untuk non-finalis maksimal 2.000 karakter."),
});

export async function updateFinalistNotice(formData: FormData): Promise<FinalistActionResponse> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = noticeSchema.safeParse({
    finalist_message: formData.get("finalist_message") ?? "",
    non_finalist_message: formData.get("non_finalist_message") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Format pesan tidak valid." };
  }

  const { finalist_message, non_finalist_message } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("finalist_notice")
    .update({
      finalist_message,
      non_finalist_message,
    })
    .eq("id", true)
    .select();

  if (error) {
    console.error("Failed to update finalist_notice", error);
    return { ok: false, message: "Gagal menyimpan pesan pengumuman finalis." };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "Gagal menyimpan pesan pengumuman. Baris data tidak ditemukan." };
  }

  revalidatePath("/admin/finalis");
  revalidatePath("/team");
  return { ok: true };
}

export async function publishFinalistNotice(): Promise<FinalistActionResponse> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("finalist_notice")
    .update({
      is_published: true,
      published_at: nowIso,
    })
    .eq("id", true)
    .select();

  if (error) {
    console.error("Failed to publish finalist_notice", error);
    return { ok: false, message: "Gagal mempublikasikan pengumuman finalis." };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "Gagal mempublikasikan pengumuman. Baris data tidak ditemukan." };
  }

  revalidatePath("/admin/finalis");
  revalidatePath("/team");
  return { ok: true };
}

export async function unpublishFinalistNotice(): Promise<FinalistActionResponse> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("finalist_notice")
    .update({
      is_published: false,
      published_at: null,
    })
    .eq("id", true)
    .select();

  if (error) {
    console.error("Failed to unpublish finalist_notice", error);
    return { ok: false, message: "Gagal menarik kembali pengumuman finalis." };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "Gagal menarik kembali pengumuman. Baris data tidak ditemukan." };
  }

  revalidatePath("/admin/finalis");
  revalidatePath("/team");
  return { ok: true };
}

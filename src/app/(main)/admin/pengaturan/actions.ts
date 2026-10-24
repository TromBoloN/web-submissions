"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { parseWitaInputToExclusiveCutoff } from "@/lib/deadline";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { success: true } | { success: false; error: string };

const deadlineSchema = z.object({
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Format batas waktu tidak valid (harus YYYY-MM-DDTHH:mm)."),
});

export async function updateCompetitionDeadline(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = deadlineSchema.safeParse({
    deadline: formData.get("deadline"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data batas waktu tidak valid." };
  }

  const closesAtIso = parseWitaInputToExclusiveCutoff(parsed.data.deadline);
  if (!closesAtIso) {
    return { success: false, error: "Tanggal dan waktu tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_settings")
    .update({
      submission_closes_at: closesAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select();

  if (error) {
    console.error("Failed to update competition settings", error);
    return { success: false, error: "Gagal menyimpan pengaturan batas waktu. Coba lagi." };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Data pengaturan kompetisi tidak ditemukan untuk diperbarui." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pengaturan");
  return { success: true };
}

const juknisSchema = z.object({
  juknis_url: z
    .string()
    .trim()
    .max(500, "Tautan juknis maksimal 500 karakter.")
    .refine((val) => {
      if (val === "") return true;
      if (!val.startsWith("https://")) return false;
      try {
        const u = new URL(val);
        return u.protocol === "https:";
      } catch {
        return false;
      }
    }, "Tautan juknis harus berupa URL https:// yang valid."),
});

export async function updateJuknisUrl(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const rawUrl = formData.get("juknis_url");
  const parsed = juknisSchema.safeParse({
    juknis_url: typeof rawUrl === "string" ? rawUrl : "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Tautan juknis tidak valid." };
  }

  const normalizedUrl = parsed.data.juknis_url === "" ? null : parsed.data.juknis_url;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_settings")
    .update({
      juknis_url: normalizedUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select();

  if (error) {
    console.error("Failed to update juknis url", error);
    return { success: false, error: "Gagal menyimpan tautan juknis. Coba lagi." };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Data pengaturan kompetisi tidak ditemukan untuk diperbarui." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/team", "layout");
  revalidatePath("/judge", "layout");
  return { success: true };
}

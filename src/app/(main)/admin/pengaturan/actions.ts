"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { normalizeWhatsAppNumber } from "@/lib/contact";
import { parseWitaInputToExclusiveCutoff, parseWitaInputToUtcIso } from "@/lib/deadline";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { success: true; warning?: string } | { success: false; error: string };

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

const contactWhatsappSchema = z.object({
  contact_whatsapp: z.string().trim().max(30, "Nomor WhatsApp maksimal 30 karakter."),
});

export async function updateContactWhatsapp(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const raw = formData.get("contact_whatsapp");
  const parsed = contactWhatsappSchema.safeParse({
    contact_whatsapp: typeof raw === "string" ? raw : "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Nomor WhatsApp tidak valid." };
  }

  const rawNumber = parsed.data.contact_whatsapp;

  if (rawNumber !== "" && !/^[0-9+\-\s().]+$/.test(rawNumber)) {
    return {
      success: false,
      error: "Nomor WhatsApp hanya boleh berisi angka, spasi, +, tanda hubung, titik, atau kurung.",
    };
  }

  const digits = normalizeWhatsAppNumber(rawNumber);

  if (rawNumber !== "" && digits === "") {
    return { success: false, error: "Nomor WhatsApp tidak valid." };
  }

  if (digits !== "" && (digits.length < 8 || digits.length > 15)) {
    return {
      success: false,
      error: "Nomor WhatsApp harus terdiri dari 8-15 digit. Contoh: 6281234567890.",
    };
  }

  const normalized = digits === "" ? null : digits;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_settings")
    .update({
      contact_whatsapp: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select();

  if (error) {
    console.error("Failed to update contact whatsapp", error);
    return { success: false, error: "Gagal menyimpan nomor WhatsApp. Coba lagi." };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Data pengaturan kompetisi tidak ditemukan untuk diperbarui." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/team");
  revalidatePath("/login");
  return { success: true };
}

const caseStudySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul studi kasus tidak boleh kosong.")
    .max(150, "Judul studi kasus maksimal 150 karakter."),
  content_md: z
    .string()
    .min(1, "Isi studi kasus tidak boleh kosong.")
    .max(20000, "Isi studi kasus maksimal 20.000 karakter."),
  release_at: z.string().trim().optional(),
});

export async function updateCaseStudy(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const rawTitle = formData.get("title");
  const rawContent = formData.get("content_md");
  const rawReleaseAt = formData.get("release_at");

  const parsed = caseStudySchema.safeParse({
    title: typeof rawTitle === "string" ? rawTitle : "",
    content_md: typeof rawContent === "string" ? rawContent : "",
    release_at: typeof rawReleaseAt === "string" ? rawReleaseAt : "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data studi kasus tidak valid." };
  }

  let releaseAtIso: string | null = null;
  let isPastWarning = false;
  if (parsed.data.release_at) {
    releaseAtIso = parseWitaInputToUtcIso(parsed.data.release_at);
    if (!releaseAtIso) {
      return { success: false, error: "Format waktu rilis (WITA) tidak valid." };
    }
    if (new Date(releaseAtIso) <= new Date()) {
      isPastWarning = true;
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_study")
    .update({
      title: parsed.data.title,
      content_md: parsed.data.content_md,
      release_at: releaseAtIso,
      updated_by: caller.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select();

  if (error) {
    console.error("Failed to update case study", error);
    return { success: false, error: "Gagal menyimpan studi kasus. Coba lagi." };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Data studi kasus tidak ditemukan untuk diperbarui." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/team/studi-kasus");
  revalidatePath("/judge/studi-kasus");

  if (isPastWarning) {
    return {
      success: true,
      warning: "Waktu rilis berada di masa lalu, sehingga studi kasus langsung terlihat oleh peserta.",
    };
  }

  return { success: true };
}

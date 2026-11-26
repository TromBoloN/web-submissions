"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { logAuditEvent } from "@/lib/audit";
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
  revalidatePath("/admin/pengaturan", "layout");
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

  revalidatePath("/admin/pengaturan", "layout");
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

  revalidatePath("/admin/pengaturan", "layout");
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

  revalidatePath("/admin/pengaturan", "layout");
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

const updateResultsReleaseSchema = z.object({
  stage: z.enum(["preliminary", "final"], {
    message: "Tahap kompetisi tidak valid.",
  }),
  released: z.boolean({
    message: "Status rilis harus berupa nilai boolean.",
  }),
});

export async function updateResultsRelease(stage: "preliminary" | "final", released: boolean): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = updateResultsReleaseSchema.safeParse({ stage, released });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data rilis hasil tidak valid." };
  }

  const supabase = await createClient();
  const updatePayload =
    parsed.data.stage === "preliminary"
      ? {
          preliminary_results_released: parsed.data.released,
          updated_at: new Date().toISOString(),
        }
      : {
          final_results_released: parsed.data.released,
          updated_at: new Date().toISOString(),
        };

  const { data, error } = await supabase.from("competition_settings").update(updatePayload).eq("id", true).select();

  if (error) {
    console.error("Failed to update results release status", error);
    return { success: false, error: "Gagal memperbarui status rilis hasil. Silakan coba lagi." };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Data pengaturan kompetisi tidak ditemukan untuk diperbarui." };
  }

  await logAuditEvent({
    actorId: caller.id,
    action: parsed.data.released ? "results_released" : "results_unreleased",
    targetType: "competition_settings",
    metadata: { stage: parsed.data.stage },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pengaturan", "layout");
  revalidatePath("/team");
  revalidatePath("/team", "layout");
  return { success: true };
}

export async function updateRankingPublication(published: boolean): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = z.boolean({ message: "Status publikasi harus berupa nilai boolean." }).safeParse(published);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data publikasi peringkat tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_settings")
    .update({ ranking_published: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");

  if (error) {
    console.error("Failed to update ranking publication", error);
    return { success: false, error: "Gagal memperbarui publikasi peringkat. Silakan coba lagi." };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Data pengaturan kompetisi tidak ditemukan untuk diperbarui." };
  }

  await logAuditEvent({
    actorId: caller.id,
    action: parsed.data ? "ranking_published" : "ranking_unpublished",
    targetType: "competition_settings",
  });

  revalidatePath("/admin/pengaturan", "layout");
  revalidatePath("/team", "layout");
  return { success: true };
}

export async function publishShowcasePhase(phase: "initial" | "finalists" | "gallery"): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const supabase = await createClient();

  if (phase === "gallery") {
    const { data: d1, error: e1 } = await supabase.rpc("publish_showcase_phase_one");
    if (e1 || !d1) {
      console.error("Failed to publish showcase phase 1", e1);
      return { success: false, error: "Gagal menerbitkan galeri tahap awal. Silakan coba lagi." };
    }
    const { data: d2, error: e2 } = await supabase.rpc("publish_showcase_phase_two");
    if (e2 || !d2) {
      console.error("Failed to publish showcase phase 2", e2);
      return { success: false, error: "Gagal menerbitkan karya finalis. Silakan coba lagi." };
    }
  } else {
    const functionName = phase === "initial" ? "publish_showcase_phase_one" : "publish_showcase_phase_two";
    const { data, error } = await supabase.rpc(functionName);

    if (error) {
      console.error("Failed to publish showcase phase", error);
      return { success: false, error: "Gagal menerbitkan galeri. Silakan coba lagi." };
    }

    if (!data) {
      return {
        success: false,
        error:
          phase === "initial"
            ? "Galeri tahap awal sudah diterbitkan atau tidak dapat diterbitkan."
            : "Pastikan galeri tahap awal sudah diterbitkan dan tahap finalis belum diterbitkan.",
      };
    }
  }

  let auditAction = "showcase_gallery_published";
  if (phase === "initial") {
    auditAction = "showcase_phase_one_published";
  } else if (phase === "finalists") {
    auditAction = "showcase_phase_two_published";
  }

  await logAuditEvent({
    actorId: caller.id,
    action: auditAction,
    targetType: "competition_settings",
    metadata: { phase },
  });

  revalidatePath("/admin/pengaturan", "layout");
  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/team/karya");
  revalidatePath("/karya");
  return { success: true };
}

export async function unpublishShowcasePhase(
  phase: "initial" | "finalists" | "winners" | "gallery",
): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const supabase = await createClient();
  const updatedAt = new Date().toISOString();

  if (phase === "gallery") {
    const { data: settings, error: readError } = await supabase
      .from("competition_settings")
      .select("winners_published_at")
      .eq("id", true)
      .single();

    if (readError) {
      console.error("Failed to read showcase publication state", readError);
      return { success: false, error: "Gagal membaca status publikasi galeri. Silakan coba lagi." };
    }
    if (settings.winners_published_at) {
      return { success: false, error: "Batalkan publikasi pemenang terlebih dahulu." };
    }

    const { data, error } = await supabase
      .from("competition_settings")
      .update({
        showcase_published_at: null,
        showcase_finalists_published_at: null,
        updated_at: updatedAt,
      })
      .eq("id", true)
      .select();

    if (error || !data || data.length === 0) {
      console.error("Failed to unpublish showcase gallery", error);
      return { success: false, error: "Gagal membatalkan publikasi galeri. Silakan coba lagi." };
    }

    await logAuditEvent({
      actorId: caller.id,
      action: "showcase_gallery_unpublished",
      targetType: "competition_settings",
      metadata: { phase },
    });

    revalidatePath("/admin/pengaturan", "layout");
    revalidatePath("/admin");
    revalidatePath("/team");
    revalidatePath("/team/karya");
    revalidatePath("/karya");
    return { success: true };
  }

  let update:
    | { showcase_published_at: null; updated_at: string }
    | { showcase_finalists_published_at: null; updated_at: string }
    | { winners_published_at: null; updated_at: string };
  if (phase === "initial") {
    update = { showcase_published_at: null, updated_at: updatedAt };
  } else if (phase === "finalists") {
    update = { showcase_finalists_published_at: null, updated_at: updatedAt };
  } else {
    update = { winners_published_at: null, updated_at: updatedAt };
  }

  if (phase === "initial") {
    const { data: settings, error: readError } = await supabase
      .from("competition_settings")
      .select("showcase_finalists_published_at")
      .eq("id", true)
      .single();
    if (readError) {
      console.error("Failed to read showcase publication state", readError);
      return { success: false, error: "Gagal membaca status publikasi galeri. Silakan coba lagi." };
    }
    if (settings.showcase_finalists_published_at) {
      return { success: false, error: "Batalkan publikasi finalis terlebih dahulu." };
    }
  } else if (phase === "finalists") {
    const { data: settings, error: readError } = await supabase
      .from("competition_settings")
      .select("winners_published_at")
      .eq("id", true)
      .single();
    if (readError) {
      console.error("Failed to read showcase winners state", readError);
      return { success: false, error: "Gagal membaca status publikasi pemenang. Silakan coba lagi." };
    }
    if (settings.winners_published_at) {
      return { success: false, error: "Batalkan publikasi pemenang terlebih dahulu." };
    }
  }

  const { data, error } = await supabase.from("competition_settings").update(update).eq("id", true).select();
  if (error) {
    console.error("Failed to unpublish showcase phase", error);
    return { success: false, error: "Gagal membatalkan publikasi galeri. Silakan coba lagi." };
  }
  if (!data || data.length === 0) {
    return { success: false, error: "Data pengaturan kompetisi tidak ditemukan." };
  }

  let auditAction: string;
  if (phase === "initial") {
    auditAction = "showcase_phase_one_unpublished";
  } else if (phase === "finalists") {
    auditAction = "showcase_phase_two_unpublished";
  } else {
    auditAction = "showcase_winners_unpublished";
  }

  await logAuditEvent({
    actorId: caller.id,
    action: auditAction,
    targetType: "competition_settings",
    metadata: { phase },
  });

  revalidatePath("/admin/pengaturan", "layout");
  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/team/karya");
  revalidatePath("/karya");
  return { success: true };
}

export async function publishShowcaseWinners(): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_showcase_winners");
  if (error) {
    console.error("Failed to publish showcase winners", error);
    return { success: false, error: "Gagal menerbitkan pemenang. Silakan coba lagi." };
  }
  if (!data) {
    return { success: false, error: "Pastikan tahap finalis sudah diterbitkan dan pemenang belum diterbitkan." };
  }

  await logAuditEvent({
    actorId: caller.id,
    action: "showcase_winners_published",
    targetType: "competition_settings",
    metadata: { phase: "winners" },
  });

  revalidatePath("/admin/pengaturan", "layout");
  revalidatePath("/admin");
  revalidatePath("/karya");
  return { success: true };
}

const finalistShowcaseSchema = z.object({
  teamId: z.string().uuid("ID tim tidak valid."),
  title: z.string().trim().max(80, "Judul maksimal 80 karakter."),
  description: z.string().trim().max(300, "Deskripsi maksimal 300 karakter."),
  imagePath: z.string().nullable(),
});

/**
 * Admin edit of a finalist's gallery card. Writes the same columns the team edits on
 * /team/karya, so whoever saves last wins. Finalists are listed in the gallery even
 * without team consent (see migration 20261117000000).
 */
export async function saveFinalistShowcase(input: {
  teamId: string;
  title: string;
  description: string;
  imagePath: string | null;
}): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = finalistShowcaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data kartu galeri tidak valid." };
  }
  const { teamId, title, description, imagePath } = parsed.data;

  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, is_finalist, showcase_image_path")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !team) {
    return { success: false, error: "Tim tidak ditemukan." };
  }
  if (!team.is_finalist) {
    return { success: false, error: "Kartu galeri hanya dapat diatur panitia untuk tim finalis." };
  }

  // New images must come from the admin folder for this team; the current image may be kept as is.
  const adminImage = new RegExp(`^showcase/admin/${teamId}/[0-9a-fA-F-]{36}.(png|jpe?g|webp)$`);
  if (imagePath !== null && imagePath !== team.showcase_image_path && !adminImage.test(imagePath)) {
    return { success: false, error: "Lokasi gambar tidak valid. Unggah ulang gambar." };
  }

  const { data, error } = await supabase
    .from("teams")
    .update({ showcase_title: title, showcase_description: description, showcase_image_path: imagePath })
    .eq("id", teamId)
    .select("id");

  if (error || !data || data.length === 0) {
    console.error("Failed to save finalist showcase card", error);
    return { success: false, error: "Gagal menyimpan kartu galeri. Coba lagi." };
  }

  // Remove the replaced image only if it was an admin upload (team uploads belong to the team).
  const previous = team.showcase_image_path;
  if (previous && previous !== imagePath && previous.startsWith("showcase/admin/")) {
    await supabase.storage.from("web-showcase").remove([previous]);
  }

  await logAuditEvent({
    actorId: caller.id,
    action: "finalist_showcase_updated",
    targetType: "team",
    targetId: teamId,
  });

  revalidatePath("/admin/pengaturan/galeri");
  revalidatePath("/karya");
  revalidatePath("/team");
  revalidatePath("/team/karya");
  return { success: true };
}

// ----------------------------------------------------------------------------
// Identitas & Final
// ----------------------------------------------------------------------------

const httpsUrlOrEmpty = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} maksimal 500 karakter.`)
    .refine((val) => {
      if (val === "") return true;
      try {
        return new URL(val).protocol === "https:";
      } catch {
        return false;
      }
    }, `${label} harus berupa URL https:// yang valid.`);

const eventIdentitySchema = z.object({
  event_name: z.string().trim().min(1, "Nama acara wajib diisi.").max(60, "Nama acara maksimal 60 karakter."),
  event_track: z.string().trim().min(1, "Nama bidang lomba wajib diisi.").max(60, "Bidang lomba maksimal 60 karakter."),
  finalist_count: z.coerce
    .number({ message: "Jumlah finalis harus berupa angka." })
    .int("Jumlah finalis harus bilangan bulat.")
    .min(1, "Jumlah finalis minimal 1.")
    .max(20, "Jumlah finalis maksimal 20."),
  gallery_new_badge_days: z.coerce
    .number({ message: "Durasi label harus berupa angka." })
    .int("Durasi label harus bilangan bulat.")
    .min(0, "Durasi label minimal 0 hari.")
    .max(60, "Durasi label maksimal 60 hari."),
});

export async function updateEventIdentity(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = eventIdentitySchema.safeParse({
    event_name: formData.get("event_name") ?? "",
    event_track: formData.get("event_track") ?? "",
    finalist_count: formData.get("finalist_count") ?? "",
    gallery_new_badge_days: formData.get("gallery_new_badge_days") ?? "",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data identitas acara tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");

  if (error) {
    console.error("Failed to update event identity", error);
    return { success: false, error: "Gagal menyimpan identitas acara. Coba lagi." };
  }
  if (!data || data.length === 0) {
    return { success: false, error: "Data pengaturan kompetisi tidak ditemukan untuk diperbarui." };
  }

  await logAuditEvent({
    actorId: caller.id,
    action: "event_identity_updated",
    targetType: "competition_settings",
    metadata: parsed.data,
  });

  // The event name appears on every page (titles, sidebar, gallery, login).
  revalidatePath("/", "layout");
  return { success: true };
}

const finalPresentationSchema = z.object({
  presentation_minutes: z.coerce
    .number({ message: "Durasi presentasi harus berupa angka." })
    .int("Durasi presentasi harus bilangan bulat.")
    .min(1, "Durasi presentasi minimal 1 menit.")
    .max(120, "Durasi presentasi maksimal 120 menit."),
  qa_minutes: z.coerce
    .number({ message: "Durasi tanya jawab harus berupa angka." })
    .int("Durasi tanya jawab harus bilangan bulat.")
    .min(0, "Durasi tanya jawab minimal 0 menit.")
    .max(120, "Durasi tanya jawab maksimal 120 menit."),
  venue: z.string().trim().max(160, "Lokasi maksimal 160 karakter."),
  meeting_url: httpsUrlOrEmpty("Tautan sesi"),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter."),
  logistics_published: z.boolean(),
});

export async function updateFinalPresentation(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = finalPresentationSchema.safeParse({
    presentation_minutes: formData.get("presentation_minutes") ?? "",
    qa_minutes: formData.get("qa_minutes") ?? "",
    venue: formData.get("venue") ?? "",
    meeting_url: formData.get("meeting_url") ?? "",
    note: formData.get("note") ?? "",
    logistics_published: formData.get("logistics_published") === "on",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data babak final tidak valid." };
  }

  const values = { ...parsed.data, meeting_url: parsed.data.meeting_url === "" ? null : parsed.data.meeting_url };

  const supabase = await createClient();
  const { data, error } = await supabase.from("final_presentation").update(values).eq("id", true).select("id");

  if (error) {
    console.error("Failed to update final presentation", error);
    return { success: false, error: "Gagal menyimpan detail babak final. Coba lagi." };
  }
  if (!data || data.length === 0) {
    return { success: false, error: "Data babak final tidak ditemukan untuk diperbarui." };
  }

  await logAuditEvent({
    actorId: caller.id,
    action: "final_presentation_updated",
    targetType: "final_presentation",
    // Venue/link are finalist-only details; the audit log records what changed, not the values.
    metadata: {
      presentation_minutes: values.presentation_minutes,
      qa_minutes: values.qa_minutes,
      logistics_published: values.logistics_published,
    },
  });

  revalidatePath("/admin/pengaturan", "layout");
  revalidatePath("/team", "layout");
  revalidatePath("/judge", "layout");
  return { success: true };
}

// ----------------------------------------------------------------------------
// Jadwal (competition_stages)
// ----------------------------------------------------------------------------

const isoDate = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} wajib diisi.`)
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), `${label} tidak valid.`);

const stageSchema = z
  .object({
    key: z
      .string()
      .regex(/^[a-z][a-z0-9_]{1,31}$/, "Tahap tidak valid.")
      .nullable(),
    title: z.string().trim().min(1, "Judul tahap wajib diisi.").max(80, "Judul tahap maksimal 80 karakter."),
    description: z.string().trim().max(240, "Deskripsi maksimal 240 karakter."),
    starts_on: isoDate("Tanggal mulai"),
    ends_on: isoDate("Tanggal selesai"),
    time_label: z.string().trim().max(40, "Keterangan waktu maksimal 40 karakter."),
    sort_order: z.coerce
      .number({ message: "Urutan harus berupa angka." })
      .int("Urutan harus bilangan bulat.")
      .min(0, "Urutan minimal 0.")
      .max(1000, "Urutan maksimal 1000."),
    show_on_track: z.boolean(),
    status_override: z.enum(["auto", "upcoming", "current", "done"], { message: "Status tidak valid." }),
  })
  .refine((v) => v.ends_on >= v.starts_on, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    path: ["ends_on"],
  });

function revalidateSchedule() {
  // Stages show on the team journey, admin timeline, public gallery and sidebar badge.
  revalidatePath("/", "layout");
}

/** Creates a custom stage (no key in the form) or updates an existing one. */
export async function saveStage(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const rawKey = formData.get("key");
  const parsed = stageSchema.safeParse({
    key: typeof rawKey === "string" && rawKey !== "" ? rawKey : null,
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    starts_on: formData.get("starts_on") ?? "",
    ends_on: formData.get("ends_on") ?? "",
    time_label: formData.get("time_label") ?? "",
    sort_order: formData.get("sort_order") ?? "",
    show_on_track: formData.get("show_on_track") === "on",
    status_override: formData.get("status_override") ?? "auto",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tahap tidak valid." };
  }

  const { key, status_override, ...rest } = parsed.data;
  const values = { ...rest, status_override: status_override === "auto" ? null : status_override };
  const supabase = await createClient();

  if (key === null) {
    // Admin-created stages are never system stages; the key is internal, so generate one.
    const newKey = `custom_${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from("competition_stages")
      .insert({ ...values, key: newKey, is_system: false })
      .select("key");
    if (error || !data || data.length === 0) {
      console.error("Failed to create stage", error);
      return { success: false, error: "Gagal menambah tahap. Coba lagi." };
    }
    await logAuditEvent({
      actorId: caller.id,
      action: "stage_created",
      targetType: "competition_stages",
      metadata: { key: newKey, title: values.title, starts_on: values.starts_on, ends_on: values.ends_on },
    });
  } else {
    const { data, error } = await supabase.from("competition_stages").update(values).eq("key", key).select("key");
    if (error) {
      console.error("Failed to update stage", error);
      return { success: false, error: "Gagal menyimpan tahap. Coba lagi." };
    }
    if (!data || data.length === 0) {
      return { success: false, error: "Tahap tidak ditemukan untuk diperbarui." };
    }
    await logAuditEvent({
      actorId: caller.id,
      action: "stage_updated",
      targetType: "competition_stages",
      metadata: { key, title: values.title, starts_on: values.starts_on, ends_on: values.ends_on },
    });
  }

  revalidateSchedule();
  return { success: true };
}

export async function deleteStage(key: string): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,31}$/)
    .safeParse(key);
  if (!parsed.success) {
    return { success: false, error: "Tahap tidak valid." };
  }

  const supabase = await createClient();
  // RLS also refuses system stages; the filter keeps the intent explicit.
  const { data, error } = await supabase
    .from("competition_stages")
    .delete()
    .eq("key", parsed.data)
    .eq("is_system", false)
    .select("key, title");

  if (error) {
    console.error("Failed to delete stage", error);
    return { success: false, error: "Gagal menghapus tahap. Coba lagi." };
  }
  if (!data || data.length === 0) {
    return { success: false, error: "Tahap bawaan tidak dapat dihapus." };
  }

  await logAuditEvent({
    actorId: caller.id,
    action: "stage_deleted",
    targetType: "competition_stages",
    metadata: { key: parsed.data, title: data[0].title },
  });

  revalidateSchedule();
  return { success: true };
}

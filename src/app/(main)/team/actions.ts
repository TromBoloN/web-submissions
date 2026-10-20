"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SaveSubmissionResult =
  | { ok: true; status: "draft" | "submitted"; updatedAt: string }
  | { ok: false; message: string };

const submissionInputSchema = z.object({
  github_url: z.string().trim().max(500, "URL repositori maksimal 500 karakter."),
  live_demo_url: z.string().trim().max(500, "URL live demo maksimal 500 karakter."),
  video_url: z.string().trim().max(500, "URL video demo maksimal 500 karakter."),
  intent: z.enum(["draft", "submit"]),
});

export async function saveSubmission(formData: FormData): Promise<SaveSubmissionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "team") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = submissionInputSchema.safeParse({
    github_url: formData.get("github_url"),
    live_demo_url: formData.get("live_demo_url"),
    video_url: formData.get("video_url"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data submission tidak valid." };
  }

  const { github_url, live_demo_url, video_url, intent } = parsed.data;

  const supabase = await createClient();

  // Find the team for this profile
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, is_disqualified")
    .eq("profile_id", caller.id)
    .maybeSingle();

  if (teamError || !team) {
    return { ok: false, message: "Data tim Anda tidak ditemukan. Hubungi panitia." };
  }

  if (team.is_disqualified) {
    return { ok: false, message: "Tim Anda didiskualifikasi. Submission tidak dapat diubah." };
  }

  // Check existing submission
  const { data: existingSubmission, error: fetchSubError } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("team_id", team.id)
    .maybeSingle();

  if (fetchSubError) {
    console.error("Failed to fetch existing submission", fetchSubError);
    return { ok: false, message: "Gagal memuat data submission. Coba lagi." };
  }

  // Once submitted, status cannot be reverted to draft
  const isAlreadySubmitted = existingSubmission?.status === "submitted";
  const targetStatus: "draft" | "submitted" = isAlreadySubmitted || intent === "submit" ? "submitted" : "draft";

  // Validate URLs according to rules
  if (targetStatus === "submitted") {
    if (!github_url) {
      return { ok: false, message: "Repositori GitHub wajib diisi untuk mengirim submission." };
    }
    if (!/^https:\/\/github\.com\/.+/i.test(github_url)) {
      return { ok: false, message: "URL Repositori harus diawali dengan https://github.com/" };
    }
    if (!live_demo_url) {
      return { ok: false, message: "URL Live Demo wajib diisi untuk mengirim submission." };
    }
    if (!/^https?:\/\/.+/i.test(live_demo_url)) {
      return { ok: false, message: "URL Live Demo harus berupa tautan valid (diawali http:// atau https://)." };
    }
    if (!video_url) {
      return { ok: false, message: "URL Video Demo wajib diisi untuk mengirim submission." };
    }
    if (!/^https?:\/\/.+/i.test(video_url)) {
      return { ok: false, message: "URL Video Demo harus berupa tautan valid (diawali http:// atau https://)." };
    }
  } else {
    // Draft allows empty, but if provided must follow format
    if (github_url && !/^https:\/\/github\.com\/.+/i.test(github_url)) {
      return { ok: false, message: "URL Repositori harus diawali dengan https://github.com/" };
    }
    if (live_demo_url && !/^https?:\/\/.+/i.test(live_demo_url)) {
      return { ok: false, message: "URL Live Demo harus diawali http:// atau https://" };
    }
    if (video_url && !/^https?:\/\/.+/i.test(video_url)) {
      return { ok: false, message: "URL Video Demo harus diawali http:// atau https://" };
    }
  }

  if (existingSubmission) {
    // Update existing row
    const { data: updated, error: updateError } = await supabase
      .from("submissions")
      .update({
        github_url,
        live_demo_url,
        video_url,
        status: targetStatus,
      })
      .eq("team_id", team.id)
      .select();

    if (updateError) {
      if (updateError.code === "42501") {
        return {
          ok: false,
          message: "Pengiriman ditolak. Batas waktu telah berakhir atau akun tidak diizinkan mengubah submission.",
        };
      }
      console.error("Failed to update submission", updateError);
      return { ok: false, message: "Gagal memperbarui submission. Coba lagi." };
    }

    // Zero rows returned means RLS blocked the update (deadline passed or disqualified)
    if (!updated || updated.length === 0) {
      return {
        ok: false,
        message: "Pengiriman ditolak. Batas waktu telah berakhir atau akun tidak diizinkan mengubah submission.",
      };
    }

    const updatedRow = updated[0];
    revalidatePath("/team");
    return { ok: true, status: updatedRow.status, updatedAt: updatedRow.updated_at };
  }

  // Insert new row
  const { data: inserted, error: insertError } = await supabase
    .from("submissions")
    .insert({
      team_id: team.id,
      github_url,
      live_demo_url,
      video_url,
      status: targetStatus,
    })
    .select();

  if (insertError) {
    // Unique violation race condition (another request inserted first)
    if (insertError.code === "23505") {
      const { data: updatedRetry, error: retryError } = await supabase
        .from("submissions")
        .update({
          github_url,
          live_demo_url,
          video_url,
          status: targetStatus,
        })
        .eq("team_id", team.id)
        .select();

      if (retryError || !updatedRetry || updatedRetry.length === 0) {
        return {
          ok: false,
          message: "Pengiriman ditolak. Batas waktu telah berakhir atau akun tidak diizinkan mengubah submission.",
        };
      }

      const retryRow = updatedRetry[0];
      revalidatePath("/team");
      return { ok: true, status: retryRow.status, updatedAt: retryRow.updated_at };
    }

    // 42501 = RLS check failed (deadline passed or disqualified)
    if (insertError.code === "42501") {
      return {
        ok: false,
        message: "Pengiriman ditolak. Batas waktu telah berakhir atau akun tidak diizinkan mengubah submission.",
      };
    }

    console.error("Failed to insert submission", insertError);
    return { ok: false, message: "Gagal menyimpan submission. Coba lagi." };
  }

  if (!inserted || inserted.length === 0) {
    return {
      ok: false,
      message: "Pengiriman ditolak. Batas waktu telah berakhir atau akun tidak diizinkan mengubah submission.",
    };
  }

  const insertedRow = inserted[0];
  revalidatePath("/team");
  return { ok: true, status: insertedRow.status, updatedAt: insertedRow.updated_at };
}

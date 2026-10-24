"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { checkLinks, type LinkCheckResult } from "@/lib/link-check";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

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

export type CheckMyLinksResult =
  | { ok: true; data: LinkCheckResult; checkedAt: string }
  | { ok: false; message: string; data?: LinkCheckResult | null; checkedAt?: string | null };

export async function checkMyLinks(): Promise<CheckMyLinksResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "team") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const supabase = await createClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, is_disqualified")
    .eq("profile_id", caller.id)
    .maybeSingle();

  if (teamError || !team) {
    return { ok: false, message: "Data tim Anda tidak ditemukan." };
  }

  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .select("id, github_url, live_demo_url, video_url, link_check, link_checked_at")
    .eq("team_id", team.id)
    .maybeSingle();

  if (subError) {
    console.error("Failed to fetch submission for link check", subError);
    return { ok: false, message: "Gagal memuat data submission." };
  }

  if (!submission) {
    return { ok: false, message: "Belum ada submission yang disimpan untuk diperiksa." };
  }

  // Rate limit: 10 seconds
  if (submission.link_checked_at) {
    const lastCheckTime = new Date(submission.link_checked_at).getTime();
    const diffMs = Date.now() - lastCheckTime;
    if (diffMs < 10000) {
      const remainingSec = Math.ceil((10000 - diffMs) / 1000);
      return {
        ok: false,
        message: `Harap tunggu ${remainingSec} detik sebelum memeriksa tautan kembali.`,
        data: submission.link_check as LinkCheckResult | null,
        checkedAt: submission.link_checked_at,
      };
    }
  }

  const checkResult = await checkLinks({
    github: submission.github_url,
    liveDemo: submission.live_demo_url,
    video: submission.video_url,
  });

  const nowIso = new Date().toISOString();

  // Use adminClient because this works even after the deadline when team cannot UPDATE submissions
  const { error: updateError } = await adminClient
    .from("submissions")
    .update({
      link_check: checkResult as Json,
      link_checked_at: nowIso,
    })
    .eq("id", submission.id);

  if (updateError) {
    console.error("Failed to update submission link_check", updateError);
    return { ok: false, message: "Gagal menyimpan hasil pemeriksaan tautan." };
  }

  revalidatePath("/team");

  return {
    ok: true,
    data: checkResult,
    checkedAt: nowIso,
  };
}

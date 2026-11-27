"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { checkLinks, type LinkCheckResult } from "@/lib/link-check";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import { validateSubmissionLinks } from "./submission-rules";

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

export type SaveSubmissionResult =
  | { ok: true; status: "draft" | "submitted"; updatedAt: string }
  | { ok: false; message: string };

export type SaveShowcaseConsentResult = { ok: true; consent: boolean } | { ok: false; message: string };

const showcaseConsentSchema = z.object({
  consent: z.enum(["true", "false"]),
});

export async function saveShowcaseConsent(formData: FormData): Promise<SaveShowcaseConsentResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "team") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = showcaseConsentSchema.safeParse({
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Pilihan pameran tidak valid." };
  }

  const consent = parsed.data.consent === "true";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_showcase_consent", { p_consent: consent });

  if (error) {
    console.error("Failed to save showcase consent", error);
    return { ok: false, message: "Gagal menyimpan pilihan pameran. Coba lagi." };
  }

  if (!data) {
    return {
      ok: false,
      message: "Pilihan pameran tidak dapat diubah. Pastikan submission sudah terkirim dan galeri belum diterbitkan.",
    };
  }

  revalidatePath("/team");
  return { ok: true, consent };
}

const SUBMISSION_REJECTED =
  "Pengiriman ditolak. Batas waktu telah berakhir atau akun tidak diizinkan mengubah submission.";

function savedResult(row: Pick<SubmissionRow, "status" | "updated_at">): SaveSubmissionResult {
  revalidatePath("/team");
  return { ok: true, status: row.status, updatedAt: row.updated_at };
}

const submissionInputSchema = z.object({
  github_url: z.string().trim().max(500, "URL repositori maksimal 500 karakter."),
  live_demo_url: z.string().trim().max(500, "URL live demo maksimal 500 karakter."),
  video_url: z.string().trim().max(500, "URL video demo maksimal 500 karakter."),
  notes_for_judges: z.string().trim().max(1000, "Catatan untuk juri maksimal 1.000 karakter."),
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
    notes_for_judges: formData.get("notes_for_judges"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data submission tidak valid." };
  }

  const { github_url, live_demo_url, video_url, notes_for_judges, intent } = parsed.data;

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

  const linkErrors = validateSubmissionLinks(
    { github_url, live_demo_url, video_url },
    targetStatus === "submitted" ? "submit" : "draft",
  );
  const firstLinkError = Object.values(linkErrors)[0];
  if (firstLinkError) {
    return { ok: false, message: firstLinkError };
  }

  const values = { github_url, live_demo_url, video_url, notes_for_judges, status: targetStatus };

  // Zero rows back means RLS blocked the update (deadline passed or disqualified).
  const updateRow = async (): Promise<SaveSubmissionResult> => {
    const { data, error } = await supabase.from("submissions").update(values).eq("team_id", team.id).select();
    if (error && error.code !== "42501") {
      console.error("Failed to update submission", error);
      return { ok: false, message: "Gagal memperbarui submission. Coba lagi." };
    }
    if (error || !data?.[0]) return { ok: false, message: SUBMISSION_REJECTED };
    return savedResult(data[0]);
  };

  if (existingSubmission) return updateRow();

  const { data: inserted, error: insertError } = await supabase
    .from("submissions")
    .insert({ team_id: team.id, ...values })
    .select();

  // 23505: another request created the row between our check and insert, so update it instead.
  if (insertError?.code === "23505") return updateRow();
  // 42501: RLS rejected the insert (deadline passed or disqualified).
  if (insertError && insertError.code !== "42501") {
    console.error("Failed to insert submission", insertError);
    return { ok: false, message: "Gagal menyimpan submission. Coba lagi." };
  }
  if (insertError || !inserted?.[0]) return { ok: false, message: SUBMISSION_REJECTED };
  return savedResult(inserted[0]);
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

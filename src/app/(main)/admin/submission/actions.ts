"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { checkLinks, type LinkCheckResult } from "@/lib/link-check";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type AdminUpdateSubmissionResult = { ok: true } | { ok: false; message: string };

const adminSubmissionSchema = z.object({
  team_id: z.string().uuid("ID tim tidak valid."),
  github_url: z.string().trim().max(500, "URL repositori maksimal 500 karakter."),
  live_demo_url: z.string().trim().max(500, "URL live demo maksimal 500 karakter."),
  video_url: z.string().trim().max(500, "URL video demo maksimal 500 karakter."),
  notes_for_judges: z.string().trim().max(1000, "Catatan untuk juri maksimal 1.000 karakter."),
  status: z.enum(["draft", "submitted"]),
});

export async function adminUpdateSubmission(formData: FormData): Promise<AdminUpdateSubmissionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = adminSubmissionSchema.safeParse({
    team_id: formData.get("team_id"),
    github_url: formData.get("github_url"),
    live_demo_url: formData.get("live_demo_url"),
    video_url: formData.get("video_url"),
    notes_for_judges: formData.get("notes_for_judges"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data submission tidak valid." };
  }

  const { team_id, github_url, live_demo_url, video_url, notes_for_judges, status } = parsed.data;

  // Validate URLs according to status
  if (status === "submitted") {
    if (!github_url || !live_demo_url || !video_url) {
      return {
        ok: false,
        message: "Untuk status Terkirim, ketiga tautan (GitHub, Live Demo, Video Demo) wajib diisi.",
      };
    }
    if (!/^https:\/\/github\.com\/.+/i.test(github_url)) {
      return {
        ok: false,
        message: "URL Repositori GitHub harus diawali dengan https://github.com/",
      };
    }
    if (!/^https?:\/\/.+/i.test(live_demo_url)) {
      return {
        ok: false,
        message: "URL Live Demo harus diawali dengan http:// atau https://",
      };
    }
    if (!/^https?:\/\/.+/i.test(video_url)) {
      return {
        ok: false,
        message: "URL Video Demo harus diawali dengan http:// atau https://",
      };
    }
  } else {
    // Draft allows empty, but if filled must be valid
    if (github_url && !/^https:\/\/github\.com\/.+/i.test(github_url)) {
      return {
        ok: false,
        message: "URL Repositori GitHub harus diawali dengan https://github.com/",
      };
    }
    if (live_demo_url && !/^https?:\/\/.+/i.test(live_demo_url)) {
      return {
        ok: false,
        message: "URL Live Demo harus diawali dengan http:// atau https://",
      };
    }
    if (video_url && !/^https?:\/\/.+/i.test(video_url)) {
      return {
        ok: false,
        message: "URL Video Demo harus diawali dengan http:// atau https://",
      };
    }
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("submissions")
    .select("id")
    .eq("team_id", team_id)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch submission", fetchError);
    return { ok: false, message: "Gagal memuat submission tim. Coba lagi." };
  }

  if (existing) {
    const { data, error } = await supabase
      .from("submissions")
      .update({
        github_url,
        live_demo_url,
        video_url,
        notes_for_judges,
        status,
      })
      .eq("team_id", team_id)
      .select();

    if (error) {
      console.error("Failed to update submission by admin", error);
      return { ok: false, message: "Gagal memperbarui submission tim. Coba lagi." };
    }

    if (!data || data.length === 0) {
      return { ok: false, message: "Gagal menyimpan submission. Tidak ada baris yang diperbarui." };
    }
  } else {
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        team_id,
        github_url,
        live_demo_url,
        video_url,
        notes_for_judges,
        status,
      })
      .select();

    if (error) {
      console.error("Failed to insert submission by admin", error);
      return { ok: false, message: "Gagal membuat submission tim. Coba lagi." };
    }

    if (!data || data.length === 0) {
      return { ok: false, message: "Gagal menyimpan submission. Tidak ada baris yang dibuat." };
    }
  }

  revalidatePath("/admin/submission");
  revalidatePath("/admin");
  revalidatePath("/team");
  return { ok: true };
}

export type AdminRecheckLinksResult =
  | { ok: true; data: LinkCheckResult; checkedAt: string }
  | { ok: false; message: string };

export async function adminRecheckLinks(teamId: string): Promise<AdminRecheckLinksResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const supabase = await createClient();

  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .select("id, github_url, live_demo_url, video_url")
    .eq("team_id", teamId)
    .maybeSingle();

  if (subError || !submission) {
    return { ok: false, message: "Data submission tidak ditemukan untuk tim ini." };
  }

  const checkResult = await checkLinks({
    github: submission.github_url,
    liveDemo: submission.live_demo_url,
    video: submission.video_url,
  });

  const nowIso = new Date().toISOString();

  const { error: updateError } = await adminClient
    .from("submissions")
    .update({
      link_check: checkResult as Json,
      link_checked_at: nowIso,
    })
    .eq("id", submission.id);

  if (updateError) {
    console.error("Failed to update submission link_check by admin", updateError);
    return { ok: false, message: "Gagal menyimpan hasil pemeriksaan tautan." };
  }

  revalidatePath("/admin/submission");
  return { ok: true, data: checkResult, checkedAt: nowIso };
}

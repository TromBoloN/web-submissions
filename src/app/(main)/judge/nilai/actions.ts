"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SaveScoreResult = { ok: true; total: number; updatedAt: string } | { ok: false; message: string };

function handleScoreError(error: { code?: string; message?: string } | null, defaultMessage: string): string {
  if (error?.code === "P0001" || error?.message?.includes("hasil penilaian telah dirilis")) {
    return "Penilaian ini sudah dikunci karena hasil telah dirilis.";
  }
  if (error?.code === "42501") {
    return "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini.";
  }
  return defaultMessage;
}

const criterionScoreSchema = z
  .union([z.number(), z.string()])
  .superRefine((val, ctx) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nilai kriteria wajib diisi (tidak boleh kosong).",
        });
        return;
      }
      const normalized = trimmed.replace(",", ".");
      const num = Number(normalized);
      if (Number.isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nilai harus berupa angka yang valid.",
        });
        return;
      }
      if (num < 0 || num > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nilai harus berada di rentang 0 sampai 100.",
        });
        return;
      }
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nilai maksimal memiliki 2 angka di belakang koma.",
        });
        return;
      }
    } else {
      if (Number.isNaN(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nilai harus berupa angka yang valid.",
        });
        return;
      }
      if (val < 0 || val > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nilai harus berada di rentang 0 sampai 100.",
        });
        return;
      }
      const str = val.toString();
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(str)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nilai maksimal memiliki 2 angka di belakang koma.",
        });
        return;
      }
    }
  })
  .transform((val) => {
    if (typeof val === "string") {
      return Number(val.trim().replace(",", "."));
    }
    return val;
  });

const prelimScoreInputSchema = z.object({
  tahap: z.literal("preliminary"),
  team_id: z.string().uuid("ID tim tidak valid."),
  scores: z.object({
    functionality_score: criterionScoreSchema,
    case_study_fit_score: criterionScoreSchema,
    ui_ux_score: criterionScoreSchema,
    code_quality_score: criterionScoreSchema,
    documentation_score: criterionScoreSchema,
  }),
  feedback: z.string().trim().max(2000, "Masukan maksimal 2000 karakter.").default(""),
});

const finalScoreInputSchema = z.object({
  tahap: z.literal("final"),
  team_id: z.string().uuid("ID tim tidak valid."),
  scores: z.object({
    functionality_score: criterionScoreSchema,
    case_study_fit_score: criterionScoreSchema,
    ui_ux_score: criterionScoreSchema,
    code_quality_score: criterionScoreSchema,
    documentation_score: criterionScoreSchema,
    presentation_qa_score: criterionScoreSchema,
  }),
  feedback: z.string().trim().max(2000, "Masukan maksimal 2000 karakter.").default(""),
});

export async function saveScore(input: {
  tahap: "preliminary" | "final";
  team_id: string;
  scores: Record<string, number | string>;
  feedback?: string;
}): Promise<SaveScoreResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "judge") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const allowedStages = caller.judge_stage === "both" ? ["preliminary", "final"] : [caller.judge_stage];
  if (!allowedStages.includes(input.tahap)) {
    return { ok: false, message: "Tahap penilaian tidak sesuai dengan hak akses juri Anda." };
  }

  if (input.tahap === "preliminary") {
    const parsed = prelimScoreInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Nilai tidak valid." };
    }

    const { team_id, scores, feedback } = parsed.data;
    const supabase = await createClient();

    // Look up existing row
    const { data: existing, error: fetchError } = await supabase
      .from("preliminary_scores")
      .select("id, locked_at")
      .eq("judge_id", caller.id)
      .eq("team_id", team_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to check existing prelim score", fetchError);
      return { ok: false, message: "Gagal memproses penilaian. Coba lagi." };
    }

    if (existing?.locked_at) {
      return { ok: false, message: "Nilai Anda sudah dikunci dan tidak dapat diubah lagi." };
    }

    const scoreData = {
      functionality_score: scores.functionality_score,
      case_study_fit_score: scores.case_study_fit_score,
      ui_ux_score: scores.ui_ux_score,
      code_quality_score: scores.code_quality_score,
      documentation_score: scores.documentation_score,
      feedback: feedback ?? "",
    };

    if (existing) {
      // Update existing (never send judge_id or total_weighted_score)
      const { data, error } = await supabase
        .from("preliminary_scores")
        .update(scoreData)
        .eq("judge_id", caller.id)
        .eq("team_id", team_id)
        .select();

      if (error) {
        console.error("Failed to update prelim score", error);
        return { ok: false, message: handleScoreError(error, "Gagal memperbarui nilai. Coba lagi.") };
      }

      if (!data || data.length === 0) {
        return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
      }

      const saved = data[0];
      revalidatePath("/judge");
      revalidatePath(`/judge/nilai/preliminary/${team_id}`);
      return {
        ok: true,
        total: Number(saved.total_weighted_score),
        updatedAt: saved.updated_at,
      };
    }

    // Insert new
    const { data, error } = await supabase
      .from("preliminary_scores")
      .insert({
        judge_id: caller.id,
        team_id,
        ...scoreData,
      })
      .select();

    if (error) {
      // Handle unique-violation race condition (retry once as update)
      if (error.code === "23505") {
        const { data: retryData, error: retryError } = await supabase
          .from("preliminary_scores")
          .update(scoreData)
          .eq("judge_id", caller.id)
          .eq("team_id", team_id)
          .select();

        if (retryError || !retryData || retryData.length === 0) {
          return {
            ok: false,
            message: handleScoreError(retryError, "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini."),
          };
        }

        const saved = retryData[0];
        revalidatePath("/judge");
        revalidatePath(`/judge/nilai/preliminary/${team_id}`);
        return {
          ok: true,
          total: Number(saved.total_weighted_score),
          updatedAt: saved.updated_at,
        };
      }

      console.error("Failed to insert prelim score", error);
      return { ok: false, message: handleScoreError(error, "Gagal menyimpan nilai. Coba lagi.") };
    }

    if (!data || data.length === 0) {
      return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
    }

    const saved = data[0];
    revalidatePath("/judge");
    revalidatePath(`/judge/nilai/preliminary/${team_id}`);
    return {
      ok: true,
      total: Number(saved.total_weighted_score),
      updatedAt: saved.updated_at,
    };
  }

  // Final stage scoring
  const parsed = finalScoreInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nilai tidak valid." };
  }

  const { team_id, scores, feedback } = parsed.data;
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("final_scores")
    .select("id, locked_at")
    .eq("judge_id", caller.id)
    .eq("team_id", team_id)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to check existing final score", fetchError);
    return { ok: false, message: "Gagal memproses penilaian. Coba lagi." };
  }

  if (existing?.locked_at) {
    return { ok: false, message: "Nilai Anda sudah dikunci dan tidak dapat diubah lagi." };
  }

  const scoreData = {
    functionality_score: scores.functionality_score,
    case_study_fit_score: scores.case_study_fit_score,
    ui_ux_score: scores.ui_ux_score,
    code_quality_score: scores.code_quality_score,
    documentation_score: scores.documentation_score,
    presentation_qa_score: scores.presentation_qa_score,
    feedback: feedback ?? "",
  };

  if (existing) {
    const { data, error } = await supabase
      .from("final_scores")
      .update(scoreData)
      .eq("judge_id", caller.id)
      .eq("team_id", team_id)
      .select();

    if (error) {
      console.error("Failed to update final score", error);
      return { ok: false, message: handleScoreError(error, "Gagal memperbarui nilai. Coba lagi.") };
    }

    if (!data || data.length === 0) {
      return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
    }

    const saved = data[0];
    revalidatePath("/judge");
    revalidatePath(`/judge/nilai/final/${team_id}`);
    return {
      ok: true,
      total: Number(saved.total_weighted_score),
      updatedAt: saved.updated_at,
    };
  }

  // Insert new final score
  const { data, error } = await supabase
    .from("final_scores")
    .insert({
      judge_id: caller.id,
      team_id,
      ...scoreData,
    })
    .select();

  if (error) {
    if (error.code === "23505") {
      const { data: retryData, error: retryError } = await supabase
        .from("final_scores")
        .update(scoreData)
        .eq("judge_id", caller.id)
        .eq("team_id", team_id)
        .select();

      if (retryError || !retryData || retryData.length === 0) {
        return {
          ok: false,
          message: handleScoreError(retryError, "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini."),
        };
      }

      const saved = retryData[0];
      revalidatePath("/judge");
      revalidatePath(`/judge/nilai/final/${team_id}`);
      return {
        ok: true,
        total: Number(saved.total_weighted_score),
        updatedAt: saved.updated_at,
      };
    }

    console.error("Failed to insert final score", error);
    return { ok: false, message: handleScoreError(error, "Gagal menyimpan nilai. Coba lagi.") };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
  }

  const saved = data[0];
  revalidatePath("/judge");
  revalidatePath(`/judge/nilai/final/${team_id}`);
  return {
    ok: true,
    total: Number(saved.total_weighted_score),
    updatedAt: saved.updated_at,
  };
}

export type LockScoreResult = { ok: true; lockedAt: string } | { ok: false; message: string };

export async function lockScore(input: { tahap: "preliminary" | "final"; team_id: string }): Promise<LockScoreResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "judge") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const allowedStages = caller.judge_stage === "both" ? ["preliminary", "final"] : [caller.judge_stage];
  if (!allowedStages.includes(input.tahap)) {
    return { ok: false, message: "Tahap penilaian tidak sesuai dengan hak akses juri Anda." };
  }

  if (!input.team_id) {
    return { ok: false, message: "ID tim tidak valid." };
  }

  const lockedAt = new Date().toISOString();
  const supabase = await createClient();

  if (input.tahap === "preliminary") {
    const { data, error } = await supabase
      .from("preliminary_scores")
      .update({ locked_at: lockedAt })
      .eq("judge_id", caller.id)
      .eq("team_id", input.team_id)
      .is("locked_at", null)
      .select("locked_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to lock prelim score", error);
      return { ok: false, message: handleScoreError(error, "Gagal mengunci nilai. Coba lagi.") };
    }

    if (!data?.locked_at) {
      return { ok: false, message: "Nilai belum tersimpan atau sudah dikunci sebelumnya." };
    }

    revalidatePath("/judge");
    revalidatePath("/admin/peringkat");
    revalidatePath(`/judge/nilai/preliminary/${input.team_id}`);
    return { ok: true, lockedAt: data.locked_at };
  }

  const { data, error } = await supabase
    .from("final_scores")
    .update({ locked_at: lockedAt })
    .eq("judge_id", caller.id)
    .eq("team_id", input.team_id)
    .is("locked_at", null)
    .select("locked_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to lock final score", error);
    return { ok: false, message: handleScoreError(error, "Gagal mengunci nilai. Coba lagi.") };
  }

  if (!data?.locked_at) {
    return { ok: false, message: "Nilai belum tersimpan atau sudah dikunci sebelumnya." };
  }

  revalidatePath("/judge");
  revalidatePath("/admin/peringkat");
  revalidatePath(`/judge/nilai/final/${input.team_id}`);
  return { ok: true, lockedAt: data.locked_at };
}

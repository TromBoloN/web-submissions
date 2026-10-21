"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SaveScoreResult = { ok: true; total: number; updatedAt: string } | { ok: false; message: string };

const criterionScoreSchema = z.coerce
  .number()
  .min(0, "Nilai minimal 0.")
  .max(100, "Nilai maksimal 100.")
  .refine((val) => !Number.isNaN(val) && /^\d{1,3}(\.\d{1,2})?$/.test(val.toString()), {
    message: "Nilai maksimal memiliki 2 angka di belakang koma.",
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
  scores: Record<string, number>;
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
      .select("id")
      .eq("judge_id", caller.id)
      .eq("team_id", team_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to check existing prelim score", fetchError);
      return { ok: false, message: "Gagal memproses penilaian. Coba lagi." };
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
        if (error.code === "42501") {
          return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
        }
        console.error("Failed to update prelim score", error);
        return { ok: false, message: "Gagal memperbarui nilai. Coba lagi." };
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
          return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
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

      if (error.code === "42501") {
        return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
      }

      console.error("Failed to insert prelim score", error);
      return { ok: false, message: "Gagal menyimpan nilai. Coba lagi." };
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
    .select("id")
    .eq("judge_id", caller.id)
    .eq("team_id", team_id)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to check existing final score", fetchError);
    return { ok: false, message: "Gagal memproses penilaian. Coba lagi." };
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
      if (error.code === "42501") {
        return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
      }
      console.error("Failed to update final score", error);
      return { ok: false, message: "Gagal memperbarui nilai. Coba lagi." };
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
        return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
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

    if (error.code === "42501") {
      return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
    }

    console.error("Failed to insert final score", error);
    return { ok: false, message: "Gagal menyimpan nilai. Coba lagi." };
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

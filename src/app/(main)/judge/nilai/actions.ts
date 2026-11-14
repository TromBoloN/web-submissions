"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { logAuditEvent } from "@/lib/audit";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ScoreStatus = "draft" | "final";

export type SaveScoreResult =
  | { ok: true; total: number | null; updatedAt: string; status: ScoreStatus }
  | { ok: false; message: string };

async function logScoreChange(actorId: string, stage: "preliminary" | "final", teamId: string, action: string) {
  await logAuditEvent({
    actorId,
    action,
    targetType: `${stage}_score`,
    targetId: teamId,
    metadata: { stage },
  });
}

function handleScoreError(error: { code?: string; message?: string } | null, defaultMessage: string): string {
  const message = error?.message ?? "";
  if (error?.code === "P0001" && message.includes("recusal")) {
    return "Penilaian ditolak karena Anda telah mengajukan recusal untuk tim ini.";
  }
  if (error?.code === "P0001" || message.includes("hasil penilaian telah dirilis")) {
    return "Penilaian ini sudah dikunci karena hasil telah dirilis.";
  }
  if (error?.code === "23514") {
    return "Semua kriteria wajib diisi sebelum menyimpan nilai final.";
  }
  if (error?.code === "42501") {
    return "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini.";
  }
  return defaultMessage;
}

// Each criterion may be empty while saving a draft. Completeness is enforced
// per stage when the mode is "final".
const criterionScoreSchema = z
  .union([z.number(), z.string()])
  .superRefine((val, ctx) => {
    const raw = typeof val === "string" ? val.trim() : val;
    if (raw === "") return;

    const normalized = typeof raw === "string" ? raw.replace(",", ".") : String(raw);
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
    }
  })
  .transform((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? null : Number(trimmed.replace(",", "."));
    }
    return val;
  });

const scoreCommonShape = {
  mode: z.enum(["draft", "final"]),
  feedback: z.string().trim().max(2000, "Masukan maksimal 2000 karakter.").default(""),
  private_note: z.string().trim().max(2000, "Catatan pribadi maksimal 2000 karakter.").default(""),
};

function requireCompleteScores(scores: Record<string, number | null>, ctx: z.RefinementCtx) {
  for (const [key, value] of Object.entries(scores)) {
    if (value === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scores", key],
        message: "Semua kriteria wajib diisi sebelum menyimpan nilai final.",
      });
    }
  }
}

function requireAtLeastOneScore(scores: Record<string, number | null>, ctx: z.RefinementCtx) {
  if (Object.values(scores).every((value) => value === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scores"],
      message: "Isi minimal satu kriteria sebelum menyimpan draf.",
    });
  }
}

const prelimScoreInputSchema = z
  .object({
    tahap: z.literal("preliminary"),
    team_id: z.string().uuid("ID tim tidak valid."),
    ...scoreCommonShape,
    scores: z.object({
      functionality_score: criterionScoreSchema,
      case_study_fit_score: criterionScoreSchema,
      ui_ux_score: criterionScoreSchema,
      code_quality_score: criterionScoreSchema,
      documentation_score: criterionScoreSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "final") {
      requireCompleteScores(data.scores, ctx);
    } else {
      requireAtLeastOneScore(data.scores, ctx);
    }
  });

const finalScoreInputSchema = z
  .object({
    tahap: z.literal("final"),
    team_id: z.string().uuid("ID tim tidak valid."),
    ...scoreCommonShape,
    scores: z.object({
      functionality_score: criterionScoreSchema,
      case_study_fit_score: criterionScoreSchema,
      ui_ux_score: criterionScoreSchema,
      code_quality_score: criterionScoreSchema,
      documentation_score: criterionScoreSchema,
      presentation_qa_score: criterionScoreSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "final") {
      requireCompleteScores(data.scores, ctx);
    } else {
      requireAtLeastOneScore(data.scores, ctx);
    }
  });

export async function saveScore(input: {
  tahap: "preliminary" | "final";
  team_id: string;
  mode: ScoreStatus;
  scores: Record<string, number | string>;
  feedback?: string;
  private_note?: string;
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

    const { team_id, scores, feedback, private_note, mode } = parsed.data;
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
      private_note: private_note ? private_note : null,
      status: mode,
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
      await logScoreChange(caller.id, "preliminary", team_id, "score_changed");
      revalidatePath("/judge");
      revalidatePath("/admin/peringkat");
      revalidatePath(`/judge/nilai/preliminary/${team_id}`);
      return {
        ok: true,
        total: saved.total_weighted_score === null ? null : Number(saved.total_weighted_score),
        updatedAt: saved.updated_at,
        status: saved.status,
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
        await logScoreChange(caller.id, "preliminary", team_id, "score_changed");
        revalidatePath("/judge");
        revalidatePath("/admin/peringkat");
        revalidatePath(`/judge/nilai/preliminary/${team_id}`);
        return {
          ok: true,
          total: saved.total_weighted_score === null ? null : Number(saved.total_weighted_score),
          updatedAt: saved.updated_at,
          status: saved.status,
        };
      }

      console.error("Failed to insert prelim score", error);
      return { ok: false, message: handleScoreError(error, "Gagal menyimpan nilai. Coba lagi.") };
    }

    if (!data || data.length === 0) {
      return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
    }

    const saved = data[0];
    await logScoreChange(caller.id, "preliminary", team_id, "score_changed");
    revalidatePath("/judge");
    revalidatePath("/admin/peringkat");
    revalidatePath(`/judge/nilai/preliminary/${team_id}`);
    return {
      ok: true,
      total: saved.total_weighted_score === null ? null : Number(saved.total_weighted_score),
      updatedAt: saved.updated_at,
      status: saved.status,
    };
  }

  // Final stage scoring
  const parsed = finalScoreInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nilai tidak valid." };
  }

  const { team_id, scores, feedback, private_note, mode } = parsed.data;
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
    private_note: private_note ? private_note : null,
    status: mode,
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
    await logScoreChange(caller.id, "final", team_id, "score_changed");
    revalidatePath("/judge");
    revalidatePath("/admin/peringkat");
    revalidatePath(`/judge/nilai/final/${team_id}`);
    return {
      ok: true,
      total: saved.total_weighted_score === null ? null : Number(saved.total_weighted_score),
      updatedAt: saved.updated_at,
      status: saved.status,
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
      await logScoreChange(caller.id, "final", team_id, "score_changed");
      revalidatePath("/judge");
      revalidatePath("/admin/peringkat");
      revalidatePath(`/judge/nilai/final/${team_id}`);
      return {
        ok: true,
        total: saved.total_weighted_score === null ? null : Number(saved.total_weighted_score),
        updatedAt: saved.updated_at,
        status: saved.status,
      };
    }

    console.error("Failed to insert final score", error);
    return { ok: false, message: handleScoreError(error, "Gagal menyimpan nilai. Coba lagi.") };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "Penilaian ditolak. Tim tidak dapat dinilai pada tahap ini." };
  }

  const saved = data[0];
  await logScoreChange(caller.id, "final", team_id, "score_changed");
  revalidatePath("/judge");
  revalidatePath("/admin/peringkat");
  revalidatePath(`/judge/nilai/final/${team_id}`);
  return {
    ok: true,
    total: saved.total_weighted_score === null ? null : Number(saved.total_weighted_score),
    updatedAt: saved.updated_at,
    status: saved.status,
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
      .update({ locked_at: lockedAt, status: "final" })
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

    await logScoreChange(caller.id, "preliminary", input.team_id, "score_locked");
    revalidatePath("/judge");
    revalidatePath("/admin/peringkat");
    revalidatePath(`/judge/nilai/preliminary/${input.team_id}`);
    return { ok: true, lockedAt: data.locked_at };
  }

  const { data, error } = await supabase
    .from("final_scores")
    .update({ locked_at: lockedAt, status: "final" })
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

  await logScoreChange(caller.id, "final", input.team_id, "score_locked");
  revalidatePath("/judge");
  revalidatePath("/admin/peringkat");
  revalidatePath(`/judge/nilai/final/${input.team_id}`);
  return { ok: true, lockedAt: data.locked_at };
}

export type RecusalResult = { ok: true } | { ok: false; message: string };

const recusalInputSchema = z.object({
  tahap: z.enum(["preliminary", "final"]),
  team_id: z.string().uuid("ID tim tidak valid."),
  reason: z.string().trim().min(1, "Alasan recusal wajib diisi.").max(2000, "Alasan recusal maksimal 2000 karakter."),
});

const recusalCancelSchema = z.object({
  tahap: z.enum(["preliminary", "final"]),
  team_id: z.string().uuid("ID tim tidak valid."),
});

function handleRecusalError(error: { code?: string; message?: string } | null, defaultMessage: string): string {
  const message = error?.message ?? "";
  if (error?.code === "23505") {
    return "Anda sudah mengajukan recusal untuk tim ini.";
  }
  if (message.includes("sudah memiliki skor final")) {
    return "Recusal ditolak karena Anda sudah menyimpan nilai final untuk tim ini.";
  }
  if (message.includes("dirilis")) {
    return "Recusal tidak dapat diubah karena hasil penilaian telah dirilis.";
  }
  if (error?.code === "42501") {
    return "Recusal ditolak. Tim ini tidak dapat dinilai pada tahap tersebut.";
  }
  return defaultMessage;
}

function revalidateRecusalPaths(tahap: "preliminary" | "final", teamId: string) {
  revalidatePath("/judge");
  revalidatePath("/admin/peringkat");
  revalidatePath("/admin/pengaturan/hasil");
  revalidatePath(`/judge/nilai/${tahap}/${teamId}`);
}

export async function createRecusal(input: {
  tahap: "preliminary" | "final";
  team_id: string;
  reason: string;
}): Promise<RecusalResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "judge") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const allowedStages = caller.judge_stage === "both" ? ["preliminary", "final"] : [caller.judge_stage];
  if (!allowedStages.includes(input.tahap)) {
    return { ok: false, message: "Tahap penilaian tidak sesuai dengan hak akses juri Anda." };
  }

  const parsed = recusalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data recusal tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("judge_recusals")
    .insert({
      judge_id: caller.id,
      team_id: parsed.data.team_id,
      stage: parsed.data.tahap,
      reason: parsed.data.reason,
    })
    .select("id");

  if (error) {
    console.error("Failed to create recusal", error);
    return { ok: false, message: handleRecusalError(error, "Gagal menyimpan recusal. Coba lagi.") };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "Recusal ditolak. Tim ini tidak dapat dinilai pada tahap tersebut." };
  }

  revalidateRecusalPaths(parsed.data.tahap, parsed.data.team_id);
  return { ok: true };
}

export async function cancelRecusal(input: {
  tahap: "preliminary" | "final";
  team_id: string;
}): Promise<RecusalResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "judge") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const allowedStages = caller.judge_stage === "both" ? ["preliminary", "final"] : [caller.judge_stage];
  if (!allowedStages.includes(input.tahap)) {
    return { ok: false, message: "Tahap penilaian tidak sesuai dengan hak akses juri Anda." };
  }

  const parsed = recusalCancelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data recusal tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("judge_recusals")
    .delete()
    .eq("judge_id", caller.id)
    .eq("team_id", parsed.data.team_id)
    .eq("stage", parsed.data.tahap)
    .select("id");

  if (error) {
    console.error("Failed to cancel recusal", error);
    return { ok: false, message: handleRecusalError(error, "Gagal membatalkan recusal. Coba lagi.") };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "Recusal tidak ditemukan atau sudah tidak dapat dibatalkan." };
  }

  revalidateRecusalPaths(parsed.data.tahap, parsed.data.team_id);
  return { ok: true };
}

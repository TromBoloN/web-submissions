// NOTE: Rubric weights and column names defined here MUST match the database's generated columns
// in public.preliminary_scores and public.final_scores (see supabase/migrations/20261020000000_init_schema.sql).

export type ScoringStage = "preliminary" | "final";

export interface RubricCriterion {
  column: string;
  label: string;
  weight: number; // Percentage (e.g. 35 for 35%)
  indicator: string;
}

export const PRELIMINARY_RUBRIC: readonly RubricCriterion[] = [
  {
    column: "functionality_score",
    label: "Fungsionalitas",
    weight: 35,
    indicator: "Kelengkapan fitur aplikasi, keandalan sistem, dan pemenuhan spesifikasi teknis.",
  },
  {
    column: "case_study_fit_score",
    label: "Kesesuaian Studi Kasus",
    weight: 25,
    indicator: "Kesesuaian dan efektivitas solusi web terhadap permasalahan pada studi kasus.",
  },
  {
    column: "ui_ux_score",
    label: "UI/UX",
    weight: 20,
    indicator: "Kemudahan navigasi, responsivitas tampilan antarmuka, dan estetika desain pengguna.",
  },
  {
    column: "code_quality_score",
    label: "Kualitas Kode & Pemeliharaan",
    weight: 10,
    indicator: "Struktur kerapian kode sumber, modularitas, dan kemudahan pemeliharaan (maintainability).",
  },
  {
    column: "documentation_score",
    label: "Dokumentasi",
    weight: 10,
    indicator: "Kelengkapan panduan instalasi, kejelasan README repositori, dan dokumentasi alur solusi.",
  },
] as const;

export const FINAL_RUBRIC: readonly RubricCriterion[] = [
  {
    column: "functionality_score",
    label: "Fungsionalitas",
    weight: 25,
    indicator: "Kelengkapan fitur aplikasi, keandalan sistem, dan pemenuhan spesifikasi teknis.",
  },
  {
    column: "case_study_fit_score",
    label: "Kesesuaian Studi Kasus",
    weight: 20,
    indicator: "Kesesuaian dan efektivitas solusi web terhadap permasalahan pada studi kasus.",
  },
  {
    column: "ui_ux_score",
    label: "UI/UX",
    weight: 15,
    indicator: "Kemudahan navigasi, responsivitas tampilan antarmuka, dan estetika desain pengguna.",
  },
  {
    column: "code_quality_score",
    label: "Kualitas Kode & Pemeliharaan",
    weight: 10,
    indicator: "Struktur kerapian kode sumber, modularitas, dan kemudahan pemeliharaan (maintainability).",
  },
  {
    column: "documentation_score",
    label: "Dokumentasi",
    weight: 10,
    indicator: "Kelengkapan panduan instalasi, kejelasan README repositori, dan dokumentasi alur solusi.",
  },
  {
    column: "presentation_qa_score",
    label: "Presentasi & Tanya Jawab",
    weight: 20,
    indicator: "Kejelasan pemaparan solusi, demonstrasi karya, dan ketepatan menjawab pertanyaan dewan juri.",
  },
] as const;

export function getRubricForStage(stage: ScoringStage): readonly RubricCriterion[] {
  return stage === "preliminary" ? PRELIMINARY_RUBRIC : FINAL_RUBRIC;
}

/**
 * Calculates the weighted total score for a given stage based on the rubric criteria.
 * Returns the rounded total with 2 decimal places.
 */
export function calcWeightedTotal(
  stage: ScoringStage,
  scores: Record<string, number | string | undefined | null>,
): number {
  const rubric = getRubricForStage(stage);
  let total = 0;

  for (const criterion of rubric) {
    const rawVal = scores[criterion.column];
    const val = typeof rawVal === "number" ? rawVal : Number(rawVal);
    if (!Number.isNaN(val) && rawVal !== null && rawVal !== undefined && rawVal !== "") {
      total += val * (criterion.weight / 100);
    }
  }

  return Math.round(total * 100) / 100;
}

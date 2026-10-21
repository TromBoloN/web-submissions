// NOTE: Rubric weights and column names defined here MUST match the database's generated columns
// in public.preliminary_scores and public.final_scores (see supabase/migrations/20261020000000_init_schema.sql).

export type ScoringStage = "preliminary" | "final";

export interface RubricCriterion {
  column: string;
  label: string;
  weight: number; // Percentage (e.g. 35 for 35%)
}

export const PRELIMINARY_RUBRIC: readonly RubricCriterion[] = [
  { column: "functionality_score", label: "Fungsionalitas", weight: 35 },
  { column: "case_study_fit_score", label: "Kesesuaian studi kasus", weight: 25 },
  { column: "ui_ux_score", label: "UI/UX", weight: 20 },
  { column: "code_quality_score", label: "Kualitas kode & maintainability", weight: 10 },
  { column: "documentation_score", label: "Dokumentasi", weight: 10 },
] as const;

export const FINAL_RUBRIC: readonly RubricCriterion[] = [
  { column: "functionality_score", label: "Fungsionalitas", weight: 25 },
  { column: "case_study_fit_score", label: "Kesesuaian studi kasus", weight: 20 },
  { column: "ui_ux_score", label: "UI/UX", weight: 15 },
  { column: "code_quality_score", label: "Kualitas kode & maintainability", weight: 10 },
  { column: "documentation_score", label: "Dokumentasi", weight: 10 },
  { column: "presentation_qa_score", label: "Presentasi & Tanya Jawab", weight: 20 },
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

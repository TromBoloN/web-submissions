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
    indicator:
      "Kelengkapan dan keberjalanan fitur yang dikembangkan serta kemampuan aplikasi dalam menjalankan fungsi sesuai tujuan yang ditetapkan.",
  },
  {
    column: "case_study_fit_score",
    label: "Kesesuaian dengan Studi Kasus",
    weight: 25,
    indicator:
      "Kesesuaian produk dengan tema dan studi kasus yang diberikan serta kemampuan solusi dalam menjawab permasalahan yang ditetapkan.",
  },
  {
    column: "ui_ux_score",
    label: "UI/UX",
    weight: 20,
    indicator:
      "Kualitas antarmuka, kemudahan navigasi, kejelasan alur penggunaan, responsivitas, dan pengalaman pengguna.",
  },
  {
    column: "code_quality_score",
    label: "Kualitas Kode & Pemeliharaan",
    weight: 10,
    indicator:
      "Kerapian dan keteraturan kode, struktur proyek, penggunaan komponen, serta kemudahan kode untuk dipahami, dipelihara, dan dikembangkan oleh pengembang lain.",
  },
  {
    column: "documentation_score",
    label: "Dokumentasi",
    weight: 10,
    indicator: "Kelengkapan dan kejelasan README.md serta dokumentasi teknis yang disediakan oleh peserta.",
  },
] as const;

export const FINAL_RUBRIC: readonly RubricCriterion[] = [
  {
    column: "functionality_score",
    label: "Fungsionalitas",
    weight: 25,
    indicator:
      "Kelengkapan dan keberjalanan fitur yang dikembangkan serta kemampuan aplikasi dalam menjalankan fungsi sesuai tujuan yang ditetapkan.",
  },
  {
    column: "case_study_fit_score",
    label: "Kesesuaian dengan Studi Kasus",
    weight: 20,
    indicator:
      "Kesesuaian produk dengan tema dan studi kasus yang diberikan serta kemampuan solusi dalam menjawab permasalahan yang ditetapkan.",
  },
  {
    column: "ui_ux_score",
    label: "UI/UX",
    weight: 15,
    indicator:
      "Kualitas antarmuka, kemudahan navigasi, kejelasan alur penggunaan, responsivitas, dan pengalaman pengguna.",
  },
  {
    column: "code_quality_score",
    label: "Kualitas Kode & Pemeliharaan",
    weight: 10,
    indicator:
      "Kerapian dan keteraturan kode, struktur proyek, penggunaan komponen, serta kemudahan kode untuk dipahami, dipelihara, dan dikembangkan oleh pengembang lain.",
  },
  {
    column: "documentation_score",
    label: "Dokumentasi",
    weight: 10,
    indicator: "Kelengkapan dan kejelasan README.md serta dokumentasi teknis yang disediakan oleh peserta.",
  },
  {
    column: "presentation_qa_score",
    label: "Presentasi dan Q&A",
    weight: 20,
    indicator:
      "Kemampuan menjelaskan produk, fitur, dan tujuan pengembangan dengan jelas; menjelaskan implementasi dan keputusan pengembangan; penguasaan terhadap produk dan teknologi yang digunakan; menjawab pertanyaan dan mempertanggungjawabkan keputusan selama pengembangan.",
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

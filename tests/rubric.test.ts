import { describe, expect, it } from "vitest";

import { calcWeightedTotal, FINAL_RUBRIC, PRELIMINARY_RUBRIC } from "@/lib/rubric";

describe("rubric calculations", () => {
  it("keeps each stage's rubric weights at 100 percent", () => {
    expect(PRELIMINARY_RUBRIC.reduce((total, criterion) => total + criterion.weight, 0)).toBe(100);
    expect(FINAL_RUBRIC.reduce((total, criterion) => total + criterion.weight, 0)).toBe(100);
  });

  it("calculates a preliminary weighted total", () => {
    expect(
      calcWeightedTotal("preliminary", {
        functionality_score: 10,
        case_study_fit_score: 8,
        ui_ux_score: 7,
        code_quality_score: 9,
        documentation_score: 6,
      }),
    ).toBe(8.4);
  });

  it("calculates a final weighted total and accepts decimal strings", () => {
    expect(
      calcWeightedTotal("final", {
        functionality_score: "9,5",
        case_study_fit_score: "8.5",
        ui_ux_score: 8,
        code_quality_score: 7,
        documentation_score: 6,
        presentation_qa_score: 9,
      }),
    ).toBe(8.38);
  });

  it("ignores missing criteria while preserving two-decimal rounding", () => {
    expect(
      calcWeightedTotal("preliminary", {
        functionality_score: 7.777,
        case_study_fit_score: null,
        ui_ux_score: undefined,
        code_quality_score: "",
      }),
    ).toBe(2.72);
  });
});

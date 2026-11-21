import { describe, expect, it } from "vitest";

import { buildScoreMarkdown } from "@/lib/score-markdown";

describe("buildScoreMarkdown", () => {
  it("renders categories, judge, total and comment per team", () => {
    const md = buildScoreMarkdown({
      stage: "preliminary",
      generatedAt: "2026-11-17 10:00:00",
      formatDate: () => "2026-11-16 09:00:00",
      teams: [
        {
          rank: 1,
          team_code: "T01",
          team_name: "Alpha | Beta",
          avg_score: 8.4,
          judges: [
            {
              judge_name: "Juri A",
              scores: {
                functionality_score: 10,
                case_study_fit_score: 8,
                ui_ux_score: 7,
                code_quality_score: 9,
                documentation_score: 6,
              },
              total_weighted_score: 8.4,
              feedback: "Bagus.\nPerbaiki README.",
              updated_at: "2026-11-16T01:00:00Z",
            },
          ],
        },
      ],
    });

    expect(md).toContain("## #1 · T01 — Alpha | Beta");
    expect(md).toContain("### Juri A");
    expect(md).toContain("| Fungsionalitas (35%) | 10 |");
    expect(md).toContain("| **Total berbobot** | **8.4** |");
    expect(md).toContain("> Bagus.\n> Perbaiki README.");
  });

  it("lists sanctions with the pre-sanction average", () => {
    const md = buildScoreMarkdown({
      stage: "preliminary",
      generatedAt: "x",
      formatDate: (s) => s,
      teams: [
        {
          rank: 1,
          team_code: "T02",
          team_name: "Gamma",
          avg_score: 5,
          raw_avg_score: 8.5,
          sanctions: [{ criterion: "ui_ux_score", points: 10, reason: "Plagiat aset | tanpa izin" }],
          judges: [],
        },
      ],
    });

    expect(md).toContain("Rata-rata skor berbobot: **5** (sebelum sanksi: 8.5)");
    expect(md).toContain("### Sanksi Panitia");
    expect(md).toContain("| UI/UX | −10 | Plagiat aset \\| tanpa izin |");
  });

  it("notes when there are no final scores", () => {
    const md = buildScoreMarkdown({ stage: "final", generatedAt: "x", formatDate: (s) => s, teams: [] });
    expect(md).toContain("Belum ada nilai final");
    expect(md).toContain("Presentasi dan Q&A");
  });
});

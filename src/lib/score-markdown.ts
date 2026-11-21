import { getRubricForStage, type ScoringStage } from "@/lib/rubric";

export interface ScoreMarkdownJudgeScore {
  judge_name: string;
  scores: Record<string, number | null | undefined>;
  total_weighted_score: number | null;
  feedback: string | null;
  updated_at: string;
}

export interface ScoreMarkdownSanction {
  criterion: string;
  points: number;
  reason: string;
}

export interface ScoreMarkdownTeam {
  rank: number | null;
  team_code: string;
  team_name: string;
  /** After sanctions. */
  avg_score: number | null;
  /** Before sanctions; only shown when it differs from avg_score. */
  raw_avg_score?: number | null;
  sanctions?: ScoreMarkdownSanction[];
  judges: ScoreMarkdownJudgeScore[];
}

export interface ScoreMarkdownInput {
  stage: ScoringStage;
  generatedAt: string; // already formatted (WITA)
  teams: ScoreMarkdownTeam[];
  formatDate: (iso: string) => string;
}

const STAGE_LABEL: Record<ScoringStage, string> = {
  preliminary: "Babak Awal",
  final: "Babak Final",
};

/** Keep user-provided text on one line so it can't break a heading. */
function oneLine(text: string): string {
  return text.replace(/\r?\n+/g, " ").trim();
}

/** One line plus escaped pipes, for table cells. */
function cell(text: string): string {
  return oneLine(text).replace(/\|/g, "\\|");
}

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value)
    .toFixed(2)
    .replace(/\.?0+$/, "");
}

function quote(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");
}

export function buildScoreMarkdown({ stage, generatedAt, teams, formatDate }: ScoreMarkdownInput): string {
  const rubric = getRubricForStage(stage);
  const out: string[] = [];

  out.push(`# Rekap Nilai Juri — ${STAGE_LABEL[stage]}`, "");
  out.push(`Dibuat: ${generatedAt} WITA  `);
  out.push(`Hanya nilai berstatus **final** yang disertakan.`, "");

  out.push("## Kriteria Penilaian", "");
  out.push("| Kriteria | Bobot |", "| --- | ---: |");
  for (const c of rubric) out.push(`| ${c.label} | ${c.weight}% |`);
  out.push("");

  if (teams.length === 0) {
    out.push("_Belum ada nilai final untuk tahap ini._", "");
    return out.join("\n");
  }

  out.push("## Ringkasan Peringkat", "");
  out.push("| Peringkat | Tim | Jumlah Juri | Rata-rata |", "| ---: | --- | ---: | ---: |");
  for (const t of teams) {
    out.push(
      `| ${t.rank ?? "-"} | ${cell(t.team_code)} — ${cell(t.team_name)} | ${t.judges.length} | ${fmt(t.avg_score)} |`,
    );
  }
  out.push("");

  for (const t of teams) {
    out.push("---", "");
    const rankPrefix = t.rank ? `#${t.rank} · ` : "";
    out.push(`## ${rankPrefix}${oneLine(t.team_code)} — ${oneLine(t.team_name)}`, "");
    const sanctions = t.sanctions ?? [];
    const hasRaw = sanctions.length > 0 && t.raw_avg_score !== undefined && t.raw_avg_score !== null;
    out.push(
      `Rata-rata skor berbobot: **${fmt(t.avg_score)}**${hasRaw ? ` (sebelum sanksi: ${fmt(t.raw_avg_score)})` : ""}`,
      "",
    );

    if (sanctions.length > 0) {
      out.push("### Sanksi Panitia", "");
      out.push("| Kriteria | Pengurangan | Alasan |", "| --- | ---: | --- |");
      for (const s of sanctions) {
        const label = rubric.find((c) => c.column === s.criterion)?.label ?? s.criterion;
        out.push(`| ${cell(label)} | −${fmt(s.points)} | ${cell(s.reason)} |`);
      }
      out.push("");
    }

    if (t.judges.length === 0) {
      out.push("_Belum ada nilai final dari juri._", "");
      continue;
    }

    for (const j of t.judges) {
      out.push(`### ${oneLine(j.judge_name)}`, "");
      out.push("| Kriteria | Nilai |", "| --- | ---: |");
      for (const c of rubric) {
        out.push(`| ${c.label} (${c.weight}%) | ${fmt(j.scores[c.column])} |`);
      }
      out.push(`| **Total berbobot** | **${fmt(j.total_weighted_score)}** |`, "");
      out.push(`**Komentar** · _${formatDate(j.updated_at)} WITA_`, "");
      out.push(j.feedback?.trim() ? quote(j.feedback) : "> _Tidak ada komentar._", "");
    }
  }

  return out.join("\n");
}

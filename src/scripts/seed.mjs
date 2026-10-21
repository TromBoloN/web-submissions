// Seeder / un-seeder for MIT-WEEK 2026 test data.
//
//   npm run seed         -> creates fake judges, teams, submissions and scores
//   npm run seed:clear   -> deletes everything the seeder created
//
// Everything created here uses the email domain below. Deleting an auth user
// cascades to profiles -> teams -> submissions -> scores (ON DELETE CASCADE),
// so "clear" only needs to delete those auth users.
//
// NEVER use this email domain for real accounts.

import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { createClient } from "@supabase/supabase-js";

const SEED_DOMAIN = "@seed.mitweek.test";
const TEAM_CODE_PREFIX = "SEED-";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedPassword = process.env.SEED_PASSWORD;
const command = process.argv[2];

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local.");
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function confirm(message) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(`${message} Ketik "ya" untuk lanjut: `)).trim().toLowerCase();
  rl.close();
  return answer === "ya";
}

// Deterministic pseudo-random numbers so every seed run produces the same scores.
function makeRandom(seed) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(2026);
const randomScore = () => Math.round((55 + random() * 43) * 100) / 100;

// ---------------------------------------------------------------------------
// Data definition
// ---------------------------------------------------------------------------
const judges = [
  { email: `juri.awal${SEED_DOMAIN}`, name: "Juri Awal (Seed)", stage: "preliminary" },
  { email: `juri.final${SEED_DOMAIN}`, name: "Juri Final (Seed)", stage: "final" },
  { email: `juri.both${SEED_DOMAIN}`, name: "Juri Awal & Final (Seed)", stage: "both" },
];

// submission: "submitted" | "draft" | "none"
const teamDefs = [
  { n: 1, name: "Tim Alfa", submission: "submitted", finalist: true },
  { n: 2, name: "Tim Bravo", submission: "submitted", finalist: true },
  { n: 3, name: "Tim Charlie", submission: "submitted", finalist: true },
  { n: 4, name: "Tim Delta", submission: "submitted" },
  { n: 5, name: "Tim Echo", submission: "submitted" },
  { n: 6, name: "Tim Foxtrot", submission: "submitted", onlyOnePrelimJudge: true },
  { n: 7, name: "Tim Golf", submission: "submitted", disqualified: true },
  { n: 8, name: "Tim Hotel", submission: "draft" },
  { n: 9, name: "Tim India", submission: "none" },
  { n: 10, name: "Tim Juliet", submission: "none" },
];

const pad = (n) => String(n).padStart(3, "0");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function listSeedUsers() {
  const found = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    found.push(...data.users.filter((u) => u.email?.endsWith(SEED_DOMAIN)));
    if (data.users.length < 1000) break;
  }
  return found;
}

async function createAuthUser(email) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: seedPassword,
    email_confirm: true,
  });
  if (error) throw new Error(`Gagal membuat user ${email}: ${error.message}`);
  return data.user.id;
}

function check(error, label) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------
async function clearSeed({ ask }) {
  const users = await listSeedUsers();
  if (users.length === 0) {
    console.log("Tidak ada data seed yang ditemukan. Tidak ada yang dihapus.");
    return;
  }

  // Safety: never delete anything that looks like a real admin account.
  const { data: admins, error: adminError } = await sb
    .from("profiles")
    .select("email")
    .in(
      "id",
      users.map((u) => u.id),
    )
    .eq("role", "admin");
  check(adminError, "Gagal memeriksa role admin");
  if (admins && admins.length > 0) {
    console.error(
      `Dibatalkan: akun admin memakai domain seed (${admins.map((a) => a.email).join(", ")}). Hapus domain seed dari akun tersebut dulu.`,
    );
    process.exit(1);
  }

  if (ask) {
    const host = new URL(url).host;
    console.log(`Target project: ${host}`);
    console.log(`Akan menghapus ${users.length} akun seed (${SEED_DOMAIN}) beserta tim, submission, dan nilainya.`);
    if (!(await confirm("Lanjutkan?"))) {
      console.log("Dibatalkan.");
      return;
    }
  }

  for (const user of users) {
    const { error } = await sb.auth.admin.deleteUser(user.id);
    check(error, `Gagal menghapus ${user.email}`);
  }

  const { count: profileCount } = await sb
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .like("email", `%${SEED_DOMAIN}`);
  const { count: teamCount } = await sb
    .from("teams")
    .select("id", { count: "exact", head: true })
    .like("team_code", `${TEAM_CODE_PREFIX}%`);

  console.log(`Selesai. Sisa profil seed: ${profileCount ?? "?"}, sisa tim seed: ${teamCount ?? "?"} (harus 0).`);
}

// ---------------------------------------------------------------------------
// seed
// ---------------------------------------------------------------------------
async function runSeed() {
  const existing = await listSeedUsers();
  if (existing.length > 0) {
    console.error("Data seed sudah ada. Jalankan `npm run seed:clear` dulu.");
    process.exit(1);
  }

  const host = new URL(url).host;
  console.log(`Target project: ${host}`);
  console.log(`Akan membuat ${judges.length} juri dan ${teamDefs.length} tim contoh (${SEED_DOMAIN}).`);
  if (!(await confirm("Lanjutkan?"))) {
    console.log("Dibatalkan.");
    return;
  }

  // 1. Auth users + profiles
  const judgeIds = {};
  const profileRows = [];
  for (const judge of judges) {
    const id = await createAuthUser(judge.email);
    judgeIds[judge.stage] = id;
    profileRows.push({
      id,
      email: judge.email,
      full_name: judge.name,
      role: "judge",
      judge_stage: judge.stage,
    });
  }

  const teamProfileIds = {};
  for (const def of teamDefs) {
    const email = `tim${pad(def.n)}${SEED_DOMAIN}`;
    const id = await createAuthUser(email);
    teamProfileIds[def.n] = id;
    profileRows.push({
      id,
      email,
      full_name: `Ketua ${def.name}`,
      role: "team",
      judge_stage: null,
    });
  }

  const { error: profileError } = await sb.from("profiles").insert(profileRows);
  check(profileError, "Gagal menyimpan profil");

  // 2. Teams
  const teamRows = teamDefs.map((def) => ({
    profile_id: teamProfileIds[def.n],
    team_code: `${TEAM_CODE_PREFIX}${pad(def.n)}`,
    team_name: `${def.name} (Seed)`,
    institution: "Universitas Contoh",
    leader_name: `Ketua ${def.name}`,
    members: [`Ketua ${def.name}`, `Anggota ${def.name}`],
    is_finalist: Boolean(def.finalist),
    is_disqualified: Boolean(def.disqualified),
  }));
  const { data: insertedTeams, error: teamError } = await sb.from("teams").insert(teamRows).select("id, team_code");
  check(teamError, "Gagal menyimpan tim");

  const teamIdByNumber = {};
  for (const def of teamDefs) {
    const row = insertedTeams.find((t) => t.team_code === `${TEAM_CODE_PREFIX}${pad(def.n)}`);
    teamIdByNumber[def.n] = row.id;
  }

  // 3. Submissions
  const submissionRows = [];
  for (const def of teamDefs) {
    if (def.submission === "none") continue;
    const base = `${pad(def.n)}`;
    submissionRows.push({
      team_id: teamIdByNumber[def.n],
      github_url: `https://github.com/example/seed-${base}`,
      live_demo_url: def.submission === "submitted" ? `https://example.com/seed/${base}` : "",
      video_url: def.submission === "submitted" ? `https://example.com/seed/${base}/video` : "",
      status: def.submission,
    });
  }
  const { error: submissionError } = await sb.from("submissions").insert(submissionRows);
  check(submissionError, "Gagal menyimpan submission");

  // 4. Preliminary scores: submitted, non-disqualified teams
  const prelimJudges = [judgeIds.preliminary, judgeIds.both];
  const prelimRows = [];
  for (const def of teamDefs) {
    if (def.submission !== "submitted" || def.disqualified) continue;
    const scorers = def.onlyOnePrelimJudge ? [prelimJudges[0]] : prelimJudges;
    for (const judgeId of scorers) {
      prelimRows.push({
        judge_id: judgeId,
        team_id: teamIdByNumber[def.n],
        functionality_score: randomScore(),
        case_study_fit_score: randomScore(),
        ui_ux_score: randomScore(),
        code_quality_score: randomScore(),
        documentation_score: randomScore(),
        feedback: "Data contoh (seed).",
      });
    }
  }
  const { error: prelimError } = await sb.from("preliminary_scores").insert(prelimRows);
  check(prelimError, "Gagal menyimpan nilai babak awal");

  // 5. Final scores: finalists
  const finalJudges = [judgeIds.final, judgeIds.both];
  const finalRows = [];
  for (const def of teamDefs) {
    if (!def.finalist) continue;
    for (const judgeId of finalJudges) {
      finalRows.push({
        judge_id: judgeId,
        team_id: teamIdByNumber[def.n],
        functionality_score: randomScore(),
        case_study_fit_score: randomScore(),
        ui_ux_score: randomScore(),
        code_quality_score: randomScore(),
        documentation_score: randomScore(),
        presentation_qa_score: randomScore(),
        feedback: "Data contoh (seed).",
      });
    }
  }
  const { error: finalError } = await sb.from("final_scores").insert(finalRows);
  check(finalError, "Gagal menyimpan nilai final");

  console.log("\nSeed selesai. Akun yang dibuat (kata sandi = nilai SEED_PASSWORD di .env.local):");
  for (const row of profileRows) {
    console.log(`  ${row.role.padEnd(5)}  ${row.email}`);
  }
  console.log("\nJangan biarkan data seed ada saat kompetisi berjalan. Hapus dengan: npm run seed:clear");
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  if (command === "clear") {
    await clearSeed({ ask: true });
    return;
  }

  if (command === "seed") {
    if (!seedPassword || seedPassword.length < 12) {
      console.error("Isi SEED_PASSWORD di .env.local (minimal 12 karakter) sebelum menjalankan seed.");
      process.exit(1);
    }
    try {
      await runSeed();
    } catch (error) {
      console.error(`\nSeed gagal: ${error.message}`);
      console.error("Membersihkan data seed yang sudah terlanjur dibuat...");
      await clearSeed({ ask: false });
      process.exit(1);
    }
    return;
  }

  console.error('Perintah tidak dikenal. Gunakan "seed" atau "clear".');
  process.exit(1);
}

await main();

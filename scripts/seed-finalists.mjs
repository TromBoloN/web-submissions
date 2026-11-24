// Finalist test data for the LOCAL Docker stack only (npm run local:up / local:restore first).
//
//   npm run seed:finalists -- seed                     top 5 of preliminary_ranking -> finalists, 2 final judges
//   npm run seed:finalists -- seed --notice            ... and publish the finalist notice
//   npm run seed:finalists -- seed --scores            ... and give every finalist final-status final scores
//   npm run seed:finalists -- clear                    delete the seeded final judges (their scores cascade)
//
// Supabase keys come ONLY from .env.docker.local and the URL must be localhost, so production is never touched.
// Only SEED_PASSWORD is read from the environment, .env.local or .env (no other keys are loaded from them).
// Finalist flags and the notice are not reverted by "clear": run `npm run local:restore` for a full reset.

import { createClient } from "@supabase/supabase-js";

import fs from "node:fs";

const ENV_FILE = ".env.docker.local";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const SEED_DOMAIN = "@seed.mitweek.test";
const FINALIST_SLOTS = 5;
const FINAL_JUDGES = [
  { email: `juri.final1${SEED_DOMAIN}`, name: "Juri Final 1 (Seed)" },
  { email: `juri.final2${SEED_DOMAIN}`, name: "Juri Final 2 (Seed)" },
];

const [command, ...flags] = process.argv.slice(2);
const withNotice = flags.includes("--notice");
const withScores = flags.includes("--scores");

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function readEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

// --- Target: local stack only -----------------------------------------------
const dockerEnv = readEnvFile(ENV_FILE);
const url = dockerEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = dockerEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  fail(`${ENV_FILE} tidak ditemukan atau tidak lengkap. Jalankan dulu: npm run local:up`);
}
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  // reported below
}
if (!LOCAL_HOSTS.has(host)) {
  fail(`Target bukan lokal (${url}). Dibatalkan agar produksi tidak tersentuh.`);
}

const seedPassword =
  process.env.SEED_PASSWORD || readEnvFile(".env.local").SEED_PASSWORD || readEnvFile(".env").SEED_PASSWORD;

const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function check(error, label) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

// Deterministic scores so every run gives the same final ranking.
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
const random = makeRandom(2611);
const randomScore = () => Math.round((60 + random() * 38) * 100) / 100;

async function findSeedJudges() {
  const wanted = new Set(FINAL_JUDGES.map((j) => j.email));
  const found = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    check(error, "Gagal membaca akun");
    found.push(...data.users.filter((u) => u.email && wanted.has(u.email)));
    if (data.users.length < 1000) break;
  }
  return found;
}

// --- seed ---------------------------------------------------------------------
async function seed() {
  if (!seedPassword || seedPassword.length < 12) {
    fail("SEED_PASSWORD (minimal 12 karakter) wajib ada di environment, .env.local, atau .env.");
  }

  // 1. Current top 5 (same rule as Admin > Peringkat > "Tetapkan 5 teratas")
  const { data: ranking, error: rankingError } = await sb
    .from("preliminary_ranking")
    .select("team_id, team_code, team_name, rank, avg_score")
    .order("rank", { ascending: true })
    .order("team_code", { ascending: true });
  check(rankingError, "Gagal membaca preliminary_ranking");

  const ranked = (ranking ?? []).filter((r) => r.team_id && r.rank !== null);
  if (ranked.length < FINALIST_SLOTS) {
    fail(`Baru ${ranked.length} tim yang memiliki nilai final babak awal. Dibutuhkan minimal ${FINALIST_SLOTS}.`);
  }
  const cutoff = ranked[FINALIST_SLOTS - 1];
  const next = ranked[FINALIST_SLOTS];
  const inTopRanks = ranked.filter((r) => r.rank <= cutoff.rank).length;
  if (inTopRanks > FINALIST_SLOTS || (next && next.avg_score === cutoff.avg_score)) {
    fail("Ada nilai seri di batas peringkat 5. Tetapkan finalis manual di halaman Tim.");
  }
  const top = ranked.slice(0, FINALIST_SLOTS);
  const topIds = top.map((r) => r.team_id);

  // 2. Finalist flags: exactly the top 5
  const { error: clearError } = await sb
    .from("teams")
    .update({ is_finalist: false })
    .eq("is_finalist", true)
    .not("id", "in", `(${topIds.join(",")})`);
  check(clearError, "Gagal melepas finalis lama");

  const { data: setRows, error: setError } = await sb
    .from("teams")
    .update({ is_finalist: true })
    .in("id", topIds)
    .select("id");
  check(setError, "Gagal menetapkan finalis");
  if ((setRows ?? []).length !== FINALIST_SLOTS) fail("Tidak semua tim top 5 berhasil ditandai finalis.");

  // 3. Final judges (idempotent: reuse existing seed accounts)
  const existing = await findSeedJudges();
  const judgeIds = [];
  for (const judge of FINAL_JUDGES) {
    let id = existing.find((u) => u.email === judge.email)?.id;
    if (!id) {
      const { data, error } = await sb.auth.admin.createUser({
        email: judge.email,
        password: seedPassword,
        email_confirm: true,
      });
      check(error, `Gagal membuat akun ${judge.email}`);
      id = data.user.id;
    }
    const { error: profileError } = await sb.from("profiles").upsert({
      id,
      email: judge.email,
      full_name: judge.name,
      role: "judge",
      judge_stage: "final",
      is_active: true,
    });
    check(profileError, `Gagal menyimpan profil ${judge.email}`);
    judgeIds.push(id);
  }

  // 4. Optional: publish the finalist notice
  if (withNotice) {
    const { data: notice, error: noticeReadError } = await sb
      .from("finalist_notice")
      .select("finalist_message, non_finalist_message")
      .eq("id", true)
      .maybeSingle();
    check(noticeReadError, "Gagal membaca pengumuman finalis");
    const { error: noticeError } = await sb.from("finalist_notice").upsert({
      id: true,
      finalist_message: notice?.finalist_message?.trim() || "Selamat! Tim Anda lolos ke babak final. (seed lokal)",
      non_finalist_message: notice?.non_finalist_message?.trim() || "Terima kasih atas partisipasinya. (seed lokal)",
      is_published: true,
      published_at: new Date().toISOString(),
    });
    check(noticeError, "Gagal memublikasikan pengumuman finalis");
  }

  // 5. Optional: final-status final scores from both seed judges
  let scoresNote = "tidak dibuat (tambahkan --scores)";
  if (withScores) {
    const { data: settings, error: settingsError } = await sb
      .from("competition_settings")
      .select("final_results_released")
      .eq("id", true)
      .maybeSingle();
    check(settingsError, "Gagal membaca pengaturan");

    if (settings?.final_results_released) {
      scoresNote = "dilewati: hasil final sudah dirilis (nilai terkunci)";
    } else {
      const { error: deleteError } = await sb.from("final_scores").delete().in("judge_id", judgeIds);
      check(deleteError, "Gagal menghapus nilai final seed lama");

      const rows = [];
      for (const judgeId of judgeIds) {
        for (const teamId of topIds) {
          rows.push({
            judge_id: judgeId,
            team_id: teamId,
            functionality_score: randomScore(),
            case_study_fit_score: randomScore(),
            ui_ux_score: randomScore(),
            code_quality_score: randomScore(),
            documentation_score: randomScore(),
            presentation_qa_score: randomScore(),
            feedback: "Masukan contoh babak final (seed lokal).",
            status: "final",
          });
        }
      }
      const { error: insertError } = await sb.from("final_scores").insert(rows);
      check(insertError, "Gagal menyimpan nilai final");
      scoresNote = `${rows.length} nilai final dibuat`;
    }
  }

  console.log("\nFinalis (top 5 babak awal):");
  for (const r of top) {
    console.log(`  #${r.rank}  ${r.team_code}  ${r.team_name}  (${Number(r.avg_score).toFixed(2)})`);
  }
  console.log("\nJuri final (kata sandi = SEED_PASSWORD, login dengan email lengkap):");
  for (const j of FINAL_JUDGES) console.log(`  ${j.email}`);
  console.log(`\nPengumuman finalis: ${withNotice ? "dipublikasikan" : "tidak diubah (tambahkan --notice)"}`);
  console.log(`Nilai final: ${scoresNote}`);
  console.log("\nHapus juri seed: npm run seed:finalists -- clear  |  reset penuh: npm run local:restore");
}

// --- clear --------------------------------------------------------------------
async function clear() {
  const users = await findSeedJudges();
  if (users.length === 0) {
    console.log("Tidak ada juri final seed untuk dihapus.");
    return;
  }
  for (const user of users) {
    // Cascades: auth.users -> profiles -> final_scores / judge_recusals.
    const { error } = await sb.auth.admin.deleteUser(user.id);
    check(error, `Gagal menghapus ${user.email}`);
    console.log(`  dihapus: ${user.email}`);
  }
  console.log("\nStatus finalis dan pengumuman tidak dikembalikan. Reset penuh: npm run local:restore");
}

// --- main ---------------------------------------------------------------------
try {
  if (command === "seed") await seed();
  else if (command === "clear") await clear();
  else {
    console.log("Pakai: npm run seed:finalists -- <seed [--notice] [--scores] | clear>");
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

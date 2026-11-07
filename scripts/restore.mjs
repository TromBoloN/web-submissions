import { createClient } from "@supabase/supabase-js";

import fs from "node:fs";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const PRIVATE_OUTPUT_DIR = "private-output";
const DEFAULT_PASSWORD = process.env.RESTORE_PASSWORD || "Mitweek2026!";

function loadLocalEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file) || typeof process.loadEnvFile !== "function") {
      continue;
    }

    try {
      process.loadEnvFile(file);
    } catch (error) {
      console.warn(`Peringatan: gagal membaca ${file}: ${errorMessage(error)}`);
    }
  }
}

function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Kesalahan tidak diketahui";
}

function findLatestBackupDir() {
  if (!fs.existsSync(PRIVATE_OUTPUT_DIR)) {
    return null;
  }

  const entries = fs
    .readdirSync(PRIVATE_OUTPUT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("backup-"))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (entries.length === 0) {
    return null;
  }

  return path.join(PRIVATE_OUTPUT_DIR, entries[0]);
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

async function promptConfirmation(message) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(message)).trim();
  rl.close();
  return answer;
}

// Batch upsert helper for large tables
async function upsertInBatches(supabase, table, rows, onConflict = "id", batchSize = 100) {
  if (!rows || rows.length === 0) {
    return { success: true, count: 0 };
  }

  let totalInserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      throw new Error(`Gagal upsert tabel ${table} (baris ${i + 1}-${i + chunk.length}): ${error.message}`);
    }
    totalInserted += chunk.length;
  }

  return { success: true, count: totalInserted };
}

async function restoreAuthUsers(supabase, users, defaultPassword) {
  if (!users || users.length === 0) {
    return { created: 0, existing: 0, failed: 0 };
  }

  // Get all existing users to avoid duplicate calls
  const existingUsers = new Map();
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw new Error(`Gagal membaca user auth yang ada: ${error.message}`);
    }
    if (!data.users || data.users.length === 0) {
      break;
    }
    for (const u of data.users) {
      if (u.id) existingUsers.set(u.id, u);
      if (u.email) existingUsers.set(u.email.toLowerCase(), u);
    }
  }

  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const user of users) {
    if (existingUsers.has(user.id) || (user.email && existingUsers.has(user.email.toLowerCase()))) {
      existing += 1;
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email ?? undefined,
      phone: user.phone ? user.phone : undefined,
      email_confirm: true,
      password: defaultPassword,
    });

    if (error) {
      console.warn(`  ⚠️ Gagal membuat user auth ${user.email ?? user.id}: ${error.message}`);
      failed += 1;
    } else {
      created += 1;
    }
  }

  return { created, existing, failed };
}

async function main() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("[ERROR] NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi.");
    console.error("Tambahkan keduanya ke .env.local atau .env, lalu jalankan lagi.");
    process.exit(1);
  }

  // Target backup directory from CLI arg or auto-detect latest
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const autoConfirm = process.argv.includes("--yes") || process.argv.includes("-y");

  const backupDir = args[0] ? path.resolve(args[0]) : findLatestBackupDir();
  if (!backupDir || !fs.existsSync(backupDir)) {
    console.error(`[ERROR] Folder backup tidak ditemukan di: ${backupDir ?? "(kosong)"}`);
    process.exit(1);
  }

  const manifestPath = path.join(backupDir, "manifest.json");
  const manifest = readJsonFile(manifestPath);

  console.log("========================================================");
  console.log("  RESTORE DATABASE SUPABASE - MIT-WEEK 2026");
  console.log("========================================================");
  console.log(`Database Target  : ${url}`);
  console.log(`Folder Sumber    : ${path.relative(process.cwd(), backupDir)}`);
  if (manifest?.generated_at_wita) {
    console.log(`Waktu Backup     : ${manifest.generated_at_wita}`);
  }
  console.log(`Default Password : ${DEFAULT_PASSWORD}`);
  console.log("========================================================\n");

  if (!autoConfirm) {
    const confirmation = await promptConfirmation(
      'Ketik "YA" (huruf besar) untuk mengeksekusi restore data ke database: ',
    );
    if (confirmation !== "YA") {
      console.log("Operasi restore dibatalkan oleh pengguna.");
      return;
    }
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  console.log("\nMemulai pemulihan data...\n");

  // 1. Auth Users
  const authUsers = readJsonFile(path.join(backupDir, "auth_users.json"));
  if (authUsers) {
    process.stdout.write("Memulihkan auth.users ... ");
    const res = await restoreAuthUsers(supabase, authUsers, DEFAULT_PASSWORD);
    console.log(`OK (${res.created} dibuat, ${res.existing} sudah ada, ${res.failed} gagal)`);
  }

  // 2. Profiles
  const profiles = readJsonFile(path.join(backupDir, "profiles.json"));
  if (profiles) {
    process.stdout.write("Memulihkan tabel profiles ... ");
    const res = await upsertInBatches(supabase, "profiles", profiles, "id");
    console.log(`OK (${res.count} baris)`);
  }

  // 3. Teams
  const teams = readJsonFile(path.join(backupDir, "teams.json"));
  if (teams) {
    process.stdout.write("Memulihkan tabel teams ... ");
    const res = await upsertInBatches(supabase, "teams", teams, "id");
    console.log(`OK (${res.count} baris)`);
  }

  // 4. Competition Settings
  const settings = readJsonFile(path.join(backupDir, "competition_settings.json"));
  if (settings && settings.length > 0) {
    process.stdout.write("Memulihkan tabel competition_settings ... ");
    const res = await upsertInBatches(supabase, "competition_settings", settings, "id");
    console.log(`OK (${res.count} baris)`);
  }

  // 5. Case Study
  const caseStudy = readJsonFile(path.join(backupDir, "case_study.json"));
  if (caseStudy && caseStudy.length > 0) {
    process.stdout.write("Memulihkan tabel case_study ... ");
    const res = await upsertInBatches(supabase, "case_study", caseStudy, "id");
    console.log(`OK (${res.count} baris)`);
  }

  // 6. Finalist Notice
  const finalistNotice = readJsonFile(path.join(backupDir, "finalist_notice.json"));
  if (finalistNotice && finalistNotice.length > 0) {
    process.stdout.write("Memulihkan tabel finalist_notice ... ");
    const res = await upsertInBatches(supabase, "finalist_notice", finalistNotice, "id");
    console.log(`OK (${res.count} baris)`);
  }

  // 7. Submissions
  const submissions = readJsonFile(path.join(backupDir, "submissions.json"));
  if (submissions && submissions.length > 0) {
    process.stdout.write("Memulihkan tabel submissions ... ");
    const res = await upsertInBatches(supabase, "submissions", submissions, "id");
    console.log(`OK (${res.count} baris)`);
  }

  // 8. Submission History
  const subHistory = readJsonFile(path.join(backupDir, "submission_history.json"));
  if (subHistory && subHistory.length > 0) {
    process.stdout.write("Memulihkan tabel submission_history ... ");
    // Clear trigger-generated initial entries from step 7 so backup history is restored cleanly
    await supabase.from("submission_history").delete().neq("id", 0);
    // id is GENERATED ALWAYS AS IDENTITY; strip id so Postgres generates identity cleanly
    const cleaned = subHistory.map(({ id, ...rest }) => rest);
    let totalHistory = 0;
    for (let i = 0; i < cleaned.length; i += 100) {
      const chunk = cleaned.slice(i, i + 100);
      const { error } = await supabase.from("submission_history").insert(chunk);
      if (error) {
        throw new Error(`Gagal memulihkan submission_history: ${error.message}`);
      }
      totalHistory += chunk.length;
    }
    console.log(`OK (${totalHistory} baris)`);
  }

  // 9. Preliminary Scores (strip generated columns if any)
  const prelimScores = readJsonFile(path.join(backupDir, "preliminary_scores.json"));
  if (prelimScores && prelimScores.length > 0) {
    process.stdout.write("Memulihkan tabel preliminary_scores ... ");
    const cleaned = prelimScores.map((row) => {
      const copy = { ...row };
      delete copy.total_weighted_score;
      return copy;
    });
    const res = await upsertInBatches(supabase, "preliminary_scores", cleaned, "id");
    console.log(`OK (${res.count} baris)`);
  }

  // 10. Final Scores (strip generated columns if any)
  const finalScores = readJsonFile(path.join(backupDir, "final_scores.json"));
  if (finalScores && finalScores.length > 0) {
    process.stdout.write("Memulihkan tabel final_scores ... ");
    const cleaned = finalScores.map((row) => {
      const copy = { ...row };
      delete copy.total_weighted_score;
      return copy;
    });
    const res = await upsertInBatches(supabase, "final_scores", cleaned, "id");
    console.log(`OK (${res.count} baris)`);
  }

  console.log("\n========================================================");
  console.log("  RESTORE SELESAI DENGAN SUKSES! HASIL: OK");
  console.log("========================================================");
  console.log(`Seluruh akun auth yang baru dibuat memiliki kata sandi: ${DEFAULT_PASSWORD}`);
  console.log("User dapat login atau mengganti kata sandi mereka di dashboard.\n");
}

try {
  await main();
} catch (error) {
  console.error(`\n[ERROR] ${errorMessage(error)}`);
  console.log("HASIL: GAGAL");
  process.exit(1);
}

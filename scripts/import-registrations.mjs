// scripts/import-registrations.mjs
// Onboarding script for MIT-WEEK 2026 registered teams.
// Usage:
//   npm run onboard              -> Dry run (reads data/registrations.csv, checks the DB, prints the plan, writes nothing)
//   npm run onboard -- --commit  -> Interactive commit (creates auth users, profiles, teams, writes credentials)
// Note: the extra "--" is required, otherwise npm swallows the --commit flag.

import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

// ---------------------------------------------------------------------------
// 4.1 COLUMN MAPPING
// Maps internal field names to the header text in data/registrations.csv.
// Matching ignores case, surrounding spaces and repeated spaces.
// ---------------------------------------------------------------------------
const COLUMN_MAP = {
  timestamp: "Timestamp",
  email: "Email Address",
  category: "Pilihan Lomba",
  type: "Bentuk partisipasi",
  leaderName: "Nama lengkap ketua tim",
  phone: "Nomor WhatsApp ketua tim",
  institution: "Asal sekolah / perguruan tinggi",
  members: "Nama anggota lain beserta asal sekolah/kampus",
  teamName: "Nama tim",
  verified: "Verified", // added manually to the Google Sheet by the committee
};

const CSV_PATH = path.join("data", "registrations.csv");
const PRIVATE_OUTPUT_DIR = "private-output";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";
const ALL_CHARS = UPPER + LOWER + DIGIT;

// Load .env.local / .env only for variables that are still missing.
// process.loadEnvFile never overrides variables that are already set.
function loadLocalEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  for (const file of [".env.local", ".env"]) {
    if (fs.existsSync(file) && typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(file);
      } catch {
        // ignore unreadable env file; the check below reports missing variables
      }
    }
  }
}

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function generateTeamPassword(length = 14) {
  while (true) {
    const chars = [];
    for (let i = 0; i < length; i++) {
      chars.push(ALL_CHARS[randomInt(0, ALL_CHARS.length)]);
    }
    const hasUpper = chars.some((c) => UPPER.includes(c));
    const hasLower = chars.some((c) => LOWER.includes(c));
    const hasDigit = chars.some((c) => DIGIT.includes(c));
    if (hasUpper && hasLower && hasDigit) {
      return chars.join("");
    }
  }
}

// Returns an international number without "+" (for example 62812...), or null if it does not look valid.
function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("620")) {
    digits = `62${digits.slice(3)}`; // typo like +62 0812...
  } else if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }
  if (digits.startsWith("62") && digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

// Removes an attached institution but keeps hyphenated names such as "Siti Nur-Aini" intact.
function cleanMemberName(raw) {
  return String(raw ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "") // trailing "(Universitas ...)"
    .replace(/\s+[-–—]\s+.*$/, "") // " - Universitas ..." (dash must have spaces around it)
    .trim();
}

function parseMembers(rawLeader, rawMembers) {
  const leader = String(rawLeader || "").trim();
  const members = [leader];
  const seen = new Set([leader.toLowerCase()]);

  if (rawMembers) {
    const lines = String(rawMembers).split(/[\r\n;]+/);
    for (const line of lines) {
      const cleaned = cleanMemberName(line);
      if (cleaned && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        members.push(cleaned);
      }
    }
  }
  return members;
}

function escapeCsvCell(value) {
  let str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}${m}${day}-${h}${min}${s}`;
}

async function promptConfirmation(message) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(message)).trim();
  rl.close();
  return answer;
}

async function main() {
  const isCommit = process.argv.includes("--commit");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`File CSV pendaftaran tidak ditemukan di: ${CSV_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
  let records;
  try {
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
    });
  } catch (err) {
    console.error(`Gagal mem-parse file CSV: ${err.message}`);
    process.exit(1);
  }

  if (records.length === 0) {
    console.error("File CSV pendaftaran kosong.");
    process.exit(1);
  }

  // Resolve every mapped field to the real header once (case-insensitive, trimmed).
  const availableHeaders = Object.keys(records[0]);
  const headerLookup = new Map();
  for (const header of availableHeaders) {
    const key = normalizeHeader(header);
    if (!headerLookup.has(key)) headerLookup.set(key, header);
  }

  const H = {}; // field name -> actual header in the CSV
  const missingHeaders = [];
  for (const [fieldKey, headerName] of Object.entries(COLUMN_MAP)) {
    const actual = headerLookup.get(normalizeHeader(headerName));
    if (actual === undefined) {
      missingHeaders.push(`  - [${fieldKey}]: "${headerName}"`);
    } else {
      H[fieldKey] = actual;
    }
  }

  if (missingHeaders.length > 0) {
    console.error("\n[ERROR] Header CSV yang dipetakan pada COLUMN_MAP tidak cocok:");
    console.error(missingHeaders.join("\n"));
    console.error("\nHeader yang tersedia di data/registrations.csv:");
    console.error(availableHeaders.map((h) => `  "${h}"`).join("\n"));
    console.error("\nSilakan sesuaikan COLUMN_MAP di scripts/import-registrations.mjs atau tambahkan kolom ke CSV.");
    process.exit(1);
  }

  // Load environment
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset.");
    process.exit(1);
  }

  const supabaseHost = new URL(url).hostname;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Query existing data for collisions and team code sequence
  const [{ data: existingProfiles, error: profilesError }, { data: existingTeams, error: teamsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, email"),
      supabase.from("teams").select("id, team_code, team_name"),
    ]);

  if (profilesError || teamsError) {
    console.error("Gagal mengambil data profiles/teams dari database:", profilesError || teamsError);
    process.exit(1);
  }

  const dbEmails = new Set((existingProfiles ?? []).map((p) => (p.email ?? "").toLowerCase()));
  const dbTeamNames = new Set((existingTeams ?? []).map((t) => (t.team_name ?? "").toLowerCase()));

  // Determine starting team code number (highest existing MIT-xxx)
  let nextTeamNumber =
    (existingTeams ?? []).reduce((highest, team) => {
      const match = team.team_code?.match(/^MIT-(\d{3})$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;

  // Process rows
  let ignoredCount = 0;
  const targetCandidates = [];

  const emailCountsInSheet = new Map();
  const teamNameCountsInSheet = new Map();

  records.forEach((row, index) => {
    const csvRow = index + 2; // +1 for header, +1 for 1-based index
    const category = (row[H.category] ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const verifiedVal = (row[H.verified] ?? "").trim().toLowerCase();

    // 4.2 Only process category Web Development AND verified = TRUE / YA / Y / 1
    const isWebDev = category === "web development";
    const isVerified = ["true", "ya", "y", "1"].includes(verifiedVal);

    if (!isWebDev || !isVerified) {
      ignoredCount++;
      return;
    }

    const email = (row[H.email] ?? "").trim().toLowerCase();
    const leaderName = (row[H.leaderName] ?? "").trim();
    let teamName = (row[H.teamName] ?? "").trim();
    if (!teamName) {
      teamName = leaderName;
    }
    const phone = normalizePhone(row[H.phone]);
    const institution = (row[H.institution] ?? "").trim();
    const isIndividu = (row[H.type] ?? "").trim().toLowerCase().includes("individu");
    const members = isIndividu ? [leaderName] : parseMembers(leaderName, row[H.members]);

    if (email) {
      emailCountsInSheet.set(email, (emailCountsInSheet.get(email) ?? 0) + 1);
    }
    if (teamName) {
      const lowerTeam = teamName.toLowerCase();
      teamNameCountsInSheet.set(lowerTeam, (teamNameCountsInSheet.get(lowerTeam) ?? 0) + 1);
    }

    targetCandidates.push({
      csvRow,
      email,
      phone,
      teamName,
      leaderName,
      institution,
      members,
    });
  });

  // Evaluate problem rows
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const processedRows = [];

  for (const item of targetCandidates) {
    const problems = [];

    if (!item.email || !emailRegex.test(item.email)) {
      problems.push("email tidak valid");
    }
    if (!item.phone) {
      problems.push("nomor telepon tidak valid (harus diawali 62, 10-15 digit)");
    }
    if (!item.leaderName) {
      problems.push("nama ketua kosong");
    }
    if (emailCountsInSheet.get(item.email) > 1) {
      problems.push("duplikat email di dalam sheet");
    }
    if (teamNameCountsInSheet.get(item.teamName.toLowerCase()) > 1) {
      problems.push("duplikat nama tim di dalam sheet");
    }
    if (dbEmails.has(item.email)) {
      problems.push("sudah punya akun");
    }
    if (dbTeamNames.has(item.teamName.toLowerCase())) {
      problems.push("nama tim sudah ada di database");
    }

    processedRows.push({
      ...item,
      status: problems.length > 0 ? problems.join("; ") : "akan dibuat",
      isProblem: problems.length > 0,
    });
  }

  const willCreateRows = processedRows.filter((r) => !r.isProblem);
  const problemRows = processedRows.filter((r) => r.isProblem);

  console.log("\n========================================================");
  console.log(`  IMPORT PENDAFTARAN TIM MIT-WEEK 2026 (${isCommit ? "MODE COMMIT" : "DRY RUN"})`);
  console.log("========================================================\n");
  console.log(`Database target           : ${supabaseHost}`);
  console.log(`Total baris di CSV        : ${records.length}`);
  console.log(`Diabaikan (bukan WebDev/belum verified) : ${ignoredCount}`);
  console.log(`Lolos filter kriteria     : ${targetCandidates.length}`);
  console.log(`Baris bermasalah (skip)   : ${problemRows.length}`);
  console.log(`Siap dibuatkan akun       : ${willCreateRows.length}\n`);

  console.log(
    "Baris | Nama Tim                       | Email                      | No. HP         | Anggota | Status",
  );
  console.log(
    "------+--------------------------------+----------------------------+----------------+---------+---------------------",
  );
  for (const r of processedRows) {
    const baris = String(r.csvRow).padStart(5, " ");
    const tim = r.teamName.padEnd(30, " ").slice(0, 30);
    const eml = r.email.padEnd(26, " ").slice(0, 26);
    const hp = (r.phone ?? "-").padEnd(14, " ");
    const ang = String(r.members.length).padStart(7, " ");
    console.log(`${baris} | ${tim} | ${eml} | ${hp} | ${ang} | ${r.status}`);
    console.log(`        anggota: ${r.members.join(" | ")}`);
  }
  console.log(
    "------+--------------------------------+----------------------------+----------------+---------+---------------------\n",
  );

  if (!isCommit) {
    console.log("[DRY RUN SELESAI] Tidak ada data yang diubah atau file yang ditulis.");
    console.log("Jalankan dengan 'npm run onboard -- --commit' untuk melakukan import akun sesungguhnya.\n");
    return;
  }

  // -------------------------------------------------------------------------
  // COMMIT MODE
  // -------------------------------------------------------------------------
  if (willCreateRows.length === 0) {
    console.log("Tidak ada akun valid yang perlu dibuat. Berhenti.");
    return;
  }

  console.log(`TARGET DATABASE: ${supabaseHost}`);
  const confirmation = await promptConfirmation('Ketik "YA" (huruf besar) untuk mengeksekusi pembuatan akun: ');
  if (confirmation !== "YA") {
    console.log("Dibatalkan oleh pengguna.");
    return;
  }

  fs.mkdirSync(PRIVATE_OUTPUT_DIR, { recursive: true });
  const ts = formatTimestamp();
  const credPath = path.join(PRIVATE_OUTPUT_DIR, `credentials-${ts}.csv`);
  const logPath = path.join(PRIVATE_OUTPUT_DIR, `import-log-${ts}.txt`);

  // Credentials CSV header with BOM so Excel reads UTF-8 correctly
  const credHeader = ["team_code", "team_name", "leader_name", "email", "phone", "password"]
    .map(escapeCsvCell)
    .join(",");
  fs.writeFileSync(credPath, `\uFEFF${credHeader}\n`, "utf-8");

  const logEntries = [];
  logEntries.push(`IMPORT LOG MIT-WEEK 2026 - ${new Date().toISOString()}`);
  logEntries.push(`Target Database: ${supabaseHost}`);
  logEntries.push(`Total valid: ${willCreateRows.length}, Total skipped: ${problemRows.length}\n`);

  let createdCount = 0;
  let failedCount = 0;

  for (const row of willCreateRows) {
    const teamCode = `MIT-${String(nextTeamNumber).padStart(3, "0")}`;
    const password = generateTeamPassword(14);

    process.stdout.write(`Membuat akun: ${row.email} (${teamCode}) ... `);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: row.email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.log(`GAGAL AUTH (${authError?.message})`);
      failedCount++;
      logEntries.push(`[FAILED AUTH] Baris ${row.csvRow} - ${row.email}: ${authError?.message}`);
      continue;
    }

    const userId = authData.user.id;

    // 2. Insert profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: row.email,
      full_name: row.leaderName,
      role: "team",
      is_active: true,
    });

    if (profileError) {
      console.log(`GAGAL PROFILE (${profileError.message}) -> Rollback user`);
      await supabase.auth.admin.deleteUser(userId);
      failedCount++;
      logEntries.push(`[FAILED PROFILE] Baris ${row.csvRow} - ${row.email}: ${profileError.message}`);
      continue;
    }

    // 3. Insert team
    const { error: teamError } = await supabase.from("teams").insert({
      profile_id: userId,
      team_code: teamCode,
      team_name: row.teamName,
      institution: row.institution,
      leader_name: row.leaderName,
      members: row.members,
    });

    if (teamError) {
      console.log(`GAGAL TEAM (${teamError.message}) -> Rollback profile & user`);
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);
      failedCount++;
      logEntries.push(`[FAILED TEAM] Baris ${row.csvRow} - ${row.email}: ${teamError.message}`);
      continue;
    }

    // 4. Append to the credentials CSV immediately, so a crash never loses a created account's password
    const credRow = [teamCode, row.teamName, row.leaderName, row.email, row.phone, password]
      .map(escapeCsvCell)
      .join(",");
    fs.appendFileSync(credPath, `${credRow}\n`, "utf-8");

    createdCount++;
    nextTeamNumber++;
    logEntries.push(`[CREATED] Baris ${row.csvRow} - ${teamCode} - ${row.teamName} (${row.email})`);
    console.log("SUKSES");
  }

  if (problemRows.length > 0) {
    logEntries.push("\n--- BARIS DILEWATI (SKIPPED) ---");
    for (const pr of problemRows) {
      logEntries.push(`[SKIPPED] Baris ${pr.csvRow} - ${pr.teamName} (${pr.email}): ${pr.status}`);
    }
  }

  fs.writeFileSync(logPath, `${logEntries.join("\n")}\n`, "utf-8");

  console.log("\n========================================================");
  console.log("  HASIL EKSEKUSI IMPORT");
  console.log("========================================================");
  console.log(`Berhasil dibuat : ${createdCount}`);
  console.log(`Gagal dibuat    : ${failedCount}`);
  console.log(`Dilewati (skip) : ${problemRows.length}`);
  console.log(`File kredensial : ${credPath}`);
  console.log(`File log import : ${logPath}`);
  console.log("\n[PENTING] Segera amankan atau hapus file kredensial setelah pesan WhatsApp terkirim!");

  if (failedCount > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

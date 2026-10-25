import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;
const WITA_TIME_ZONE = "Asia/Makassar";
const PRIVATE_OUTPUT_DIR = "private-output";
const OPTIONAL_TABLES = new Set(["submission_history"]);
const TABLES = [
  "profiles",
  "teams",
  "competition_settings",
  "case_study",
  "submissions",
  "submission_history",
  "preliminary_scores",
  "final_scores",
  "finalist_notice",
];

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

function isMissingTableError(error) {
  const code = error?.code;
  const message = error?.message;
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (typeof message === "string" &&
      /could not find the table|relation .* does not exist|schema cache/i.test(message))
  );
}

function witaParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WITA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }
  return values;
}

function makeBackupDir(startedAt) {
  const parts = witaParts(startedAt);
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}${parts.minute}${parts.second}`;
  const baseDir = path.join(PRIVATE_OUTPUT_DIR, `backup-${date}-${time}`);
  let outDir = baseDir;
  let suffix = 2;

  while (fs.existsSync(outDir)) {
    outDir = `${baseDir}-${suffix}`;
    suffix += 1;
  }

  return {
    outDir,
    generatedAtWita: `${date}T${parts.hour}:${parts.minute}:${parts.second}+08:00`,
  };
}

function displayPath(target) {
  return path.relative(process.cwd(), target).split(path.sep).join("/");
}

function jsonReplacer(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function writeJson(filePath, value) {
  const json = `${JSON.stringify(value, jsonReplacer, 2)}\n`;
  fs.writeFileSync(filePath, json, {
    encoding: "utf8",
    mode: 0o600,
  });
}

async function fetchCount(supabase, table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    throw error;
  }
  return count;
}

async function backupTable(supabase, table, outDir) {
  const rows = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (OPTIONAL_TABLES.has(table) && isMissingTableError(error)) {
        return {
          status: "SKIPPED",
          rows: null,
          databaseRows: null,
          note: "Tabel belum ada.",
        };
      }
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);
    from += data.length;
  }

  const finalCount = await fetchCount(supabase, table);
  if (finalCount === null) {
    throw new Error("Jumlah baris database tidak tersedia.");
  }

  const status = rows.length === finalCount ? "OK" : "MISMATCH";
  writeJson(path.join(outDir, `${table}.json`), rows);

  const result = {
    status,
    rows: rows.length,
    databaseRows: finalCount,
    file: `${table}.json`,
  };
  if (status === "MISMATCH") {
    result.note = "Jumlah baris tidak cocok; jalankan ulang backup.";
  }
  return result;
}

function pickAuthUser(user) {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    role: user.role ?? null,
    aud: user.aud ?? null,
    email_confirmed_at: user.email_confirmed_at ?? null,
    phone_confirmed_at: user.phone_confirmed_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
    created_at: user.created_at ?? null,
    updated_at: user.updated_at ?? null,
  };
}

async function backupAuthUsers(supabase, outDir) {
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) {
      throw error;
    }
    if (data.users.length === 0) {
      break;
    }
    users.push(...data.users);
  }

  const picked = users.map(pickAuthUser).sort((a, b) => {
    const emailCompare = (a.email ?? "").localeCompare(b.email ?? "");
    if (emailCompare !== 0) {
      return emailCompare;
    }
    return a.id.localeCompare(b.id);
  });

  writeJson(path.join(outDir, "auth_users.json"), picked);
  return {
    status: "OK",
    rows: picked.length,
    file: "auth_users.json",
  };
}

function printTableResult(table, result) {
  let detail;
  if (result.status === "OK") {
    detail = `${result.rows} baris`;
  } else if (result.status === "SKIPPED") {
    detail = "tabel belum ada";
  } else if (result.status === "MISMATCH") {
    detail = `${result.rows} ditulis / ${result.databaseRows} di database`;
  } else {
    detail = result.error ?? "kesalahan tidak diketahui";
  }

  console.log(`  ${table.padEnd(24)} ${result.status.padEnd(9)} ${detail}`);
}

async function main() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[ERROR] NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi.");
    console.error("Tambahkan keduanya ke .env.local atau .env, lalu jalankan lagi.");
    console.log("HASIL: GAGAL");
    process.exitCode = 1;
    return;
  }

  const startedAt = new Date();
  const { outDir, generatedAtWita } = makeBackupDir(startedAt);
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  console.log("Membaca database (hanya SELECT, tanpa mengubah data).");
  console.log(`Folder backup: ${displayPath(outDir)}`);
  console.log();

  const results = [];
  for (const table of TABLES) {
    try {
      const result = await backupTable(supabase, table, outDir);
      results.push({ table, ...result });
      printTableResult(table, result);
    } catch (error) {
      const result = {
        status: "GAGAL",
        rows: null,
        databaseRows: null,
        error: errorMessage(error),
      };
      results.push({ table, ...result });
      printTableResult(table, result);
    }
  }

  const authResult = await backupAuthUsers(supabase, outDir).catch((error) => ({
    status: "GAGAL",
    rows: null,
    error: errorMessage(error),
  }));
  printTableResult("auth_users", authResult);

  const tableEntries = {};
  for (const result of results) {
    const entry = { status: result.status, rows: result.rows };
    if (result.file) {
      entry.file = result.file;
    }
    if (typeof result.databaseRows === "number") {
      entry.database_rows = result.databaseRows;
    }
    if (result.note) {
      entry.note = result.note;
    }
    if (result.error) {
      entry.error = result.error;
    }
    tableEntries[result.table] = entry;
  }

  const authEntry = { status: authResult.status, rows: authResult.rows };
  if (authResult.status === "OK") {
    authEntry.file = "auth_users.json";
  }
  if (authResult.error) {
    authEntry.error = authResult.error;
  }

  const allOk =
    authResult.status === "OK" && results.every((result) => result.status === "OK" || result.status === "SKIPPED");

  const manifest = {
    format_version: 1,
    generated_at: startedAt.toISOString(),
    generated_at_wita: generatedAtWita,
    timezone: "Asia/Makassar (WITA)",
    project_url: url,
    page_size: PAGE_SIZE,
    tables: tableEntries,
    auth_users: authEntry,
    result: allOk ? "OK" : "GAGAL",
  };

  const manifestPath = path.join(outDir, "manifest.json");
  writeJson(manifestPath, manifest);

  console.log();
  const skipped = results.filter((result) => result.status === "SKIPPED");
  if (skipped.length > 0) {
    const names = skipped.map((result) => result.table).join(", ");
    console.log(`Catatan: ${names} belum ada (SKIPPED). Jalankan backup lagi setelah migrasi diterapkan.`);
  }
  console.log(`Manifest: ${displayPath(manifestPath)}`);
  console.log("Simpan folder backup di tempat privat; private-output/ sudah diabaikan Git.");
  if (!allOk) {
    console.log("Jalankan ulang backup. Jika MISMATCH berulang, pastikan tidak ada perubahan data saat backup.");
    process.exitCode = 1;
  }
  console.log(`HASIL: ${allOk ? "OK" : "GAGAL"}`);
}

try {
  await main();
} catch (error) {
  console.error(`\n[ERROR] ${errorMessage(error)}`);
  console.log("HASIL: GAGAL");
  process.exitCode = 1;
}

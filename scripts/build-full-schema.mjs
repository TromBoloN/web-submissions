// Builds supabase/schema/full_schema.sql: the final state of every migration as ONE file that is safe to
// run twice (fresh project or an already-migrated one). Generated from pg_dump of a fully migrated local
// database, then rewritten into idempotent statements.
//
//   node scripts/build-full-schema.mjs [database]        (default database: postgres)
//
// Needs the local Docker stack (npm run local:up). The database must have ALL migrations applied.
// Never point this at production: it only reads, but there is no reason to.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_web-submissions";
const DATABASE = process.argv[2] ?? "postgres";
const OUT = path.join("supabase", "schema", "full_schema.sql");
const SEED_TABLES = [
  "competition_settings",
  "case_study",
  "finalist_notice",
  "final_presentation",
  "competition_stages",
];

function pgDump(args) {
  const res = spawnSync("docker", ["exec", CONTAINER, "pg_dump", "-U", "postgres", "-d", DATABASE, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) {
    console.error(res.stderr || res.error);
    process.exit(1);
  }
  return res.stdout.replace(/\r\n/g, "\n");
}

/** pg_dump separates objects with "--\n-- Name: X; Type: T; ..." headers. Returns [{ type, name, sql }]. */
function splitEntries(dump) {
  const header = /^--\n-- (?:Data for )?Name: (.*?); Type: ([A-Z ]+?);.*\n--\n/gm;
  const entries = [];
  const matches = [...dump.matchAll(header)];
  matches.forEach((m, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : dump.length;
    const sql = dump
      .slice(m.index + m[0].length, end)
      .split("\n")
      .filter((line) => !line.startsWith("\\") && !line.startsWith("-- PostgreSQL database dump"))
      .join("\n")
      .trim();
    if (sql) entries.push({ name: m[1], type: m[2], sql });
  });
  return entries;
}

function guarded(sql, conditions) {
  return `DO $guard$ BEGIN\n  ${sql.replace(/\n/g, "\n  ")}\nEXCEPTION WHEN ${conditions} THEN NULL;\nEND $guard$;`;
}

function transform({ type, sql }) {
  switch (type) {
    case "SCHEMA":
    case "DEFAULT ACL": // platform defaults (Supabase sets them); not ours to change
      return null;
    case "COMMENT":
      return sql.startsWith("COMMENT ON SCHEMA") ? null : sql;
    case "TYPE":
      return guarded(sql, "duplicate_object");
    case "FUNCTION":
      return sql.replace(/^CREATE FUNCTION /, "CREATE OR REPLACE FUNCTION ");
    case "TABLE":
      return sql.replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ");
    case "VIEW":
      return sql.replace(/^CREATE VIEW /, "CREATE OR REPLACE VIEW ");
    case "SEQUENCE": {
      const m = sql.match(/^ALTER TABLE (\S+?)\.(\S+) ALTER COLUMN (\S+) ADD GENERATED/);
      if (!m) throw new Error(`Unhandled SEQUENCE entry:\n${sql}`);
      const [, schema, table, column] = m;
      return `DO $guard$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${table}' AND column_name = '${column}' AND is_identity = 'YES') THEN\n    ${sql.replace(/\n/g, "\n    ")}\n  END IF;\nEND $guard$;`;
    }
    case "CONSTRAINT":
    case "FK CONSTRAINT":
      return guarded(sql, "duplicate_object OR duplicate_table OR invalid_table_definition");
    case "INDEX":
      return sql.replace(/^CREATE (UNIQUE )?INDEX /, "CREATE $1INDEX IF NOT EXISTS ");
    case "TRIGGER":
      return sql.replace(/^CREATE TRIGGER /, "CREATE OR REPLACE TRIGGER ");
    case "POLICY": {
      const m = sql.match(/^CREATE POLICY (".*?"|\S+) ON (\S+)/);
      if (!m) throw new Error(`Unhandled POLICY entry:\n${sql}`);
      return `DROP POLICY IF EXISTS ${m[1]} ON ${m[2]};\n${sql}`;
    }
    case "ACL": {
      // pg_dump writes grants relative to Postgres' built-in defaults, but Supabase's default privileges
      // also grant anon/authenticated on every new object. Reset first so the result is exactly this ACL.
      const m = sql.match(/ ON ((?:FUNCTION|TABLE|SEQUENCE) .+?) (?:TO|FROM) /);
      if (!m) return sql; // schema-level ACLs are platform defaults: leave as dumped
      // PUBLIC is left out: pg_dump already emits "REVOKE ... FROM PUBLIC" when the reference revoked it.
      return `REVOKE ALL ON ${m[1]} FROM anon, authenticated, service_role;\n${sql}`;
    }
    case "ROW SECURITY":
    case "TABLE DATA":
      return sql;
    default:
      throw new Error(`Unhandled entry type ${type}`);
  }
}

const schemaDump = pgDump(["--schema-only", "--no-owner", "-n", "public"]);
const storageDump = pgDump(["--schema-only", "--no-owner", "-n", "storage"]);
const dataDump = pgDump([
  "--data-only",
  "--no-owner",
  "--column-inserts",
  "--on-conflict-do-nothing",
  ...SEED_TABLES.flatMap((t) => ["-t", `public.${t}`]),
]);

const body = splitEntries(schemaDump).map(transform).filter(Boolean);
// Only our policies on storage.objects (the migrations create them; Supabase ships none).
const storagePolicies = splitEntries(storageDump)
  .filter((e) => e.type === "POLICY" && e.sql.includes(" ON storage.objects "))
  .map(transform);
const seeds = splitEntries(dataDump).map(transform);

const migrations = fs
  .readdirSync(path.join("supabase", "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

const out = `-- ============================================================================
-- MIT-WEEK competition portal: FULL SCHEMA (generated, do not edit by hand)
--
-- The final state of every file in supabase/migrations/, as one script that is safe to run twice:
-- on a fresh Supabase project, or on a database that already has the migrations.
--   * Tables are created only if missing (columns are never altered or dropped here).
--   * Functions, views, triggers and policies are replaced with their final definitions.
--   * Constraints, types and identity columns are skipped when they already exist.
--   * Seed rows (settings, case study, finalist notice, final presentation, system stages) are
--     inserted only if missing, so existing settings are never overwritten.
-- It does NOT create the "web-showcase" storage bucket (create it in the dashboard, see SETUP.md)
-- and does not touch Supabase's own auth/storage schemas beyond our storage.objects policies.
--
-- Regenerate after adding a migration: node scripts/build-full-schema.mjs
-- Built from ${migrations.length} migrations, last: ${migrations.at(-1)}
-- ============================================================================

BEGIN;

SET LOCAL check_function_bodies = false;
SET LOCAL client_min_messages = warning;
SELECT pg_catalog.set_config('search_path', '', true);

${[...body, "-- Storage policies (bucket web-showcase)", ...storagePolicies, "-- Seed rows", ...seeds].join("\n\n")}

COMMIT;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`Wrote ${OUT} (${out.split("\n").length} lines) from database "${DATABASE}".`);

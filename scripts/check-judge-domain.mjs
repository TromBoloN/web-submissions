// Throwaway script to probe whether Supabase Auth accepts specific reserved domains.
// Run with: node --env-file=.env scripts/check-judge-domain.mjs

import { createClient } from "@supabase/supabase-js";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Ignore if .env.local does not exist
  }
  try {
    process.loadEnvFile(".env");
  } catch {
    // Ignore if .env does not exist
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CANDIDATES = [
  "probe@juri.mitweek.invalid",
  "probe@juri.mitweek.test",
  "probe@juri.mitweek.example",
];

const PROBE_PASSWORD = "TemporaryProbePass2026!";

async function runProbe() {
  console.log("Checking candidate judge email domains with Supabase Auth...\n");

  const results = [];

  for (const email of CANDIDATES) {
    process.stdout.write(`Testing: ${email} ... `);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: PROBE_PASSWORD,
        email_confirm: true,
      });

      if (error) {
        console.log(`REJECTED (${error.message})`);
        results.push({ email, accepted: false, reason: error.message });
      } else if (data?.user?.id) {
        // Successfully created, now delete probe user immediately
        const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
        if (deleteError) {
          console.log(`ACCEPTED (User created, but delete cleanup failed: ${deleteError.message})`);
        } else {
          console.log("ACCEPTED (Created and deleted successfully)");
        }
        results.push({ email, accepted: true });
      } else {
        console.log("UNKNOWN RESPONSE");
        results.push({ email, accepted: false, reason: "No user id returned" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`ERROR (${msg})`);
      results.push({ email, accepted: false, reason: msg });
    }
  }

  console.log("\n--- Probe Summary ---");
  for (const r of results) {
    console.log(`${r.accepted ? "[ACCEPTED]" : "[REJECTED]"} ${r.email}${r.reason ? ` - ${r.reason}` : ""}`);
  }
}

runProbe().catch((err) => {
  console.error("Fatal probe error:", err);
  process.exit(1);
});

// Showcase-only demo data.
//
//   npm run seed:showcase -- seed
//   npm run seed:showcase -- seed --publish
//   npm run seed:showcase -- clear
//
// This uses a separate domain and team-code prefix from the competition seed.
// Never use the showcase domain for real accounts.

import { createClient } from "@supabase/supabase-js";

import fs from "node:fs";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

for (const file of [".env.local", ".env"]) {
  if ((!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) && fs.existsSync(file)) {
    try {
      process.loadEnvFile?.(file);
    } catch {
      // The required-variable check below reports missing configuration.
    }
  }
}

const SHOWCASE_DOMAIN = "@showcase.mitweek.test";
const TEAM_CODE_PREFIX = "SHOWCASE-";
const command = process.argv[2];
const shouldPublish = process.argv.includes("--publish");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedPassword = process.env.SEED_PASSWORD;

if (!url || !serviceKey || !seedPassword || seedPassword.length < 12) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan SEED_PASSWORD (minimal 12 karakter) wajib diisi.",
  );
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const teams = [
  {
    number: 1,
    name: "Aurora Signal",
    title: "Sinyal Aman",
    description: "Membantu pengguna mengenali sinyal digital yang patut dipercaya sebelum mengambil keputusan.",
    finalist: true,
    image: "default-light.webp",
  },
  {
    number: 2,
    name: "Byte Garden",
    title: "Trust Garden",
    description: "Ruang belajar interaktif untuk memahami pola penipuan digital dengan cara yang ringan.",
    finalist: true,
    image: "default-dark.webp",
  },
  {
    number: 3,
    name: "Cakrawala",
    title: "Lihat Dua Kali",
    description: "Pendekatan visual untuk membantu anak muda berhenti sejenak sebelum membuka tautan.",
    finalist: true,
    image: "default-light.webp",
  },
  {
    number: 4,
    name: "Delta Kode",
    title: "Kawal Tautan",
    description: "Pemeriksa tautan sederhana dengan penjelasan yang bisa dipahami semua orang.",
    finalist: true,
    image: null,
  },
  {
    number: 5,
    name: "Empat Mata",
    title: "Baca Konteks",
    description: "Membaca konteks percakapan untuk menemukan tekanan, urgensi, dan pola manipulasi.",
    image: "default-dark.webp",
  },
  {
    number: 6,
    name: "Fokus Pagi",
    title: "",
    description: "Prototipe edukasi singkat tentang kebiasaan aman di ruang digital.",
    image: null,
  },
  {
    number: 7,
    name: "Garis Tengah",
    title: "Titik Tenang",
    description: "Mengubah situasi mendesak menjadi langkah-langkah kecil yang lebih aman.",
    image: "default-light.webp",
  },
  {
    number: 8,
    name: "Horizon",
    title: "Cek Sebelum Klik",
    description: "Dashboard ringkas untuk mengumpulkan petunjuk dari sebuah pesan mencurigakan.",
    image: "default-dark.webp",
  },
  {
    number: 9,
    name: "Iris Digital",
    title: "Iris",
    description: "Permainan mini untuk melatih intuisi dan literasi keamanan digital.",
    image: null,
  },
  {
    number: 10,
    name: "Jalur Aman",
    title: "Rute Aman",
    description: "Panduan keputusan yang membantu pengguna memilih tindakan berikutnya.",
    image: "default-light.webp",
  },
  {
    number: 11,
    name: "Kawan Data",
    title: "Kawan Data",
    description: "Teman digital untuk memeriksa klaim sebelum membagikannya ke orang lain.",
    image: "default-dark.webp",
  },
  {
    number: 12,
    name: "Lintas Sadar",
    title: "Sadar Digital",
    description: "Koleksi simulasi singkat dengan fokus pada empati dan ketelitian.",
    image: null,
  },
];

function check(error, label) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function confirm(message) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(`${message} Ketik "ya" untuk lanjut: `)).trim().toLowerCase();
  rl.close();
  return answer === "ya";
}

async function listUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    check(error, "Gagal membaca akun showcase");
    users.push(...data.users.filter((user) => user.email?.endsWith(SHOWCASE_DOMAIN)));
    if (data.users.length < 1000) return users;
  }
}

async function createUser(email) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: seedPassword,
    email_confirm: true,
  });
  check(error, `Gagal membuat akun ${email}`);
  return data.user.id;
}

async function uploadImage(profileId, teamNumber, filename) {
  if (!filename) return null;
  const filePath = path.join("media", "default", filename);
  const file = fs.readFileSync(filePath);
  const objectPath = `showcase/${profileId}/${teamNumber}-${filename}`;
  const { error } = await sb.storage.from("web-showcase").upload(objectPath, file, {
    contentType: filename.endsWith(".webp") ? "image/webp" : "image/png",
    upsert: true,
  });
  check(error, `Gagal mengunggah gambar ${filename}`);
  return objectPath;
}

async function clearShowcase() {
  const users = await listUsers();
  if (users.length === 0) {
    console.log("Tidak ada data showcase yang ditemukan.");
    return;
  }

  console.log(`Target project: ${new URL(url).host}`);
  console.log(`Akan menghapus ${users.length} akun showcase dan data terkait.`);
  if (!(await confirm("Lanjutkan?"))) return;

  for (const user of users) {
    const { data: objects, error: listError } = await sb.storage.from("web-showcase").list(`showcase/${user.id}`);
    check(listError, `Gagal membaca gambar ${user.email}`);
    if (objects && objects.length > 0) {
      const { error: removeError } = await sb.storage
        .from("web-showcase")
        .remove(objects.map((object) => `showcase/${user.id}/${object.name}`));
      check(removeError, `Gagal menghapus gambar ${user.email}`);
    }
    const { error } = await sb.auth.admin.deleteUser(user.id);
    check(error, `Gagal menghapus ${user.email}`);
  }
  console.log("Data showcase berhasil dihapus.");
}

async function seedShowcase() {
  const existing = await listUsers();
  if (existing.length > 0) {
    console.error("Data showcase sudah ada. Jalankan `npm run seed:showcase -- clear` dulu.");
    process.exit(1);
  }

  console.log(`Target project: ${new URL(url).host}`);
  console.log(`Akan membuat ${teams.length} akun tim showcase.`);
  if (shouldPublish) {
    console.log("Mode publish aktif: kedua tahap galeri akan dibuat terlihat untuk pengujian.");
  }
  if (!(await confirm("Lanjutkan?"))) return;

  const profileRows = [];
  const teamRows = [];
  const teamIds = [];

  for (const team of teams) {
    const email = `team${String(team.number).padStart(2, "0")}${SHOWCASE_DOMAIN}`;
    const profileId = await createUser(email);
    profileRows.push({
      id: profileId,
      email,
      full_name: `Ketua ${team.name} (Showcase)`,
      role: "team",
      judge_stage: null,
    });
    teamRows.push({
      profile_id: profileId,
      team_code: `${TEAM_CODE_PREFIX}${String(team.number).padStart(2, "0")}`,
      team_name: `${team.name} (Showcase)`,
      institution: "Universitas Contoh Showcase",
      leader_name: `Ketua ${team.name}`,
      members: [`Ketua ${team.name}`, `Anggota ${team.name}`],
      is_finalist: Boolean(team.finalist),
      is_disqualified: false,
      showcase_consent: true,
      showcase_title: team.title,
      showcase_description: team.description,
    });
    teamIds.push({ profileId, team });
  }

  const { error: profilesError } = await sb.from("profiles").insert(profileRows);
  check(profilesError, "Gagal menyimpan profil showcase");

  const { data: insertedTeams, error: teamsError } = await sb
    .from("teams")
    .insert(teamRows)
    .select("id, profile_id, team_code");
  check(teamsError, "Gagal menyimpan tim showcase");

  const submissions = [];
  for (const { profileId, team } of teamIds) {
    const inserted = insertedTeams.find((row) => row.profile_id === profileId);
    const imagePath = await uploadImage(profileId, team.number, team.image);
    const { error: imagePathError } = await sb
      .from("teams")
      .update({ showcase_image_path: imagePath })
      .eq("id", inserted.id);
    check(imagePathError, `Gagal menyimpan gambar ${team.name}`);
    submissions.push({
      team_id: inserted.id,
      github_url: `https://github.com/example/showcase-${team.number}`,
      live_demo_url: `https://example.com/showcase/${team.number}`,
      video_url: `https://example.com/showcase/${team.number}/video`,
      status: "submitted",
      notes_for_judges: `Catatan internal showcase ${team.number}.`,
      link_check: {
        github: { status: "ok", message: "Tautan GitHub contoh." },
        liveDemo: { status: team.number === 8 ? "warning" : "ok", message: "Hasil pemeriksaan contoh." },
        video: { status: "ok", message: "Tautan video contoh." },
      },
      link_checked_at: new Date().toISOString(),
    });
  }
  const { error: submissionsError } = await sb.from("submissions").insert(submissions);
  check(submissionsError, "Gagal menyimpan submission showcase");

  if (shouldPublish) {
    const { error: snapshotError } = await sb
      .from("teams")
      .update({ showcase_is_finalist: false })
      .eq("is_finalist", false)
      .like("team_code", `${TEAM_CODE_PREFIX}%`);
    check(snapshotError, "Gagal membuat snapshot non-finalis");

    const { error: finalistSnapshotError } = await sb
      .from("teams")
      .update({ showcase_is_finalist: true })
      .eq("is_finalist", true)
      .like("team_code", `${TEAM_CODE_PREFIX}%`);
    check(finalistSnapshotError, "Gagal membuat snapshot finalis");

    const { error: settingsError } = await sb
      .from("competition_settings")
      .update({
        showcase_published_at: new Date().toISOString(),
        showcase_finalists_published_at: new Date().toISOString(),
      })
      .eq("id", true);
    check(settingsError, "Gagal menerbitkan showcase untuk pengujian");
  }

  console.log("\nShowcase seed selesai.");
  console.log(`Akun: team01${SHOWCASE_DOMAIN} sampai team12${SHOWCASE_DOMAIN}`);
  console.log("Kata sandi semua akun: nilai SEED_PASSWORD.");
  console.log("Hapus dengan: npm run seed:showcase -- clear");
}

if (command === "clear") {
  await clearShowcase();
} else if (command === "seed") {
  await seedShowcase();
} else {
  console.error('Perintah tidak dikenal. Gunakan "seed" atau "clear".');
  process.exit(1);
}

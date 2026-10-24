// scripts/whatsapp-links.mjs
// Local-only helper page to distribute team portal credentials via WhatsApp.
// Usage:
//   npm run whatsapp                   -> Uses newest credentials-*.csv in private-output/
//   npm run whatsapp -- <path-to-csv>  -> Uses specified CSV file

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const DEADLINE = "10 November 2026 pukul 23.59 WITA";
const PRIVATE_OUTPUT_DIR = "private-output";
const TEMPLATE_PATH = path.join("scripts", "message-template.txt");

function loadLocalEnv() {
  if (process.env.PORTAL_URL) return;
  for (const file of [".env.local", ".env"]) {
    if (fs.existsSync(file) && typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(file);
      } catch {
        // ignore
      }
    }
  }
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

function stripFormulaPrefix(val) {
  const str = String(val ?? "").trim();
  if (str.startsWith("'")) {
    return str.slice(1);
  }
  return str;
}

function findNewestCredentialsCsv() {
  if (!fs.existsSync(PRIVATE_OUTPUT_DIR)) return null;
  const files = fs
    .readdirSync(PRIVATE_OUTPUT_DIR)
    .filter((f) => f.startsWith("credentials-") && f.endsWith(".csv"))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(PRIVATE_OUTPUT_DIR, files[0]) : null;
}

function main() {
  loadLocalEnv();

  const portalUrl = process.env.PORTAL_URL?.trim();
  if (!portalUrl) {
    console.error("\n[ERROR] Variabel PORTAL_URL belum diatur di environment (.env atau .env.local).");
    console.error("PORTAL_URL diperlukan untuk mengisi placeholder {login_url} di pesan WhatsApp.");
    console.error("Silakan tambahkan ke .env, contoh:\n  PORTAL_URL=https://mit-week.vercel.app\n");
    process.exit(1);
  }

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`File template pesan tidak ditemukan di: ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  const templateContent = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  // Determine input CSV path
  let csvPath = process.argv[2];
  if (!csvPath || csvPath.startsWith("-")) {
    csvPath = findNewestCredentialsCsv();
  }

  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error("\n[ERROR] File credentials CSV tidak ditemukan.");
    if (csvPath) {
      console.error(`Path tidak valid: ${csvPath}`);
    } else {
      console.error("Tidak ada file credentials-*.csv di private-output/.");
      console.error("Jalankan 'npm run onboard -- --commit' terlebih dahulu atau tentukan path file CSV.");
    }
    process.exit(1);
  }

  console.log(`Membaca file kredensial : ${csvPath}`);
  console.log(`Portal URL              : ${portalUrl}`);
  console.log(`Deadline karya          : ${DEADLINE}`);

  const rawCsv = fs.readFileSync(csvPath, "utf-8");
  let records;
  try {
    records = parse(rawCsv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
    });
  } catch (err) {
    console.error(`Gagal membaca CSV: ${err.message}`);
    process.exit(1);
  }

  if (records.length === 0) {
    console.error("File CSV kredensial kosong.");
    process.exit(1);
  }

  const teams = records.map((r) => {
    const team_code = stripFormulaPrefix(r.team_code);
    const team_name = stripFormulaPrefix(r.team_name);
    const leader_name = stripFormulaPrefix(r.leader_name);
    const email = stripFormulaPrefix(r.email);
    const phone = stripFormulaPrefix(r.phone);
    const password = stripFormulaPrefix(r.password);

    const message = templateContent
      .replaceAll("{leader_name}", leader_name)
      .replaceAll("{team_name}", team_name)
      .replaceAll("{team_code}", team_code)
      .replaceAll("{email}", email)
      .replaceAll("{password}", password)
      .replaceAll("{login_url}", portalUrl)
      .replaceAll("{deadline}", DEADLINE);

    const isValidPhone = Boolean(phone && /^62\d{8,13}$/.test(phone));

    return {
      team_code,
      team_name,
      leader_name,
      email,
      phone,
      password,
      message,
      isValidPhone,
    };
  });

  const ts = formatTimestamp();
  const outputPath = path.join(PRIVATE_OUTPUT_DIR, `whatsapp-links-${ts}.html`);

  // Safely escape JSON data so <script> cannot be terminated or inject markup
  const safeJsonData = JSON.stringify(teams).replace(/</g, "\\u003c");

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pengiriman WhatsApp Kredensial - MIT-WEEK 2026</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --success: #16a34a;
      --success-hover: #15803d;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .subtitle { color: var(--text-muted); font-size: 14px; }

    .warning-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--danger);
      color: #fca5a5;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .stats-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      padding: 12px 18px;
      border-radius: 8px;
      min-width: 140px;
    }
    .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 22px; font-weight: 700; margin-top: 4px; }

    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .search-input {
      flex: 1;
      min-width: 250px;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 14px;
    }
    .filter-btn {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s;
    }
    .filter-btn.active {
      background: var(--primary);
      border-color: var(--primary);
    }

    .table-container {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; }
    th {
      background: #1e293b;
      padding: 12px 16px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 13px;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr.sent-row {
      opacity: 0.55;
      background: rgba(22, 163, 74, 0.05);
    }
    tr.sent-row:hover { opacity: 0.85; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: all 0.15s;
    }
    .btn-wa {
      background: #25d366;
      color: #000;
      font-weight: 600;
    }
    .btn-wa:hover { background: #22bf5b; }
    .btn-wa:disabled {
      background: #334155;
      color: #64748b;
      cursor: not-allowed;
    }
    .btn-copy {
      background: #334155;
      color: var(--text);
    }
    .btn-copy:hover { background: #475569; }
    .btn-copy.copied {
      background: var(--success);
      color: #fff;
    }

    .phone-warning {
      color: #f87171;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }
    .badge-code {
      font-family: monospace;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .checkbox-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .checkbox-wrap input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--success);
    }

    .actions-cell {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .msg-preview {
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: underline;
      margin-top: 4px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Pengiriman Akun Peserta via WhatsApp</h1>
      <p class="subtitle">MIT-WEEK 2026 Web Development &bull; Halaman lokal pengiriman kredensial</p>
    </div>

    <div class="warning-banner">
      <span>⚠️ PERINGATAN: File ini berisi kata sandi akun peserta. Hapus file HTML ini dari disk setelah seluruh pesan berhasil dikirim.</span>
    </div>

    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-label">Total Tim</div>
        <div class="stat-value" id="stat-total">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sudah Terkirim</div>
        <div class="stat-value" style="color: #4ade80;" id="stat-sent">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Belum Terkirim</div>
        <div class="stat-value" style="color: #f87171;" id="stat-pending">0</div>
      </div>
    </div>

    <div class="controls">
      <input type="text" id="search-box" class="search-input" placeholder="Cari kode tim, nama tim, ketua, atau nomor HP...">
      <button type="button" class="filter-btn active" data-filter="all">Semua</button>
      <button type="button" class="filter-btn" data-filter="pending">Belum Terkirim</button>
      <button type="button" class="filter-btn" data-filter="sent">Sudah Terkirim</button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Kirim?</th>
            <th style="width: 100px;">Kode Tim</th>
            <th>Nama Tim</th>
            <th>Ketua Tim</th>
            <th>No. WhatsApp</th>
            <th>Email</th>
            <th style="width: 280px;">Aksi</th>
          </tr>
        </thead>
        <tbody id="teams-tbody"></tbody>
      </table>
    </div>
  </div>

  <script id="teams-data" type="application/json">
${safeJsonData}
  </script>

  <script>
    (function () {
      var rawData = document.getElementById('teams-data').textContent;
      var teams = JSON.parse(rawData);
      var currentFilter = 'all';
      var searchQuery = '';

      var tbody = document.getElementById('teams-tbody');
      var statTotal = document.getElementById('stat-total');
      var statSent = document.getElementById('stat-sent');
      var statPending = document.getElementById('stat-pending');
      var searchBox = document.getElementById('search-box');
      var filterButtons = document.querySelectorAll('.filter-btn');

      function isSent(teamCode) {
        return localStorage.getItem('sent_' + teamCode) === 'true';
      }

      function updateStats() {
        var sentCount = 0;
        teams.forEach(function (t) {
          if (isSent(t.team_code)) sentCount++;
        });
        statTotal.textContent = String(teams.length);
        statSent.textContent = String(sentCount);
        statPending.textContent = String(teams.length - sentCount);
      }

      function render() {
        while (tbody.firstChild) {
          tbody.removeChild(tbody.firstChild);
        }

        var visibleTeams = teams.filter(function (team) {
          var sent = isSent(team.team_code);
          if (currentFilter === 'pending' && sent) return false;
          if (currentFilter === 'sent' && !sent) return false;

          if (searchQuery) {
            var q = searchQuery.toLowerCase();
            var matches =
              team.team_code.toLowerCase().includes(q) ||
              team.team_name.toLowerCase().includes(q) ||
              team.leader_name.toLowerCase().includes(q) ||
              team.phone.includes(q) ||
              team.email.toLowerCase().includes(q);
            if (!matches) return false;
          }

          return true;
        });

        if (visibleTeams.length === 0) {
          var emptyRow = document.createElement('tr');
          var emptyCell = document.createElement('td');
          emptyCell.colSpan = 7;
          emptyCell.style.textAlign = 'center';
          emptyCell.style.padding = '32px';
          emptyCell.style.color = 'var(--text-muted)';
          emptyCell.textContent = 'Tidak ada tim yang sesuai filter.';
          emptyRow.appendChild(emptyCell);
          tbody.appendChild(emptyRow);
          return;
        }

        visibleTeams.forEach(function (team) {
          var tr = document.createElement('tr');
          if (isSent(team.team_code)) {
            tr.classList.add('sent-row');
          }

          // Checkbox cell
          var tdCheck = document.createElement('td');
          tdCheck.className = 'checkbox-wrap';
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.title = 'Tandai sudah terkirim';
          cb.checked = isSent(team.team_code);
          cb.addEventListener('change', function () {
            if (this.checked) {
              localStorage.setItem('sent_' + team.team_code, 'true');
              tr.classList.add('sent-row');
            } else {
              localStorage.removeItem('sent_' + team.team_code);
              tr.classList.remove('sent-row');
            }
            updateStats();
          });
          tdCheck.appendChild(cb);
          tr.appendChild(tdCheck);

          // Team code cell
          var tdCode = document.createElement('td');
          var spanCode = document.createElement('span');
          spanCode.className = 'badge-code';
          spanCode.textContent = team.team_code;
          tdCode.appendChild(spanCode);
          tr.appendChild(tdCode);

          // Team name cell
          var tdName = document.createElement('td');
          var strongName = document.createElement('strong');
          strongName.textContent = team.team_name;
          tdName.appendChild(strongName);
          tr.appendChild(tdName);

          // Leader name cell
          var tdLeader = document.createElement('td');
          tdLeader.textContent = team.leader_name;
          tr.appendChild(tdLeader);

          // Phone cell
          var tdPhone = document.createElement('td');
          tdPhone.textContent = team.phone || '-';
          if (!team.isValidPhone) {
            var warn = document.createElement('span');
            warn.className = 'phone-warning';
            warn.textContent = 'Format nomor HP tidak valid (butuh 62...)';
            tdPhone.appendChild(warn);
          }
          tr.appendChild(tdPhone);

          // Email cell
          var tdEmail = document.createElement('td');
          tdEmail.textContent = team.email;
          tr.appendChild(tdEmail);

          // Actions cell
          var tdActions = document.createElement('td');
          var wrapActions = document.createElement('div');
          wrapActions.className = 'actions-cell';

          // Kirim via WhatsApp link/button
          var waBtn = document.createElement('a');
          waBtn.className = 'btn btn-wa';
          waBtn.textContent = 'Kirim WhatsApp';
          if (team.isValidPhone) {
            waBtn.href = 'https://wa.me/' + team.phone + '?text=' + encodeURIComponent(team.message);
            waBtn.target = '_blank';
            waBtn.rel = 'noopener noreferrer';
            waBtn.addEventListener('click', function () {
              cb.checked = true;
              localStorage.setItem('sent_' + team.team_code, 'true');
              tr.classList.add('sent-row');
              updateStats();
            });
          } else {
            waBtn.href = '#';
            waBtn.disabled = true;
            waBtn.style.pointerEvents = 'none';
            waBtn.style.opacity = '0.4';
          }
          wrapActions.appendChild(waBtn);

          // Salin Pesan button
          var copyBtn = document.createElement('button');
          copyBtn.type = 'button';
          copyBtn.className = 'btn btn-copy';
          copyBtn.textContent = 'Salin Pesan';
          copyBtn.addEventListener('click', function () {
            navigator.clipboard.writeText(team.message).then(function () {
              copyBtn.textContent = 'Tersalin!';
              copyBtn.classList.add('copied');
              setTimeout(function () {
                copyBtn.textContent = 'Salin Pesan';
                copyBtn.classList.remove('copied');
              }, 1500);
            });
          });
          wrapActions.appendChild(copyBtn);

          tdActions.appendChild(wrapActions);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        });
      }

      searchBox.addEventListener('input', function (e) {
        searchQuery = e.target.value.trim();
        render();
      });

      filterButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          filterButtons.forEach(function (b) { b.classList.remove('active'); });
          this.classList.add('active');
          currentFilter = this.getAttribute('data-filter');
          render();
        });
      });

      updateStats();
      render();
    })();
  </script>
</body>
</html>`;

  fs.mkdirSync(PRIVATE_OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputPath, htmlContent, "utf-8");

  console.log("\n========================================================");
  console.log("  HALAMAN WHATSAPP BERHASIL DIBUAT");
  console.log("========================================================");
  console.log(`Total tim dimuat  : ${teams.length}`);
  console.log(`File HTML lokal   : ${outputPath}`);
  console.log("\nBuka file di atas langsung di browser (klik ganda atau open in browser).");
  console.log("Fitur:");
  console.log("- Tombol 'Kirim WhatsApp' membuka chat dengan template pesan yang sudah diisi.");
  console.log("- Tombol 'Salin Pesan' menyalin teks pesan langsung ke clipboard.");
  console.log("- Checkbox 'Kirim?' tersimpan otomatis di localStorage agar dapat dilanjutkan kapan saja.");
  console.log("- Pencarian cepat berdasarkan kode tim, nama tim, nama ketua, nomor HP, atau email.");
  console.log("\n[PENTING] File HTML ini berisi kata sandi akun tim. Hapus file ini setelah seluruh pesan dikirim!");
}

main();

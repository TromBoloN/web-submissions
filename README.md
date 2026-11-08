# MIT-WEEK 2026 — Web Development Competition Portal

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An all-in-one competition management and submission platform developed specifically for the **Web Development Competition** track at **MIT-WEEK 2026**.

---

## 📌 Context: About MIT-WEEK 2026

**MIT-WEEK (Mulawarman Informatics Technology Week) 2026** is an annual flagship technological event that brings together students, developers, and tech enthusiasts for national seminars, hands-on workshops, and competitive challenges across multiple IT disciplines run by the Association of Informatics, Faculty of Engineering, Mulawarman University.

This web application serves as the **official competition platform for the Web Development Competition** branch of MIT-WEEK 2026. It manages the full lifecycle of the contest:

- **Participant Onboarding & Submissions:** Contestants submit deliverables, study competition briefs, and inspect official rubrics and scores.
- **Multi-Stage Adjudication:** Preliminary and final rounds scored independently by an expert panel of judges with real-time weighted rubrics and blind scoring.
- **Committee Operations:** Organizers oversee teams, manage schedules, configure case studies, monitor judging progress, release results, and export rankings.

---

## 🚀 Key Modules & Capabilities

### 👨‍💻 1. Contestant Portal (`/team`)

Designed to give teams an intuitive and distraction-free submission experience:

- **Team Dashboard (`/team`):**
  - Displays verified team code (`MIT-XXX`), registered team name, educational institution, team leader, and member roster.
  - One-click copy for the unique team code, used for official communications and fallback backup forms.
  - Real-time deadline countdown calculating clock offsets between client and server time to prevent local clock tampering.
- **Deliverable Submission System:**
  - Repositories: GitHub URL (`https://github.com/...`).
  - Deployments: Live Demo URL (`http://` or `https://`).
  - Demonstrations: Video Walkthrough URL (`http://` or `https://`).
  - Team notes dedicated for the judges.
- **Draft & Submit Workflow:**
  - _Simpan Draf:_ Save partial deliverables anytime before the deadline.
  - _Kirim Submission:_ Validates all required links and transitions status to `Terkirim` (Submitted).
  - _Perbarui Submission:_ Allows post-submission updates without reverting status to draft.
- **Case Study Viewer (`/team/studi-kasus`):**
  - Direct in-app access to the official case study and problem statement rendered from Markdown.
- **Team Results & Feedback (`/team/hasil`):**
  - Conditionally enabled in navigation once the committee officially releases results.
  - Prominent total weighted score with panel count indicator (_"Dinilai oleh N juri"_).
  - Rubric criterion breakdown table showing Juknis indicators, average judge scores, rubric weights, and final contributions.
  - Anonymized judicial feedback list with zero identifiable judge metadata.
  - Dynamic Finalist tab exclusively unlocked for Top 5 Finalist teams.
  - Graceful edge-case handling for unsubmitted entries, disqualifications, and unreleased stages.
- **Account Security (`/team/kata-sandi`):**
  - Self-service password updates with current password verification.

---

### ⚖️ 2. Judicial Evaluation Panel (`/judge`)

Built for fair, confidential, and structured evaluation:

- **Judging Queue (`/judge`):**
  - Filterable by stage (_Babak Awal_ / _Babak Final_) and scoring progress (_Belum dinilai_, _Draf_, _Terkunci_).
  - High-level progress counter showing completed evaluations versus assigned queue.
  - Strict blind judging: Judges evaluate submissions independently; scorecards from peer judges remain completely invisible.
  - Eligible feed: Displays only active, non-disqualified teams with submitted deliverables.
- **Scoring Interface (`/judge/nilai/[tahap]/[teamId]`):**
  - Project showcase card with safe external openers for GitHub repository, live demo, and demo video, alongside contestant notes.
  - Formal rubric entry inputs:
    - **Preliminary Stage:** Functionality (35%), Case Study Fit (25%), UI/UX (20%), Code Quality (10%), Documentation (10%).
    - **Final Stage:** Functionality (25%), Case Study Fit (20%), UI/UX (15%), Code Quality (10%), Presentation & Q&A (20%), Documentation (10%).
  - Live client-side weighted preview calculation with strict two-decimal precision.
  - _Simpan Nilai_ (draft) vs. _Simpan & Kunci_ (lock) with confirmation dialog.
- **Release-Driven Read-Only Enforcement:**
  - When stage results are released by the committee, the scoring form automatically locks into a read-only view with alert banners.
  - Backed by database triggers preventing `INSERT`, `UPDATE`, or `DELETE` writes once released.
- **Case Study Viewer (`/judge/studi-kasus`):**
  - In-portal reference for the competition brief and rubrics.
- **Account Security (`/judge/kata-sandi`):**
  - Self-service password updates.

---

### 🛡️ 3. Administrative Control Center (`/admin`)

Full-spectrum operational management for the organizing committee:

- **Dashboard Overview (`/admin`):**
  - KPI metric cards: Total Teams, Finalists, Active Judges, and Submissions count.
  - Active competition deadline status with last-accepted-minute boundary precision.
  - Quick action links to all administrative workflows.
- **Account Management (`/admin/akun`):**
  - Provision accounts for Admins, Judges (with stage assignments: `preliminary`, `final`, or `both`), and Teams.
  - Instant status toggle: Immediate activation and deactivation with server-side revocation.
  - Administrative password resets and multi-attribute search/filtering.
- **Team Management (`/admin/tim`):**
  - Team directory with member rosters, institutions, and WhatsApp contact links.
  - Disqualification toggle with immediate contestant access revocation.
- **Finalist Selection (`/admin/finalis`):**
  - Dedicated finalist management interface for locking in the Top 5 Finalist teams.
  - Counter guards and confirmation dialogs preventing over-assignment.
- **Submission Monitoring & Admin Overrides (`/admin/submission`):**
  - Real-time TanStack Table displaying all registered teams.
  - Status badges: `Terkirim` (green), `Draf` (amber), and `Belum dikirim` (neutral).
  - Safe link openers with `rel="noopener noreferrer"` and visual URL truncation.
  - _Admin Override Modal:_ Enables committee members to manually update or input team links (e.g., synchronizing emergency fallback submissions) unrestricted by deadlines.
  - _CSV Data Export (`/admin/submission/export`):_ Instant UTF-8 BOM spreadsheet export with sanitization against formula injection.
- **Leaderboard & Rankings (`/admin/peringkat`):**
  - Real-time aggregate rankings powered by PostgreSQL views (`preliminary_ranking`, `final_ranking`).
  - Stage tabs for Preliminary and Final rounds with rank badges, judge count, criteria averages, and total scores.
  - _Rankings CSV Export (`/admin/peringkat/export`):_ Downloadable rankings spreadsheet for jury review and archival.
- **Competition Settings (`/admin/pengaturan`):**
  - Dynamic deadline configuration interface in WITA (UTC+8) with strict "+1 minute" boundary rule.
  - Guidebook (_Juknis_) URL configuration.
  - Case study Markdown editor.
  - **Results Release Toggles ("Rilis Hasil"):**
    - Independent switches for Preliminary and Final stage results.
    - Live judging progress indicators with warning alerts if judges have unfinished scorecards.
    - Confirmation modals outlining participant visibility before release.

---

## 🔒 Security & Data Integrity

- **Database-Level Row Level Security (RLS):** All tables (`profiles`, `teams`, `submissions`, `competition_settings`, `preliminary_scores`, `final_scores`) enforce RLS policies directly in PostgreSQL. Client UI checks are treated solely as UX enhancements.
- **Server-Side Session Validation:** Every Server Action strictly invokes `getCurrentProfile()`, verifying the user's role and `is_active` status before performing any operation.
- **IDOR Immunity:** Team and judge actions resolve IDs purely from the authenticated server session (`auth.uid()`), never accepting user-supplied IDs from client payloads.
- **Secure Results Exposure (RPC):** Team score summaries and comments are delivered exclusively through `SECURITY DEFINER` function `public.get_my_results()` with an empty `search_path`. Direct `SELECT` policies on score tables are prohibited for contestants. Comments are randomly sorted (`md5(feedback)`) with judge identities, timestamps, and raw peer scores stripped.
- **Database Trigger Locks:**
  - Timestamp immutability triggers on submissions.
  - Pre-release score locks: Triggers `trg_preliminary_scores_release_lock` and `trg_final_scores_release_lock` block `INSERT`, `UPDATE`, and `DELETE` on score tables whenever a stage is released.
- **Spreadsheet Formula Injection Defense:** CSV export cells starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically neutralized to prevent Dynamic Data Exchange (DDE) exploits.
- **Tab-Nabbing Protection:** All external links render with `rel="noopener noreferrer"` and `target="_blank"`.

---

## 📂 Project Architecture

```
web-submissions/
├── docs/                            # Documentation library, source map, and phase plans
│   ├── documentation/               # Setup, architecture, data, API, operations, and contribution guides
│   │   └── README.md                # Documentation index
│   └── development/                 # Step-by-step feature implementation specifications
├── src/
│   ├── proxy.ts                     # Session refresh & route redirect (Next.js 16)
│   ├── app/
│   │   ├── (auth)/login/            # Authentication & sign-in screens
│   │   ├── (main)/
│   │   │   ├── admin/               # Administrator control center
│   │   │   │   ├── akun/            # Account provisioning & management
│   │   │   │   ├── finalis/         # Finalist selection & lock
│   │   │   │   ├── pengaturan/      # Deadlines, case study & results release
│   │   │   │   ├── peringkat/       # Aggregate leaderboard & CSV export
│   │   │   │   ├── submission/      # Deliverable monitoring, admin edit & export
│   │   │   │   └── tim/             # Team roster & disqualification management
│   │   │   ├── dashboard/           # Shared dashboard shell & navigation
│   │   │   ├── judge/               # Judging queue & rubric scoring interface
│   │   │   │   ├── nilai/           # Stage-based scoring forms ([tahap]/[teamId])
│   │   │   │   └── studi-kasus/     # Case study reference
│   │   │   └── team/                # Contestant submission portal
│   │   │       ├── hasil/           # Official released results & feedback
│   │   │       └── studi-kasus/     # Contestant case study brief
│   ├── components/
│   │   ├── ui/                      # Reusable shadcn/ui components (radix-nova)
│   │   └── change-password-form.tsx # Shared password update component
│   ├── lib/
│   │   ├── auth.ts                  # Server-side auth helpers (getCurrentProfile, requireRole)
│   │   ├── rubric.ts                # Competition rubric weights & calculations
│   │   ├── deadline.ts              # WITA timezone calculations & boundary rules
│   │   ├── csv.ts                   # CSV serialization & formula injection guards
│   │   └── supabase/                # Client, Server, and Admin Supabase instances
│   ├── navigation/sidebar/          # Role-based dynamic sidebar item registry
│   └── types/database.ts            # Supabase database TypeScript definitions
├── supabase/
│   └── migrations/                  # Schema, RLS, functions, views & triggers SQL
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack & Dependencies

| Layer                  | Technology                                                     |
| :--------------------- | :------------------------------------------------------------- |
| **Framework**          | Next.js 16.4 (App Router with Turbopack), React 19, TypeScript |
| **Styling**            | Tailwind CSS v4, Lucide React Icons                            |
| **Component Library**  | shadcn/ui (Radix UI primitives)                                |
| **Backend & Database** | Supabase (PostgreSQL 15+, Auth, Row Level Security)            |
| **Form Management**    | React Hook Form, Zod schema validation                         |
| **Data Tables**        | TanStack Table v9                                              |
| **Code Quality**       | Biome (linter & formatter)                                     |

---

## 🏁 Getting Started Locally

### Prerequisites

- **Node.js** v20.x or higher
- **npm** v10.x or higher
- A Supabase project (local or cloud-hosted)

### 1. Clone the Repository

```bash
git clone https://github.com/TromBoloN/web-submissions.git
cd web-submissions
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

> **Note:** The `SUPABASE_SERVICE_ROLE_KEY` is strictly server-side and will never be exposed to browser bundles.

### 4. Database Setup

Apply the schema migrations located in `supabase/migrations/` sequentially via the Supabase CLI or the Supabase SQL Editor:

1. `20261020000000_init_schema.sql` — Initial schema, RLS, functions, and ranking views.
2. `20261024000000_contestant_features.sql` - Basic schema for constestant tables
3. `20261025000000_judging_and_contact.sql` - Basic schema for judging and contact tables
4. `20261026000000_team_results.sql` — Results release flags and secure `get_my_results()` RPC function.
5. `20261027000000_score_release_lock.sql` — Database triggers enforcing score freeze upon results release.
6. `20261108000000_fix_first_submitted_at.sql` - First submit fix.
7. `20261108010000_drafts_recusals_and_private_notes.sql` - Schema for draft and judge private notes.

### 5. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

For the complete setup guide, environment-variable reference, migration workflow, and common fixes, see [`docs/documentation/SETUP.md`](docs/documentation/SETUP.md).

---

## 📜 Available Scripts

| Command           | Purpose                                                |
| :---------------- | :----------------------------------------------------- |
| `npm run dev`     | Starts local Next.js development server with Turbopack |
| `npm run build`   | Compiles the production build and type-checks          |
| `npm run lint`    | Runs Biome linter across the codebase                  |
| `npm run format`  | Automatically formats files using Biome                |
| `npm run check`   | Checks formatting and linting concurrently             |
| `npm run backup`  | runs a backup database script and save it as json      |
| `npm run restore` | runs a restore script from the json backup             |
| `npm run onboard` | converts registratrants data into a csv for accounts   |

## 📚 Documentation

The documentation library is organized by task:

- [Documentation index](docs/documentation/README.md)
- [Setup and development](docs/documentation/SETUP.md)
- [Architecture and data flow](docs/documentation/ARCHITECTURE.md)
- [Data model and security](docs/documentation/DATA-MODEL.md)
- [Application reference](docs/documentation/API.md)
- [Operations and incident runbook](docs/documentation/OPERATIONS.md)
- [Frontend conventions](docs/documentation/FRONTEND.md)
- [Contributing](docs/documentation/CONTRIBUTING.md)

The application currently exposes Next.js pages, Server Actions, two admin CSV routes, and one authenticated Supabase RPC; it does not have a separate REST/GraphQL API. The application reference documents those actual interfaces.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

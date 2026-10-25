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

**MIT-WEEK (Mulawarman Informatics Technology Week) 2026** is an annual flagship technological event that brings together students, developers, and tech enthusiasts for national seminars, hands-on workshops, and competitive challenges across multiple IT disciplines run by Association of Informatics, Faculty of Engineering, Mulawarman University.

This web application serves as the **official competition platform for the Web Development Competition** branch of MIT-WEEK 2026. It manages the full lifecycle of the contest:

- **Participant Onboarding & Submissions:** Contestants submit and refine their web projects within tight deadlines.
- **Multi-Stage Adjudication:** Preliminary and final rounds scored independently by an expert panel of judges.
- **Committee Operations:** Organizers oversee teams, manage schedules, monitor deliverables, and export results.

---

## 🚀 Key Modules & Capabilities

### 👨‍💻 1. Contestant Portal (`/team`)

Designed to give teams an intuitive and distraction-free submission experience:

- **Team Dashboard:** Displays verified team code (`MIT-XXX`), registered team name, educational institution, team leader, and member roster.
- **Copy Helper:** One-click copy for the unique team code, used for official communications and fallback backup forms.
- **Real-Time Deadline Countdown:** Dynamic countdown timer calculating clock offsets between client and server time to prevent local clock tampering.
- **Link-Based Submission System:** Fields for project deliverables:
  - GitHub Repository URL (restricted to valid `https://github.com/` repositories)
  - Live Demo Deployment URL (`http://` or `https://`)
  - Video Demonstration / Walkthrough URL (`http://` or `https://`)
- **Draft & Submit Workflow:**
  - **Simpan Draf:** Save incomplete or in-progress URLs anytime before the deadline.
  - **Kirim Submission:** Validates all three links and transitions status to `Terkirim` (Submitted).
  - **Perbarui Submission:** Allows post-submission updates without reverting status to draft.
- **Automatic Read-Only Locking:** When the deadline expires or if a team is disqualified, the form converts into a read-only review view with clear status alert banners.
- **Submission Timestamps:** Transparent display of first save (`Pertama disimpan`) and last modified (`Terakhir diubah`) in Central Indonesia Time (WITA / UTC+8).

### ⚖️ 2. Judicial Evaluation Panel (`/judge`)

Built for fair, confidential, and structured evaluation:

- **Two-Stage Judging Pipeline:**
  - **Preliminary Round (_Babak Penyisihan_):** Assessment of all active submissions against core judging criteria.
  - **Final Round (_Babak Final_):** Restricted evaluation exclusively for the Top 5 Finalist teams.
- **Strict Blind Judging & Privacy:** Judges evaluate submissions independently; no judge can view or edit scorecards filled by other judges.
- **Eligible Submission Feeds:** Automatically displays only teams with completed submissions (`submitted`) who have not been disqualified.

### 🛡️ 3. Administrative Control Center (`/admin`)

Full-spectrum operational management for the organizing committee:

- **Dashboard Overview (`/admin`):**
  - KPI metric cards: Total Teams, Finalist Count, Active Judges, and Submissions count.
  - Active competition deadline status with last-accepted-minute precision.
  - Quick action links to all administrative workflows.
- **Account Management (`/admin/akun`):**
  - Provision accounts for Admins, Judges (with stage assignment: `preliminary`, `final`, or `both`), and Teams.
  - Account status toggle: Instant activation and deactivation with server-side revocation.
  - Administrative password resets.
  - Multi-attribute search and role filtering.
- **Team Management (`/admin/tim`):**
  - Team directory with member rosters and institutions.
  - Finalist selection toggles (Top 5 lock with counter warning).
  - Disqualification toggle with immediate contestant access revocation.
- **Submission Monitoring (`/admin/submission`):**
  - Real-time TanStack Table displaying all teams (including teams with no submission yet).
  - Summary badges: `Terkirim` (green), `Draf` (amber), and `Belum dikirim` (dashed).
  - Safe link openers with `rel="noopener noreferrer"` and visual URL truncation.
  - Filter by status (`Semua`, `Terkirim`, `Draf`, `Belum dikirim`) and keyword search.
  - **Admin Submission Override:** Modal dialog enabling committee members to manually update or input team links (e.g., synchronizing emergency Google Form submissions) unrestricted by deadlines.
- **CSV Data Export (`/admin/submission/export`):**
  - Instant one-click download of `submissions-YYYY-MM-DD.csv`.
  - Formatted with UTF-8 BOM (`\uFEFF`) for immediate, seamless opening in Microsoft Excel without encoding glitches.
  - Includes full team details, submission links, timestamps (in WITA), finalist status, and disqualification status.
  - Fully excludes passwords, sensitive account emails, and judicial scores.
- **Competition Settings (`/admin/pengaturan`):**
  - Dynamic deadline configuration interface with WITA timezone input.
  - Strict "last accepted minute" time boundary calculation.

### 🎨 4. Theme & Layout Personalization

- **Theme Presets:** Integrated theme switcher supporting Light Mode, Dark Mode, and distinct aesthetic presets (Default Neutral, Tangerine, Neo Brutalism, Soft Pop).
- **Responsive Layout:** Adaptive sidebar navigation with collapsed icon-only mode for mobile and compact desktop screens.

---

## 🔒 Security & Data Integrity

- **Database-Level Row Level Security (RLS):** All tables (`profiles`, `teams`, `submissions`, `competition_settings`, `preliminary_scores`, `final_scores`) enforce RLS policies directly in PostgreSQL. Client UI checks are treated solely as UX enhancements.
- **Server-Side Session Validation:** Every Server Action and Route Handler strictly invokes `getCurrentProfile()`, verifying the user's role and `is_active` status before performing any operation.
- **IDOR Immunity:** Team submission actions resolve team IDs purely from the authenticated server session (`auth.uid()`), never accepting user-supplied team IDs from client payloads.
- **Database Trigger Locks:** PostgreSQL triggers prevent tampering with `submitted_at` timestamps and ensure `team_id` immutability upon updates.
- **Spreadsheet Formula Injection Defense:** CSV export cells starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically prefixed with a single quote (`'`) to neutralize Dynamic Data Exchange (DDE) exploits.
- **Tab-Nabbing Protection:** All external contestant links render with `rel="noopener noreferrer"` and `target="_blank"`.

---

## 📂 Project Architecture

```
mit-week-portal/
├── src/
│   ├── app/
│   │   ├── (main)/
│   │   │   ├── admin/               # Administrator routes
│   │   │   │   ├── akun/            # Account provisioning & management
│   │   │   │   ├── pengaturan/      # Competition deadline settings
│   │   │   │   ├── submission/      # Submission monitoring & admin edits
│   │   │   │   │   └── export/      # CSV export Route Handler
│   │   │   │   └── tim/             # Team management & finalist toggling
│   │   │   ├── dashboard/           # Shared shell & layout components
│   │   │   ├── judge/               # Judging & score entry panel
│   │   │   └── team/                # Contestant submission portal
│   │   ├── login/                   # Authentication screen
│   │   ├── layout.tsx               # Root application layout
│   │   └── page.tsx                 # Role-based route dispatcher
│   ├── components/
│   │   └── ui/                      # Reusable shadcn/ui components
│   ├── lib/
│   │   ├── supabase/                # Client, Server, and Admin Supabase clients
│   │   ├── auth.ts                  # Auth helpers (getCurrentProfile, requireRole)
│   │   ├── deadline.ts              # WITA timezone & deadline calculations
│   │   └── user-display.ts          # Profile presentation utilities
│   ├── navigation/
│   │   └── sidebar/                 # Role-dependent navigation configuration
│   └── types/
│       └── database.ts              # Generated Supabase database TypeScript definitions
├── supabase/
│   └── migrations/                  # Schema, RLS policies, views & triggers SQL
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

Apply the initial schema, functions, triggers, and RLS policies using the Supabase CLI or by executing the SQL script located at:

```
supabase/migrations/20261020000000_init_schema.sql
```

### 5. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📜 Available Scripts

| Command          | Purpose                                                |
| :--------------- | :----------------------------------------------------- |
| `npm run dev`    | Starts local Next.js development server with Turbopack |
| `npm run build`  | Compiles the production build and type-checks          |
| `npm run lint`   | Runs Biome linter across the codebase                  |
| `npm run format` | Automatically formats files using Biome                |
| `npm run check`  | Checks formatting and linting concurrently             |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

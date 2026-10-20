-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Migration 001: schema, helper functions, triggers, RLS, ranking views
-- Urutan: enum -> tabel -> helper function -> trigger -> RLS -> view
-- ============================================================================

-- ============================================================================
-- 0. ENUM TYPES
-- ============================================================================
CREATE TYPE user_role_type       AS ENUM ('admin', 'judge', 'team');
-- 'both' = juri yang menilai preliminary sekaligus final (hapus jika tidak dipakai)
CREATE TYPE judge_stage_type     AS ENUM ('preliminary', 'final', 'both');
CREATE TYPE submission_status_type AS ENUM ('draft', 'submitted');

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- A. Profiles (memperluas auth.users)
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL UNIQUE,
    full_name   TEXT NOT NULL,
    role        user_role_type NOT NULL DEFAULT 'team',
    judge_stage judge_stage_type DEFAULT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- judge_stage wajib diisi untuk juri, dan harus kosong untuk role lain
    CONSTRAINT judge_stage_matches_role
        CHECK ((role = 'judge') = (judge_stage IS NOT NULL))
);

-- B. Teams
CREATE TABLE public.teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_code       TEXT NOT NULL UNIQUE,   -- dipakai untuk mencocokkan data Google Form cadangan
    team_name       TEXT NOT NULL UNIQUE,
    institution     TEXT NOT NULL,
    leader_name     TEXT NOT NULL,
    members         TEXT[] NOT NULL DEFAULT '{}',
    is_finalist     BOOLEAN NOT NULL DEFAULT FALSE,
    is_disqualified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. Competition settings (satu baris saja) - modul "Deadline control"
CREATE TABLE public.competition_settings (
    id                   BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    -- Submission ditolak pada/setelah waktu ini (eksklusif).
    -- 11 Nov 2026 00:00 WITA = 10 Nov 2026 23:59:59 WITA masih diterima.
    submission_closes_at TIMESTAMPTZ NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.competition_settings (id, submission_closes_at)
VALUES (TRUE, '2026-11-11 00:00:00+08'::timestamptz);

-- D. Submissions
CREATE TABLE public.submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id       UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
    github_url    TEXT NOT NULL DEFAULT '',
    live_demo_url TEXT NOT NULL DEFAULT '',
    video_url     TEXT NOT NULL DEFAULT '',
    status        submission_status_type NOT NULL DEFAULT 'draft',
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- waktu pertama, tidak boleh tertimpa
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- waktu terakhir diubah

    CONSTRAINT github_url_format  CHECK (github_url    = '' OR github_url    ~* '^https?://'),
    CONSTRAINT live_url_format    CHECK (live_demo_url = '' OR live_demo_url ~* '^https?://'),
    CONSTRAINT video_url_format   CHECK (video_url     = '' OR video_url     ~* '^https?://'),
    -- Status 'submitted' hanya boleh jika ketiga URL terisi
    CONSTRAINT submitted_requires_urls
        CHECK (status = 'draft'
               OR (github_url <> '' AND live_demo_url <> '' AND video_url <> ''))
);

-- E. Preliminary scores
CREATE TABLE public.preliminary_scores (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id  UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

    functionality_score  NUMERIC(5,2) NOT NULL CHECK (functionality_score  BETWEEN 0 AND 100),
    case_study_fit_score NUMERIC(5,2) NOT NULL CHECK (case_study_fit_score BETWEEN 0 AND 100),
    ui_ux_score          NUMERIC(5,2) NOT NULL CHECK (ui_ux_score          BETWEEN 0 AND 100),
    code_quality_score   NUMERIC(5,2) NOT NULL CHECK (code_quality_score   BETWEEN 0 AND 100),
    documentation_score  NUMERIC(5,2) NOT NULL CHECK (documentation_score  BETWEEN 0 AND 100),

    total_weighted_score NUMERIC(5,2) GENERATED ALWAYS AS (
        (functionality_score  * 0.35) +
        (case_study_fit_score * 0.25) +
        (ui_ux_score          * 0.20) +
        (code_quality_score   * 0.10) +
        (documentation_score  * 0.10)
    ) STORED,

    feedback   TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_prelim_judge_team UNIQUE (judge_id, team_id)
);

-- F. Final scores
CREATE TABLE public.final_scores (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id  UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

    functionality_score   NUMERIC(5,2) NOT NULL CHECK (functionality_score   BETWEEN 0 AND 100),
    case_study_fit_score  NUMERIC(5,2) NOT NULL CHECK (case_study_fit_score  BETWEEN 0 AND 100),
    ui_ux_score           NUMERIC(5,2) NOT NULL CHECK (ui_ux_score           BETWEEN 0 AND 100),
    code_quality_score    NUMERIC(5,2) NOT NULL CHECK (code_quality_score    BETWEEN 0 AND 100),
    documentation_score   NUMERIC(5,2) NOT NULL CHECK (documentation_score   BETWEEN 0 AND 100),
    presentation_qa_score NUMERIC(5,2) NOT NULL CHECK (presentation_qa_score BETWEEN 0 AND 100),

    total_weighted_score NUMERIC(5,2) GENERATED ALWAYS AS (
        (functionality_score   * 0.25) +
        (case_study_fit_score  * 0.20) +
        (ui_ux_score           * 0.15) +
        (code_quality_score    * 0.10) +
        (documentation_score   * 0.10) +
        (presentation_qa_score * 0.20)
    ) STORED,

    feedback   TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_final_judge_team UNIQUE (judge_id, team_id)
);

-- Index untuk foreign key (menjaga performa RLS dan agregasi)
CREATE INDEX idx_prelim_scores_team ON public.preliminary_scores (team_id);
CREATE INDEX idx_final_scores_team  ON public.final_scores (team_id);

-- ============================================================================
-- 2. HELPER FUNCTIONS
--    Dibuat SETELAH tabel agar function berbahasa SQL lolos validasi.
--    SECURITY DEFINER + search_path kosong -> aman dan tanpa rekursi RLS.
-- ============================================================================

-- Role user saat ini. NULL jika akun dinonaktifkan -> semua policy role gagal.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.role::text
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active;
$$;

CREATE OR REPLACE FUNCTION public.current_user_judge_stage()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.judge_stage::text
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active;
$$;

-- Apakah submission masih dibuka?
CREATE OR REPLACE FUNCTION public.submission_open()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT statement_timestamp() < s.submission_closes_at
    FROM public.competition_settings AS s
    WHERE s.id;
$$;

-- Boleh tim saat ini membuat/mengubah submission untuk tim ini?
CREATE OR REPLACE FUNCTION public.team_can_submit(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(public.current_user_role() = 'team', FALSE)
       AND COALESCE(public.submission_open(), FALSE)
       AND EXISTS (
            SELECT 1 FROM public.teams AS t
            WHERE t.id = p_team_id
              AND t.profile_id = (SELECT auth.uid())
              AND NOT t.is_disqualified
       );
$$;

-- Boleh juri saat ini MELIHAT submission tim ini?
-- Juri preliminary/both: semua tim. Juri final: hanya finalis.
CREATE OR REPLACE FUNCTION public.judge_can_view_team(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(public.current_user_role() = 'judge', FALSE)
       AND (
            public.current_user_judge_stage() IN ('preliminary', 'both')
            OR EXISTS (
                SELECT 1 FROM public.teams AS t
                WHERE t.id = p_team_id AND t.is_finalist
            )
       );
$$;

-- Boleh juri saat ini memberi skor preliminary ke tim ini?
CREATE OR REPLACE FUNCTION public.judge_can_score_preliminary(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(public.current_user_role() = 'judge', FALSE)
       AND public.current_user_judge_stage() IN ('preliminary', 'both')
       AND EXISTS (
            SELECT 1
            FROM public.teams AS t
            JOIN public.submissions AS s ON s.team_id = t.id
            WHERE t.id = p_team_id
              AND NOT t.is_disqualified
              AND s.status = 'submitted'
       );
$$;

-- Boleh juri saat ini memberi skor final ke tim ini?
CREATE OR REPLACE FUNCTION public.judge_can_score_final(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(public.current_user_role() = 'judge', FALSE)
       AND public.current_user_judge_stage() IN ('final', 'both')
       AND EXISTS (
            SELECT 1
            FROM public.teams AS t
            JOIN public.submissions AS s ON s.team_id = t.id
            WHERE t.id = p_team_id
              AND t.is_finalist
              AND NOT t.is_disqualified
              AND s.status = 'submitted'
       );
$$;

-- Function helper tidak boleh dipanggil anonim lewat API
REVOKE EXECUTE ON FUNCTION
    public.current_user_role(),
    public.current_user_judge_stage(),
    public.submission_open(),
    public.team_can_submit(uuid),
    public.judge_can_view_team(uuid),
    public.judge_can_score_preliminary(uuid),
    public.judge_can_score_final(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
    public.current_user_role(),
    public.current_user_judge_stage(),
    public.submission_open(),
    public.team_can_submit(uuid),
    public.judge_can_view_team(uuid),
    public.judge_can_score_preliminary(uuid),
    public.judge_can_score_final(uuid)
TO authenticated;

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- Timestamp submission: submitted_at dikunci, updated_at otomatis, team_id dikunci
CREATE OR REPLACE FUNCTION public.set_submission_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.submitted_at := now();
    ELSE
        NEW.submitted_at := OLD.submitted_at;  -- waktu pertama tidak boleh berubah
        NEW.team_id      := OLD.team_id;       -- submission tidak boleh dipindah ke tim lain
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_submission_timestamps
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.set_submission_timestamps();

-- Skor: judge_id & team_id dikunci setelah dibuat, updated_at otomatis
CREATE OR REPLACE FUNCTION public.lock_score_keys()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.judge_id   := OLD.judge_id;
        NEW.team_id    := OLD.team_id;
        NEW.created_at := OLD.created_at;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prelim_lock_keys
BEFORE INSERT OR UPDATE ON public.preliminary_scores
FOR EACH ROW EXECUTE FUNCTION public.lock_score_keys();

CREATE TRIGGER trg_final_lock_keys
BEFORE INSERT OR UPDATE ON public.final_scores
FOR EACH ROW EXECUTE FUNCTION public.lock_score_keys();

-- updated_at untuk competition_settings
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_settings_touch
BEFORE UPDATE ON public.competition_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preliminary_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_scores          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- A. PROFILES
-- User tidak bisa mengubah profilnya sendiri (mencegah eskalasi role).
-- Profil sendiri tetap terbaca meski akun nonaktif, agar UI bisa menampilkan pesan.
-- ---------------------------------------------------------------------------
CREATE POLICY "Admin full access profiles" ON public.profiles
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- B. TEAMS
-- ---------------------------------------------------------------------------
CREATE POLICY "Admin full access teams" ON public.teams
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Judges read teams" ON public.teams
FOR SELECT TO authenticated
USING (public.current_user_role() = 'judge');

CREATE POLICY "Teams read own team" ON public.teams
FOR SELECT TO authenticated
USING (
    public.current_user_role() = 'team'
    AND profile_id = (SELECT auth.uid())
);

-- ---------------------------------------------------------------------------
-- C. COMPETITION SETTINGS
-- ---------------------------------------------------------------------------
CREATE POLICY "Admin full access settings" ON public.competition_settings
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Authenticated read settings" ON public.competition_settings
FOR SELECT TO authenticated
USING (public.current_user_role() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- D. SUBMISSIONS
-- ---------------------------------------------------------------------------
CREATE POLICY "Admin full access submissions" ON public.submissions
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

-- Juri hanya melihat submission berstatus 'submitted' sesuai tahap penilaiannya
CREATE POLICY "Judges read eligible submissions" ON public.submissions
FOR SELECT TO authenticated
USING (
    status = 'submitted'
    AND public.judge_can_view_team(team_id)
);

-- Tim selalu bisa membaca submission sendiri (juga setelah deadline)
CREATE POLICY "Teams read own submission" ON public.submissions
FOR SELECT TO authenticated
USING (
    public.current_user_role() = 'team'
    AND team_id IN (SELECT id FROM public.teams WHERE profile_id = (SELECT auth.uid()))
);

-- Tim hanya bisa menulis sebelum deadline, tidak jika didiskualifikasi
CREATE POLICY "Teams insert before deadline" ON public.submissions
FOR INSERT TO authenticated
WITH CHECK (public.team_can_submit(team_id));

CREATE POLICY "Teams update before deadline" ON public.submissions
FOR UPDATE TO authenticated
USING (public.team_can_submit(team_id))
WITH CHECK (public.team_can_submit(team_id));

-- Tidak ada policy DELETE untuk tim / juri.

-- ---------------------------------------------------------------------------
-- E. PRELIMINARY SCORES
-- ---------------------------------------------------------------------------
CREATE POLICY "Admin full access prelim" ON public.preliminary_scores
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Judges read own preliminary scores" ON public.preliminary_scores
FOR SELECT TO authenticated
USING (
    public.current_user_role() = 'judge'
    AND judge_id = (SELECT auth.uid())
);

CREATE POLICY "Prelim judges insert own scores" ON public.preliminary_scores
FOR INSERT TO authenticated
WITH CHECK (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_preliminary(team_id)
);

CREATE POLICY "Prelim judges update own scores" ON public.preliminary_scores
FOR UPDATE TO authenticated
USING (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_preliminary(team_id)
)
WITH CHECK (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_preliminary(team_id)
);

-- ---------------------------------------------------------------------------
-- F. FINAL SCORES
-- ---------------------------------------------------------------------------
CREATE POLICY "Admin full access final" ON public.final_scores
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Judges read own final scores" ON public.final_scores
FOR SELECT TO authenticated
USING (
    public.current_user_role() = 'judge'
    AND judge_id = (SELECT auth.uid())
);

CREATE POLICY "Final judges insert own scores" ON public.final_scores
FOR INSERT TO authenticated
WITH CHECK (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_final(team_id)
);

CREATE POLICY "Final judges update own scores" ON public.final_scores
FOR UPDATE TO authenticated
USING (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_final(team_id)
)
WITH CHECK (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_final(team_id)
);

-- ============================================================================
-- 5. RANKING VIEWS
--    security_invoker = true -> RLS tetap berlaku.
--    Admin melihat semua tim; juri hanya melihat agregat skornya sendiri;
--    tim tidak mendapat baris apa pun.
--    Metode agregasi: rata-rata total berbobot per juri (ubah jika panitia sepakat metode lain).
--    Tim yang didiskualifikasi tidak ikut peringkat.
-- ============================================================================
CREATE VIEW public.preliminary_ranking
WITH (security_invoker = true) AS
SELECT
    t.id                                   AS team_id,
    t.team_code,
    t.team_name,
    COUNT(ps.id)                           AS judges_count,
    ROUND(AVG(ps.total_weighted_score), 2) AS avg_score,
    RANK() OVER (ORDER BY AVG(ps.total_weighted_score) DESC) AS rank
FROM public.teams AS t
JOIN public.preliminary_scores AS ps ON ps.team_id = t.id
WHERE NOT t.is_disqualified
GROUP BY t.id, t.team_code, t.team_name;

CREATE VIEW public.final_ranking
WITH (security_invoker = true) AS
SELECT
    t.id                                   AS team_id,
    t.team_code,
    t.team_name,
    COUNT(fs.id)                           AS judges_count,
    ROUND(AVG(fs.total_weighted_score), 2) AS avg_score,
    RANK() OVER (ORDER BY AVG(fs.total_weighted_score) DESC) AS rank
FROM public.teams AS t
JOIN public.final_scores AS fs ON fs.team_id = t.id
WHERE t.is_finalist AND NOT t.is_disqualified
GROUP BY t.id, t.team_code, t.team_name;

REVOKE ALL ON public.preliminary_ranking, public.final_ranking FROM PUBLIC, anon;
GRANT SELECT ON public.preliminary_ranking, public.final_ranking TO authenticated;

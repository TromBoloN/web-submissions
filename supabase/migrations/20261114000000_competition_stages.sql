-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Competition stages as data (Idempotent)
--
-- Replaces the schedule hardcoded in the app (team-schedule.ts, admin dashboard
-- timeline, karya-constants.ts, gallery copy, sidebar gallery badge).
--
-- * One row per milestone. Dates are WITA calendar days (DATE, no time zone);
--   the app compares them against the WITA date of server time.
-- * The submission deadline is NOT a row here: it stays in
--   competition_settings.submission_closes_at (single source of truth). The app
--   renders the "submit" node from that column.
-- * System rows (review, top5, gallery, final, winners) drive app logic. Admins
--   can edit their dates and text but cannot delete them or change their key.
--   Admins may add extra, non-system rows (e.g. a technical meeting).
-- * status_override lets admins force a stage state when reality differs from
--   the calendar (e.g. Top 5 announcement delayed). NULL = follow the dates.
-- ============================================================================

-- ============================================================================
-- 1. TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.competition_stages (
  key             TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  starts_on       DATE NOT NULL,
  ends_on         DATE NOT NULL,
  time_label      TEXT NOT NULL DEFAULT '',
  sort_order      SMALLINT NOT NULL DEFAULT 100,
  show_on_track   BOOLEAN NOT NULL DEFAULT TRUE,
  status_override TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.competition_stages IS
  'Competition milestones shown on the team journey track, admin timeline and public gallery. Dates are WITA calendar days.';
COMMENT ON COLUMN public.competition_stages.status_override IS
  'NULL follows starts_on/ends_on; otherwise forces upcoming, current or done.';
COMMENT ON COLUMN public.competition_stages.is_system IS
  'System stages are referenced by app logic: they cannot be deleted and their key cannot change.';

ALTER TABLE public.competition_stages
  DROP CONSTRAINT IF EXISTS competition_stages_key_check,
  ADD CONSTRAINT competition_stages_key_check
    CHECK (key ~ '^[a-z][a-z0-9_]{1,31}$');

ALTER TABLE public.competition_stages
  DROP CONSTRAINT IF EXISTS competition_stages_title_check,
  ADD CONSTRAINT competition_stages_title_check
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 80);

ALTER TABLE public.competition_stages
  DROP CONSTRAINT IF EXISTS competition_stages_description_check,
  ADD CONSTRAINT competition_stages_description_check
    CHECK (char_length(description) <= 240);

ALTER TABLE public.competition_stages
  DROP CONSTRAINT IF EXISTS competition_stages_time_label_check,
  ADD CONSTRAINT competition_stages_time_label_check
    CHECK (char_length(time_label) <= 40);

ALTER TABLE public.competition_stages
  DROP CONSTRAINT IF EXISTS competition_stages_sort_order_check,
  ADD CONSTRAINT competition_stages_sort_order_check
    CHECK (sort_order BETWEEN 0 AND 1000);

ALTER TABLE public.competition_stages
  DROP CONSTRAINT IF EXISTS competition_stages_date_order_check,
  ADD CONSTRAINT competition_stages_date_order_check
    CHECK (ends_on >= starts_on);

ALTER TABLE public.competition_stages
  DROP CONSTRAINT IF EXISTS competition_stages_status_override_check,
  ADD CONSTRAINT competition_stages_status_override_check
    CHECK (status_override IS NULL OR status_override IN ('upcoming', 'current', 'done'));

CREATE INDEX IF NOT EXISTS idx_competition_stages_order
  ON public.competition_stages (sort_order, starts_on);


-- ============================================================================
-- 2. SEED SYSTEM STAGES (current hardcoded schedule)
--    Inserted before the guard trigger exists; ON CONFLICT keeps admin edits
--    when the migration is re-run.
-- ============================================================================
INSERT INTO public.competition_stages
  (key, title, description, starts_on, ends_on, time_label, sort_order, show_on_track, is_system)
VALUES
  ('review',  'Penilaian Babak Awal', 'Dewan juri mengevaluasi seluruh karya terkirim.',
     '2026-11-11', '2026-11-17', '', 20, TRUE,  TRUE),
  ('top5',    'Pengumuman Top 5',     'Daftar finalis resmi diumumkan di portal & media.',
     '2026-11-18', '2026-11-18', '', 30, TRUE,  TRUE),
  ('gallery', 'Galeri Karya Dibuka',  'Pembukaan galeri karya peserta untuk publik.',
     '2026-11-18', '2026-11-18', '', 35, FALSE, TRUE),
  ('final',   'Babak Final',          'Sesi presentasi karya dan tanya jawab tim finalis.',
     '2026-11-21', '2026-11-21', '', 40, TRUE,  TRUE),
  ('winners', 'Pengumuman Juara',     'Penetapan dan selebrasi pemenang MIT-WEEK 2026.',
     '2026-11-25', '2026-11-25', '', 50, TRUE,  TRUE)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- 3. GUARD + STAMP TRIGGER
--    Keeps system rows' key and flag fixed, and records who changed a row.
--    Runs for every writer (RLS does not apply to the trigger itself).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_competition_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_system AND NEW.key IS DISTINCT FROM OLD.key THEN
      RAISE EXCEPTION 'System stage key cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.is_system IS DISTINCT FROM OLD.is_system THEN
      RAISE EXCEPTION 'is_system cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := statement_timestamp();
  NEW.updated_by := COALESCE((SELECT auth.uid()), NEW.updated_by);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_competition_stage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_competition_stages_guard ON public.competition_stages;
CREATE TRIGGER trg_competition_stages_guard
BEFORE INSERT OR UPDATE ON public.competition_stages
FOR EACH ROW EXECUTE FUNCTION public.guard_competition_stage();


-- ============================================================================
-- 4. ROW LEVEL SECURITY
--    Any active signed-in role can read. Only admin can write. Admin-created
--    rows are never system rows, and system rows cannot be deleted.
-- ============================================================================
ALTER TABLE public.competition_stages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.competition_stages FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.competition_stages TO authenticated;

DROP POLICY IF EXISTS competition_stages_read ON public.competition_stages;
CREATE POLICY competition_stages_read
  ON public.competition_stages
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IS NOT NULL);

DROP POLICY IF EXISTS competition_stages_admin_insert ON public.competition_stages;
CREATE POLICY competition_stages_admin_insert
  ON public.competition_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin' AND NOT is_system);

DROP POLICY IF EXISTS competition_stages_admin_update ON public.competition_stages;
CREATE POLICY competition_stages_admin_update
  ON public.competition_stages
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS competition_stages_admin_delete ON public.competition_stages;
CREATE POLICY competition_stages_admin_delete
  ON public.competition_stages
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin' AND NOT is_system);


-- ============================================================================
-- 5. PUBLIC READ FOR THE GALLERY (/karya is reachable without login)
--    Returns schedule fields only; nothing here is private. Same pattern as
--    get_public_showcase(): anon gets EXECUTE on the function, never the table.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_public_competition_schedule()
RETURNS TABLE (
  key             TEXT,
  title           TEXT,
  description     TEXT,
  starts_on       DATE,
  ends_on         DATE,
  time_label      TEXT,
  sort_order      SMALLINT,
  show_on_track   BOOLEAN,
  status_override TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.key, s.title, s.description, s.starts_on, s.ends_on, s.time_label,
         s.sort_order, s.show_on_track, s.status_override
    FROM public.competition_stages AS s
   ORDER BY s.sort_order, s.starts_on, s.key;
$$;

REVOKE ALL ON FUNCTION public.get_public_competition_schedule() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_competition_schedule() TO anon, authenticated;

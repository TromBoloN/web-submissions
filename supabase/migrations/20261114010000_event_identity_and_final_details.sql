-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Event identity, finalist count and final presentation details (Idempotent)
--
-- 1. competition_settings: event name/track, finalist count, gallery "Baru"
--    badge duration. Non-sensitive; readable by every signed-in role through
--    the existing "Authenticated read settings" policy, and by the public
--    gallery through get_public_event_info().
-- 2. final_presentation: format, venue and meeting link for the final. The
--    venue/link are for finalists, so this lives in its own admin-only table
--    (competition_settings is readable by every signed-in role) and is read
--    through get_my_final_presentation() with an in-body authorization check.
-- ============================================================================

-- ============================================================================
-- 1. EVENT IDENTITY ON competition_settings
-- ============================================================================
ALTER TABLE public.competition_settings
  ADD COLUMN IF NOT EXISTS event_name TEXT NOT NULL DEFAULT 'MIT-WEEK 2026',
  ADD COLUMN IF NOT EXISTS event_track TEXT NOT NULL DEFAULT 'Web Development',
  ADD COLUMN IF NOT EXISTS finalist_count SMALLINT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS gallery_new_badge_days SMALLINT NOT NULL DEFAULT 7;

COMMENT ON COLUMN public.competition_settings.finalist_count IS
  'Number of finalists ("Top N"). Display and admin guidance only; finalists are still picked manually.';
COMMENT ON COLUMN public.competition_settings.gallery_new_badge_days IS
  'Days the sidebar shows "Baru" on the gallery after showcase_published_at. 0 disables the badge.';

ALTER TABLE public.competition_settings
  DROP CONSTRAINT IF EXISTS competition_settings_event_name_check,
  ADD CONSTRAINT competition_settings_event_name_check
    CHECK (char_length(btrim(event_name)) BETWEEN 1 AND 60);

ALTER TABLE public.competition_settings
  DROP CONSTRAINT IF EXISTS competition_settings_event_track_check,
  ADD CONSTRAINT competition_settings_event_track_check
    CHECK (char_length(btrim(event_track)) BETWEEN 1 AND 60);

ALTER TABLE public.competition_settings
  DROP CONSTRAINT IF EXISTS competition_settings_finalist_count_check,
  ADD CONSTRAINT competition_settings_finalist_count_check
    CHECK (finalist_count BETWEEN 1 AND 20);

ALTER TABLE public.competition_settings
  DROP CONSTRAINT IF EXISTS competition_settings_gallery_new_badge_days_check,
  ADD CONSTRAINT competition_settings_gallery_new_badge_days_check
    CHECK (gallery_new_badge_days BETWEEN 0 AND 60);

-- Public gallery and login page: identity only.
CREATE OR REPLACE FUNCTION public.get_public_event_info()
RETURNS TABLE (
  event_name     TEXT,
  event_track    TEXT,
  finalist_count SMALLINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.event_name, s.event_track, s.finalist_count
    FROM public.competition_settings AS s
   WHERE s.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_event_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_event_info() TO anon, authenticated;


-- ============================================================================
-- 2. FINAL PRESENTATION DETAILS (single row, admin only)
--    The final's date lives in competition_stages (key = 'final').
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.final_presentation (
  id                   BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  presentation_minutes SMALLINT NOT NULL DEFAULT 10,
  qa_minutes           SMALLINT NOT NULL DEFAULT 10,
  venue                TEXT NOT NULL DEFAULT '',
  meeting_url          TEXT,
  note                 TEXT NOT NULL DEFAULT 'Urutan tampil serta lokasi atau tautan sesi akan dikirim langsung oleh panitia.',
  logistics_published  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON COLUMN public.final_presentation.logistics_published IS
  'When FALSE, venue and meeting_url are withheld from finalists and judges (format and note still show).';

ALTER TABLE public.final_presentation
  DROP CONSTRAINT IF EXISTS final_presentation_presentation_minutes_check,
  ADD CONSTRAINT final_presentation_presentation_minutes_check
    CHECK (presentation_minutes BETWEEN 1 AND 120);

ALTER TABLE public.final_presentation
  DROP CONSTRAINT IF EXISTS final_presentation_qa_minutes_check,
  ADD CONSTRAINT final_presentation_qa_minutes_check
    CHECK (qa_minutes BETWEEN 0 AND 120);

ALTER TABLE public.final_presentation
  DROP CONSTRAINT IF EXISTS final_presentation_venue_check,
  ADD CONSTRAINT final_presentation_venue_check
    CHECK (char_length(venue) <= 160);

ALTER TABLE public.final_presentation
  DROP CONSTRAINT IF EXISTS final_presentation_meeting_url_check,
  ADD CONSTRAINT final_presentation_meeting_url_check
    CHECK (meeting_url IS NULL OR (meeting_url ~* '^https://' AND char_length(meeting_url) <= 500));

ALTER TABLE public.final_presentation
  DROP CONSTRAINT IF EXISTS final_presentation_note_check,
  ADD CONSTRAINT final_presentation_note_check
    CHECK (char_length(note) <= 500);

INSERT INTO public.final_presentation (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.stamp_final_presentation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := statement_timestamp();
  NEW.updated_by := COALESCE((SELECT auth.uid()), NEW.updated_by);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_final_presentation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_final_presentation_stamp ON public.final_presentation;
CREATE TRIGGER trg_final_presentation_stamp
BEFORE UPDATE ON public.final_presentation
FOR EACH ROW EXECUTE FUNCTION public.stamp_final_presentation();

ALTER TABLE public.final_presentation ENABLE ROW LEVEL SECURITY;

-- Single seeded row: admins read and update it; no INSERT/DELETE for clients.
REVOKE ALL ON TABLE public.final_presentation FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.final_presentation TO authenticated;

DROP POLICY IF EXISTS final_presentation_admin_select ON public.final_presentation;
CREATE POLICY final_presentation_admin_select
  ON public.final_presentation
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS final_presentation_admin_update ON public.final_presentation;
CREATE POLICY final_presentation_admin_update
  ON public.final_presentation
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ============================================================================
-- 3. SAFE READ: get_my_final_presentation()
--    Allowed callers (checked in the body, roles via current_user_role(),
--    which already requires an active profile):
--      * admin
--      * judge with judge_stage 'final' or 'both'
--      * team that is a finalist, not disqualified, after the finalist notice
--        has been published
--    Everyone else gets zero rows. venue/meeting_url are NULL until
--    logistics_published. No team or judge identifiers are returned.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_final_presentation()
RETURNS TABLE (
  presentation_minutes SMALLINT,
  qa_minutes           SMALLINT,
  venue                TEXT,
  meeting_url          TEXT,
  note                 TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT f.presentation_minutes,
         f.qa_minutes,
         CASE WHEN f.logistics_published THEN NULLIF(f.venue, '') END,
         CASE WHEN f.logistics_published THEN f.meeting_url END,
         f.note
    FROM public.final_presentation AS f
   WHERE f.id
     AND (
       public.current_user_role() = 'admin'
       OR (
         public.current_user_role() = 'judge'
         AND public.current_user_judge_stage() IN ('final', 'both')
       )
       OR (
         public.current_user_role() = 'team'
         AND EXISTS (
           SELECT 1
             FROM public.teams AS t
            WHERE t.profile_id = (SELECT auth.uid())
              AND t.is_finalist
              AND NOT t.is_disqualified
         )
         AND EXISTS (
           SELECT 1 FROM public.finalist_notice AS n WHERE n.id AND n.is_published
         )
       )
     );
$$;

REVOKE ALL ON FUNCTION public.get_my_final_presentation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_final_presentation() TO authenticated;

-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Migration 003: Judging safeguards and public contact
-- 1. Notes for judges on submissions (max 1,000 chars)
-- 2. Append-only submission history written by trigger
-- 3. Score locking for preliminary and final scores
-- 4. Public contact WhatsApp number on competition settings
-- ============================================================================

-- ============================================================================
-- 1. NOTES FOR JUDGES
-- ============================================================================
ALTER TABLE public.submissions
  ADD COLUMN notes_for_judges TEXT NOT NULL DEFAULT '',
  ADD CONSTRAINT submissions_notes_for_judges_length
    CHECK (char_length(notes_for_judges) <= 1000);


-- ============================================================================
-- 2. SUBMISSION HISTORY (append-only, written by trigger only)
-- ============================================================================
CREATE TABLE public.submission_history (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id    UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  team_id          UUID NOT NULL,
  github_url       TEXT NOT NULL DEFAULT '',
  live_demo_url    TEXT NOT NULL DEFAULT '',
  video_url        TEXT NOT NULL DEFAULT '',
  notes_for_judges TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL,
  changed_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_history_submission
  ON public.submission_history (submission_id, changed_at DESC);
CREATE INDEX idx_submission_history_team
  ON public.submission_history (team_id);
CREATE INDEX idx_submission_history_changed_at
  ON public.submission_history (changed_at DESC, id DESC);

ALTER TABLE public.submission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read submission history" ON public.submission_history
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

REVOKE ALL ON public.submission_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.submission_history TO authenticated;

-- Baseline snapshot so existing submissions have a starting history entry.
INSERT INTO public.submission_history (
  submission_id,
  team_id,
  github_url,
  live_demo_url,
  video_url,
  notes_for_judges,
  status,
  changed_by,
  changed_at
)
SELECT
  s.id,
  s.team_id,
  s.github_url,
  s.live_demo_url,
  s.video_url,
  s.notes_for_judges,
  s.status::text,
  NULL,
  s.updated_at
FROM public.submissions AS s;

CREATE OR REPLACE FUNCTION public.log_submission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.submission_history (
    submission_id,
    team_id,
    github_url,
    live_demo_url,
    video_url,
    notes_for_judges,
    status,
    changed_by
  )
  VALUES (
    NEW.id,
    NEW.team_id,
    NEW.github_url,
    NEW.live_demo_url,
    NEW.video_url,
    NEW.notes_for_judges,
    NEW.status::text,
    (SELECT p.id FROM public.profiles AS p WHERE p.id = auth.uid())
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_submission_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER submissions_history_after_insert
  AFTER INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.log_submission_change();

CREATE TRIGGER submissions_history_after_update
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  WHEN (
    OLD.github_url IS DISTINCT FROM NEW.github_url
    OR OLD.live_demo_url IS DISTINCT FROM NEW.live_demo_url
    OR OLD.video_url IS DISTINCT FROM NEW.video_url
    OR OLD.notes_for_judges IS DISTINCT FROM NEW.notes_for_judges
    OR OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION public.log_submission_change();


-- ============================================================================
-- 3. SCORE LOCKING
--    A judge can lock their own score after finishing. Locked scores can no
--    longer be edited by the judge (admin full-access policy is unchanged).
-- ============================================================================
ALTER TABLE public.preliminary_scores ADD COLUMN locked_at TIMESTAMPTZ;
ALTER TABLE public.final_scores ADD COLUMN locked_at TIMESTAMPTZ;

DROP POLICY "Prelim judges update own scores" ON public.preliminary_scores;
CREATE POLICY "Prelim judges update own unlocked scores" ON public.preliminary_scores
  FOR UPDATE TO authenticated
  USING (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_preliminary(team_id)
    AND locked_at IS NULL
  )
  WITH CHECK (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_preliminary(team_id)
  );

DROP POLICY "Final judges update own scores" ON public.final_scores;
CREATE POLICY "Final judges update own unlocked scores" ON public.final_scores
  FOR UPDATE TO authenticated
  USING (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_final(team_id)
    AND locked_at IS NULL
  )
  WITH CHECK (
    judge_id = (SELECT auth.uid())
    AND public.judge_can_score_final(team_id)
  );


-- ============================================================================
-- 4. PUBLIC CONTACT WHATSAPP
-- ============================================================================
ALTER TABLE public.competition_settings
  ADD COLUMN contact_whatsapp TEXT;

ALTER TABLE public.competition_settings
  ADD CONSTRAINT competition_settings_contact_whatsapp_check
  CHECK (contact_whatsapp IS NULL OR contact_whatsapp ~ '^[0-9]{8,15}$');

-- Safe public read for the login page (unauthenticated visitors).
CREATE OR REPLACE FUNCTION public.get_public_contact_whatsapp()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.contact_whatsapp
  FROM public.competition_settings AS s
  WHERE s.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_contact_whatsapp() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_contact_whatsapp() TO anon, authenticated, service_role;

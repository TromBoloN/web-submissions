-- ============================================================================
-- Fix: do not present the legacy first-row timestamp as an official submission time.
-- This file is idempotent: safe to re-run.
-- ============================================================================

-- One-time data fix. It only runs if the new function does not exist yet,
-- so a re-run cannot wipe real first_submitted_at values written by the new logic
-- (those can legitimately equal submitted_at).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'submissions_set_first_submitted_at'
  ) THEN
    UPDATE public.submissions
       SET first_submitted_at = NULL
     WHERE status = 'submitted'
       AND first_submitted_at = submitted_at;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.submissions_set_first_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.first_submitted_at IS NOT NULL THEN
    NEW.first_submitted_at := OLD.first_submitted_at;
  ELSIF TG_OP = 'UPDATE'
    AND OLD.status = 'draft'
    AND NEW.status = 'submitted' THEN
    NEW.first_submitted_at := now();
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'submitted' THEN
    NEW.first_submitted_at := COALESCE(NEW.first_submitted_at, now());
  ELSE
    NEW.first_submitted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
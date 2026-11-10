-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Fix: publish_showcase_phase_one failed with 21000 because the finalist
-- snapshot updated every team without a WHERE clause (blocked by safe update).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.publish_showcase_phase_one()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_published_at TIMESTAMPTZ;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RETURN FALSE;
  END IF;

  SELECT cs.showcase_published_at
    INTO v_published_at
    FROM public.competition_settings AS cs
   WHERE cs.id;

  IF v_published_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.teams
     SET showcase_is_finalist = is_finalist
   WHERE showcase_is_finalist IS DISTINCT FROM is_finalist;

  UPDATE public.competition_settings
     SET showcase_published_at = statement_timestamp(),
         showcase_consent_locked_at = COALESCE(showcase_consent_locked_at, statement_timestamp()),
         updated_at = statement_timestamp()
   WHERE id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_showcase_phase_one() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_showcase_phase_one() TO authenticated;

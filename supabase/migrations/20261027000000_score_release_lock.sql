-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Migration: Enforce Score Locking Upon Results Release
-- Blocks INSERT, UPDATE, and DELETE on preliminary_scores and final_scores
-- whenever the stage results are marked as released.
-- ============================================================================

-- 1. Trigger function for preliminary_scores
CREATE OR REPLACE FUNCTION public.check_preliminary_scores_not_released()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released boolean;
BEGIN
  SELECT COALESCE(cs.preliminary_results_released, FALSE)
    INTO v_released
    FROM public.competition_settings cs
   WHERE cs.id = TRUE;

  IF v_released THEN
    RAISE EXCEPTION 'Penilaian babak awal telah dikunci karena hasil penilaian telah dirilis.'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 2. Trigger function for final_scores
CREATE OR REPLACE FUNCTION public.check_final_scores_not_released()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released boolean;
BEGIN
  SELECT COALESCE(cs.final_results_released, FALSE)
    INTO v_released
    FROM public.competition_settings cs
   WHERE cs.id = TRUE;

  IF v_released THEN
    RAISE EXCEPTION 'Penilaian babak final telah dikunci karena hasil penilaian telah dirilis.'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Revoke permissions from PUBLIC and anon for consistency
REVOKE ALL ON FUNCTION public.check_preliminary_scores_not_released() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_final_scores_not_released() FROM PUBLIC, anon;

-- 4. Create triggers on preliminary_scores and final_scores
CREATE TRIGGER trg_preliminary_scores_release_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.preliminary_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.check_preliminary_scores_not_released();

CREATE TRIGGER trg_final_scores_release_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.final_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.check_final_scores_not_released();


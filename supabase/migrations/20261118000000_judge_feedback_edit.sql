-- ============================================================================
-- MIT-WEEK 2026: judges may replace their comment (feedback) on a submitted score,
-- even after locking it or after results are released. Scores never change.
-- 1. update_my_score_feedback(stage, team_id, feedback): judge-only, own row, status 'final',
--    feedback column only; writes an audit event that keeps the previous comment.
-- 2. Release-lock triggers let exactly that write through: the function sets a
--    transaction-local flag, and the trigger also checks nothing but feedback changed.
--    Clients cannot set that flag (PostgREST exposes no set_config).
-- Independent of the pending 20261114* migrations. Idempotent: safe to re-run.
-- ============================================================================

-- Columns ignored when deciding "only the comment changed" (updated_at is stamped by a trigger,
-- total_weighted_score is generated).
CREATE OR REPLACE FUNCTION public.is_feedback_only_edit(p_old JSONB, p_new JSONB)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT current_setting('mitweek.feedback_only_edit', TRUE) = 'on'
     AND (p_old - 'feedback' - 'updated_at' - 'total_weighted_score')
       = (p_new - 'feedback' - 'updated_at' - 'total_weighted_score');
$$;

REVOKE ALL ON FUNCTION public.is_feedback_only_edit(JSONB, JSONB) FROM PUBLIC, anon, authenticated;

-- 1. Release-lock triggers (same as 20261027000000, plus the feedback-only exception) ----------
CREATE OR REPLACE FUNCTION public.check_preliminary_scores_not_released()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND public.is_feedback_only_edit(to_jsonb(OLD), to_jsonb(NEW)) THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.check_final_scores_not_released()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND public.is_feedback_only_edit(to_jsonb(OLD), to_jsonb(NEW)) THEN
    RETURN NEW;
  END IF;

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

REVOKE ALL ON FUNCTION public.check_preliminary_scores_not_released() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_final_scores_not_released() FROM PUBLIC, anon;

-- 2. Judge RPC -------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_score_feedback(
  p_stage TEXT,
  p_team_id UUID,
  p_feedback TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_new TEXT := trim(COALESCE(p_feedback, ''));
  v_score_id UUID;
  v_old TEXT;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'judge' THEN
    RETURN FALSE;
  END IF;

  IF p_stage NOT IN ('preliminary', 'final') OR length(v_new) > 2000 THEN
    RETURN FALSE;
  END IF;

  IF p_stage = 'preliminary' THEN
    SELECT s.id, COALESCE(s.feedback, '')
      INTO v_score_id, v_old
      FROM public.preliminary_scores AS s
     WHERE s.judge_id = v_uid
       AND s.team_id = p_team_id
       AND s.status = 'final'::public.score_status_type
       FOR UPDATE;
  ELSE
    SELECT s.id, COALESCE(s.feedback, '')
      INTO v_score_id, v_old
      FROM public.final_scores AS s
     WHERE s.judge_id = v_uid
       AND s.team_id = p_team_id
       AND s.status = 'final'::public.score_status_type
       FOR UPDATE;
  END IF;

  IF v_score_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_old = v_new THEN
    RETURN TRUE;
  END IF;

  PERFORM set_config('mitweek.feedback_only_edit', 'on', TRUE);
  IF p_stage = 'preliminary' THEN
    UPDATE public.preliminary_scores SET feedback = v_new WHERE id = v_score_id;
  ELSE
    UPDATE public.final_scores SET feedback = v_new WHERE id = v_score_id;
  END IF;
  PERFORM set_config('mitweek.feedback_only_edit', 'off', TRUE);

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (
    v_uid,
    'score_feedback_replaced',
    p_stage || '_score',
    p_team_id,
    jsonb_build_object('stage', p_stage, 'score_id', v_score_id, 'previous_feedback', v_old)
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_score_feedback(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_score_feedback(TEXT, UUID, TEXT) TO authenticated;

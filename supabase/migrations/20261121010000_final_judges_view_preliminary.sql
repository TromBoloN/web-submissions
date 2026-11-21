-- ============================================================================
-- MIT-WEEK 2026: final judges can read the preliminary scores of a finalist
-- Committee request: while scoring a finalist, a final judge sees how that team was
-- scored in the preliminary round.
--   public.get_preliminary_scores_for_final(p_team_id): SECURITY DEFINER, read-only.
-- Gates (all must hold, otherwise no rows):
--   - caller is an active judge with judge_stage 'final' or 'both'
--   - preliminary results are released (no influence while the preliminary is open)
--   - the team is a non-disqualified finalist with a submitted submission
--   - the caller is not recused from this team for the final
-- Returns only final-status preliminary scores: the five criteria, the weighted total
-- and the team-facing comment (feedback). Judges are anonymous: a per-team label
-- (1, 2, ...) ordered by a hash of judge+team, so the label is stable on reload but
-- does not identify the judge or match across teams. Never judge_id, names,
-- timestamps, private_note or draft scores.
-- Apply after 20261121000000. Idempotent: safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_preliminary_scores_for_final(p_team_id UUID)
RETURNS TABLE (
  judge_label INT,
  functionality_score NUMERIC,
  case_study_fit_score NUMERIC,
  ui_ux_score NUMERIC,
  code_quality_score NUMERIC,
  documentation_score NUMERIC,
  total_weighted_score NUMERIC,
  feedback TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Active final-stage judge only (current_user_role() is NULL for inactive profiles).
  IF public.current_user_role() IS DISTINCT FROM 'judge'
     OR public.current_user_judge_stage() NOT IN ('final', 'both') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.competition_settings AS cs
     WHERE cs.id = TRUE
       AND cs.preliminary_results_released
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.teams AS t
      JOIN public.submissions AS s ON s.team_id = t.id
     WHERE t.id = p_team_id
       AND t.is_finalist
       AND NOT t.is_disqualified
       AND s.status = 'submitted'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.judge_recusals AS jr
     WHERE jr.judge_id = (SELECT auth.uid())
       AND jr.team_id = p_team_id
       AND jr.stage = 'final'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (ROW_NUMBER() OVER (ORDER BY md5(ps.judge_id::TEXT || ':' || ps.team_id::TEXT)))::INT,
    ps.functionality_score::NUMERIC,
    ps.case_study_fit_score::NUMERIC,
    ps.ui_ux_score::NUMERIC,
    ps.code_quality_score::NUMERIC,
    ps.documentation_score::NUMERIC,
    ps.total_weighted_score::NUMERIC,
    ps.feedback
  FROM public.preliminary_scores AS ps
  WHERE ps.team_id = p_team_id
    AND ps.status = 'final'
  ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_preliminary_scores_for_final(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_preliminary_scores_for_final(UUID) TO authenticated;

-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Migration 004: Team Results and Release Flags
-- 1. Add preliminary_results_released & final_results_released to competition_settings
-- 2. public.get_my_results() SECURITY DEFINER function for contestant results
-- This file is idempotent: safe to re-run.
-- ============================================================================

-- ============================================================================
-- 1. RELEASE FLAGS IN COMPETITION_SETTINGS
-- ============================================================================
ALTER TABLE public.competition_settings
  ADD COLUMN IF NOT EXISTS preliminary_results_released BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_results_released BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- 2. GET_MY_RESULTS() RPC FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_results()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_team record;
  v_sub_status public.submission_status_type := NULL;
  v_prelim_released boolean := FALSE;
  v_final_released boolean := FALSE;

  v_prelim_count int := 0;
  v_prelim_total numeric(5,2);
  v_prelim_func numeric(5,2);
  v_prelim_fit numeric(5,2);
  v_prelim_ui numeric(5,2);
  v_prelim_code numeric(5,2);
  v_prelim_doc numeric(5,2);
  v_prelim_comments jsonb := '[]'::jsonb;
  v_preliminary_json jsonb := NULL;

  v_final_count int := 0;
  v_final_total numeric(5,2);
  v_final_func numeric(5,2);
  v_final_fit numeric(5,2);
  v_final_ui numeric(5,2);
  v_final_code numeric(5,2);
  v_final_doc numeric(5,2);
  v_final_pres numeric(5,2);
  v_final_comments jsonb := '[]'::jsonb;
  v_final_json jsonb := NULL;
BEGIN
  -- 1. Authorization: caller must have active 'team' role
  v_role := public.current_user_role();
  IF v_role IS DISTINCT FROM 'team' THEN
    RETURN NULL;
  END IF;

  -- 2. Derive team from auth.uid()
  SELECT t.id, t.team_name, t.is_finalist, t.is_disqualified
  INTO v_team
  FROM public.teams t
  WHERE t.profile_id = (SELECT auth.uid());

  IF v_team.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. Disqualification check: disqualified teams get no scores
  IF v_team.is_disqualified THEN
    RETURN jsonb_build_object(
      'status', 'disqualified',
      'is_disqualified', true,
      'is_finalist', v_team.is_finalist,
      'preliminary', NULL,
      'final', NULL
    );
  END IF;

  -- 4. Submission status check: team must have submitted
  SELECT s.status
  INTO v_sub_status
  FROM public.submissions s
  WHERE s.team_id = v_team.id;

  IF v_sub_status IS DISTINCT FROM 'submitted'::public.submission_status_type THEN
    RETURN jsonb_build_object(
      'status', 'no_submission',
      'is_disqualified', false,
      'is_finalist', v_team.is_finalist,
      'preliminary', NULL,
      'final', NULL
    );
  END IF;

  -- 5. Read release flags from competition_settings
  SELECT
    COALESCE(cs.preliminary_results_released, FALSE),
    COALESCE(cs.final_results_released, FALSE)
  INTO
    v_prelim_released,
    v_final_released
  FROM public.competition_settings cs
  WHERE cs.id = TRUE;

  -- 6. Preliminary stage aggregate (if released)
  IF v_prelim_released THEN
    SELECT
      COUNT(ps.id)::int,
      ROUND(AVG(ps.total_weighted_score), 2),
      ROUND(AVG(ps.functionality_score), 2),
      ROUND(AVG(ps.case_study_fit_score), 2),
      ROUND(AVG(ps.ui_ux_score), 2),
      ROUND(AVG(ps.code_quality_score), 2),
      ROUND(AVG(ps.documentation_score), 2)
    INTO
      v_prelim_count,
      v_prelim_total,
      v_prelim_func,
      v_prelim_fit,
      v_prelim_ui,
      v_prelim_code,
      v_prelim_doc
    FROM public.preliminary_scores ps
    WHERE ps.team_id = v_team.id;

    SELECT COALESCE(
      jsonb_agg(ps.feedback ORDER BY md5(ps.feedback)),
      '[]'::jsonb
    )
    INTO v_prelim_comments
    FROM public.preliminary_scores ps
    WHERE ps.team_id = v_team.id
      AND ps.feedback IS NOT NULL
      AND TRIM(ps.feedback) <> '';

    IF v_prelim_count > 0 THEN
      v_preliminary_json := jsonb_build_object(
        'judge_count', v_prelim_count,
        'criteria', jsonb_build_array(
          jsonb_build_object('key', 'functionality_score', 'average', v_prelim_func),
          jsonb_build_object('key', 'case_study_fit_score', 'average', v_prelim_fit),
          jsonb_build_object('key', 'ui_ux_score', 'average', v_prelim_ui),
          jsonb_build_object('key', 'code_quality_score', 'average', v_prelim_code),
          jsonb_build_object('key', 'documentation_score', 'average', v_prelim_doc)
        ),
        'total', v_prelim_total,
        'comments', COALESCE(v_prelim_comments, '[]'::jsonb)
      );
    ELSE
      v_preliminary_json := jsonb_build_object(
        'judge_count', 0,
        'criteria', '[]'::jsonb,
        'total', NULL,
        'comments', '[]'::jsonb
      );
    END IF;
  END IF;

  -- 7. Final stage aggregate (if released and team is finalist)
  IF v_final_released AND v_team.is_finalist THEN
    SELECT
      COUNT(fs.id)::int,
      ROUND(AVG(fs.total_weighted_score), 2),
      ROUND(AVG(fs.functionality_score), 2),
      ROUND(AVG(fs.case_study_fit_score), 2),
      ROUND(AVG(fs.ui_ux_score), 2),
      ROUND(AVG(fs.code_quality_score), 2),
      ROUND(AVG(fs.documentation_score), 2),
      ROUND(AVG(fs.presentation_qa_score), 2)
    INTO
      v_final_count,
      v_final_total,
      v_final_func,
      v_final_fit,
      v_final_ui,
      v_final_code,
      v_final_doc,
      v_final_pres
    FROM public.final_scores fs
    WHERE fs.team_id = v_team.id;

    SELECT COALESCE(
      jsonb_agg(fs.feedback ORDER BY md5(fs.feedback)),
      '[]'::jsonb
    )
    INTO v_final_comments
    FROM public.final_scores fs
    WHERE fs.team_id = v_team.id
      AND fs.feedback IS NOT NULL
      AND TRIM(fs.feedback) <> '';

    IF v_final_count > 0 THEN
      v_final_json := jsonb_build_object(
        'judge_count', v_final_count,
        'criteria', jsonb_build_array(
          jsonb_build_object('key', 'functionality_score', 'average', v_final_func),
          jsonb_build_object('key', 'case_study_fit_score', 'average', v_final_fit),
          jsonb_build_object('key', 'ui_ux_score', 'average', v_final_ui),
          jsonb_build_object('key', 'code_quality_score', 'average', v_final_code),
          jsonb_build_object('key', 'documentation_score', 'average', v_final_doc),
          jsonb_build_object('key', 'presentation_qa_score', 'average', v_final_pres)
        ),
        'total', v_final_total,
        'comments', COALESCE(v_final_comments, '[]'::jsonb)
      );
    ELSE
      v_final_json := jsonb_build_object(
        'judge_count', 0,
        'criteria', '[]'::jsonb,
        'total', NULL,
        'comments', '[]'::jsonb
      );
    END IF;
  END IF;

  -- 8. Assembled response
  RETURN jsonb_build_object(
    'status', 'ok',
    'is_disqualified', false,
    'is_finalist', v_team.is_finalist,
    'preliminary', v_preliminary_json,
    'final', v_final_json
  );
END;
$$;

-- Revoke public/anon privileges and grant to authenticated only
REVOKE ALL ON FUNCTION public.get_my_results() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_results() TO authenticated;
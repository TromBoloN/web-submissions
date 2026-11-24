-- ============================================================================
-- MIT-WEEK 2026: admin score sanctions
-- Committee request: an admin can deduct points from one criterion of a team's score
-- in a stage, with a mandatory reason the team can read (sanctions).
--   1. public.score_sanctions: one row per sanction (team, stage, criterion, points, reason).
--      Admin-only through RLS (select, insert, delete; no update: remove and re-add instead).
--   2. public.score_sanction_deduction(team, stage): weighted points removed from the
--      team's stage total. Applied to the team's criterion AVERAGE across final-status
--      judge scores, never to individual judge scores:
--        adjusted criterion = GREATEST(judge average - SUM(sanction points), 0)
--      so a criterion bottoms out at exactly 0 and the total can never go below 0.
--      Teams without sanctions get exactly the same numbers as before.
--   3. preliminary_ranking / final_ranking: avg_score and rank are after sanctions;
--      raw_avg_score and sanction_deduction are appended for the admin.
--      get_public_showcase_winners() reads final_ranking and follows automatically.
--   4. get_my_results(): criterion averages and totals after sanctions, plus the team's
--      own sanctions (criterion, the points as entered, reason; no admin identity or timestamps).
--      Pre-sanction averages/total and the effective (capped) deduction are NOT returned to teams
--      (owner request: a sanctioned team sees the sanctioned points but not its pre-sanction score).
--      Also fixes a pre-existing gap: only final-status scores are counted (drafts were
--      included before), matching the ranking views.
--   5. get_public_ranking(): aggregate score after sanctions.
-- Sanctions can be added or removed at any time, including after release.
-- Apply after 20261121010000. Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE + RLS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.score_sanctions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  stage      TEXT NOT NULL CHECK (stage IN ('preliminary', 'final')),
  criterion  TEXT NOT NULL,
  points     NUMERIC(5,2) NOT NULL CHECK (points > 0 AND points <= 100),
  reason     TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 1000),
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT score_sanctions_criterion_check CHECK (
    criterion IN ('functionality_score', 'case_study_fit_score', 'ui_ux_score', 'code_quality_score', 'documentation_score')
    OR (stage = 'final' AND criterion = 'presentation_qa_score')
  )
);

CREATE INDEX IF NOT EXISTS score_sanctions_team_stage_idx ON public.score_sanctions (team_id, stage);

ALTER TABLE public.score_sanctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read sanctions" ON public.score_sanctions;
CREATE POLICY "Admin read sanctions" ON public.score_sanctions
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin insert own sanctions" ON public.score_sanctions;
CREATE POLICY "Admin insert own sanctions" ON public.score_sanctions
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin' AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin delete sanctions" ON public.score_sanctions;
CREATE POLICY "Admin delete sanctions" ON public.score_sanctions
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

REVOKE ALL ON public.score_sanctions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.score_sanctions TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. DEDUCTION HELPER (security invoker: RLS applies to direct callers, so only
--    admins see sanctions; SECURITY DEFINER callers below run as the owner)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.score_sanction_deduction(p_team_id UUID, p_stage TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_func NUMERIC;
  v_fit  NUMERIC;
  v_ui   NUMERIC;
  v_code NUMERIC;
  v_doc  NUMERIC;
  v_pres NUMERIC;
  v_deduction NUMERIC;
BEGIN
  IF p_stage = 'preliminary' THEN
    SELECT AVG(ps.functionality_score), AVG(ps.case_study_fit_score), AVG(ps.ui_ux_score),
           AVG(ps.code_quality_score), AVG(ps.documentation_score)
      INTO v_func, v_fit, v_ui, v_code, v_doc
      FROM public.preliminary_scores AS ps
     WHERE ps.team_id = p_team_id AND ps.status = 'final';
  ELSIF p_stage = 'final' THEN
    SELECT AVG(fs.functionality_score), AVG(fs.case_study_fit_score), AVG(fs.ui_ux_score),
           AVG(fs.code_quality_score), AVG(fs.documentation_score), AVG(fs.presentation_qa_score)
      INTO v_func, v_fit, v_ui, v_code, v_doc, v_pres
      FROM public.final_scores AS fs
     WHERE fs.team_id = p_team_id AND fs.status = 'final';
  ELSE
    RETURN 0;
  END IF;

  IF v_func IS NULL THEN
    RETURN 0; -- no final-status scores yet
  END IF;

  -- Weights must match the generated total_weighted_score columns and src/lib/rubric.ts.
  SELECT SUM(LEAST(sp.pts, c.avg_val) * c.w)
    INTO v_deduction
    FROM (
      VALUES
        ('functionality_score',   v_func, CASE WHEN p_stage = 'preliminary' THEN 0.35 ELSE 0.25 END),
        ('case_study_fit_score',  v_fit,  CASE WHEN p_stage = 'preliminary' THEN 0.25 ELSE 0.20 END),
        ('ui_ux_score',           v_ui,   CASE WHEN p_stage = 'preliminary' THEN 0.20 ELSE 0.15 END),
        ('code_quality_score',    v_code, 0.10),
        ('documentation_score',   v_doc,  0.10),
        ('presentation_qa_score', v_pres, CASE WHEN p_stage = 'final' THEN 0.20 ELSE 0 END)
    ) AS c (criterion, avg_val, w)
    JOIN (
      SELECT s.criterion, SUM(s.points) AS pts
        FROM public.score_sanctions AS s
       WHERE s.team_id = p_team_id AND s.stage = p_stage
       GROUP BY s.criterion
    ) AS sp ON sp.criterion = c.criterion
   WHERE c.avg_val IS NOT NULL;

  RETURN COALESCE(v_deduction, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.score_sanction_deduction(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.score_sanction_deduction(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. RANKING VIEWS (after sanctions; existing columns keep name, type and order)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.preliminary_ranking
WITH (security_invoker = true) AS
SELECT
    x.team_id,
    x.team_code,
    x.team_name,
    x.judges_count,
    ROUND(x.adjusted_avg, 2)                       AS avg_score,
    RANK() OVER (ORDER BY x.adjusted_avg DESC)     AS rank,
    ROUND(x.raw_avg, 2)                            AS raw_avg_score,
    ROUND(x.deduction, 2)                          AS sanction_deduction
FROM (
    SELECT
        g.*,
        GREATEST(g.raw_avg - g.deduction, 0) AS adjusted_avg
    FROM (
        SELECT
            t.id                                   AS team_id,
            t.team_code,
            t.team_name,
            COUNT(ps.id)                           AS judges_count,
            AVG(ps.total_weighted_score)           AS raw_avg,
            public.score_sanction_deduction(t.id, 'preliminary') AS deduction
        FROM public.teams AS t
        JOIN public.preliminary_scores AS ps ON ps.team_id = t.id AND ps.status = 'final'
        WHERE NOT t.is_disqualified
        GROUP BY t.id, t.team_code, t.team_name
    ) AS g
) AS x;

CREATE OR REPLACE VIEW public.final_ranking
WITH (security_invoker = true) AS
SELECT
    x.team_id,
    x.team_code,
    x.team_name,
    x.judges_count,
    ROUND(x.adjusted_avg, 2)                       AS avg_score,
    RANK() OVER (ORDER BY x.adjusted_avg DESC)     AS rank,
    ROUND(x.raw_avg, 2)                            AS raw_avg_score,
    ROUND(x.deduction, 2)                          AS sanction_deduction
FROM (
    SELECT
        g.*,
        GREATEST(g.raw_avg - g.deduction, 0) AS adjusted_avg
    FROM (
        SELECT
            t.id                                   AS team_id,
            t.team_code,
            t.team_name,
            COUNT(fs.id)                           AS judges_count,
            AVG(fs.total_weighted_score)           AS raw_avg,
            public.score_sanction_deduction(t.id, 'final') AS deduction
        FROM public.teams AS t
        JOIN public.final_scores AS fs ON fs.team_id = t.id AND fs.status = 'final'
        WHERE t.is_finalist AND NOT t.is_disqualified
        GROUP BY t.id, t.team_code, t.team_name
    ) AS g
) AS x;

REVOKE ALL ON public.preliminary_ranking, public.final_ranking FROM PUBLIC, anon;
GRANT SELECT ON public.preliminary_ranking, public.final_ranking TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. GET_MY_RESULTS() (team-facing, after sanctions, final-status scores only)
-- ----------------------------------------------------------------------------
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

  v_count int := 0;
  v_raw_total numeric;
  v_func numeric;
  v_fit numeric;
  v_ui numeric;
  v_code numeric;
  v_doc numeric;
  v_pres numeric;
  v_points jsonb;
  v_sanctions jsonb;
  v_comments jsonb;
  v_preliminary_json jsonb := NULL;
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
      AVG(ps.total_weighted_score),
      AVG(ps.functionality_score),
      AVG(ps.case_study_fit_score),
      AVG(ps.ui_ux_score),
      AVG(ps.code_quality_score),
      AVG(ps.documentation_score)
    INTO v_count, v_raw_total, v_func, v_fit, v_ui, v_code, v_doc
    FROM public.preliminary_scores ps
    WHERE ps.team_id = v_team.id
      AND ps.status = 'final';

    SELECT COALESCE(jsonb_agg(ps.feedback ORDER BY md5(ps.feedback)), '[]'::jsonb)
    INTO v_comments
    FROM public.preliminary_scores ps
    WHERE ps.team_id = v_team.id
      AND ps.status = 'final'
      AND ps.feedback IS NOT NULL
      AND TRIM(ps.feedback) <> '';

    SELECT
      COALESCE(jsonb_object_agg(g.criterion, g.pts), '{}'::jsonb)
    INTO v_points
    FROM (
      SELECT s.criterion, SUM(s.points) AS pts
        FROM public.score_sanctions s
       WHERE s.team_id = v_team.id AND s.stage = 'preliminary'
       GROUP BY s.criterion
    ) AS g;

    SELECT COALESCE(
      jsonb_agg(jsonb_build_object('criterion', s.criterion, 'points', s.points, 'reason', s.reason) ORDER BY s.created_at),
      '[]'::jsonb
    )
    INTO v_sanctions
    FROM public.score_sanctions s
    WHERE s.team_id = v_team.id AND s.stage = 'preliminary';

    IF v_count > 0 THEN
      v_preliminary_json := jsonb_build_object(
        'judge_count', v_count,
        'criteria', (
          SELECT jsonb_agg(
                   jsonb_build_object(
                     'key', c.key,
                     'average', ROUND(GREATEST(c.avg_val - COALESCE((v_points ->> c.key)::numeric, 0), 0), 2)
                   ) ORDER BY c.ord)
            FROM (
              VALUES
                (1, 'functionality_score', v_func),
                (2, 'case_study_fit_score', v_fit),
                (3, 'ui_ux_score', v_ui),
                (4, 'code_quality_score', v_code),
                (5, 'documentation_score', v_doc)
            ) AS c (ord, key, avg_val)
        ),
        'total', ROUND(GREATEST(v_raw_total - public.score_sanction_deduction(v_team.id, 'preliminary'), 0), 2),
        'comments', COALESCE(v_comments, '[]'::jsonb),
        'sanctions', COALESCE(v_sanctions, '[]'::jsonb)
      );
    ELSE
      v_preliminary_json := jsonb_build_object(
        'judge_count', 0,
        'criteria', '[]'::jsonb,
        'total', NULL,
        'comments', '[]'::jsonb,
        'sanctions', '[]'::jsonb
      );
    END IF;
  END IF;

  -- 7. Final stage aggregate (if released and team is finalist)
  IF v_final_released AND v_team.is_finalist THEN
    SELECT
      COUNT(fs.id)::int,
      AVG(fs.total_weighted_score),
      AVG(fs.functionality_score),
      AVG(fs.case_study_fit_score),
      AVG(fs.ui_ux_score),
      AVG(fs.code_quality_score),
      AVG(fs.documentation_score),
      AVG(fs.presentation_qa_score)
    INTO v_count, v_raw_total, v_func, v_fit, v_ui, v_code, v_doc, v_pres
    FROM public.final_scores fs
    WHERE fs.team_id = v_team.id
      AND fs.status = 'final';

    SELECT COALESCE(jsonb_agg(fs.feedback ORDER BY md5(fs.feedback)), '[]'::jsonb)
    INTO v_comments
    FROM public.final_scores fs
    WHERE fs.team_id = v_team.id
      AND fs.status = 'final'
      AND fs.feedback IS NOT NULL
      AND TRIM(fs.feedback) <> '';

    SELECT
      COALESCE(jsonb_object_agg(g.criterion, g.pts), '{}'::jsonb)
    INTO v_points
    FROM (
      SELECT s.criterion, SUM(s.points) AS pts
        FROM public.score_sanctions s
       WHERE s.team_id = v_team.id AND s.stage = 'final'
       GROUP BY s.criterion
    ) AS g;

    SELECT COALESCE(
      jsonb_agg(jsonb_build_object('criterion', s.criterion, 'points', s.points, 'reason', s.reason) ORDER BY s.created_at),
      '[]'::jsonb
    )
    INTO v_sanctions
    FROM public.score_sanctions s
    WHERE s.team_id = v_team.id AND s.stage = 'final';

    IF v_count > 0 THEN
      v_final_json := jsonb_build_object(
        'judge_count', v_count,
        'criteria', (
          SELECT jsonb_agg(
                   jsonb_build_object(
                     'key', c.key,
                     'average', ROUND(GREATEST(c.avg_val - COALESCE((v_points ->> c.key)::numeric, 0), 0), 2)
                   ) ORDER BY c.ord)
            FROM (
              VALUES
                (1, 'functionality_score', v_func),
                (2, 'case_study_fit_score', v_fit),
                (3, 'ui_ux_score', v_ui),
                (4, 'code_quality_score', v_code),
                (5, 'documentation_score', v_doc),
                (6, 'presentation_qa_score', v_pres)
            ) AS c (ord, key, avg_val)
        ),
        'total', ROUND(GREATEST(v_raw_total - public.score_sanction_deduction(v_team.id, 'final'), 0), 2),
        'comments', COALESCE(v_comments, '[]'::jsonb),
        'sanctions', COALESCE(v_sanctions, '[]'::jsonb)
      );
    ELSE
      v_final_json := jsonb_build_object(
        'judge_count', 0,
        'criteria', '[]'::jsonb,
        'total', NULL,
        'comments', '[]'::jsonb,
        'sanctions', '[]'::jsonb
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

REVOKE ALL ON FUNCTION public.get_my_results() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_results() TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. GET_PUBLIC_RANKING() (aggregate after sanctions; output unchanged otherwise)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_ranking()
RETURNS TABLE (
  rank INT,
  team_name TEXT,
  institution TEXT,
  stage TEXT,
  score NUMERIC,
  is_own_team BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
  v_own_team UUID;
BEGIN
  -- Active team or admin only (current_user_role() is NULL for inactive profiles).
  v_role := public.current_user_role();
  IF v_role IS DISTINCT FROM 'team' AND v_role IS DISTINCT FROM 'admin' THEN
    RETURN;
  END IF;

  IF v_role = 'team' THEN
    SELECT t.id INTO v_own_team
      FROM public.teams AS t
     WHERE t.profile_id = (SELECT auth.uid());
    IF v_own_team IS NULL THEN
      RETURN;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.competition_settings AS cs
     WHERE cs.id = TRUE
       AND cs.ranking_published
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT t.id, t.team_name, t.institution, t.is_finalist
      FROM public.teams AS t
      JOIN public.submissions AS s ON s.team_id = t.id AND s.status = 'submitted'
     WHERE NOT t.is_disqualified
  ),
  finalists AS (
    SELECT e.id, e.team_name, e.institution,
           -- NULL stays NULL when there are no scores (GREATEST would turn it into 0).
           CASE WHEN COUNT(fs.id) = 0 THEN NULL
                ELSE ROUND(GREATEST(AVG(fs.total_weighted_score) - public.score_sanction_deduction(e.id, 'final'), 0), 2)
           END AS avg_score
      FROM eligible AS e
      LEFT JOIN public.final_scores AS fs ON fs.team_id = e.id AND fs.status = 'final'
     WHERE e.is_finalist
     GROUP BY e.id, e.team_name, e.institution
  ),
  others AS (
    SELECT e.id, e.team_name, e.institution,
           CASE WHEN COUNT(ps.id) = 0 THEN NULL
                ELSE ROUND(GREATEST(AVG(ps.total_weighted_score) - public.score_sanction_deduction(e.id, 'preliminary'), 0), 2)
           END AS avg_score
      FROM eligible AS e
      LEFT JOIN public.preliminary_scores AS ps ON ps.team_id = e.id AND ps.status = 'final'
     WHERE NOT e.is_finalist
     GROUP BY e.id, e.team_name, e.institution
  ),
  ranked_finalists AS (
    SELECT f.*, (RANK() OVER (ORDER BY f.avg_score DESC NULLS LAST))::INT AS r
      FROM finalists AS f
  ),
  ranked_others AS (
    SELECT o.*,
           ((SELECT COUNT(*) FROM finalists)::INT
             + RANK() OVER (ORDER BY o.avg_score DESC NULLS LAST))::INT AS r
      FROM others AS o
  )
  SELECT x.r, x.team_name, x.institution, x.stage, x.avg_score, (x.id = v_own_team)
    FROM (
      SELECT rf.r, rf.team_name, rf.institution, 'final'::TEXT AS stage, rf.avg_score, rf.id
        FROM ranked_finalists AS rf
      UNION ALL
      SELECT ro.r, ro.team_name, ro.institution, 'preliminary'::TEXT AS stage, ro.avg_score, ro.id
        FROM ranked_others AS ro
    ) AS x
   ORDER BY x.r, x.team_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_ranking() TO authenticated;

-- ============================================================================
-- MIT-WEEK 2026: published ranking shows institutions for the top 5 only
-- Owner request: in the team-facing ranking, a team's institution is visible only for
-- ranks 1-5 (and always for the caller's own team). Everyone else's institution is
-- returned as NULL, so it never reaches the browser.
-- Redefines public.get_public_ranking() from 20261122000000_score_sanctions.sql:
-- identical ranking and sanction logic; only the institution column is masked.
-- Apply after 20261122000000. Idempotent: safe to re-run.
-- ============================================================================

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
  SELECT
    x.r,
    x.team_name,
    -- Institution only for ranks 1-5 (a scored rank) and for the caller's own team.
    CASE WHEN (x.r <= 5 AND x.avg_score IS NOT NULL) OR x.id = v_own_team THEN x.institution ELSE NULL END,
    x.stage,
    x.avg_score,
    (x.id = v_own_team)
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

-- ============================================================================
-- MIT-WEEK 2026: overall ranking published to contestants
-- At the committee's request the admin can publish the full standings to every team,
-- first to last, below /team/hasil. Normally done after the final results are released;
-- it can also be switched on earlier for testing (the app labels it as provisional).
--   1. competition_settings.ranking_published (admin toggle, default off)
--   2. public.get_public_ranking(): SECURITY DEFINER, returns rows only when
--      ranking_published is true.
-- Order: finalists by final average (ranks 1..k), then the other submitted,
-- non-disqualified teams by preliminary average (ranks k+1..n). Only final-status
-- scores count. Returns rank, team name, institution, aggregate score, the stage that
-- score comes from, and whether the row is the caller's own team. Never judge identity,
-- per-judge scores, ids, team codes or emails.
-- Apply after 20261118020000. Idempotent: safe to re-run.
-- ============================================================================

ALTER TABLE public.competition_settings
  ADD COLUMN IF NOT EXISTS ranking_published BOOLEAN NOT NULL DEFAULT FALSE;

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
           ROUND(AVG(fs.total_weighted_score), 2) AS avg_score
      FROM eligible AS e
      LEFT JOIN public.final_scores AS fs ON fs.team_id = e.id AND fs.status = 'final'
     WHERE e.is_finalist
     GROUP BY e.id, e.team_name, e.institution
  ),
  others AS (
    SELECT e.id, e.team_name, e.institution,
           ROUND(AVG(ps.total_weighted_score), 2) AS avg_score
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

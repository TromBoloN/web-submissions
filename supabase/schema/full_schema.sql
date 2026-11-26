-- ============================================================================
-- MIT-WEEK competition portal: FULL SCHEMA (generated, do not edit by hand)
--
-- The final state of every file in supabase/migrations/, as one script that is safe to run twice:
-- on a fresh Supabase project, or on a database that already has the migrations.
--   * Tables are created only if missing (columns are never altered or dropped here).
--   * Functions, views, triggers and policies are replaced with their final definitions.
--   * Constraints, types and identity columns are skipped when they already exist.
--   * Seed rows (settings, case study, finalist notice, final presentation, system stages) are
--     inserted only if missing, so existing settings are never overwritten.
-- It does NOT create the "web-showcase" storage bucket (create it in the dashboard, see SETUP.md)
-- and does not touch Supabase's own auth/storage schemas beyond our storage.objects policies.
--
-- Regenerate after adding a migration: node scripts/build-full-schema.mjs
-- Built from 21 migrations, last: 20261126000000_judges_view_public_ranking.sql
-- ============================================================================

BEGIN;

SET LOCAL check_function_bodies = false;
SET LOCAL client_min_messages = warning;
SELECT pg_catalog.set_config('search_path', '', true);

DO $guard$ BEGIN
  CREATE TYPE public.judge_stage_type AS ENUM (
      'preliminary',
      'final',
      'both'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  CREATE TYPE public.score_status_type AS ENUM (
      'draft',
      'final'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  CREATE TYPE public.submission_status_type AS ENUM (
      'draft',
      'submitted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  CREATE TYPE public.user_role_type AS ENUM (
      'admin',
      'judge',
      'team'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

CREATE OR REPLACE FUNCTION public.check_final_scores_not_released() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.check_preliminary_scores_not_released() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.check_recusal_validity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_released boolean;
BEGIN
    -- Check results released
    SELECT CASE WHEN (CASE WHEN TG_OP = 'DELETE' THEN OLD.stage ELSE NEW.stage END) = 'preliminary'
                THEN COALESCE(cs.preliminary_results_released, FALSE)
                ELSE COALESCE(cs.final_results_released, FALSE)
           END
      INTO v_released
      FROM public.competition_settings cs
     WHERE cs.id = TRUE;

    IF v_released THEN
        RAISE EXCEPTION 'Aksi recusal ditolak karena hasil penilaian tahap ini telah dirilis.'
            USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Check if judge already has final score for this team in this stage
        IF NEW.stage = 'preliminary' THEN
            IF EXISTS (
                SELECT 1 FROM public.preliminary_scores
                 WHERE judge_id = NEW.judge_id
                   AND team_id = NEW.team_id
                   AND status = 'final'
            ) THEN
                RAISE EXCEPTION 'Recusal ditolak karena Anda sudah memiliki skor final untuk tim ini.'
                    USING ERRCODE = 'P0001';
            END IF;
            -- Clean up any existing draft score upon recusal
            DELETE FROM public.preliminary_scores
             WHERE judge_id = NEW.judge_id
               AND team_id = NEW.team_id
               AND status = 'draft';
        ELSIF NEW.stage = 'final' THEN
            IF EXISTS (
                SELECT 1 FROM public.final_scores
                 WHERE judge_id = NEW.judge_id
                   AND team_id = NEW.team_id
                   AND status = 'final'
            ) THEN
                RAISE EXCEPTION 'Recusal ditolak karena Anda sudah memiliki skor final untuk tim ini.'
                    USING ERRCODE = 'P0001';
            END IF;
            -- Clean up any existing draft score upon recusal
            DELETE FROM public.final_scores
             WHERE judge_id = NEW.judge_id
               AND team_id = NEW.team_id
               AND status = 'draft';
        END IF;

        RETURN NEW;
    END IF;

    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_score_not_recused() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_stage text;
BEGIN
    v_stage := TG_ARGV[0];

    IF EXISTS (
        SELECT 1 FROM public.judge_recusals
         WHERE judge_id = NEW.judge_id
           AND team_id = NEW.team_id
           AND stage = v_stage
    ) THEN
        RAISE EXCEPTION 'Penilaian ditolak karena juri telah mengajukan recusal untuk tim ini pada tahap %.', v_stage
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_judge_stage() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT p.judge_stage::text
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT p.role::text
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active;
$$;

CREATE OR REPLACE FUNCTION public.get_my_final_presentation() RETURNS TABLE(presentation_minutes smallint, qa_minutes smallint, venue text, meeting_url text, note text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT f.presentation_minutes,
         f.qa_minutes,
         CASE WHEN f.logistics_published THEN NULLIF(f.venue, '') END,
         CASE WHEN f.logistics_published THEN f.meeting_url END,
         f.note
    FROM public.final_presentation AS f
   WHERE f.id
     AND (
       public.current_user_role() = 'admin'
       OR (
         public.current_user_role() = 'judge'
         AND public.current_user_judge_stage() IN ('final', 'both')
       )
       OR (
         public.current_user_role() = 'team'
         AND EXISTS (
           SELECT 1
             FROM public.teams AS t
            WHERE t.profile_id = (SELECT auth.uid())
              AND t.is_finalist
              AND NOT t.is_disqualified
         )
         AND EXISTS (
           SELECT 1 FROM public.finalist_notice AS n WHERE n.id AND n.is_published
         )
       )
     );
$$;

CREATE OR REPLACE FUNCTION public.get_my_finalist_notice() RETURNS TABLE(is_finalist boolean, message text, published_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT t.is_finalist,
         CASE WHEN t.is_finalist THEN n.finalist_message
              ELSE n.non_finalist_message END,
         n.published_at
    FROM public.finalist_notice n
    JOIN public.teams t ON t.profile_id = (SELECT auth.uid())
   WHERE n.is_published
     AND NOT t.is_disqualified
     AND public.current_user_role() = 'team';
$$;

CREATE OR REPLACE FUNCTION public.get_my_results() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.get_preliminary_scores_for_final(p_team_id uuid) RETURNS TABLE(judge_label integer, functionality_score numeric, case_study_fit_score numeric, ui_ux_score numeric, code_quality_score numeric, documentation_score numeric, total_weighted_score numeric, feedback text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.get_public_competition_schedule() RETURNS TABLE(key text, title text, description text, starts_on date, ends_on date, time_label text, sort_order smallint, show_on_track boolean, status_override text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT s.key, s.title, s.description, s.starts_on, s.ends_on, s.time_label,
         s.sort_order, s.show_on_track, s.status_override
    FROM public.competition_stages AS s
   ORDER BY s.sort_order, s.starts_on, s.key;
$$;

CREATE OR REPLACE FUNCTION public.get_public_contact_whatsapp() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT s.contact_whatsapp
  FROM public.competition_settings AS s
  WHERE s.id;
$$;

CREATE OR REPLACE FUNCTION public.get_public_event_info() RETURNS TABLE(event_name text, event_track text, finalist_count smallint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT s.event_name, s.event_track, s.finalist_count
    FROM public.competition_settings AS s
   WHERE s.id;
$$;

CREATE OR REPLACE FUNCTION public.get_public_ranking() RETURNS TABLE(rank integer, team_name text, institution text, stage text, score numeric, is_own_team boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_role TEXT;
  v_own_team UUID;
BEGIN
  -- Active team, judge or admin only (current_user_role() is NULL for inactive profiles).
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('team', 'judge', 'admin') THEN
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

CREATE OR REPLACE FUNCTION public.get_public_showcase() RETURNS TABLE(team_name text, showcase_title text, showcase_description text, showcase_image_path text, github_url text, live_demo_url text, video_url text, live_demo_ok boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT
    t.team_name,
    t.showcase_title,
    t.showcase_description,
    t.showcase_image_path,
    CASE WHEN t.showcase_consent OR t.showcase_is_finalist IS TRUE THEN s.github_url ELSE '' END,
    CASE WHEN t.showcase_consent OR t.showcase_is_finalist IS TRUE THEN s.live_demo_url ELSE '' END,
    CASE WHEN t.showcase_consent OR t.showcase_is_finalist IS TRUE THEN s.video_url ELSE '' END,
    COALESCE(
      (t.showcase_consent OR t.showcase_is_finalist IS TRUE)
        AND s.live_demo_url <> ''
        AND (s.link_check -> 'liveDemo' ->> 'status') = 'ok',
      FALSE
    )
    FROM public.teams AS t
    JOIN public.profiles AS p ON p.id = t.profile_id
    JOIN public.submissions AS s ON s.team_id = t.id
    CROSS JOIN public.competition_settings AS cs
   WHERE cs.id
     AND (t.showcase_consent OR t.showcase_is_finalist IS TRUE)
     AND NOT t.is_disqualified
     AND p.is_active
     AND s.status = 'submitted'::public.submission_status_type
     AND (
       (t.showcase_is_finalist = FALSE AND cs.showcase_published_at IS NOT NULL)
       OR
       (t.showcase_is_finalist = TRUE AND cs.showcase_finalists_published_at IS NOT NULL)
     )
   ORDER BY md5(t.id::TEXT);
$$;

CREATE OR REPLACE FUNCTION public.get_public_showcase_winners() RETURNS TABLE(team_name text, winner_rank bigint, final_score numeric, showcase_title text, showcase_description text, showcase_image_path text, github_url text, live_demo_url text, video_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT
    ranking.team_name,
    ranking.rank,
    ranking.avg_score,
    t.showcase_title,
    t.showcase_description,
    t.showcase_image_path,
    CASE WHEN t.showcase_consent OR t.showcase_is_finalist IS TRUE THEN s.github_url ELSE '' END,
    CASE WHEN t.showcase_consent OR t.showcase_is_finalist IS TRUE THEN s.live_demo_url ELSE '' END,
    CASE WHEN t.showcase_consent OR t.showcase_is_finalist IS TRUE THEN s.video_url ELSE '' END
    FROM public.final_ranking AS ranking
    JOIN public.teams AS t ON t.id = ranking.team_id
    JOIN public.profiles AS p ON p.id = t.profile_id
    JOIN public.submissions AS s ON s.team_id = t.id
    CROSS JOIN public.competition_settings AS cs
   WHERE cs.id
     AND cs.winners_published_at IS NOT NULL
     AND p.is_active
     AND NOT t.is_disqualified
     AND ranking.rank <= 3
     AND s.status = 'submitted'::public.submission_status_type
   ORDER BY ranking.rank, ranking.team_id
   LIMIT 3;
$$;

CREATE OR REPLACE FUNCTION public.guard_competition_stage() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_system AND NEW.key IS DISTINCT FROM OLD.key THEN
      RAISE EXCEPTION 'System stage key cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.is_system IS DISTINCT FROM OLD.is_system THEN
      RAISE EXCEPTION 'is_system cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := statement_timestamp();
  NEW.updated_by := COALESCE((SELECT auth.uid()), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_feedback_only_edit(p_old jsonb, p_new jsonb) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT current_setting('mitweek.feedback_only_edit', TRUE) = 'on'
     AND (p_old - 'feedback' - 'updated_at' - 'total_weighted_score')
       = (p_new - 'feedback' - 'updated_at' - 'total_weighted_score');
$$;

CREATE OR REPLACE FUNCTION public.judge_can_score_final(p_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT COALESCE(public.current_user_role() = 'judge', FALSE)
       AND public.current_user_judge_stage() IN ('final', 'both')
       AND NOT EXISTS (
            SELECT 1 FROM public.competition_settings cs
             WHERE cs.id = TRUE AND cs.final_results_released
       )
       AND NOT EXISTS (
            SELECT 1 FROM public.judge_recusals jr
             WHERE jr.judge_id = (SELECT auth.uid())
               AND jr.team_id = p_team_id
               AND jr.stage = 'final'
       )
       AND EXISTS (
            SELECT 1
              FROM public.teams AS t
              JOIN public.submissions AS s ON s.team_id = t.id
             WHERE t.id = p_team_id
               AND t.is_finalist
               AND NOT t.is_disqualified
               AND s.status = 'submitted'
       );
$$;

CREATE OR REPLACE FUNCTION public.judge_can_score_preliminary(p_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT COALESCE(public.current_user_role() = 'judge', FALSE)
       AND public.current_user_judge_stage() IN ('preliminary', 'both')
       AND NOT EXISTS (
            SELECT 1 FROM public.competition_settings cs
             WHERE cs.id = TRUE AND cs.preliminary_results_released
       )
       AND NOT EXISTS (
            SELECT 1 FROM public.judge_recusals jr
             WHERE jr.judge_id = (SELECT auth.uid())
               AND jr.team_id = p_team_id
               AND jr.stage = 'preliminary'
       )
       AND EXISTS (
            SELECT 1
              FROM public.teams AS t
              JOIN public.submissions AS s ON s.team_id = t.id
             WHERE t.id = p_team_id
               AND NOT t.is_disqualified
               AND s.status = 'submitted'
       );
$$;

CREATE OR REPLACE FUNCTION public.judge_can_view_team(p_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT COALESCE(public.current_user_role() = 'judge', FALSE)
       AND (
            public.current_user_judge_stage() IN ('preliminary', 'both')
            OR EXISTS (
                SELECT 1 FROM public.teams AS t
                WHERE t.id = p_team_id AND t.is_finalist
            )
       );
$$;

CREATE OR REPLACE FUNCTION public.lock_score_keys() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.judge_id   := OLD.judge_id;
        NEW.team_id    := OLD.team_id;
        NEW.created_at := OLD.created_at;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_submission_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.publish_showcase_phase_one() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.publish_showcase_phase_two() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_phase_one_at TIMESTAMPTZ;
  v_phase_two_at TIMESTAMPTZ;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RETURN FALSE;
  END IF;

  SELECT cs.showcase_published_at, cs.showcase_finalists_published_at
    INTO v_phase_one_at, v_phase_two_at
    FROM public.competition_settings AS cs
   WHERE cs.id;

  IF v_phase_one_at IS NULL OR v_phase_two_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.competition_settings
     SET showcase_finalists_published_at = statement_timestamp(),
         updated_at = statement_timestamp()
   WHERE id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_showcase_winners() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_phase_two_at TIMESTAMPTZ;
  v_winners_at TIMESTAMPTZ;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RETURN FALSE;
  END IF;

  SELECT cs.showcase_finalists_published_at, cs.winners_published_at
    INTO v_phase_two_at, v_winners_at
    FROM public.competition_settings AS cs
   WHERE cs.id;

  IF v_phase_two_at IS NULL OR v_winners_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.competition_settings
     SET winners_published_at = statement_timestamp(),
         updated_at = statement_timestamp()
   WHERE id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_showcase_details(p_consent boolean, p_title text, p_description text, p_image_path text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
DECLARE
  v_team_id UUID;
  v_is_finalist BOOLEAN;
  v_current_image TEXT;
  v_consent_locked_at TIMESTAMPTZ;
  v_finalists_published_at TIMESTAMPTZ;
  v_updated INTEGER;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'team' THEN
    RETURN FALSE;
  END IF;

  IF length(trim(COALESCE(p_title, ''))) > 80
     OR length(trim(COALESCE(p_description, ''))) > 300 THEN
    RETURN FALSE;
  END IF;

  SELECT t.id, COALESCE(t.showcase_is_finalist, t.is_finalist), t.showcase_image_path
    INTO v_team_id, v_is_finalist, v_current_image
    FROM public.teams AS t
    JOIN public.profiles AS p ON p.id = t.profile_id
   WHERE t.profile_id = (SELECT auth.uid())
     AND p.is_active
     AND NOT t.is_disqualified;

  IF v_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Own upload, or keep the image already on the card (e.g. one the admin uploaded).
  IF p_image_path IS NOT NULL
     AND p_image_path IS DISTINCT FROM v_current_image
     AND (
       p_image_path !~ '^showcase/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(png|jpe?g|webp)$'
       OR split_part(p_image_path, '/', 2) <> (SELECT auth.uid())::TEXT
     ) THEN
    RETURN FALSE;
  END IF;

  SELECT cs.showcase_consent_locked_at, cs.showcase_finalists_published_at
    INTO v_consent_locked_at, v_finalists_published_at
    FROM public.competition_settings AS cs
   WHERE cs.id;

  -- Until the finalist announcement is published a finalist is treated like any other team,
  -- so the result of this call never reveals finalist status early.
  v_is_finalist := v_is_finalist AND EXISTS (
    SELECT 1 FROM public.finalist_notice AS n WHERE n.id AND n.is_published
  );

  -- Finalists go public in phase two, so they stay editable until then.
  IF (v_is_finalist AND v_finalists_published_at IS NOT NULL)
     OR (NOT v_is_finalist AND v_consent_locked_at IS NOT NULL) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.teams AS t
     SET showcase_consent = p_consent,
         showcase_title = trim(COALESCE(p_title, '')),
         showcase_description = trim(COALESCE(p_description, '')),
         showcase_image_path = p_image_path
   FROM public.submissions AS s
  WHERE t.id = v_team_id
    AND s.team_id = t.id
    AND s.status = 'submitted'::public.submission_status_type;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$_$;

CREATE OR REPLACE FUNCTION public.score_sanction_deduction(p_team_id uuid, p_stage text) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.set_showcase_consent(p_consent boolean) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_team_id UUID;
  v_consent_locked_at TIMESTAMPTZ;
  v_updated INTEGER;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'team' THEN
    RETURN FALSE;
  END IF;

  SELECT t.id
    INTO v_team_id
    FROM public.teams AS t
    JOIN public.profiles AS p ON p.id = t.profile_id
   WHERE t.profile_id = (SELECT auth.uid())
     AND p.is_active
     AND NOT t.is_disqualified;

  IF v_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT cs.showcase_consent_locked_at
    INTO v_consent_locked_at
    FROM public.competition_settings AS cs
   WHERE cs.id;

  IF v_consent_locked_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.teams AS t
     SET showcase_consent = p_consent
    FROM public.submissions AS s
   WHERE t.id = v_team_id
     AND s.team_id = t.id
     AND s.status = 'submitted'::public.submission_status_type;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_submission_first_submitted_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'submitted' AND NEW.first_submitted_at IS NULL THEN
            NEW.first_submitted_at := COALESCE(NEW.submitted_at, now());
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Never overwrite once it has been set
        IF OLD.first_submitted_at IS NOT NULL THEN
            NEW.first_submitted_at := OLD.first_submitted_at;
        ELSIF OLD.status IS DISTINCT FROM 'submitted' AND NEW.status = 'submitted' THEN
            NEW.first_submitted_at := COALESCE(NEW.submitted_at, now());
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_submission_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.submitted_at := now();
    ELSE
        NEW.submitted_at := OLD.submitted_at;
        NEW.team_id      := OLD.team_id;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.stamp_final_presentation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := statement_timestamp();
  NEW.updated_by := COALESCE((SELECT auth.uid()), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.submission_open() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT statement_timestamp() < s.submission_closes_at
    FROM public.competition_settings AS s
    WHERE s.id;
$$;

CREATE OR REPLACE FUNCTION public.submissions_set_first_submitted_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.team_can_submit(p_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT COALESCE(public.current_user_role() = 'team', FALSE)
       AND COALESCE(public.submission_open(), FALSE)
       AND EXISTS (
           SELECT 1 FROM public.teams AS t
           WHERE t.id = p_team_id
             AND t.profile_id = (SELECT auth.uid())
             AND NOT t.is_disqualified
       );
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_score_feedback(p_stage text, p_team_id uuid, p_feedback text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.case_study (
    id boolean DEFAULT true NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    content_md text DEFAULT ''::text NOT NULL,
    release_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT case_study_id_check CHECK (id)
);

CREATE TABLE IF NOT EXISTS public.competition_settings (
    id boolean DEFAULT true NOT NULL,
    submission_closes_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    juknis_url text,
    contact_whatsapp text,
    preliminary_results_released boolean DEFAULT false NOT NULL,
    final_results_released boolean DEFAULT false NOT NULL,
    showcase_published_at timestamp with time zone,
    showcase_finalists_published_at timestamp with time zone,
    showcase_consent_locked_at timestamp with time zone,
    winners_published_at timestamp with time zone,
    event_name text DEFAULT 'MIT-WEEK 2026'::text NOT NULL,
    event_track text DEFAULT 'Web Development'::text NOT NULL,
    finalist_count smallint DEFAULT 5 NOT NULL,
    gallery_new_badge_days smallint DEFAULT 7 NOT NULL,
    ranking_published boolean DEFAULT false NOT NULL,
    CONSTRAINT competition_settings_contact_whatsapp_check CHECK (((contact_whatsapp IS NULL) OR (contact_whatsapp ~ '^[0-9]{8,15}$'::text))),
    CONSTRAINT competition_settings_event_name_check CHECK (((char_length(btrim(event_name)) >= 1) AND (char_length(btrim(event_name)) <= 60))),
    CONSTRAINT competition_settings_event_track_check CHECK (((char_length(btrim(event_track)) >= 1) AND (char_length(btrim(event_track)) <= 60))),
    CONSTRAINT competition_settings_finalist_count_check CHECK (((finalist_count >= 1) AND (finalist_count <= 20))),
    CONSTRAINT competition_settings_gallery_new_badge_days_check CHECK (((gallery_new_badge_days >= 0) AND (gallery_new_badge_days <= 60))),
    CONSTRAINT competition_settings_id_check CHECK (id),
    CONSTRAINT competition_settings_juknis_url_check CHECK (((juknis_url IS NULL) OR (juknis_url ~* '^https://'::text)))
);

COMMENT ON COLUMN public.competition_settings.finalist_count IS 'Number of finalists ("Top N"). Display and admin guidance only; finalists are still picked manually.';

COMMENT ON COLUMN public.competition_settings.gallery_new_badge_days IS 'Days the sidebar shows "Baru" on the gallery after showcase_published_at. 0 disables the badge.';

CREATE TABLE IF NOT EXISTS public.competition_stages (
    key text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    time_label text DEFAULT ''::text NOT NULL,
    sort_order smallint DEFAULT 100 NOT NULL,
    show_on_track boolean DEFAULT true NOT NULL,
    status_override text,
    is_system boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT competition_stages_date_order_check CHECK ((ends_on >= starts_on)),
    CONSTRAINT competition_stages_description_check CHECK ((char_length(description) <= 240)),
    CONSTRAINT competition_stages_key_check CHECK ((key ~ '^[a-z][a-z0-9_]{1,31}$'::text)),
    CONSTRAINT competition_stages_sort_order_check CHECK (((sort_order >= 0) AND (sort_order <= 1000))),
    CONSTRAINT competition_stages_status_override_check CHECK (((status_override IS NULL) OR (status_override = ANY (ARRAY['upcoming'::text, 'current'::text, 'done'::text])))),
    CONSTRAINT competition_stages_time_label_check CHECK ((char_length(time_label) <= 40)),
    CONSTRAINT competition_stages_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 80)))
);

COMMENT ON TABLE public.competition_stages IS 'Competition milestones shown on the team journey track, admin timeline and public gallery. Dates are WITA calendar days.';

COMMENT ON COLUMN public.competition_stages.status_override IS 'NULL follows starts_on/ends_on; otherwise forces upcoming, current or done.';

COMMENT ON COLUMN public.competition_stages.is_system IS 'System stages are referenced by app logic: they cannot be deleted and their key cannot change.';

CREATE TABLE IF NOT EXISTS public.final_presentation (
    id boolean DEFAULT true NOT NULL,
    presentation_minutes smallint DEFAULT 10 NOT NULL,
    qa_minutes smallint DEFAULT 10 NOT NULL,
    venue text DEFAULT ''::text NOT NULL,
    meeting_url text,
    note text DEFAULT 'Urutan tampil serta lokasi atau tautan sesi akan dikirim langsung oleh panitia.'::text NOT NULL,
    logistics_published boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT final_presentation_id_check CHECK (id),
    CONSTRAINT final_presentation_meeting_url_check CHECK (((meeting_url IS NULL) OR ((meeting_url ~* '^https://'::text) AND (char_length(meeting_url) <= 500)))),
    CONSTRAINT final_presentation_note_check CHECK ((char_length(note) <= 500)),
    CONSTRAINT final_presentation_presentation_minutes_check CHECK (((presentation_minutes >= 1) AND (presentation_minutes <= 120))),
    CONSTRAINT final_presentation_qa_minutes_check CHECK (((qa_minutes >= 0) AND (qa_minutes <= 120))),
    CONSTRAINT final_presentation_venue_check CHECK ((char_length(venue) <= 160))
);

COMMENT ON COLUMN public.final_presentation.logistics_published IS 'When FALSE, venue and meeting_url are withheld from finalists and judges (format and note still show).';

CREATE TABLE IF NOT EXISTS public.final_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    judge_id uuid NOT NULL,
    team_id uuid NOT NULL,
    functionality_score numeric(5,2),
    case_study_fit_score numeric(5,2),
    ui_ux_score numeric(5,2),
    code_quality_score numeric(5,2),
    documentation_score numeric(5,2),
    presentation_qa_score numeric(5,2),
    total_weighted_score numeric(5,2) GENERATED ALWAYS AS (((((((functionality_score * 0.25) + (case_study_fit_score * 0.20)) + (ui_ux_score * 0.15)) + (code_quality_score * 0.10)) + (documentation_score * 0.10)) + (presentation_qa_score * 0.20))) STORED,
    feedback text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    status public.score_status_type DEFAULT 'final'::public.score_status_type NOT NULL,
    private_note text,
    CONSTRAINT chk_final_private_note_length CHECK (((private_note IS NULL) OR (length(private_note) <= 2000))),
    CONSTRAINT chk_final_scores_status_criteria CHECK (((status = 'draft'::public.score_status_type) OR ((status = 'final'::public.score_status_type) AND (functionality_score IS NOT NULL) AND (case_study_fit_score IS NOT NULL) AND (ui_ux_score IS NOT NULL) AND (code_quality_score IS NOT NULL) AND (documentation_score IS NOT NULL) AND (presentation_qa_score IS NOT NULL)))),
    CONSTRAINT final_scores_case_study_fit_score_check CHECK (((case_study_fit_score >= (0)::numeric) AND (case_study_fit_score <= (100)::numeric))),
    CONSTRAINT final_scores_code_quality_score_check CHECK (((code_quality_score >= (0)::numeric) AND (code_quality_score <= (100)::numeric))),
    CONSTRAINT final_scores_documentation_score_check CHECK (((documentation_score >= (0)::numeric) AND (documentation_score <= (100)::numeric))),
    CONSTRAINT final_scores_functionality_score_check CHECK (((functionality_score >= (0)::numeric) AND (functionality_score <= (100)::numeric))),
    CONSTRAINT final_scores_presentation_qa_score_check CHECK (((presentation_qa_score >= (0)::numeric) AND (presentation_qa_score <= (100)::numeric))),
    CONSTRAINT final_scores_ui_ux_score_check CHECK (((ui_ux_score >= (0)::numeric) AND (ui_ux_score <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    team_code text NOT NULL,
    team_name text NOT NULL,
    institution text NOT NULL,
    leader_name text NOT NULL,
    members text[] DEFAULT '{}'::text[] NOT NULL,
    is_finalist boolean DEFAULT false NOT NULL,
    is_disqualified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    showcase_consent boolean DEFAULT false NOT NULL,
    showcase_is_finalist boolean,
    showcase_title text DEFAULT ''::text NOT NULL,
    showcase_description text DEFAULT ''::text NOT NULL,
    showcase_image_path text
);

CREATE OR REPLACE VIEW public.final_ranking WITH (security_invoker='true') AS
 SELECT team_id,
    team_code,
    team_name,
    judges_count,
    round(adjusted_avg, 2) AS avg_score,
    rank() OVER (ORDER BY adjusted_avg DESC) AS rank,
    round(raw_avg, 2) AS raw_avg_score,
    round(deduction, 2) AS sanction_deduction
   FROM ( SELECT g.team_id,
            g.team_code,
            g.team_name,
            g.judges_count,
            g.raw_avg,
            g.deduction,
            GREATEST((g.raw_avg - g.deduction), (0)::numeric) AS adjusted_avg
           FROM ( SELECT t.id AS team_id,
                    t.team_code,
                    t.team_name,
                    count(fs.id) AS judges_count,
                    avg(fs.total_weighted_score) AS raw_avg,
                    public.score_sanction_deduction(t.id, 'final'::text) AS deduction
                   FROM (public.teams t
                     JOIN public.final_scores fs ON (((fs.team_id = t.id) AND (fs.status = 'final'::public.score_status_type))))
                  WHERE (t.is_finalist AND (NOT t.is_disqualified))
                  GROUP BY t.id, t.team_code, t.team_name) g) x;

CREATE TABLE IF NOT EXISTS public.finalist_notice (
    id boolean DEFAULT true NOT NULL,
    finalist_message text DEFAULT ''::text NOT NULL,
    non_finalist_message text DEFAULT ''::text NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT finalist_notice_id_check CHECK (id)
);

CREATE TABLE IF NOT EXISTS public.judge_recusals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    judge_id uuid NOT NULL,
    team_id uuid NOT NULL,
    stage text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT judge_recusals_reason_check CHECK (((length(TRIM(BOTH FROM reason)) > 0) AND (length(reason) <= 2000))),
    CONSTRAINT judge_recusals_stage_check CHECK ((stage = ANY (ARRAY['preliminary'::text, 'final'::text])))
);

CREATE TABLE IF NOT EXISTS public.preliminary_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    judge_id uuid NOT NULL,
    team_id uuid NOT NULL,
    functionality_score numeric(5,2),
    case_study_fit_score numeric(5,2),
    ui_ux_score numeric(5,2),
    code_quality_score numeric(5,2),
    documentation_score numeric(5,2),
    total_weighted_score numeric(5,2) GENERATED ALWAYS AS ((((((functionality_score * 0.35) + (case_study_fit_score * 0.25)) + (ui_ux_score * 0.20)) + (code_quality_score * 0.10)) + (documentation_score * 0.10))) STORED,
    feedback text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    status public.score_status_type DEFAULT 'final'::public.score_status_type NOT NULL,
    private_note text,
    CONSTRAINT chk_prelim_private_note_length CHECK (((private_note IS NULL) OR (length(private_note) <= 2000))),
    CONSTRAINT chk_prelim_scores_status_criteria CHECK (((status = 'draft'::public.score_status_type) OR ((status = 'final'::public.score_status_type) AND (functionality_score IS NOT NULL) AND (case_study_fit_score IS NOT NULL) AND (ui_ux_score IS NOT NULL) AND (code_quality_score IS NOT NULL) AND (documentation_score IS NOT NULL)))),
    CONSTRAINT preliminary_scores_case_study_fit_score_check CHECK (((case_study_fit_score >= (0)::numeric) AND (case_study_fit_score <= (100)::numeric))),
    CONSTRAINT preliminary_scores_code_quality_score_check CHECK (((code_quality_score >= (0)::numeric) AND (code_quality_score <= (100)::numeric))),
    CONSTRAINT preliminary_scores_documentation_score_check CHECK (((documentation_score >= (0)::numeric) AND (documentation_score <= (100)::numeric))),
    CONSTRAINT preliminary_scores_functionality_score_check CHECK (((functionality_score >= (0)::numeric) AND (functionality_score <= (100)::numeric))),
    CONSTRAINT preliminary_scores_ui_ux_score_check CHECK (((ui_ux_score >= (0)::numeric) AND (ui_ux_score <= (100)::numeric)))
);

CREATE OR REPLACE VIEW public.preliminary_ranking WITH (security_invoker='true') AS
 SELECT team_id,
    team_code,
    team_name,
    judges_count,
    round(adjusted_avg, 2) AS avg_score,
    rank() OVER (ORDER BY adjusted_avg DESC) AS rank,
    round(raw_avg, 2) AS raw_avg_score,
    round(deduction, 2) AS sanction_deduction
   FROM ( SELECT g.team_id,
            g.team_code,
            g.team_name,
            g.judges_count,
            g.raw_avg,
            g.deduction,
            GREATEST((g.raw_avg - g.deduction), (0)::numeric) AS adjusted_avg
           FROM ( SELECT t.id AS team_id,
                    t.team_code,
                    t.team_name,
                    count(ps.id) AS judges_count,
                    avg(ps.total_weighted_score) AS raw_avg,
                    public.score_sanction_deduction(t.id, 'preliminary'::text) AS deduction
                   FROM (public.teams t
                     JOIN public.preliminary_scores ps ON (((ps.team_id = t.id) AND (ps.status = 'final'::public.score_status_type))))
                  WHERE (NOT t.is_disqualified)
                  GROUP BY t.id, t.team_code, t.team_name) g) x;

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    role public.user_role_type DEFAULT 'team'::public.user_role_type NOT NULL,
    judge_stage public.judge_stage_type,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT judge_stage_matches_role CHECK (((role = 'judge'::public.user_role_type) = (judge_stage IS NOT NULL)))
);

CREATE TABLE IF NOT EXISTS public.score_sanctions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    stage text NOT NULL,
    criterion text NOT NULL,
    points numeric(5,2) NOT NULL,
    reason text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT score_sanctions_criterion_check CHECK (((criterion = ANY (ARRAY['functionality_score'::text, 'case_study_fit_score'::text, 'ui_ux_score'::text, 'code_quality_score'::text, 'documentation_score'::text])) OR ((stage = 'final'::text) AND (criterion = 'presentation_qa_score'::text)))),
    CONSTRAINT score_sanctions_points_check CHECK (((points > (0)::numeric) AND (points <= (100)::numeric))),
    CONSTRAINT score_sanctions_reason_check CHECK (((char_length(btrim(reason)) >= 5) AND (char_length(btrim(reason)) <= 1000))),
    CONSTRAINT score_sanctions_stage_check CHECK ((stage = ANY (ARRAY['preliminary'::text, 'final'::text])))
);

CREATE TABLE IF NOT EXISTS public.submission_history (
    id bigint NOT NULL,
    submission_id uuid NOT NULL,
    team_id uuid NOT NULL,
    github_url text DEFAULT ''::text NOT NULL,
    live_demo_url text DEFAULT ''::text NOT NULL,
    video_url text DEFAULT ''::text NOT NULL,
    notes_for_judges text DEFAULT ''::text NOT NULL,
    status text NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $guard$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'submission_history' AND column_name = 'id' AND is_identity = 'YES') THEN
    ALTER TABLE public.submission_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME public.submission_history_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );
  END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    github_url text DEFAULT ''::text NOT NULL,
    live_demo_url text DEFAULT ''::text NOT NULL,
    video_url text DEFAULT ''::text NOT NULL,
    status public.submission_status_type DEFAULT 'draft'::public.submission_status_type NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    first_submitted_at timestamp with time zone,
    link_check jsonb,
    link_checked_at timestamp with time zone,
    notes_for_judges text DEFAULT ''::text NOT NULL,
    CONSTRAINT github_url_format CHECK (((github_url = ''::text) OR (github_url ~* '^https?://'::text))),
    CONSTRAINT live_url_format CHECK (((live_demo_url = ''::text) OR (live_demo_url ~* '^https?://'::text))),
    CONSTRAINT submissions_notes_for_judges_length CHECK ((char_length(notes_for_judges) <= 1000)),
    CONSTRAINT submitted_requires_urls CHECK (((status = 'draft'::public.submission_status_type) OR ((github_url <> ''::text) AND (live_demo_url <> ''::text) AND (video_url <> ''::text)))),
    CONSTRAINT video_url_format CHECK (((video_url = ''::text) OR (video_url ~* '^https?://'::text)))
);

DO $guard$ BEGIN
  ALTER TABLE ONLY public.audit_logs
      ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.case_study
      ADD CONSTRAINT case_study_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.competition_settings
      ADD CONSTRAINT competition_settings_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.competition_stages
      ADD CONSTRAINT competition_stages_pkey PRIMARY KEY (key);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.final_presentation
      ADD CONSTRAINT final_presentation_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.final_scores
      ADD CONSTRAINT final_scores_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.finalist_notice
      ADD CONSTRAINT finalist_notice_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.judge_recusals
      ADD CONSTRAINT judge_recusals_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.preliminary_scores
      ADD CONSTRAINT preliminary_scores_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.profiles
      ADD CONSTRAINT profiles_email_key UNIQUE (email);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.profiles
      ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.score_sanctions
      ADD CONSTRAINT score_sanctions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.submission_history
      ADD CONSTRAINT submission_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.submissions
      ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.submissions
      ADD CONSTRAINT submissions_team_id_key UNIQUE (team_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.teams
      ADD CONSTRAINT teams_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.teams
      ADD CONSTRAINT teams_profile_id_key UNIQUE (profile_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.teams
      ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.teams
      ADD CONSTRAINT teams_team_name_key UNIQUE (team_name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.final_scores
      ADD CONSTRAINT unique_final_judge_team UNIQUE (judge_id, team_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.judge_recusals
      ADD CONSTRAINT unique_judge_team_stage_recusal UNIQUE (judge_id, team_id, stage);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.preliminary_scores
      ADD CONSTRAINT unique_prelim_judge_team UNIQUE (judge_id, team_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs USING btree (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_competition_stages_order ON public.competition_stages USING btree (sort_order, starts_on);

CREATE INDEX IF NOT EXISTS idx_final_scores_team ON public.final_scores USING btree (team_id);

CREATE INDEX IF NOT EXISTS idx_prelim_scores_team ON public.preliminary_scores USING btree (team_id);

CREATE INDEX IF NOT EXISTS idx_submission_history_changed_at ON public.submission_history USING btree (changed_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_submission_history_submission ON public.submission_history USING btree (submission_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_history_team ON public.submission_history USING btree (team_id);

CREATE INDEX IF NOT EXISTS score_sanctions_team_stage_idx ON public.score_sanctions USING btree (team_id, stage);

CREATE OR REPLACE TRIGGER submissions_first_submitted_at BEFORE INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.submissions_set_first_submitted_at();

CREATE OR REPLACE TRIGGER submissions_history_after_insert AFTER INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.log_submission_change();

CREATE OR REPLACE TRIGGER submissions_history_after_update AFTER UPDATE ON public.submissions FOR EACH ROW WHEN (((old.github_url IS DISTINCT FROM new.github_url) OR (old.live_demo_url IS DISTINCT FROM new.live_demo_url) OR (old.video_url IS DISTINCT FROM new.video_url) OR (old.notes_for_judges IS DISTINCT FROM new.notes_for_judges) OR (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION public.log_submission_change();

CREATE OR REPLACE TRIGGER trg_case_study_touch BEFORE UPDATE ON public.case_study FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE TRIGGER trg_check_recusal_validity BEFORE INSERT OR DELETE ON public.judge_recusals FOR EACH ROW EXECUTE FUNCTION public.check_recusal_validity();

CREATE OR REPLACE TRIGGER trg_competition_stages_guard BEFORE INSERT OR UPDATE ON public.competition_stages FOR EACH ROW EXECUTE FUNCTION public.guard_competition_stage();

CREATE OR REPLACE TRIGGER trg_final_lock_keys BEFORE INSERT OR UPDATE ON public.final_scores FOR EACH ROW EXECUTE FUNCTION public.lock_score_keys();

CREATE OR REPLACE TRIGGER trg_final_presentation_stamp BEFORE UPDATE ON public.final_presentation FOR EACH ROW EXECUTE FUNCTION public.stamp_final_presentation();

CREATE OR REPLACE TRIGGER trg_final_score_not_recused BEFORE INSERT OR UPDATE ON public.final_scores FOR EACH ROW EXECUTE FUNCTION public.check_score_not_recused('final');

CREATE OR REPLACE TRIGGER trg_final_scores_release_lock BEFORE INSERT OR DELETE OR UPDATE ON public.final_scores FOR EACH ROW EXECUTE FUNCTION public.check_final_scores_not_released();

CREATE OR REPLACE TRIGGER trg_finalist_notice_touch BEFORE UPDATE ON public.finalist_notice FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE TRIGGER trg_prelim_lock_keys BEFORE INSERT OR UPDATE ON public.preliminary_scores FOR EACH ROW EXECUTE FUNCTION public.lock_score_keys();

CREATE OR REPLACE TRIGGER trg_prelim_score_not_recused BEFORE INSERT OR UPDATE ON public.preliminary_scores FOR EACH ROW EXECUTE FUNCTION public.check_score_not_recused('preliminary');

CREATE OR REPLACE TRIGGER trg_preliminary_scores_release_lock BEFORE INSERT OR DELETE OR UPDATE ON public.preliminary_scores FOR EACH ROW EXECUTE FUNCTION public.check_preliminary_scores_not_released();

CREATE OR REPLACE TRIGGER trg_set_submission_first_submitted_at BEFORE INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.set_submission_first_submitted_at();

CREATE OR REPLACE TRIGGER trg_settings_touch BEFORE UPDATE ON public.competition_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE TRIGGER trg_submission_timestamps BEFORE INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.set_submission_timestamps();

DO $guard$ BEGIN
  ALTER TABLE ONLY public.audit_logs
      ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.case_study
      ADD CONSTRAINT case_study_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.competition_stages
      ADD CONSTRAINT competition_stages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.final_presentation
      ADD CONSTRAINT final_presentation_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.final_scores
      ADD CONSTRAINT final_scores_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.final_scores
      ADD CONSTRAINT final_scores_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.judge_recusals
      ADD CONSTRAINT judge_recusals_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.judge_recusals
      ADD CONSTRAINT judge_recusals_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.preliminary_scores
      ADD CONSTRAINT preliminary_scores_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.preliminary_scores
      ADD CONSTRAINT preliminary_scores_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.profiles
      ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.score_sanctions
      ADD CONSTRAINT score_sanctions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.score_sanctions
      ADD CONSTRAINT score_sanctions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.submission_history
      ADD CONSTRAINT submission_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.submission_history
      ADD CONSTRAINT submission_history_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.submissions
      ADD CONSTRAINT submissions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
  ALTER TABLE ONLY public.teams
      ADD CONSTRAINT teams_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DROP POLICY IF EXISTS "Admin delete sanctions" ON public.score_sanctions;
CREATE POLICY "Admin delete sanctions" ON public.score_sanctions FOR DELETE TO authenticated USING ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access case_study" ON public.case_study;
CREATE POLICY "Admin full access case_study" ON public.case_study TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access final" ON public.final_scores;
CREATE POLICY "Admin full access final" ON public.final_scores TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access finalist_notice" ON public.finalist_notice;
CREATE POLICY "Admin full access finalist_notice" ON public.finalist_notice TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access prelim" ON public.preliminary_scores;
CREATE POLICY "Admin full access prelim" ON public.preliminary_scores TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" ON public.profiles TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access settings" ON public.competition_settings;
CREATE POLICY "Admin full access settings" ON public.competition_settings TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access submissions" ON public.submissions;
CREATE POLICY "Admin full access submissions" ON public.submissions TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin full access teams" ON public.teams;
CREATE POLICY "Admin full access teams" ON public.teams TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin insert own sanctions" ON public.score_sanctions;
CREATE POLICY "Admin insert own sanctions" ON public.score_sanctions FOR INSERT TO authenticated WITH CHECK (((public.current_user_role() = 'admin'::text) AND (created_by = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Admin read all judge_recusals" ON public.judge_recusals;
CREATE POLICY "Admin read all judge_recusals" ON public.judge_recusals FOR SELECT TO authenticated USING ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin read sanctions" ON public.score_sanctions;
CREATE POLICY "Admin read sanctions" ON public.score_sanctions FOR SELECT TO authenticated USING ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Admin read submission history" ON public.submission_history;
CREATE POLICY "Admin read submission history" ON public.submission_history FOR SELECT TO authenticated USING ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS "Authenticated read settings" ON public.competition_settings;
CREATE POLICY "Authenticated read settings" ON public.competition_settings FOR SELECT TO authenticated USING ((public.current_user_role() IS NOT NULL));

DROP POLICY IF EXISTS "Final judges insert own scores" ON public.final_scores;
CREATE POLICY "Final judges insert own scores" ON public.final_scores FOR INSERT TO authenticated WITH CHECK (((judge_id = ( SELECT auth.uid() AS uid)) AND public.judge_can_score_final(team_id)));

DROP POLICY IF EXISTS "Final judges update own unlocked scores" ON public.final_scores;
CREATE POLICY "Final judges update own unlocked scores" ON public.final_scores FOR UPDATE TO authenticated USING (((judge_id = ( SELECT auth.uid() AS uid)) AND public.judge_can_score_final(team_id) AND (locked_at IS NULL))) WITH CHECK (((judge_id = ( SELECT auth.uid() AS uid)) AND public.judge_can_score_final(team_id)));

DROP POLICY IF EXISTS "Judges delete own recusals" ON public.judge_recusals;
CREATE POLICY "Judges delete own recusals" ON public.judge_recusals FOR DELETE TO authenticated USING (((judge_id = ( SELECT auth.uid() AS uid)) AND (public.current_user_role() = 'judge'::text)));

DROP POLICY IF EXISTS "Judges insert own recusals" ON public.judge_recusals;
CREATE POLICY "Judges insert own recusals" ON public.judge_recusals FOR INSERT TO authenticated WITH CHECK (((judge_id = ( SELECT auth.uid() AS uid)) AND (public.current_user_role() = 'judge'::text) AND public.judge_can_view_team(team_id)));

DROP POLICY IF EXISTS "Judges read case_study" ON public.case_study;
CREATE POLICY "Judges read case_study" ON public.case_study FOR SELECT TO authenticated USING ((public.current_user_role() = 'judge'::text));

DROP POLICY IF EXISTS "Judges read eligible submissions" ON public.submissions;
CREATE POLICY "Judges read eligible submissions" ON public.submissions FOR SELECT TO authenticated USING (((status = 'submitted'::public.submission_status_type) AND public.judge_can_view_team(team_id)));

DROP POLICY IF EXISTS "Judges read own final scores" ON public.final_scores;
CREATE POLICY "Judges read own final scores" ON public.final_scores FOR SELECT TO authenticated USING (((public.current_user_role() = 'judge'::text) AND (judge_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Judges read own preliminary scores" ON public.preliminary_scores;
CREATE POLICY "Judges read own preliminary scores" ON public.preliminary_scores FOR SELECT TO authenticated USING (((public.current_user_role() = 'judge'::text) AND (judge_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Judges read own recusals" ON public.judge_recusals;
CREATE POLICY "Judges read own recusals" ON public.judge_recusals FOR SELECT TO authenticated USING (((judge_id = ( SELECT auth.uid() AS uid)) AND (public.current_user_role() = 'judge'::text)));

DROP POLICY IF EXISTS "Judges read teams" ON public.teams;
CREATE POLICY "Judges read teams" ON public.teams FOR SELECT TO authenticated USING ((public.current_user_role() = 'judge'::text));

DROP POLICY IF EXISTS "Prelim judges insert own scores" ON public.preliminary_scores;
CREATE POLICY "Prelim judges insert own scores" ON public.preliminary_scores FOR INSERT TO authenticated WITH CHECK (((judge_id = ( SELECT auth.uid() AS uid)) AND public.judge_can_score_preliminary(team_id)));

DROP POLICY IF EXISTS "Prelim judges update own unlocked scores" ON public.preliminary_scores;
CREATE POLICY "Prelim judges update own unlocked scores" ON public.preliminary_scores FOR UPDATE TO authenticated USING (((judge_id = ( SELECT auth.uid() AS uid)) AND public.judge_can_score_preliminary(team_id) AND (locked_at IS NULL))) WITH CHECK (((judge_id = ( SELECT auth.uid() AS uid)) AND public.judge_can_score_preliminary(team_id)));

DROP POLICY IF EXISTS "Teams insert before deadline" ON public.submissions;
CREATE POLICY "Teams insert before deadline" ON public.submissions FOR INSERT TO authenticated WITH CHECK (public.team_can_submit(team_id));

DROP POLICY IF EXISTS "Teams read case_study when released" ON public.case_study;
CREATE POLICY "Teams read case_study when released" ON public.case_study FOR SELECT TO authenticated USING (((public.current_user_role() = 'team'::text) AND ((release_at IS NULL) OR (release_at <= now()))));

DROP POLICY IF EXISTS "Teams read own submission" ON public.submissions;
CREATE POLICY "Teams read own submission" ON public.submissions FOR SELECT TO authenticated USING (((public.current_user_role() = 'team'::text) AND (team_id IN ( SELECT teams.id
   FROM public.teams
  WHERE (teams.profile_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "Teams read own team" ON public.teams;
CREATE POLICY "Teams read own team" ON public.teams FOR SELECT TO authenticated USING (((public.current_user_role() = 'team'::text) AND (profile_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Teams update before deadline" ON public.submissions;
CREATE POLICY "Teams update before deadline" ON public.submissions FOR UPDATE TO authenticated USING (public.team_can_submit(team_id)) WITH CHECK (public.team_can_submit(team_id));

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = ( SELECT auth.uid() AS uid)));

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs FOR SELECT TO authenticated USING ((public.current_user_role() = 'admin'::text));

ALTER TABLE public.case_study ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.competition_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.competition_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competition_stages_admin_delete ON public.competition_stages;
CREATE POLICY competition_stages_admin_delete ON public.competition_stages FOR DELETE TO authenticated USING (((public.current_user_role() = 'admin'::text) AND (NOT is_system)));

DROP POLICY IF EXISTS competition_stages_admin_insert ON public.competition_stages;
CREATE POLICY competition_stages_admin_insert ON public.competition_stages FOR INSERT TO authenticated WITH CHECK (((public.current_user_role() = 'admin'::text) AND (NOT is_system)));

DROP POLICY IF EXISTS competition_stages_admin_update ON public.competition_stages;
CREATE POLICY competition_stages_admin_update ON public.competition_stages FOR UPDATE TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS competition_stages_read ON public.competition_stages;
CREATE POLICY competition_stages_read ON public.competition_stages FOR SELECT TO authenticated USING ((public.current_user_role() IS NOT NULL));

ALTER TABLE public.final_presentation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS final_presentation_admin_select ON public.final_presentation;
CREATE POLICY final_presentation_admin_select ON public.final_presentation FOR SELECT TO authenticated USING ((public.current_user_role() = 'admin'::text));

DROP POLICY IF EXISTS final_presentation_admin_update ON public.final_presentation;
CREATE POLICY final_presentation_admin_update ON public.final_presentation FOR UPDATE TO authenticated USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));

ALTER TABLE public.final_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.finalist_notice ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.judge_recusals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.preliminary_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.score_sanctions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.submission_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.check_final_scores_not_released() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_final_scores_not_released() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_final_scores_not_released() TO authenticated;
GRANT ALL ON FUNCTION public.check_final_scores_not_released() TO service_role;

REVOKE ALL ON FUNCTION public.check_preliminary_scores_not_released() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_preliminary_scores_not_released() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_preliminary_scores_not_released() TO authenticated;
GRANT ALL ON FUNCTION public.check_preliminary_scores_not_released() TO service_role;

REVOKE ALL ON FUNCTION public.check_recusal_validity() FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.check_recusal_validity() TO anon;
GRANT ALL ON FUNCTION public.check_recusal_validity() TO authenticated;
GRANT ALL ON FUNCTION public.check_recusal_validity() TO service_role;

REVOKE ALL ON FUNCTION public.check_score_not_recused() FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.check_score_not_recused() TO anon;
GRANT ALL ON FUNCTION public.check_score_not_recused() TO authenticated;
GRANT ALL ON FUNCTION public.check_score_not_recused() TO service_role;

REVOKE ALL ON FUNCTION public.current_user_judge_stage() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.current_user_judge_stage() FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_user_judge_stage() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_judge_stage() TO service_role;

REVOKE ALL ON FUNCTION public.current_user_role() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_role() TO service_role;

REVOKE ALL ON FUNCTION public.get_my_final_presentation() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_final_presentation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_my_final_presentation() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_final_presentation() TO service_role;

REVOKE ALL ON FUNCTION public.get_my_finalist_notice() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_finalist_notice() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_my_finalist_notice() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_finalist_notice() TO service_role;

REVOKE ALL ON FUNCTION public.get_my_results() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_results() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_my_results() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_results() TO service_role;

REVOKE ALL ON FUNCTION public.get_preliminary_scores_for_final(p_team_id uuid) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_preliminary_scores_for_final(p_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_preliminary_scores_for_final(p_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_preliminary_scores_for_final(p_team_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_public_competition_schedule() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_competition_schedule() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_competition_schedule() TO anon;
GRANT ALL ON FUNCTION public.get_public_competition_schedule() TO authenticated;
GRANT ALL ON FUNCTION public.get_public_competition_schedule() TO service_role;

REVOKE ALL ON FUNCTION public.get_public_contact_whatsapp() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_contact_whatsapp() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_contact_whatsapp() TO anon;
GRANT ALL ON FUNCTION public.get_public_contact_whatsapp() TO authenticated;
GRANT ALL ON FUNCTION public.get_public_contact_whatsapp() TO service_role;

REVOKE ALL ON FUNCTION public.get_public_event_info() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_event_info() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_event_info() TO anon;
GRANT ALL ON FUNCTION public.get_public_event_info() TO authenticated;
GRANT ALL ON FUNCTION public.get_public_event_info() TO service_role;

REVOKE ALL ON FUNCTION public.get_public_ranking() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_ranking() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_ranking() TO authenticated;
GRANT ALL ON FUNCTION public.get_public_ranking() TO service_role;

REVOKE ALL ON FUNCTION public.get_public_showcase() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_showcase() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_showcase() TO anon;
GRANT ALL ON FUNCTION public.get_public_showcase() TO authenticated;
GRANT ALL ON FUNCTION public.get_public_showcase() TO service_role;

REVOKE ALL ON FUNCTION public.get_public_showcase_winners() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_showcase_winners() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_showcase_winners() TO anon;
GRANT ALL ON FUNCTION public.get_public_showcase_winners() TO authenticated;
GRANT ALL ON FUNCTION public.get_public_showcase_winners() TO service_role;

REVOKE ALL ON FUNCTION public.guard_competition_stage() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_competition_stage() FROM PUBLIC;
GRANT ALL ON FUNCTION public.guard_competition_stage() TO service_role;

REVOKE ALL ON FUNCTION public.is_feedback_only_edit(p_old jsonb, p_new jsonb) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_feedback_only_edit(p_old jsonb, p_new jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_feedback_only_edit(p_old jsonb, p_new jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.judge_can_score_final(p_team_id uuid) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.judge_can_score_final(p_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.judge_can_score_final(p_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.judge_can_score_final(p_team_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.judge_can_score_preliminary(p_team_id uuid) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.judge_can_score_preliminary(p_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.judge_can_score_preliminary(p_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.judge_can_score_preliminary(p_team_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.judge_can_view_team(p_team_id uuid) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.judge_can_view_team(p_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.judge_can_view_team(p_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.judge_can_view_team(p_team_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.lock_score_keys() FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.lock_score_keys() TO anon;
GRANT ALL ON FUNCTION public.lock_score_keys() TO authenticated;
GRANT ALL ON FUNCTION public.lock_score_keys() TO service_role;

REVOKE ALL ON FUNCTION public.log_submission_change() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.log_submission_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_submission_change() TO service_role;

REVOKE ALL ON FUNCTION public.publish_showcase_phase_one() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.publish_showcase_phase_one() FROM PUBLIC;
GRANT ALL ON FUNCTION public.publish_showcase_phase_one() TO authenticated;
GRANT ALL ON FUNCTION public.publish_showcase_phase_one() TO service_role;

REVOKE ALL ON FUNCTION public.publish_showcase_phase_two() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.publish_showcase_phase_two() FROM PUBLIC;
GRANT ALL ON FUNCTION public.publish_showcase_phase_two() TO authenticated;
GRANT ALL ON FUNCTION public.publish_showcase_phase_two() TO service_role;

REVOKE ALL ON FUNCTION public.publish_showcase_winners() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.publish_showcase_winners() FROM PUBLIC;
GRANT ALL ON FUNCTION public.publish_showcase_winners() TO authenticated;
GRANT ALL ON FUNCTION public.publish_showcase_winners() TO service_role;

REVOKE ALL ON FUNCTION public.save_showcase_details(p_consent boolean, p_title text, p_description text, p_image_path text) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.save_showcase_details(p_consent boolean, p_title text, p_description text, p_image_path text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_showcase_details(p_consent boolean, p_title text, p_description text, p_image_path text) TO authenticated;
GRANT ALL ON FUNCTION public.save_showcase_details(p_consent boolean, p_title text, p_description text, p_image_path text) TO service_role;

REVOKE ALL ON FUNCTION public.score_sanction_deduction(p_team_id uuid, p_stage text) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.score_sanction_deduction(p_team_id uuid, p_stage text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.score_sanction_deduction(p_team_id uuid, p_stage text) TO authenticated;
GRANT ALL ON FUNCTION public.score_sanction_deduction(p_team_id uuid, p_stage text) TO service_role;

REVOKE ALL ON FUNCTION public.set_showcase_consent(p_consent boolean) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_showcase_consent(p_consent boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_showcase_consent(p_consent boolean) TO authenticated;
GRANT ALL ON FUNCTION public.set_showcase_consent(p_consent boolean) TO service_role;

REVOKE ALL ON FUNCTION public.set_submission_first_submitted_at() FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.set_submission_first_submitted_at() TO anon;
GRANT ALL ON FUNCTION public.set_submission_first_submitted_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_submission_first_submitted_at() TO service_role;

REVOKE ALL ON FUNCTION public.set_submission_timestamps() FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.set_submission_timestamps() TO anon;
GRANT ALL ON FUNCTION public.set_submission_timestamps() TO authenticated;
GRANT ALL ON FUNCTION public.set_submission_timestamps() TO service_role;

REVOKE ALL ON FUNCTION public.stamp_final_presentation() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.stamp_final_presentation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.stamp_final_presentation() TO service_role;

REVOKE ALL ON FUNCTION public.submission_open() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.submission_open() FROM PUBLIC;
GRANT ALL ON FUNCTION public.submission_open() TO authenticated;
GRANT ALL ON FUNCTION public.submission_open() TO service_role;

REVOKE ALL ON FUNCTION public.submissions_set_first_submitted_at() FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.submissions_set_first_submitted_at() TO anon;
GRANT ALL ON FUNCTION public.submissions_set_first_submitted_at() TO authenticated;
GRANT ALL ON FUNCTION public.submissions_set_first_submitted_at() TO service_role;

REVOKE ALL ON FUNCTION public.team_can_submit(p_team_id uuid) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.team_can_submit(p_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.team_can_submit(p_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.team_can_submit(p_team_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.update_my_score_feedback(p_stage text, p_team_id uuid, p_feedback text) FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_my_score_feedback(p_stage text, p_team_id uuid, p_feedback text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_my_score_feedback(p_stage text, p_team_id uuid, p_feedback text) TO authenticated;
GRANT ALL ON FUNCTION public.update_my_score_feedback(p_stage text, p_team_id uuid, p_feedback text) TO service_role;

REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;

REVOKE ALL ON TABLE public.case_study FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.case_study TO anon;
GRANT ALL ON TABLE public.case_study TO authenticated;
GRANT ALL ON TABLE public.case_study TO service_role;

REVOKE ALL ON TABLE public.competition_settings FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.competition_settings TO anon;
GRANT ALL ON TABLE public.competition_settings TO authenticated;
GRANT ALL ON TABLE public.competition_settings TO service_role;

REVOKE ALL ON TABLE public.competition_stages FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.competition_stages TO authenticated;
GRANT ALL ON TABLE public.competition_stages TO service_role;

REVOKE ALL ON TABLE public.final_presentation FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.final_presentation TO service_role;
GRANT SELECT,UPDATE ON TABLE public.final_presentation TO authenticated;

REVOKE ALL ON TABLE public.final_scores FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.final_scores TO anon;
GRANT ALL ON TABLE public.final_scores TO authenticated;
GRANT ALL ON TABLE public.final_scores TO service_role;

REVOKE ALL ON TABLE public.teams FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.teams TO anon;
GRANT ALL ON TABLE public.teams TO authenticated;
GRANT ALL ON TABLE public.teams TO service_role;

REVOKE ALL ON TABLE public.final_ranking FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.final_ranking TO authenticated;
GRANT ALL ON TABLE public.final_ranking TO service_role;

REVOKE ALL ON TABLE public.finalist_notice FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.finalist_notice TO anon;
GRANT ALL ON TABLE public.finalist_notice TO authenticated;
GRANT ALL ON TABLE public.finalist_notice TO service_role;

REVOKE ALL ON TABLE public.judge_recusals FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.judge_recusals TO authenticated;
GRANT ALL ON TABLE public.judge_recusals TO service_role;

REVOKE ALL ON TABLE public.preliminary_scores FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.preliminary_scores TO anon;
GRANT ALL ON TABLE public.preliminary_scores TO authenticated;
GRANT ALL ON TABLE public.preliminary_scores TO service_role;

REVOKE ALL ON TABLE public.preliminary_ranking FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.preliminary_ranking TO authenticated;
GRANT ALL ON TABLE public.preliminary_ranking TO service_role;

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

REVOKE ALL ON TABLE public.score_sanctions FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.score_sanctions TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.score_sanctions TO authenticated;

REVOKE ALL ON TABLE public.submission_history FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.submission_history TO service_role;
GRANT SELECT ON TABLE public.submission_history TO authenticated;

REVOKE ALL ON SEQUENCE public.submission_history_id_seq FROM anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.submission_history_id_seq TO anon;
GRANT ALL ON SEQUENCE public.submission_history_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.submission_history_id_seq TO service_role;

REVOKE ALL ON TABLE public.submissions FROM anon, authenticated, service_role;
GRANT ALL ON TABLE public.submissions TO anon;
GRANT ALL ON TABLE public.submissions TO authenticated;
GRANT ALL ON TABLE public.submissions TO service_role;

-- Storage policies (bucket web-showcase)

DROP POLICY IF EXISTS "Admins delete showcase images" ON storage.objects;
CREATE POLICY "Admins delete showcase images" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'web-showcase'::text) AND ((storage.foldername(name))[1] = 'showcase'::text) AND ((storage.foldername(name))[2] = 'admin'::text) AND (public.current_user_role() = 'admin'::text)));

DROP POLICY IF EXISTS "Admins upload showcase images" ON storage.objects;
CREATE POLICY "Admins upload showcase images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'web-showcase'::text) AND ((storage.foldername(name))[1] = 'showcase'::text) AND ((storage.foldername(name))[2] = 'admin'::text) AND (public.current_user_role() = 'admin'::text)));

DROP POLICY IF EXISTS "Showcase public reads" ON storage.objects;
CREATE POLICY "Showcase public reads" ON storage.objects FOR SELECT TO authenticated, anon USING ((bucket_id = 'web-showcase'::text));

DROP POLICY IF EXISTS "Teams delete own showcase images" ON storage.objects;
CREATE POLICY "Teams delete own showcase images" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'web-showcase'::text) AND ((storage.foldername(name))[1] = 'showcase'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text)));

DROP POLICY IF EXISTS "Teams update own showcase images" ON storage.objects;
CREATE POLICY "Teams update own showcase images" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'web-showcase'::text) AND ((storage.foldername(name))[1] = 'showcase'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text))) WITH CHECK (((bucket_id = 'web-showcase'::text) AND ((storage.foldername(name))[1] = 'showcase'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (lower(COALESCE((metadata ->> 'mimetype'::text), ''::text)) = ANY (ARRAY['image/png'::text, 'image/jpeg'::text, 'image/webp'::text])) AND (lower(name) ~ '\.(png|jpe?g|webp)$'::text)));

DROP POLICY IF EXISTS "Teams upload own showcase images" ON storage.objects;
CREATE POLICY "Teams upload own showcase images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'web-showcase'::text) AND ((storage.foldername(name))[1] = 'showcase'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (lower(COALESCE((metadata ->> 'mimetype'::text), ''::text)) = ANY (ARRAY['image/png'::text, 'image/jpeg'::text, 'image/webp'::text])) AND (lower(name) ~ '\.(png|jpe?g|webp)$'::text)));

-- Seed rows

INSERT INTO public.case_study (id, title, content_md, release_at, updated_at, updated_by) VALUES (true, 'Trust Trap: Should You Trust It?', '## Latar Belakang

Pengguna muda semakin sering menghadapi berbagai interaksi digital, seperti pesan atau tawaran mencurigakan, permintaan transfer uang yang tidak terduga, dan tautan yang berpotensi mengarah pada penipuan. Tidak selalu mudah untuk menentukan apakah suatu interaksi dapat dipercaya, terutama ketika informasi yang tersedia terbatas atau pengguna dihadapkan pada situasi yang mendesak.

## Tantangan

Peserta ditantang untuk mengembangkan solusi berbasis web yang membantu pengguna muda menilai interaksi digital mencurigakan yang mereka temui, mengambil keputusan berdasarkan informasi yang tersedia, serta menentukan langkah tindak lanjut yang sesuai.

## Contoh Situasi

Situasi berikut hanya menggambarkan jenis permasalahan yang dapat dihadapi pengguna. Contoh ini bukan batasan, dan peserta bebas mengangkat situasi lain yang relevan.

1. **Hadiah yang butuh biaya.** Seorang mahasiswa menerima pesan di Instagram dari akun yang mengaku sebagai penyelenggara beasiswa. Ia dinyatakan sebagai penerima, tetapi harus membayar biaya administrasi Rp50.000 dalam waktu satu jam agar hadiahnya tidak hangus. Ia belum pernah mendaftar beasiswa itu, tetapi takut kehilangan kesempatan.
2. **Ajakan dari grup.** Seorang siswa SMK ditambahkan ke grup chat yang ramai membicarakan investasi “cepat untung”. Anggota lain memamerkan bukti penarikan dana dan terus mendorongnya segera bergabung sebelum kuota ditutup. Ia penasaran, tetapi tidak yakin mana yang nyata.
3. **Tautan dari teman.** Seorang pelajar menerima pesan dari akun teman dekatnya berisi tautan dan tulisan “coba lihat ini, kamu ada di foto ini”. Tautannya terlihat sedikit janggal, dan gaya bahasanya tidak seperti biasanya. Ia ragu apakah akun temannya diretas atau ia hanya terlalu curiga.

## Ketentuan

Peserta bebas menentukan pendekatan solusi, target pengguna yang lebih spesifik, dan teknologi yang digunakan, selama solusi yang dikembangkan tetap relevan dengan permasalahan dalam studi kasus dan memenuhi ketentuan kompetisi.', NULL, '2026-11-26 01:43:21.744446+00', NULL) ON CONFLICT DO NOTHING;

INSERT INTO public.competition_settings (id, submission_closes_at, updated_at, juknis_url, contact_whatsapp, preliminary_results_released, final_results_released, showcase_published_at, showcase_finalists_published_at, showcase_consent_locked_at, winners_published_at, event_name, event_track, finalist_count, gallery_new_badge_days, ranking_published) VALUES (true, '2026-11-10 16:00:00+00', '2026-11-26 01:43:21.397016+00', NULL, NULL, false, false, NULL, NULL, NULL, NULL, 'MIT-WEEK 2026', 'Web Development', 5, 7, false) ON CONFLICT DO NOTHING;

INSERT INTO public.competition_stages (key, title, description, starts_on, ends_on, time_label, sort_order, show_on_track, status_override, is_system, updated_at, updated_by) VALUES ('review', 'Penilaian Babak Awal', 'Dewan juri mengevaluasi seluruh karya terkirim.', '2026-11-11', '2026-11-17', '', 20, true, NULL, true, '2026-11-26 01:43:24.778876+00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.competition_stages (key, title, description, starts_on, ends_on, time_label, sort_order, show_on_track, status_override, is_system, updated_at, updated_by) VALUES ('top5', 'Pengumuman Top 5', 'Daftar finalis resmi diumumkan di portal & media.', '2026-11-18', '2026-11-18', '', 30, true, NULL, true, '2026-11-26 01:43:24.778876+00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.competition_stages (key, title, description, starts_on, ends_on, time_label, sort_order, show_on_track, status_override, is_system, updated_at, updated_by) VALUES ('gallery', 'Galeri Karya Dibuka', 'Pembukaan galeri karya peserta untuk publik.', '2026-11-18', '2026-11-18', '', 35, false, NULL, true, '2026-11-26 01:43:24.778876+00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.competition_stages (key, title, description, starts_on, ends_on, time_label, sort_order, show_on_track, status_override, is_system, updated_at, updated_by) VALUES ('final', 'Babak Final', 'Sesi presentasi karya dan tanya jawab tim finalis.', '2026-11-21', '2026-11-21', '', 40, true, NULL, true, '2026-11-26 01:43:24.778876+00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.competition_stages (key, title, description, starts_on, ends_on, time_label, sort_order, show_on_track, status_override, is_system, updated_at, updated_by) VALUES ('winners', 'Pengumuman Juara', 'Penetapan dan selebrasi pemenang MIT-WEEK 2026.', '2026-11-25', '2026-11-25', '', 50, true, NULL, true, '2026-11-26 01:43:24.778876+00', NULL) ON CONFLICT DO NOTHING;

INSERT INTO public.final_presentation (id, presentation_minutes, qa_minutes, venue, meeting_url, note, logistics_published, updated_at, updated_by) VALUES (true, 10, 10, '', NULL, 'Urutan tampil serta lokasi atau tautan sesi akan dikirim langsung oleh panitia.', false, '2026-11-26 01:43:25.087617+00', NULL) ON CONFLICT DO NOTHING;

INSERT INTO public.finalist_notice (id, finalist_message, non_finalist_message, is_published, published_at, updated_at) VALUES (true, '', '', false, NULL, '2026-11-26 01:43:21.753688+00') ON CONFLICT DO NOTHING;


--
--

COMMIT;

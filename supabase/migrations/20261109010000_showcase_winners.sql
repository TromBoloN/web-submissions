-- MIT-WEEK 2026: explicit winners publication for the public showcase.

ALTER TABLE public.competition_settings
  ADD COLUMN IF NOT EXISTS winners_published_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.publish_showcase_winners()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.publish_showcase_winners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_showcase_winners() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_showcase_winners()
RETURNS TABLE (
  team_name TEXT,
  winner_rank BIGINT,
  final_score NUMERIC,
  showcase_title TEXT,
  showcase_description TEXT,
  showcase_image_path TEXT,
  github_url TEXT,
  live_demo_url TEXT,
  video_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    ranking.team_name,
    ranking.rank,
    ranking.avg_score,
    CASE WHEN t.showcase_consent THEN t.showcase_title ELSE '' END,
    CASE WHEN t.showcase_consent THEN t.showcase_description ELSE '' END,
    CASE WHEN t.showcase_consent THEN t.showcase_image_path ELSE NULL END,
    CASE WHEN t.showcase_consent THEN s.github_url ELSE '' END,
    CASE WHEN t.showcase_consent THEN s.live_demo_url ELSE '' END,
    CASE WHEN t.showcase_consent THEN s.video_url ELSE '' END
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

REVOKE ALL ON FUNCTION public.get_public_showcase_winners() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_showcase_winners() TO anon;

-- ============================================================================
-- MIT-WEEK 2026: finalists' project links are always public
-- Per the finalist announcement ("Galeri Karya (Wajib)": the gallery uses the team name
-- and submission links), finalists (showcase_is_finalist) get github_url, live_demo_url and
-- video_url without showcase_consent, so every gallery card has the same three links.
-- Non-finalists are unchanged: every link needs consent.
-- Applies to get_public_showcase() and get_public_showcase_winners(); return types are
-- unchanged, so CREATE OR REPLACE keeps the existing grants (re-applied anyway).
-- Apply after 20261118010000. Idempotent: safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_showcase()
RETURNS TABLE (
  team_name TEXT,
  showcase_title TEXT,
  showcase_description TEXT,
  showcase_image_path TEXT,
  github_url TEXT,
  live_demo_url TEXT,
  video_url TEXT,
  live_demo_ok BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.get_public_showcase() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_showcase() TO anon;

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

REVOKE ALL ON FUNCTION public.get_public_showcase_winners() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_showcase_winners() TO anon;

-- ============================================================================
-- MIT-WEEK 2026: "Demo aktif" mark in the public gallery
-- get_public_showcase() gains live_demo_ok: TRUE only when the team's demo link is shown
-- (consent) and the last admin link check for it returned status 'ok'. Warnings and
-- unchecked links are FALSE, so the gallery never labels a demo as broken in public.
-- Same rows and rules as 20261117000000 (finalists listed without consent; links need consent).
-- The return type changes, so the function is dropped and recreated (grants re-applied).
-- Apply after 20261117000000. Idempotent: safe to re-run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_public_showcase();

CREATE FUNCTION public.get_public_showcase()
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
    CASE WHEN t.showcase_consent THEN s.github_url ELSE '' END,
    CASE WHEN t.showcase_consent THEN s.live_demo_url ELSE '' END,
    CASE WHEN t.showcase_consent THEN s.video_url ELSE '' END,
    COALESCE(
      t.showcase_consent
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

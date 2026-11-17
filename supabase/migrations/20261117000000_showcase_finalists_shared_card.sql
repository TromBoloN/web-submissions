-- ============================================================================
-- MIT-WEEK 2026: finalists always appear in the gallery; admin and team share the card
-- 1. Storage: admins may upload/delete card images under showcase/admin/<team_id>/
-- 2. save_showcase_details(): finalists stay editable until the finalist gallery is published,
--    and a team may keep an image the admin uploaded for it.
-- 3. get_public_showcase(): finalists are listed even without team consent and their card
--    (title, description, image) is shown. Repository/demo/video links still need consent.
-- 4. get_public_showcase_winners(): same card rule for winners (all winners are finalists).
-- Admins edit the existing showcase_title/description/image_path columns directly
-- ("Admin full access teams" policy), so admin and team edit the same card: last save wins.
-- Independent of the pending 20261114* migrations. Idempotent: safe to re-run.
-- ============================================================================

-- 1. STORAGE: ADMIN UPLOADS ------------------------------------------------------
DROP POLICY IF EXISTS "Admins upload showcase images" ON storage.objects;
CREATE POLICY "Admins upload showcase images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'web-showcase'
  AND (storage.foldername(name))[1] = 'showcase'
  AND (storage.foldername(name))[2] = 'admin'
  AND public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "Admins delete showcase images" ON storage.objects;
CREATE POLICY "Admins delete showcase images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'web-showcase'
  AND (storage.foldername(name))[1] = 'showcase'
  AND (storage.foldername(name))[2] = 'admin'
  AND public.current_user_role() = 'admin'
);

-- 2. TEAM SAVE ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_showcase_details(
  p_consent BOOLEAN,
  p_title TEXT,
  p_description TEXT,
  p_image_path TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.save_showcase_details(BOOLEAN, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_showcase_details(BOOLEAN, TEXT, TEXT, TEXT) TO authenticated;

-- 3. PUBLIC GALLERY --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_showcase()
RETURNS TABLE (
  team_name TEXT,
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
    t.team_name,
    t.showcase_title,
    t.showcase_description,
    t.showcase_image_path,
    CASE WHEN t.showcase_consent THEN s.github_url ELSE '' END,
    CASE WHEN t.showcase_consent THEN s.live_demo_url ELSE '' END,
    CASE WHEN t.showcase_consent THEN s.video_url ELSE '' END
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

-- 4. WINNERS ---------------------------------------------------------------------
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

-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Migration 006: Public showcase consent and staged publication
-- ============================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS showcase_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS showcase_is_finalist BOOLEAN,
  ADD COLUMN IF NOT EXISTS showcase_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS showcase_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS showcase_image_path TEXT;

ALTER TABLE public.competition_settings
  ADD COLUMN IF NOT EXISTS showcase_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS showcase_finalists_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS showcase_consent_locked_at TIMESTAMPTZ;

-- Teams can change consent until the first showcase publication. The lock is
-- retained if an admin temporarily unpublishes the gallery. The team is
-- always derived from the authenticated profile, never from client input.
CREATE OR REPLACE FUNCTION public.set_showcase_consent(p_consent BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.set_showcase_consent(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_showcase_consent(BOOLEAN) TO authenticated;

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
  v_consent_locked_at TIMESTAMPTZ;
  v_updated INTEGER;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'team' THEN
    RETURN FALSE;
  END IF;

  IF length(trim(COALESCE(p_title, ''))) > 80
     OR length(trim(COALESCE(p_description, ''))) > 300 THEN
    RETURN FALSE;
  END IF;

  IF p_image_path IS NOT NULL
     AND (
       p_image_path !~ '^showcase/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(png|jpe?g|webp)$'
       OR split_part(p_image_path, '/', 2) <> (SELECT auth.uid())::TEXT
     ) THEN
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

-- Phase 1 snapshots finalist status and publishes only non-finalist works.
-- The snapshot prevents later finalist edits from changing phase 1 visibility.
CREATE OR REPLACE FUNCTION public.publish_showcase_phase_one()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
     SET showcase_is_finalist = is_finalist;

  UPDATE public.competition_settings
     SET showcase_published_at = statement_timestamp(),
         showcase_consent_locked_at = COALESCE(showcase_consent_locked_at, statement_timestamp()),
         updated_at = statement_timestamp()
   WHERE id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_showcase_phase_one() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_showcase_phase_one() TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_showcase_phase_two()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.publish_showcase_phase_two() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_showcase_phase_two() TO authenticated;

-- Public output is deliberately limited to the approved gallery whitelist.
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
    s.github_url,
    s.live_demo_url,
    s.video_url
    FROM public.teams AS t
    JOIN public.profiles AS p ON p.id = t.profile_id
    JOIN public.submissions AS s ON s.team_id = t.id
    CROSS JOIN public.competition_settings AS cs
   WHERE cs.id
     AND t.showcase_consent
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

-- The bucket is public for anonymous reads. Writes and deletes are restricted
-- to the authenticated user's own showcase/<auth.uid()>/ folder.
UPDATE storage.buckets
   SET public = TRUE,
       file_size_limit = 2097152,
       allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
 WHERE id = 'web-showcase';

DROP POLICY IF EXISTS "Showcase public reads" ON storage.objects;
CREATE POLICY "Showcase public reads" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'web-showcase');

DROP POLICY IF EXISTS "Teams upload own showcase images" ON storage.objects;
CREATE POLICY "Teams upload own showcase images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'web-showcase'
  AND (storage.foldername(name))[1] = 'showcase'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::TEXT
  AND lower(COALESCE(metadata->>'mimetype', '')) IN ('image/png', 'image/jpeg', 'image/webp')
  AND lower(name) ~ '\.(png|jpe?g|webp)$'
);

DROP POLICY IF EXISTS "Teams update own showcase images" ON storage.objects;
CREATE POLICY "Teams update own showcase images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'web-showcase'
  AND (storage.foldername(name))[1] = 'showcase'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::TEXT
)
WITH CHECK (
  bucket_id = 'web-showcase'
  AND (storage.foldername(name))[1] = 'showcase'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::TEXT
  AND lower(COALESCE(metadata->>'mimetype', '')) IN ('image/png', 'image/jpeg', 'image/webp')
  AND lower(name) ~ '\.(png|jpe?g|webp)$'
);

DROP POLICY IF EXISTS "Teams delete own showcase images" ON storage.objects;
CREATE POLICY "Teams delete own showcase images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'web-showcase'
  AND (storage.foldername(name))[1] = 'showcase'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::TEXT
);

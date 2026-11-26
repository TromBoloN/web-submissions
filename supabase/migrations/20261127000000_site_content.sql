-- ============================================================================
-- MIT-WEEK 2026: site_content, an admin-editable store for page copy
-- Owner request (CMS, step 6): non-developers edit page text in
-- Pengaturan → Konten instead of changing code.
--   * One row per copy key. The app holds a fixed registry of allowed keys and
--     their defaults (src/lib/site-content.ts); a missing row means "use the
--     default", so deleting a row is "Kembalikan ke bawaan".
--   * Admins read and write the table directly (RLS). Nobody else has any
--     table privilege; anon gets nothing.
--   * get_site_content() returns every key/value pair to anon and authenticated
--     users, because the copy is shown on /login and /karya.
--     EVERYTHING STORED HERE IS PUBLIC BY DESIGN. Never put private data
--     (emails, links meant for finalists only, judge info, scores) in this table.
-- Apply after 20261126000000. Idempotent: safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.site_content IS
  'Admin-edited page copy. Public via get_site_content(): never store private data here.';

ALTER TABLE public.site_content
  DROP CONSTRAINT IF EXISTS site_content_key_check,
  ADD CONSTRAINT site_content_key_check
    CHECK (key ~ '^[a-z0-9_.]+$' AND char_length(key) <= 80);

ALTER TABLE public.site_content
  DROP CONSTRAINT IF EXISTS site_content_value_check,
  ADD CONSTRAINT site_content_value_check
    CHECK (char_length(value) <= 5000);

CREATE OR REPLACE FUNCTION public.stamp_site_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := statement_timestamp();
  NEW.updated_by := COALESCE((SELECT auth.uid()), NEW.updated_by);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_site_content() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_site_content_stamp ON public.site_content;
CREATE TRIGGER trg_site_content_stamp
BEFORE INSERT OR UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.stamp_site_content();

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Admins upsert (INSERT ... ON CONFLICT needs SELECT, INSERT and UPDATE) and
-- delete to reset a key. RLS limits every operation to admins.
REVOKE ALL ON TABLE public.site_content FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_content TO authenticated;

DROP POLICY IF EXISTS site_content_admin_select ON public.site_content;
CREATE POLICY site_content_admin_select
  ON public.site_content
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS site_content_admin_insert ON public.site_content;
CREATE POLICY site_content_admin_insert
  ON public.site_content
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS site_content_admin_update ON public.site_content;
CREATE POLICY site_content_admin_update
  ON public.site_content
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS site_content_admin_delete ON public.site_content;
CREATE POLICY site_content_admin_delete
  ON public.site_content
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================================
-- SAFE READ: get_site_content()
--   Public copy for every page, including /login and /karya (anon).
--   Returns only key and value: no updated_by, no timestamps.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_site_content()
RETURNS TABLE (
  key   TEXT,
  value TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT sc.key, sc.value
    FROM public.site_content AS sc
   ORDER BY sc.key;
$$;

REVOKE EXECUTE ON FUNCTION public.get_site_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_content() TO anon, authenticated;

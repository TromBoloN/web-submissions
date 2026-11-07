-- Do not present the legacy first-row timestamp as an official submission time.
UPDATE public.submissions
   SET first_submitted_at = NULL
 WHERE status = 'submitted'
   AND first_submitted_at = submitted_at;

CREATE OR REPLACE FUNCTION public.submissions_set_first_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
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

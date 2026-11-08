-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Migration: Draft Scores, Judge Recusals, Private Notes, and First Submitted At
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SCORE STATUS ENUM & COLUMNS ON PRELIMINARY_SCORES & FINAL_SCORES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.score_status_type AS ENUM ('draft', 'final');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 1a. Preliminary Scores alterations
ALTER TABLE public.preliminary_scores
    ADD COLUMN IF NOT EXISTS status public.score_status_type NOT NULL DEFAULT 'final',
    ADD COLUMN IF NOT EXISTS private_note TEXT,
    ALTER COLUMN functionality_score DROP NOT NULL,
    ALTER COLUMN case_study_fit_score DROP NOT NULL,
    ALTER COLUMN ui_ux_score DROP NOT NULL,
    ALTER COLUMN code_quality_score DROP NOT NULL,
    ALTER COLUMN documentation_score DROP NOT NULL;

ALTER TABLE public.preliminary_scores
    DROP CONSTRAINT IF EXISTS chk_prelim_private_note_length,
    ADD CONSTRAINT chk_prelim_private_note_length CHECK (private_note IS NULL OR length(private_note) <= 2000);

ALTER TABLE public.preliminary_scores
    DROP CONSTRAINT IF EXISTS chk_prelim_scores_status_criteria,
    ADD CONSTRAINT chk_prelim_scores_status_criteria CHECK (
        (status = 'draft')
        OR
        (status = 'final' AND
         functionality_score IS NOT NULL AND
         case_study_fit_score IS NOT NULL AND
         ui_ux_score IS NOT NULL AND
         code_quality_score IS NOT NULL AND
         documentation_score IS NOT NULL)
    );

-- 1b. Final Scores alterations
ALTER TABLE public.final_scores
    ADD COLUMN IF NOT EXISTS status public.score_status_type NOT NULL DEFAULT 'final',
    ADD COLUMN IF NOT EXISTS private_note TEXT,
    ALTER COLUMN functionality_score DROP NOT NULL,
    ALTER COLUMN case_study_fit_score DROP NOT NULL,
    ALTER COLUMN ui_ux_score DROP NOT NULL,
    ALTER COLUMN code_quality_score DROP NOT NULL,
    ALTER COLUMN documentation_score DROP NOT NULL,
    ALTER COLUMN presentation_qa_score DROP NOT NULL;

ALTER TABLE public.final_scores
    DROP CONSTRAINT IF EXISTS chk_final_private_note_length,
    ADD CONSTRAINT chk_final_private_note_length CHECK (private_note IS NULL OR length(private_note) <= 2000);

ALTER TABLE public.final_scores
    DROP CONSTRAINT IF EXISTS chk_final_scores_status_criteria,
    ADD CONSTRAINT chk_final_scores_status_criteria CHECK (
        (status = 'draft')
        OR
        (status = 'final' AND
         functionality_score IS NOT NULL AND
         case_study_fit_score IS NOT NULL AND
         ui_ux_score IS NOT NULL AND
         code_quality_score IS NOT NULL AND
         documentation_score IS NOT NULL AND
         presentation_qa_score IS NOT NULL)
    );

-- Note on total_weighted_score:
-- total_weighted_score is a STORED GENERATED column defined using arithmetic (+) across criteria.
-- In PostgreSQL, (NULL * weight) + (...) evaluates to NULL.
-- Thus, when any criterion column is NULL (e.g. in a partial draft), total_weighted_score
-- automatically computes to NULL without modifying the generation formula.

-- ----------------------------------------------------------------------------
-- 2. TABLE JUDGE_RECUSALS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.judge_recusals (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    stage      TEXT NOT NULL CHECK (stage IN ('preliminary', 'final')),
    reason     TEXT NOT NULL CHECK (length(trim(reason)) > 0 AND length(reason) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_judge_team_stage_recusal UNIQUE (judge_id, team_id, stage)
);

ALTER TABLE public.judge_recusals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.judge_recusals FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.judge_recusals TO authenticated;

-- RLS: Admin reads all
CREATE POLICY "Admin read all judge_recusals" ON public.judge_recusals
    FOR SELECT TO authenticated
    USING (public.current_user_role() = 'admin');

-- RLS: Judge can only select their own
CREATE POLICY "Judges read own recusals" ON public.judge_recusals
    FOR SELECT TO authenticated
    USING (
        judge_id = (SELECT auth.uid())
        AND public.current_user_role() = 'judge'
    );

-- RLS: Judge can only insert their own for teams they are allowed to view
CREATE POLICY "Judges insert own recusals" ON public.judge_recusals
    FOR INSERT TO authenticated
    WITH CHECK (
        judge_id = (SELECT auth.uid())
        AND public.current_user_role() = 'judge'
        AND public.judge_can_view_team(team_id)
    );

-- RLS: Judge can delete own recusal (cancel recusal before results release)
CREATE POLICY "Judges delete own recusals" ON public.judge_recusals
    FOR DELETE TO authenticated
    USING (
        judge_id = (SELECT auth.uid())
        AND public.current_user_role() = 'judge'
    );

-- ----------------------------------------------------------------------------
-- 3. RECUSAL & SCORING INTERLOCK TRIGGERS
-- ----------------------------------------------------------------------------

-- 3a. Recusal validation trigger:
-- - Reject recusal if results are already released for that stage.
-- - Reject recusal if the judge already has a 'final' score for that team and stage.
CREATE OR REPLACE FUNCTION public.check_recusal_validity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS trg_check_recusal_validity ON public.judge_recusals;
CREATE TRIGGER trg_check_recusal_validity
    BEFORE INSERT OR DELETE ON public.judge_recusals
    FOR EACH ROW
    EXECUTE FUNCTION public.check_recusal_validity();

-- 3b. Score insertion/update triggers: Reject score if recusal exists
CREATE OR REPLACE FUNCTION public.check_score_not_recused()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS trg_prelim_score_not_recused ON public.preliminary_scores;
CREATE TRIGGER trg_prelim_score_not_recused
    BEFORE INSERT OR UPDATE ON public.preliminary_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.check_score_not_recused('preliminary');

DROP TRIGGER IF EXISTS trg_final_score_not_recused ON public.final_scores;
CREATE TRIGGER trg_final_score_not_recused
    BEFORE INSERT OR UPDATE ON public.final_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.check_score_not_recused('final');

-- ----------------------------------------------------------------------------
-- 4. UPDATE judge_can_score_* FUNCTIONS
-- ----------------------------------------------------------------------------
-- Drafts can be edited as long as stage results are not released.
-- Disqualified teams, non-submitted, or recused judges are rejected.
CREATE OR REPLACE FUNCTION public.judge_can_score_preliminary(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.judge_can_score_final(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
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

-- ----------------------------------------------------------------------------
-- 5. RANKING VIEWS (ONLY FINAL SCORES)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.preliminary_ranking
WITH (security_invoker = true) AS
SELECT
    t.id                                   AS team_id,
    t.team_code,
    t.team_name,
    COUNT(ps.id)                           AS judges_count,
    ROUND(AVG(ps.total_weighted_score), 2) AS avg_score,
    RANK() OVER (ORDER BY AVG(ps.total_weighted_score) DESC) AS rank
FROM public.teams AS t
JOIN public.preliminary_scores AS ps ON ps.team_id = t.id AND ps.status = 'final'
WHERE NOT t.is_disqualified
GROUP BY t.id, t.team_code, t.team_name;

CREATE OR REPLACE VIEW public.final_ranking
WITH (security_invoker = true) AS
SELECT
    t.id                                   AS team_id,
    t.team_code,
    t.team_name,
    COUNT(fs.id)                           AS judges_count,
    ROUND(AVG(fs.total_weighted_score), 2) AS avg_score,
    RANK() OVER (ORDER BY AVG(fs.total_weighted_score) DESC) AS rank
FROM public.teams AS t
JOIN public.final_scores AS fs ON fs.team_id = t.id AND fs.status = 'final'
WHERE t.is_finalist AND NOT t.is_disqualified
GROUP BY t.id, t.team_code, t.team_name;

REVOKE ALL ON public.preliminary_ranking, public.final_ranking FROM PUBLIC, anon;
GRANT SELECT ON public.preliminary_ranking, public.final_ranking TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. SUBMISSIONS: FIRST_SUBMITTED_AT TRIGGER AND BACKFILL
-- ----------------------------------------------------------------------------
ALTER TABLE public.submissions
    ADD COLUMN IF NOT EXISTS first_submitted_at TIMESTAMPTZ;

-- Backfill legacy records: set first_submitted_at from submitted_at if submitted and null
UPDATE public.submissions
   SET first_submitted_at = submitted_at
 WHERE status = 'submitted'
   AND first_submitted_at IS NULL
   AND submitted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_submission_first_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS trg_set_submission_first_submitted_at ON public.submissions;
CREATE TRIGGER trg_set_submission_first_submitted_at
    BEFORE INSERT OR UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_submission_first_submitted_at();

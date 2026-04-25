-- Pipeline states: track what happens AFTER an analysis is saved.
-- Lets a saved resume_version move through the application lifecycle:
-- Evaluated (default) → Applied → Responded → Interview → Offer / Rejected / Discarded.
--
-- Inspired by career-ops `templates/states.yml`, adapted for Postgres + a web app.

ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'evaluated'
    CHECK (application_status IN (
      'evaluated',
      'applied',
      'responded',
      'interview',
      'offer',
      'rejected',
      'discarded'
    )),
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pipeline_note TEXT;

CREATE INDEX IF NOT EXISTS idx_resume_versions_user_status
  ON public.resume_versions (user_id, application_status, created_at DESC);

-- RLS already locks SELECT/INSERT/DELETE to auth.uid() = user_id (migration 001).
-- We need UPDATE too so the owner can move entries through the pipeline.
CREATE POLICY "resume_versions_update_own"
  ON public.resume_versions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

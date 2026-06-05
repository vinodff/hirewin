-- The "after" ATS score: the OPTIMIZED resume scored against the JD.
-- Before this, the results page showed the harsh "before" atsScore and the
-- jobFitScore (a different axis) mislabeled as "After" — so the strong
-- optimized score was never computed or displayed.
--
-- Nullable so existing rows and any insert that omits it stay valid
-- (avoids the not-null insert-failure class of bug).
ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS optimized_ats_score INTEGER
    CHECK (optimized_ats_score IS NULL OR (optimized_ats_score BETWEEN 0 AND 100));

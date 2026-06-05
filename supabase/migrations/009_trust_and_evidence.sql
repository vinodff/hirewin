-- Persist the trust score, skill-evidence map, and interview risk alerts so the
-- saved analysis page (/history/[id]) can show the same sections as the live
-- results page. Nullable so old rows and any omitted insert stay valid.
ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS trust_score INTEGER
    CHECK (trust_score IS NULL OR (trust_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS skill_evidence JSONB,
  ADD COLUMN IF NOT EXISTS interview_risks JSONB;

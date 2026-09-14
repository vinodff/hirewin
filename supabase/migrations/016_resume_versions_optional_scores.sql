-- HireWin — 016_resume_versions_optional_scores
--
-- Lets a row in resume_versions say "no score", because some of them genuinely
-- have none.
--
-- 001_initial.sql declared these NOT NULL:
--
--   company_type   TEXT    NOT NULL CHECK (company_type IN ('startup', ...))
--   ats_score      INTEGER NOT NULL CHECK (ats_score BETWEEN 0 AND 100)
--   job_fit_score  INTEGER NOT NULL CHECK (job_fit_score BETWEEN 0 AND 100)
--
-- That was right when every row came from /api/analyze, which computes an ATS
-- score deterministically in lib/ats-score.ts and always has all three.
--
-- It stopped being right when the Naukri auto-apply feature began writing
-- application records to the same table. An application is not an analysis: no
-- resume was scored, and the employer's company_type is unknown. The schema
-- demanded all three anyway, so the code supplied `ats_score: 85`,
-- `job_fit_score: 88` and `company_type: 'startup'` — literal constants,
-- landing in the same table and the same history UI as measured values,
-- indistinguishable from them.
--
-- That is the real origin of those fake numbers: a NOT NULL column with no
-- honest value to put in it. Removing the constraint removes the incentive.
--
-- The CHECK constraints stay. A score is still 0-100 and a company_type is
-- still one of the five when present; "absent" and "invalid" remain different
-- things.

ALTER TABLE public.resume_versions
  ALTER COLUMN company_type  DROP NOT NULL,
  ALTER COLUMN ats_score     DROP NOT NULL,
  ALTER COLUMN job_fit_score DROP NOT NULL;

-- Existing rows are untouched: every one of them came from the analysis path
-- and has real values. Only new rows can be null, and only where there is
-- nothing true to write.

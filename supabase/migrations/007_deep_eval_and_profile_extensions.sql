-- Deep evaluation columns on resume_versions.
-- These are inserted by /api/evaluate but were never in a migration.
-- Adding IF NOT EXISTS so this is idempotent against live DBs that already have them.

ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS evaluation_type TEXT NOT NULL DEFAULT 'quick'
    CHECK (evaluation_type IN ('quick', 'deep')),
  ADD COLUMN IF NOT EXISTS deep_score NUMERIC,
  ADD COLUMN IF NOT EXISTS archetype TEXT
    CHECK (archetype IN ('ai_platform_llmops', 'agentic', 'technical_pm', 'solutions_architect', 'forward_deployed', 'transformation')),
  ADD COLUMN IF NOT EXISTS legitimacy TEXT
    CHECK (legitimacy IN ('high_confidence', 'proceed_with_caution', 'suspicious')),
  ADD COLUMN IF NOT EXISTS deep_scores JSONB,
  ADD COLUMN IF NOT EXISTS gaps JSONB,
  ADD COLUMN IF NOT EXISTS star_stories JSONB,
  ADD COLUMN IF NOT EXISTS personalization_plan JSONB,
  ADD COLUMN IF NOT EXISTS comp_research JSONB,
  ADD COLUMN IF NOT EXISTS interview_questions JSONB,
  ADD COLUMN IF NOT EXISTS evaluation_report TEXT,
  ADD COLUMN IF NOT EXISTS jd_keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jd_url TEXT,
  ADD COLUMN IF NOT EXISTS jd_text TEXT;

CREATE INDEX IF NOT EXISTS idx_resume_versions_deep_score
  ON public.resume_versions (user_id, deep_score DESC NULLS LAST)
  WHERE deep_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resume_versions_archetype
  ON public.resume_versions (user_id, archetype)
  WHERE archetype IS NOT NULL;

-- Career-ops extension columns on profiles.
-- Referenced by /api/evaluate and /api/interview-prep but missing from migration 001.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS target_roles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cv_text TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS comp_current TEXT,
  ADD COLUMN IF NOT EXISTS comp_target TEXT,
  ADD COLUMN IF NOT EXISTS comp_currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS deal_breakers TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS superpower TEXT;

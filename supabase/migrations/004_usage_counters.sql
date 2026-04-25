-- Add usage counters for deep evaluations and scanner runs.
-- These follow the same monthly-reset pattern as improvements_used.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deep_evals_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scans_used INTEGER NOT NULL DEFAULT 0;

-- Update the monthly reset function to include the new counters.
CREATE OR REPLACE FUNCTION public.reset_monthly_usage_if_needed(profile_id UUID)
RETURNS VOID AS $$
DECLARE
  current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  UPDATE public.profiles
  SET
    usage_month = current_month,
    improvements_used = 0,
    roadmaps_used = 0,
    deep_evals_used = 0,
    scans_used = 0,
    downloads_used = CASE WHEN plan = 'starter' THEN downloads_used ELSE 0 END
  WHERE id = profile_id AND usage_month != current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adds the ₹49 three-download pack and stops one-time packs refilling monthly.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'starter', 'pack3', 'pro', 'power', 'team'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_plan_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_plan_check
  CHECK (plan IN ('free', 'starter', 'pack3', 'pro', 'power', 'team'));

-- downloads_used must survive the month boundary for EVERY one-time pack,
-- otherwise a ₹19 or ₹49 purchase silently refills its credits every month.
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
    downloads_used = CASE
      WHEN plan IN ('starter', 'pack3') THEN downloads_used
      ELSE 0
    END
  WHERE id = profile_id AND usage_month != current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

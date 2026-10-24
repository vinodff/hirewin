-- P0 fix (audit item P0-1): close plan/quota self-escalation on profiles.
--
-- Background: migration 001 created "profiles_update_own" with only
-- USING (auth.uid() = id) and no WITH CHECK, and no column restriction.
-- Postgres RLS policies cannot restrict columns, so any signed-in user
-- could UPDATE their own profiles row via PostgREST (anon key is public)
-- and set plan='power', zero their counters, or inflate team_wallet_paise,
-- defeating every gate that trusts profiles.plan (downloads, billing,
-- history, job-scan).
--
-- This migration does NOT rewrite 001. It:
--   1. Recreates the policy with both USING and WITH CHECK (row identity).
--   2. Adds a BEFORE UPDATE trigger that rejects, for direct client
--      writes, the escalations a policy cannot express.
--
-- Trigger design -- why it is direction-aware, not a blanket block:
--   * Privileged contexts are exempt: service_role (server-only routes
--     such as payment verify, which legitimately sets plan) and postgres
--     (SECURITY DEFINER functions: reset_monthly_usage_if_needed and the
--     try_increment_* RPCs in 004/006, which legitimately rewrite counters
--     and usage_month). Triggers fired by those functions run as postgres.
--   * For direct authenticated writes, the following are rejected:
--       - any change to plan (only the server may grant a plan)
--       - any change to usage_month (changing it forces a quota reset on
--         the next reset_monthly_usage_if_needed read)
--       - any DECREASE to a usage counter (improvements_used,
--         roadmaps_used, downloads_used, scans_used, deep_evals_used)
--         -- decreasing a counter manufactures free quota
--       - any INCREASE to team_wallet_paise (manufactures wallet credit)
--   * Deliberately still allowed for direct writes, because they are
--     harmless and existing routes rely on them until the downloads batch
--     migrates them to an atomic RPC (audit item P1-4):
--       - INCREASING a counter (download pdf/docx routes do
--         downloads_used = downloads_used + 1 via the authenticated
--         client; a larger counter only reduces remaining quota)
--       - DECREASING team_wallet_paise (spending, never a gain)
--       - changes to any other column (e.g. linkedin-prefs writes
--         cv_text / target_roles via the authenticated client)
--   * An authenticated user still cannot touch another user's row: the
--     policy's USING/WITH CHECK (auth.uid() = id) is evaluated around
--     the trigger.
--
-- Applying this file to live Supabase is a separate step that still needs
-- the user's live access; committing the file alone does not fix live.

-- 1. Recreate the update policy with WITH CHECK.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Trigger guard for protected columns.
CREATE OR REPLACE FUNCTION public.prevent_protected_profile_writes()
RETURNS TRIGGER AS $$
BEGIN
  -- Server-only contexts: service_role (service client) and postgres
  -- (SECURITY DEFINER RPCs / reset function). These are the only writers
  -- allowed to grant plans, reset months, or rewrite counters freely.
  IF current_user IN ('service_role', 'postgres') THEN
    RETURN NEW;
  END IF;

  -- Direct client writes: reject every escalation shape.
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'profiles.plan may only be changed by the server';
  END IF;

  IF NEW.usage_month IS DISTINCT FROM OLD.usage_month THEN
    RAISE EXCEPTION 'profiles.usage_month may only be changed by the server';
  END IF;

  IF NEW.improvements_used < OLD.improvements_used
    OR NEW.roadmaps_used < OLD.roadmaps_used
    OR NEW.downloads_used < OLD.downloads_used
    OR NEW.scans_used < OLD.scans_used
    OR NEW.deep_evals_used < OLD.deep_evals_used THEN
    RAISE EXCEPTION 'profiles usage counters may not be decreased by the client';
  END IF;

  IF NEW.team_wallet_paise > OLD.team_wallet_paise THEN
    RAISE EXCEPTION 'profiles.team_wallet_paise may not be increased by the client';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_protect_writes ON public.profiles;
CREATE TRIGGER trg_profiles_protect_writes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_profile_writes();

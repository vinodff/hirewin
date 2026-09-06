-- HireWin — 014_opportunity_admin
--
-- Puts the Opportunities Agent under admin control: an editable schedule, a
-- manual removal path, and the counters the console reads.
--
-- The central design problem this solves is that **the schedule cannot live in
-- vercel.json**. That file is static, deployed, and unreachable from an admin
-- UI; changing the run times would mean a code change and a redeploy. Worse,
-- Vercel's Hobby plan permits a given cron entry to fire only once per day, so
-- "run 4 times daily" cannot be expressed as one entry at all.
--
-- So the split is:
--   * vercel.json registers 24 entries, one per hour, each firing once a day.
--     That is the *permission* to run at any hour.
--   * `opportunity_settings.run_hours_ist` decides which of those hours
--     actually does work. Everything else returns immediately.
--
-- The admin edits a row; the schedule changes on the next hour. No deploy.

-- ---------------------------------------------------------------------------
-- 1. Settings
--
-- A singleton. The `id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id)` trick means
-- the table can physically hold exactly one row: any second insert collides on
-- the primary key, and `id = false` is refused by the CHECK. That is stronger
-- than a convention that everyone remembers to pass id = 1.
-- ---------------------------------------------------------------------------
CREATE TABLE public.opportunity_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),

  -- IST hours at which a run should do work. Length = runs per day.
  -- Defaults to the two the agent shipped with: 06:00 and 18:00.
  run_hours_ist SMALLINT[] NOT NULL DEFAULT '{6,18}',

  -- Links re-checked per run. Higher clears the recheck backlog faster but
  -- costs wall clock, and the route has 300s total.
  sweep_limit SMALLINT NOT NULL DEFAULT 40 CHECK (sweep_limit BETWEEN 0 AND 200),

  -- Cap on rows the ATS harvest may publish in one run. A guard against a
  -- registry edit accidentally flooding the board overnight.
  max_publish_per_run SMALLINT NOT NULL DEFAULT 200 CHECK (max_publish_per_run BETWEEN 0 AND 1000),

  -- When false, verified rows are held at `pending` for an admin to approve
  -- instead of going straight to the public page.
  auto_publish BOOLEAN NOT NULL DEFAULT TRUE,

  -- Kill switch. Every scheduled invocation returns immediately while true.
  -- Manual "Run now" still works, so an admin can test without unpausing.
  paused BOOLEAN NOT NULL DEFAULT FALSE,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- An empty array would mean "never run" while still looking configured, which
  -- is a confusing way to express `paused`. At least one hour, at most 24, and
  -- every entry a real hour.
  CONSTRAINT opportunity_settings_hours_valid CHECK (
    array_length(run_hours_ist, 1) BETWEEN 1 AND 24
    AND run_hours_ist <@ ARRAY[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]::SMALLINT[]
  )
);

-- Seed the singleton so the route never has to cope with a missing row.
INSERT INTO public.opportunity_settings (id) VALUES (TRUE);

CREATE TRIGGER opportunity_settings_set_updated_at
  BEFORE UPDATE ON public.opportunity_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Manual removal + link provenance on opportunities
--
-- Removal deliberately reuses `retired_at`, which 013 already made the
-- visibility gate, rather than adding a parallel `hidden` flag. Two independent
-- ways to hide a row is two places to forget, and the RLS policy would then
-- need to know about both. What is added is *who* and the direct-link verdict.
-- ---------------------------------------------------------------------------
ALTER TABLE public.opportunities
  -- Null for an automatic retirement by the liveness sweep; set when a human
  -- pressed Remove. Distinguishing them matters: an admin removal should not be
  -- silently undone the next time the crawler sees the posting alive.
  ADD COLUMN retired_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- True when apply_url points at ONE specific posting rather than a careers
  -- index or a search result. See lib/opportunities/apply-link.ts.
  ADD COLUMN is_direct_apply BOOLEAN,

  -- Set when an admin promotes a `pending` row by hand.
  ADD COLUMN approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN approved_at TIMESTAMPTZ;

-- The console's review queue: pending rows, newest first.
CREATE INDEX opportunities_pending_queue_idx
  ON public.opportunities (discovered_at DESC)
  WHERE status = 'pending' AND retired_at IS NULL;

-- "What did today's runs actually do?" — the console's headline query.
CREATE INDEX opportunities_discovered_day_idx
  ON public.opportunities (discovered_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Today, at a glance
--
-- The console asks the same four questions on every poll (every 15s, per
-- admin). Answering them with four round trips from the route means four
-- queries times every open tab; one function means one.
--
-- `p_since` is passed rather than assumed so the caller controls the window —
-- the console asks for IST midnight, which is not the server's midnight.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opportunity_console_summary(p_since TIMESTAMPTZ)
RETURNS TABLE (
  discovered_today   BIGINT,
  published_today    BIGINT,
  pending_today      BIGINT,
  retired_today      BIGINT,
  removed_today      BIGINT,
  live_total         BIGINT,
  pending_total      BIGINT,
  direct_apply_total BIGINT,
  indirect_total     BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    count(*) FILTER (WHERE o.discovered_at >= p_since),
    count(*) FILTER (WHERE o.discovered_at >= p_since AND o.status = 'verified'),
    count(*) FILTER (WHERE o.discovered_at >= p_since AND o.status = 'pending'),
    -- Retired BY THE SWEEP: a dead link the crawler proved gone.
    count(*) FILTER (WHERE o.retired_at >= p_since AND o.retired_by IS NULL),
    -- Removed BY A HUMAN. Kept apart because they mean different things: one
    -- is the agent working, the other is the agent being overruled.
    count(*) FILTER (WHERE o.retired_at >= p_since AND o.retired_by IS NOT NULL),
    count(*) FILTER (WHERE o.status = 'verified' AND o.retired_at IS NULL),
    count(*) FILTER (WHERE o.status = 'pending' AND o.retired_at IS NULL),
    count(*) FILTER (WHERE o.retired_at IS NULL AND o.is_direct_apply IS TRUE),
    count(*) FILTER (WHERE o.retired_at IS NULL AND o.is_direct_apply IS FALSE)
  FROM public.opportunities o;
$$;

-- ===========================================================================
-- RLS
--
-- Settings are service-role only, exactly like opportunity_runs: RLS on with no
-- policies denies everyone, and the admin console reaches them through a route
-- guarded by requireAdmin(). That is the same arrangement /api/admin/overview
-- already uses, and it keeps admin identity in one place (ADMIN_EMAILS) rather
-- than splitting it between an env var and a SQL predicate.
-- ===========================================================================
ALTER TABLE public.opportunity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_settings FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.opportunity_settings FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.opportunity_console_summary(TIMESTAMPTZ) FROM anon, authenticated;

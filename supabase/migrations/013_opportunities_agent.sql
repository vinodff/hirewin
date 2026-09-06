-- HireWin — 013_opportunities_agent
--
-- The Opportunities Agent: verified internships, jobs, hackathons, scholarships
-- and campus programmes gathered automatically twice a day and served on the
-- public /opportunities page.
--
-- Ported from BVCITS 2.0 (migrations 0006_opportunities + 0012_opportunity_agent),
-- merged into one migration and adapted in three ways that matter:
--
--   1. **The feed is PUBLIC.** BVCITS served a signed-in student dashboard, so
--      its select policy was scoped to `authenticated`. /opportunities here has
--      no auth wall, so `anon` is granted the same visible-rows-only read. The
--      gate did not weaken — it is still "verified, not retired, not expired" —
--      it just applies to a wider audience.
--   2. **No is_admin() dependency.** HireWin decides admin by email in
--      application code (lib/admin-emails.ts), not with a SQL predicate, so
--      there is no moderation policy here. Every write is service-role, which
--      is what the cron and any future admin route both use.
--   3. **A compensation column.** HireWin's card renders pay as a price tag
--      (DESIGN.md), so the figure is stored as its own field rather than being
--      buried in the description where the UI would have to re-parse it.
--
-- Security posture: **the open web is untrusted input.** Rows arrive from a
-- crawler, so the database does not assume the pipeline behaved. Two controls
-- enforce that independently of application code:
--
--   1. A row is only visible when `status = 'verified'`, it has not been
--      retired, and its deadline has not passed — see is_opportunity_visible()
--      and the RLS policy that calls it. A `pending` row is invisible by
--      construction, so a bug that forgets to filter cannot leak an unverified
--      posting onto a public page.
--   2. A CHECK constraint refuses to store `status = 'verified'` on a row whose
--      source_tier is 'unknown' or 'blocked'. Even a direct service-role insert
--      cannot publish a link shortener. The TypeScript rules in
--      lib/opportunities/verify.ts are the first line; this is the floor.

-- ---------------------------------------------------------------------------
-- Enums — mirror the derived unions in lib/opportunities/types.ts
-- ---------------------------------------------------------------------------
CREATE TYPE public.opportunity_kind AS ENUM (
  'internship',
  'job',
  'hackathon',
  'competition',
  'event',
  'webinar',
  'workshop',
  'ambassador',
  'scholarship',
  'fellowship'
);

CREATE TYPE public.opportunity_status AS ENUM ('pending', 'verified', 'rejected');

CREATE TYPE public.opportunity_source_tier AS ENUM (
  'official',    -- the employer/organiser or the ATS they hired
  'aggregator',  -- a real job board carrying a second-hand listing
  'unknown',     -- unclassified domain — never publishable without review
  'blocked'      -- shortener or chat invite — never publishable at all
);

CREATE TYPE public.opportunity_run_status  AS ENUM ('running', 'success', 'partial', 'failed');
CREATE TYPE public.opportunity_run_trigger AS ENUM ('cron', 'manual');

-- ---------------------------------------------------------------------------
-- Shared trigger helper
--
-- 001_initial.sql set created_at defaults but never needed an updated_at
-- trigger, so this codebase has no such function yet. Written here rather than
-- inlined so later tables can reuse it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Run ledger
--
-- Created before `opportunities`, which carries FKs to it.
--
-- Without a ledger there is no way to answer "how many did we find this
-- morning?" — stats would live in console.log and be gone on the next deploy.
-- One row per run, with counts, duration, and the sources actually consulted.
-- ---------------------------------------------------------------------------
CREATE TABLE public.opportunity_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  status         public.opportunity_run_status NOT NULL DEFAULT 'running',
  trigger        public.opportunity_run_trigger NOT NULL,
  -- Null for a cron run: nobody pressed anything.
  triggered_by   UUID REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- The IST calendar day this run belongs to, plus which of the day's two
  -- slots it is. BVCITS ran once a day and keyed uniqueness on (run_date,
  -- trigger); HireWin runs at 06:00 and 18:00 IST, so without `slot` the
  -- evening cron would find the morning's row and skip its own work entirely.
  run_date       DATE NOT NULL,
  slot           TEXT NOT NULL DEFAULT 'morning' CHECK (slot IN ('morning', 'evening')),

  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  duration_ms    INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),

  -- Discovery half.
  pages_searched SMALLINT NOT NULL DEFAULT 0,
  extracted      SMALLINT NOT NULL DEFAULT 0,
  verified       SMALLINT NOT NULL DEFAULT 0,
  pending        SMALLINT NOT NULL DEFAULT 0,
  rejected       SMALLINT NOT NULL DEFAULT 0,
  duplicates     SMALLINT NOT NULL DEFAULT 0,

  -- Refresh half.
  rechecked      SMALLINT NOT NULL DEFAULT 0,
  retired        SMALLINT NOT NULL DEFAULT 0,

  -- What the agent actually consulted, e.g.
  -- [{"host":"boards-api.greenhouse.io","plan":"ats","results":24,"kept":18}]
  -- This is the evidence behind "real sources"; it is written from the API and
  -- search responses, never hand-authored.
  sources        JSONB NOT NULL DEFAULT '[]'::JSONB,

  model          TEXT,
  error          TEXT,

  CONSTRAINT opportunity_runs_counts_nonneg CHECK (
    pages_searched >= 0 AND extracted >= 0 AND verified >= 0
    AND pending >= 0 AND rejected >= 0 AND duplicates >= 0
    AND rechecked >= 0 AND retired >= 0
  )
);

-- One run per slot per day per trigger: a cron retry after a timeout, or an
-- admin double-clicking "Run now", cannot spend the quota twice.
CREATE UNIQUE INDEX opportunity_runs_slot_idx ON public.opportunity_runs (run_date, slot, trigger);
CREATE INDEX opportunity_runs_recent_idx ON public.opportunity_runs (started_at DESC);
CREATE INDEX opportunity_runs_failed_idx ON public.opportunity_runs (started_at DESC)
  WHERE status = 'failed';

-- ---------------------------------------------------------------------------
-- 2. Opportunities
-- ---------------------------------------------------------------------------
CREATE TABLE public.opportunities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title         TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 240),
  organization  TEXT NOT NULL CHECK (length(btrim(organization)) BETWEEN 2 AND 160),
  kind          public.opportunity_kind NOT NULL,

  apply_url     TEXT NOT NULL CHECK (apply_url ~ '^https?://'),
  source_url    TEXT,

  -- Deduplication.
  --
  -- url_fingerprint is the canonicalised apply URL (host + path + meaningful
  -- query, tracking parameters stripped) and is UNIQUE: the same posting
  -- reached via three different tracking links is one row, not three.
  --
  -- content_fingerprint is the normalised organisation + title, and is
  -- deliberately NOT unique — two genuinely different roles at one company can
  -- normalise alike. The pipeline uses it to notice that a posting already seen
  -- on a company board has now also appeared elsewhere, and increments
  -- `corroborations` instead of inserting a duplicate.
  url_fingerprint     TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  corroborations      SMALLINT NOT NULL DEFAULT 1 CHECK (corroborations >= 0),

  location      TEXT,
  work_mode     TEXT CHECK (work_mode IS NULL OR work_mode IN ('onsite', 'remote', 'hybrid')),
  eligibility   TEXT,
  skills        TEXT[] NOT NULL DEFAULT '{}',
  description   TEXT,
  -- Published pay, verbatim from the source. Never computed — see the comment
  -- on compensationFrom() in lib/opportunities/ats.ts.
  compensation  TEXT,

  deadline      DATE,
  posted_at     DATE,

  status        public.opportunity_status NOT NULL DEFAULT 'pending',
  source_tier   public.opportunity_source_tier NOT NULL DEFAULT 'unknown',

  -- Why the verifier ruled the way it did. Kept on the row so a rejection can
  -- be audited and argued with, rather than silently disappearing.
  signals       TEXT[] NOT NULL DEFAULT '{}',

  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Liveness provenance. A listing verified in September is still in the feed
  -- in October however dead the link became, and a row with deadline IS NULL
  -- never expires on its own — these columns are what the sweep acts on.
  last_checked_at   TIMESTAMPTZ,
  -- 'ok' | 'blocked' | 'expired' | 'gone' | 'unreachable' — mirrors the
  -- LivenessVerdict union in lib/opportunities/liveness.ts. Left as TEXT rather
  -- than an enum so a new verdict does not need a migration to observe.
  last_check_result TEXT,
  -- Consecutive AMBIGUOUS failures. A definitive signal (410, a validThrough in
  -- the past) retires on the first sighting and never touches this counter; a
  -- timeout or suspected soft-404 increments it, and two in a row retire.
  -- Reset to 0 by any successful check.
  check_failures    SMALLINT NOT NULL DEFAULT 0 CHECK (check_failures >= 0),

  -- Removal is soft. An expired posting still matters for deduplication (so the
  -- same closed drive is not rediscovered every night), and keeping the
  -- evidence means any removal can be audited or reversed rather than silently
  -- losing a real opportunity.
  retired_at        TIMESTAMPTZ,
  retired_reason    TEXT,

  first_seen_run    UUID REFERENCES public.opportunity_runs (id) ON DELETE SET NULL,
  last_seen_run     UUID REFERENCES public.opportunity_runs (id) ON DELETE SET NULL,

  -- The floor described in the header: an unverifiable source can never carry
  -- a published status, whatever the caller asked for.
  CONSTRAINT opportunities_verified_needs_trusted_source
    CHECK (status <> 'verified' OR source_tier IN ('official', 'aggregator')),

  CONSTRAINT opportunities_retired_needs_reason
    CHECK (retired_at IS NULL OR retired_reason IS NOT NULL)
);

CREATE UNIQUE INDEX opportunities_url_fingerprint_idx
  ON public.opportunities (url_fingerprint);

CREATE INDEX opportunities_content_fingerprint_idx
  ON public.opportunities (content_fingerprint);

-- The public feed: open, verified rows ordered by how soon they close.
CREATE INDEX opportunities_open_feed_idx
  ON public.opportunities (deadline NULLS LAST, discovered_at DESC)
  WHERE status = 'verified' AND retired_at IS NULL;

CREATE INDEX opportunities_kind_idx ON public.opportunities (kind) WHERE status = 'verified';
CREATE INDEX opportunities_skills_idx ON public.opportunities USING GIN (skills);

-- The sweep claims work oldest-first, so this index is the one it runs on.
CREATE INDEX opportunities_recheck_queue_idx
  ON public.opportunities (last_checked_at NULLS FIRST)
  WHERE retired_at IS NULL AND status = 'verified';

CREATE INDEX opportunities_retired_idx ON public.opportunities (retired_at DESC)
  WHERE retired_at IS NOT NULL;

CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Visibility gate
--
-- SECURITY DEFINER and STABLE. An expired posting is treated as invisible
-- rather than deleted, for the dedup reason given on retired_at above.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_opportunity_visible(
  p_status     public.opportunity_status,
  p_deadline   DATE,
  p_retired_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_status = 'verified'
     AND p_retired_at IS NULL
     AND (p_deadline IS NULL OR p_deadline >= CURRENT_DATE);
$$;

-- ---------------------------------------------------------------------------
-- 4. Day-wise report
--
-- Answers "how many did we find today, yesterday, the day before" in one query,
-- counting the opportunities themselves rather than each run's self-reported
-- totals — so a run that crashed after inserting still shows its rows honestly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.opportunity_daily_stats AS
WITH days AS (
  SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day')::DATE AS day
)
SELECT
  d.day,
  (SELECT count(*) FROM public.opportunities o
    WHERE o.discovered_at::DATE = d.day)                                   AS discovered,
  (SELECT count(*) FROM public.opportunities o
    WHERE o.discovered_at::DATE = d.day AND o.status = 'verified')         AS verified,
  (SELECT count(*) FROM public.opportunities o
    WHERE o.retired_at::DATE = d.day)                                      AS retired,
  (SELECT count(*) FROM public.opportunity_runs r
    WHERE r.run_date = d.day)                                              AS runs,
  (SELECT round(avg(r.duration_ms)) FROM public.opportunity_runs r
    WHERE r.run_date = d.day AND r.duration_ms IS NOT NULL)                AS avg_duration_ms,
  (SELECT coalesce(sum(r.rechecked), 0) FROM public.opportunity_runs r
    WHERE r.run_date = d.day)                                              AS rechecked
FROM days d
ORDER BY d.day DESC;

-- ===========================================================================
-- RLS
-- ===========================================================================

ALTER TABLE public.opportunities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_runs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_runs  FORCE ROW LEVEL SECURITY;

-- The public feed. Signed out or signed in, a reader sees only what passed
-- verification, has not been retired, and has not closed. Note there is
-- deliberately NO insert/update/delete policy for anon or authenticated: rows
-- come from the pipeline (service role) only, which bypasses RLS.
CREATE POLICY "opportunities_select_visible" ON public.opportunities
  FOR SELECT TO anon, authenticated
  USING (public.is_opportunity_visible(status, deadline, retired_at));

-- The ledger is service-role only: RLS is enabled with no policies at all,
-- which denies everyone. An admin console would read it through a route
-- guarded by requireAdmin(), the same arrangement /api/admin/overview uses.

REVOKE ALL ON public.opportunity_runs        FROM anon, authenticated;
REVOKE ALL ON public.opportunity_daily_stats FROM anon, authenticated;

GRANT SELECT ON public.opportunities TO anon, authenticated;

-- HireWin — 015_analysis_cache
--
-- Free capacity without a new provider.
--
-- `streamAnalysis` runs at temperature 0, so the same resume and the same job
-- description produce the same analysis every time. Recomputing it spends quota
-- to rediscover an answer already held — and on a free tier, quota is the whole
-- constraint. OpenRouter allows 50 requests a day; every cache hit is one of
-- those fifty handed back.
--
-- This is the only lever in the AI work that trades nothing away. A bigger free
-- tier costs privacy, a smaller prompt costs output quality, a paid fallback
-- costs money. A cache hit costs nothing and returns a byte-identical answer.

CREATE TABLE public.analysis_cache (
  -- SHA-256 of the normalised resume + JD + options. The key is a hash rather
  -- than the content so this index never becomes a searchable archive of who
  -- applied where; the row still holds the analysis, but nothing is looked up
  -- by anything readable.
  cache_key    TEXT PRIMARY KEY,

  result_text  TEXT NOT NULL,

  -- Which model produced it. A cached answer from a model that has since been
  -- retired is still a valid answer, but knowing its origin is what makes a
  -- quality complaint traceable.
  provider     TEXT,
  model        TEXT,

  -- How many times this entry has been served instead of a fresh call. This is
  -- the number that says whether the cache earned its place; without it the
  -- saving is a claim rather than a measurement.
  hits         INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entries expire after 7 days (enforced in lib/ai/cache.ts, which filters on
-- created_at). This index serves both that filter and the cleanup below.
CREATE INDEX analysis_cache_created_idx ON public.analysis_cache (created_at DESC);

/**
 * Increment a hit counter without reading the row first.
 *
 * A read-then-write would lose counts under concurrency, which is exactly when
 * the cache is doing the most work and the number matters most.
 */
CREATE OR REPLACE FUNCTION public.bump_analysis_cache_hit(p_key TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.analysis_cache SET hits = hits + 1 WHERE cache_key = p_key;
$$;

/**
 * Drop expired entries.
 *
 * Not automatic. Called from the existing cron so it cannot become a
 * forgotten background job, and because a table this small can wait a day.
 */
CREATE OR REPLACE FUNCTION public.prune_analysis_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM public.analysis_cache WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

-- ===========================================================================
-- RLS
--
-- Service-role only, with no policies at all — which denies everyone.
--
-- This matters more here than on most tables. The rows hold generated resume
-- content, and the cache is deliberately NOT keyed per user (two people with
-- the same resume text and job description share an entry, which is where most
-- of the hit rate comes from). That sharing is safe only while nothing but the
-- server can read the table: a user-facing SELECT policy would let one account
-- fetch another's analysis by guessing a hash.
-- ===========================================================================
ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_cache FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.analysis_cache FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_analysis_cache_hit(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_analysis_cache() FROM anon, authenticated;

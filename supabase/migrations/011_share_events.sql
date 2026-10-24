-- Fix (audit item P1-6): share_events was referenced by code but had no
-- migration at all, so a fresh database could not reproduce it and its
-- columns/RLS were unverifiable from this checkout.
--
-- Columns match exactly how the code uses the table:
--   * app/api/share/route.ts POST inserts { user_id, version_id } and
--     counts rows with .eq('user_id', user.id).eq('version_id', versionId)
--   * app/api/share/route.ts GET counts the same way, including the case
--     where versionId is null (a share recorded without a version), so
--     version_id MUST be nullable.
--   * app/api/download/pdf|docx/route.ts counts rows for a specific
--     version_id to decide share-unlock.
-- No route updates or deletes share_events, so no UPDATE/DELETE policy
-- is created (default deny). The id/created_at columns follow the
-- conventions of the other tables in 001.
--
-- Note: this migration only makes the table reproducible. It does NOT
-- fix the share-unlock scope problem (audit item P1-5: 5 shares on one
-- version unlocking downloads of arbitrary text) -- that is a separate
-- downloads-batch change. Applying this file to live Supabase is a
-- separate step that still needs the user's live access; if a live
-- share_events table already exists with different columns/RLS, its
-- live schema must be reconciled with this file before applying.

CREATE TABLE IF NOT EXISTS public.share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version_id UUID REFERENCES public.resume_versions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_events_select_own" ON public.share_events;
CREATE POLICY "share_events_select_own" ON public.share_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "share_events_insert_own" ON public.share_events;
CREATE POLICY "share_events_insert_own" ON public.share_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_share_events_user_version
  ON public.share_events (user_id, version_id);

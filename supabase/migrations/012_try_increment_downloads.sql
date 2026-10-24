-- Fix (audit items P1-4): atomic download counter, mirroring
-- 006_atomic_usage_rpcs.sql. Previously app/api/download/pdf|docx
-- did SELECT plan,downloads_used -> canDownload() -> a later plain
-- UPDATE downloads_used = <stale>+1, so two concurrent downloads could
-- both pass a 1-download limit, and the update was never error-checked.
--
-- try_increment_downloads_used does check-and-increment in a single
-- UPDATE (SECURITY DEFINER, so it runs as postgres and is exempt from
-- the batch-1 trigger guard in 010). p_limit = -1 means unlimited
-- (team / Infinity plans). Callers must call this AFTER successful
-- generation and treat a false return as "quota lost the race" (403),
-- never deliver the file in that case. Generation failure therefore
-- never burns a credit, because no increment has happened yet.
--
-- Applying this file to live Supabase is a separate step that still
-- needs the user's live access; committing the file alone does not
-- fix live.

CREATE OR REPLACE FUNCTION public.try_increment_downloads_used(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE public.profiles
  SET downloads_used = downloads_used + 1
  WHERE id = p_user_id
    AND (p_limit < 0 OR downloads_used < p_limit);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

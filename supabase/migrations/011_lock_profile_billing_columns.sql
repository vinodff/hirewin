-- SECURITY: close a full paywall bypass, and make download spending atomic.
--
-- "profiles_update_own" is FOR UPDATE USING (auth.uid() = id). RLS policies
-- gate WHICH ROWS you may touch — they cannot gate WHICH COLUMNS. So any
-- signed-in user could run, straight from the browser with the anon key:
--
--   supabase.from('profiles').update({ plan: 'power', downloads_used: 0 })
--                            .eq('id', myUserId)
--
-- ...and grant themselves an unlimited plan for free. Column-level GRANTs are
-- the only thing that stops this, so the billing and quota columns are removed
-- from the authenticated role's UPDATE privilege entirely.
--
-- Server routes that legitimately move those columns use the service role
-- (payment verify) or a SECURITY DEFINER function (the counters below), both
-- of which are unaffected by these grants.

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

-- Only the self-service profile fields stay user-writable.
GRANT UPDATE (
  full_name,
  avatar_url,
  headline,
  target_roles,
  cv_text,
  location,
  linkedin_url,
  portfolio_url,
  comp_current,
  comp_target,
  comp_currency,
  deal_breakers,
  superpower,
  updated_at
) ON public.profiles TO authenticated;

-- Atomic download spending.
--
-- The PDF and DOCX routes did read-then-write:
--   select downloads_used -> canDownload() -> update downloads_used + 1
-- Two requests interleaving both read 0, both pass the gate, and both write 1
-- — so one ₹19 purchase yields two downloads. Clicking "PDF" and "DOCX" at the
-- same time is enough to trigger it. This mirrors the existing
-- try_increment_* functions: the check and the increment are one statement.
-- p_limit = -1 means unlimited.
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

REVOKE ALL ON FUNCTION public.try_increment_downloads_used(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_increment_downloads_used(UUID, INTEGER) TO authenticated;

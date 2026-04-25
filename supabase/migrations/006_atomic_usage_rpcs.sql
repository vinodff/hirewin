-- Atomic usage increment functions.
-- Each function does check-then-increment in a single UPDATE so two concurrent
-- requests can't both pass the quota gate.
-- p_limit = -1 means unlimited (team plan).

CREATE OR REPLACE FUNCTION public.try_increment_improvements_used(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE public.profiles
  SET improvements_used = improvements_used + 1
  WHERE id = p_user_id
    AND (p_limit < 0 OR improvements_used < p_limit);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_increment_deep_evals_used(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE public.profiles
  SET deep_evals_used = deep_evals_used + 1
  WHERE id = p_user_id
    AND (p_limit < 0 OR deep_evals_used < p_limit);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_increment_scans_used(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE public.profiles
  SET scans_used = scans_used + 1
  WHERE id = p_user_id
    AND (p_limit < 0 OR scans_used < p_limit);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

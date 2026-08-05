-- The admin dashboard summed orders and usage_events in JavaScript after
-- SELECTing them with no LIMIT. PostgREST caps rows per response (1000 by
-- default), so past that point every headline number — total revenue, total
-- API cost, top users — silently reported only the most recent page.
-- Aggregate in SQL instead, where there is no row cap.

CREATE OR REPLACE FUNCTION public.admin_revenue_summary()
RETURNS TABLE (
  total_paise BIGINT,
  last30d_paise BIGINT,
  today_paise BIGINT,
  paid_order_count BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(amount_paise), 0)::BIGINT,
    COALESCE(SUM(amount_paise) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::BIGINT,
    COALESCE(SUM(amount_paise) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0)::BIGINT,
    COUNT(*)::BIGINT
  FROM public.orders
  WHERE status = 'paid';
$$;

CREATE OR REPLACE FUNCTION public.admin_usage_summary()
RETURNS TABLE (
  total_calls BIGINT,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_cost_usd NUMERIC,
  last30d_cost_usd NUMERIC,
  last30d_tokens BIGINT,
  today_cost_usd NUMERIC,
  today_calls BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(input_tokens), 0)::BIGINT,
    COALESCE(SUM(output_tokens), 0)::BIGINT,
    COALESCE(SUM(cost_usd), 0)::NUMERIC,
    COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::NUMERIC,
    COALESCE(SUM(input_tokens + output_tokens) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::BIGINT,
    COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()))::BIGINT
  FROM public.usage_events;
$$;

CREATE OR REPLACE FUNCTION public.admin_revenue_by_day()
RETURNS TABLE (day DATE, paise BIGINT) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT d::DATE, COALESCE(SUM(o.amount_paise), 0)::BIGINT
  FROM generate_series(date_trunc('day', NOW()) - INTERVAL '29 days', date_trunc('day', NOW()), INTERVAL '1 day') d
  LEFT JOIN public.orders o
    ON o.status = 'paid' AND date_trunc('day', o.created_at) = d
  GROUP BY d ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.admin_cost_by_day()
RETURNS TABLE (day DATE, usd NUMERIC) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT d::DATE, COALESCE(SUM(u.cost_usd), 0)::NUMERIC
  FROM generate_series(date_trunc('day', NOW()) - INTERVAL '29 days', date_trunc('day', NOW()), INTERVAL '1 day') d
  LEFT JOIN public.usage_events u ON date_trunc('day', u.created_at) = d
  GROUP BY d ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.admin_plan_counts()
RETURNS TABLE (plan TEXT, count BIGINT) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT p.plan, COUNT(*)::BIGINT FROM public.profiles p GROUP BY p.plan;
$$;

CREATE OR REPLACE FUNCTION public.admin_top_users(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  plan TEXT,
  cost_usd NUMERIC,
  calls BIGINT,
  tokens BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.user_id, p.email, p.plan,
         COALESCE(SUM(u.cost_usd), 0)::NUMERIC,
         COUNT(*)::BIGINT,
         COALESCE(SUM(u.input_tokens + u.output_tokens), 0)::BIGINT
  FROM public.usage_events u
  LEFT JOIN public.profiles p ON p.id = u.user_id
  WHERE u.user_id IS NOT NULL
  GROUP BY u.user_id, p.email, p.plan
  ORDER BY 4 DESC
  LIMIT p_limit;
$$;

-- These expose whole-business figures. Only the service role may call them;
-- the admin API route checks requireAdmin() and then uses the service client.
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'admin_revenue_summary()',
    'admin_usage_summary()',
    'admin_revenue_by_day()',
    'admin_cost_by_day()',
    'admin_plan_counts()',
    'admin_top_users(integer)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;

-- Per-call Anthropic usage log: one row per API call, cost in USD
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_created ON public.usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_user ON public.usage_events (user_id, created_at DESC);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
-- No public policies; service role only (admin routes use service client).

-- Presence heartbeat: one row per signed-in user, updated every ~30s
CREATE TABLE IF NOT EXISTS public.presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON public.presence (last_seen_at DESC);

ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_upsert_own" ON public.presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presence_update_own" ON public.presence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "presence_select_own" ON public.presence FOR SELECT USING (auth.uid() = user_id);

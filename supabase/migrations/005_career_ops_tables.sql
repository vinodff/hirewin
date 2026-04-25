-- Career-ops integration tables: scanner, followup tracking.
-- These tables were initially created manually in Supabase.
-- This migration makes them reproducible and enforces RLS.

-- ============================================================
-- PORTALS: system-managed company career pages to scan
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  careers_url TEXT NOT NULL,
  api_url TEXT,
  ats_platform TEXT CHECK (ats_platform IN ('greenhouse', 'ashby', 'lever', 'workday', 'custom')),
  category TEXT NOT NULL DEFAULT 'global_tech'
    CHECK (category IN ('indian_tech', 'global_tech', 'ai_labs', 'european_tech', 'custom')),
  notes TEXT,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read system portals
CREATE POLICY "portals_select_system" ON public.portals
  FOR SELECT USING (is_system = TRUE AND auth.uid() IS NOT NULL);
-- Service role manages system portals (no user INSERT/UPDATE policy)

CREATE INDEX IF NOT EXISTS idx_portals_category ON public.portals (category, name);
CREATE INDEX IF NOT EXISTS idx_portals_enabled ON public.portals (is_system, enabled);

-- ============================================================
-- USER_PORTALS: per-user overrides + custom portals
-- portal_id NULL  → custom portal added by the user
-- portal_id SET   → toggle override for a system portal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_id UUID REFERENCES public.portals(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  custom_name TEXT,
  custom_careers_url TEXT,
  custom_api_url TEXT,
  custom_ats_platform TEXT CHECK (custom_ats_platform IN ('greenhouse', 'ashby', 'lever', 'workday', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A user can only have one override row per system portal
  CONSTRAINT user_portals_user_portal_unique UNIQUE (user_id, portal_id)
);

ALTER TABLE public.user_portals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_portals_select_own" ON public.user_portals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_portals_insert_own" ON public.user_portals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_portals_update_own" ON public.user_portals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_portals_delete_own" ON public.user_portals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_portals_user ON public.user_portals (user_id);

-- ============================================================
-- SCAN_HISTORY: discovered jobs, deduplicated per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_id UUID REFERENCES public.portals(id) ON DELETE SET NULL,
  job_url TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent the same job URL appearing twice for the same user
  CONSTRAINT scan_history_user_url_unique UNIQUE (user_id, job_url)
);

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_history_select_own" ON public.scan_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scan_history_insert_own" ON public.scan_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scan_history_update_own" ON public.scan_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scan_history_delete_own" ON public.scan_history FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scan_history_user ON public.scan_history (user_id, first_seen DESC);

-- ============================================================
-- SCAN_FILTERS: per-user title include/exclude keyword lists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_filters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  positive_keywords TEXT[] NOT NULL DEFAULT '{}',
  negative_keywords TEXT[] NOT NULL DEFAULT '{}',
  seniority_boost TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scan_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_filters_select_own" ON public.scan_filters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scan_filters_insert_own" ON public.scan_filters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scan_filters_update_own" ON public.scan_filters FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FOLLOWUPS: follow-up contact log per application
-- ============================================================
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.resume_versions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'linkedin', 'phone', 'other')),
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followups_select_own" ON public.followups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "followups_insert_own" ON public.followups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "followups_update_own" ON public.followups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "followups_delete_own" ON public.followups FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_followups_version ON public.followups (version_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_user ON public.followups (user_id, sent_at DESC);

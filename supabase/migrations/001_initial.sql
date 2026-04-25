-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'power', 'team')),
  usage_month TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
  improvements_used INTEGER NOT NULL DEFAULT 0,
  roadmaps_used INTEGER NOT NULL DEFAULT 0,
  downloads_used INTEGER NOT NULL DEFAULT 0,
  team_wallet_paise INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resume versions
CREATE TABLE public.resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (company_type IN ('startup', 'enterprise', 'faang', 'agency', 'nonprofit')),
  ats_score INTEGER NOT NULL CHECK (ats_score BETWEEN 0 AND 100),
  job_fit_score INTEGER NOT NULL CHECK (job_fit_score BETWEEN 0 AND 100),
  career_level TEXT NOT NULL CHECK (career_level IN ('Junior', 'Mid', 'Senior', 'Executive')),
  original_resume TEXT NOT NULL,
  optimized_resume TEXT NOT NULL,
  keywords_matched TEXT[] NOT NULL DEFAULT '{}',
  keywords_missing TEXT[] NOT NULL DEFAULT '{}',
  skill_gaps JSONB NOT NULL DEFAULT '[]',
  outreach_email TEXT NOT NULL DEFAULT '',
  outreach_linkedin TEXT NOT NULL DEFAULT ''
);

-- Anonymous event log for funnel analytics
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  event TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'power', 'team')),
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  is_yearly BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Resume versions: users can read/write their own
CREATE POLICY "resume_versions_select_own" ON public.resume_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "resume_versions_insert_own" ON public.resume_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resume_versions_delete_own" ON public.resume_versions FOR DELETE USING (auth.uid() = user_id);

-- Events: anyone can insert (no read for users)
CREATE POLICY "events_insert_anon" ON public.events FOR INSERT WITH CHECK (true);

-- Orders: users can read their own
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reset usage_month on new month (called by cron or on-read check)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage_if_needed(profile_id UUID)
RETURNS VOID AS $$
DECLARE
  current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  UPDATE public.profiles
  SET
    usage_month = current_month,
    improvements_used = 0,
    roadmaps_used = 0,
    downloads_used = CASE WHEN plan = 'starter' THEN downloads_used ELSE 0 END
  WHERE id = profile_id AND usage_month != current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for history queries
CREATE INDEX idx_resume_versions_user_created ON public.resume_versions (user_id, created_at DESC);
CREATE INDEX idx_events_created ON public.events (created_at DESC);

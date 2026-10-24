-- Fix (audit item P1-7, idempotency): per-user log of monthly-reset
-- notification emails, so a repeated cron run does not re-send to
-- users who already got this month's email, while users whose send
-- failed (no log row) are still retried on the next run.
--
-- Usage (app/api/cron/monthly-reset/route.ts, service-role client):
--   1. Send the email.
--   2. On success only, INSERT (user_id, month) into this table.
--   3. On a later run, skip any (user_id, month) row that already
--      exists. The month key is the YYYY-MM of the cron run (the month
--      the credits reset into), matching the email's "just reset"
--      wording.
-- The table is service-role-only by design: RLS is enabled with no
-- user policies, so only the service client (which bypasses RLS) can
-- read/write it. A failed email is never logged, so it is retried;
-- a duplicate send is only possible if the email actually went out
-- but the log insert then failed, which is rarer and less harmful
-- than silently skipping a user who never got the email.
--
-- Applying this file to live Supabase is a separate step that still
-- needs the user's live access; committing the file alone does not
-- fix live.

CREATE TABLE IF NOT EXISTS public.monthly_reset_notifications (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

ALTER TABLE public.monthly_reset_notifications ENABLE ROW LEVEL SECURITY;

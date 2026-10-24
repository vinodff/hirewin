-- Fix (audit item P1-8, revocation): allowlist of revoked extension
-- tokens, checked by app/api/linkedin-optimize/route.ts after signature
-- and expiry verification.
--
-- Revocation paths (documented in lib/extension-token.ts):
--   * Single token: INSERT (jti, user_id) into this table. The token's
--     jti is in its payload; an operator can read it from a token the
--     user supplies (payload is base64url JSON, signature is not
--     needed to read jti) or from the user's connect-extension page
--     flow. Once inserted, linkedin-optimize rejects that token with
--     the same 401 as an invalid/expired token.
--   * All tokens: rotate EXTENSION_TOKEN_SECRET. Every token signed
--     with the old secret fails signature verification immediately.
-- The table is service-role-only by design: RLS is enabled with no
-- user policies, so only the service client (which bypasses RLS) can
-- read/write it.
--
-- Applying this file to live Supabase is a separate step that still
-- needs the user's live access; committing the file alone does not
-- fix live. Until 014 is applied live, revocation checks fail open
-- in the route only in the narrow sense that a missing table makes
-- the check error, and the route treats that as "not revoked" and
-- logs it — see the route comment. The expiry + dedicated-secret
-- changes in lib/extension-token.ts apply as soon as the code deploys,
-- with or without this table.

CREATE TABLE IF NOT EXISTS public.extension_token_revocations (
  jti TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

ALTER TABLE public.extension_token_revocations ENABLE ROW LEVEL SECURITY;

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/* Stateless connection token for the Chrome extension.
   The user generates one on /connect-extension (cookie-authed) and pastes it
   into the extension. The extension sends it as a Bearer token, which the API
   verifies without a DB lookup for signature/expiry, plus a revocation
   check in the route (see below).

   Format: base64url(JSON{uid,iat,exp,jti}) + "." + hex(HMAC-SHA256)

   Batch 2 security changes (P1-8) — BREAKING for old tokens, by design:
   - Signing secret is now ONLY EXTENSION_TOKEN_SECRET (dedicated).
     Previously it fell back to SUPABASE_SERVICE_ROLE_KEY and then
     ANTHROPIC_API_KEY, reusing secrets across purposes. secret()
     now throws fail-closed if EXTENSION_TOKEN_SECRET is missing.
     Tokens minted before this change were signed with the old secret
     and will stop verifying: affected users must reconnect the
     extension (mint a fresh token) after deploy. Set
     EXTENSION_TOKEN_SECRET in the deployment environment before
     deploying this change, or token minting will 500.
   - Tokens now expire: TOKEN_TTL_MS below (30 days). verifyToken()
     rejects expired tokens and tokens with an iat in the future
     (beyond a 60s clock-skew allowance). The linkedin-optimize
     error message already said "Invalid or expired", so no message
     change was needed there.
   - Token parsing is strict: exactly two dot-separated parts, a
     64-char hex signature, and a payload that decodes to an object
     with string uid/jti and numeric iat/exp. "payload.sig.extra"
     no longer verifies.
   - Revocation: two paths.
       1. Single token: INSERT (jti, user_id) into
          extension_token_revocations (migration 014). The route
          checks this via isTokenRevoked() after verifyToken().
          Until 014 is applied live, a missing table makes the
          check error; the route treats that as "not revoked" and
          logs it, so deploy order is code-then-migration-safe, but
          revocation is not effective live until 014 is applied.
       2. All tokens: rotate EXTENSION_TOKEN_SECRET. Every old
          token fails signature verification immediately.
   - Comparison remains constant-time (timingSafeEqual). */

export const EXTENSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CLOCK_SKEW_MS = 60 * 1000;

function secret(): string {
  const s = process.env.EXTENSION_TOKEN_SECRET;
  if (!s) throw new Error('No secret available to sign extension tokens');
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export type ExtensionToken = {
  userId: string;
  jti: string;
  issuedAt: number;
  expiresAt: number;
};

export function signToken(userId: string): string {
  const now = Date.now();
  const payload = b64url(Buffer.from(JSON.stringify({
    uid: userId,
    iat: now,
    exp: now + EXTENSION_TOKEN_TTL_MS,
    jti: crypto.randomUUID(),
  })));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/** Verify signature + expiry + strict shape. Returns null on any failure. */
export function verifyToken(token: string): ExtensionToken | null {
  try {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    if (!payload || !sig || !/^[0-9a-f]{64}$/.test(sig)) return null;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
    // constant-time compare
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(fromB64url(payload).toString('utf8'));
    if (!data || typeof data !== 'object') return null;
    if (typeof data.uid !== 'string' || !data.uid) return null;
    if (typeof data.jti !== 'string' || !data.jti) return null;
    if (typeof data.iat !== 'number' || typeof data.exp !== 'number') return null;
    const now = Date.now();
    if (data.iat > now + CLOCK_SKEW_MS) return null;
    if (data.exp <= now) return null;
    return { userId: data.uid, jti: data.jti, issuedAt: data.iat, expiresAt: data.exp };
  } catch {
    return null;
  }
}

/**
 * Revocation check (async, DB-backed). Returns true if the token's jti
 * is in extension_token_revocations for this user. On a DB error
 * (e.g. migration 014 not yet applied live) it logs and returns
 * false — expiry + signature still gate the token — and the caller
 * route logs the same, so the gap is visible, not silent. Once 014
 * is applied live, this check is authoritative for revoked tokens.
 */
export async function isTokenRevoked(
  db: SupabaseClient,
  userId: string,
  jti: string
): Promise<boolean> {
  try {
    const { data, error } = await db
      .from('extension_token_revocations')
      .select('jti')
      .eq('jti', jti)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('[extension-token] revocation check error:', error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error('[extension-token] revocation check threw:', e);
    return false;
  }
}

/** Revoke a single token by its jti (operator / future revoke endpoint). */
export async function revokeToken(
  db: SupabaseClient,
  userId: string,
  jti: string,
  reason?: string
): Promise<boolean> {
  const { error } = await db
    .from('extension_token_revocations')
    .insert({ jti, user_id: userId, reason: reason ?? null });
  if (error) {
    // Already revoked is still revoked.
    if ((error as { code?: string }).code === '23505') return true;
    console.error('[extension-token] revoke error:', error);
    return false;
  }
  return true;
}

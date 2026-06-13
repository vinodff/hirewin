import crypto from 'crypto';

/* Stateless connection token for the Chrome extension.
   The user generates one on /connect-extension (cookie-authed) and pastes it
   into the extension. The extension sends it as a Bearer token, which the API
   verifies without a DB lookup. Signed with the service role key (server-only).

   Format: base64url(JSON{uid,iat}) + "." + hex(HMAC-SHA256) */

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ANTHROPIC_API_KEY;
  if (!s) throw new Error('No secret available to sign extension tokens');
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function signToken(userId: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
    // constant-time compare
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(fromB64url(payload).toString('utf8'));
    return typeof data?.uid === 'string' ? data.uid : null;
  } catch {
    return null;
  }
}

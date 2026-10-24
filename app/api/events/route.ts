import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

// Batch 2 (P1-10): events was unauthenticated, un-rate-limited, and
// unvalidated — any event string and arbitrary JSONB could be
// inserted via the service client, and DB errors were hidden behind
// {ok: true} (or {ok: false} with HTTP 200 on catch). Now the server
// enforces the same allowlist the client types in lib/analytics.ts
// already declare, plus a session-hash shape and a payload size cap,
// a per-session rate limit, and honest statuses. The client
// (lib/analytics.ts) already swallows fetch failures, so a 400/429/
// 500 here never breaks the app UI.
const ALLOWED_EVENTS = new Set([
  'upload_started',
  'upload_complete',
  'analysis_started',
  'analysis_complete',
  'download_pdf',
  'download_docx',
  'history_viewed',
  'pricing_viewed',
  'payment_started',
  'payment_complete',
  'signup',
  'login',
]);

const MAX_SESSION_HASH_CHARS = 128;
const MAX_DATA_JSON_CHARS = 10_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { event, data, sessionHash } = body ?? {};

    if (!event || typeof event !== 'string' || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: 'invalid event' }, { status: 400 });
    }

    if (sessionHash !== undefined && sessionHash !== null && typeof sessionHash !== 'string') {
      return NextResponse.json({ ok: false, error: 'invalid sessionHash' }, { status: 400 });
    }
    const session_hash = (typeof sessionHash === 'string' && sessionHash)
      ? sessionHash.slice(0, MAX_SESSION_HASH_CHARS)
      : 'unknown';

    if (data !== undefined && data !== null && (typeof data !== 'object' || Array.isArray(data))) {
      return NextResponse.json({ ok: false, error: 'invalid data' }, { status: 400 });
    }
    if (data && JSON.stringify(data).length > MAX_DATA_JSON_CHARS) {
      return NextResponse.json({ ok: false, error: 'data too large' }, { status: 400 });
    }

    const { success } = await checkRateLimit(`events:${session_hash}`);
    if (!success) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createServiceClient();
    const { error } = await supabase.from('events').insert({
      session_hash,
      event,
      data: data ?? null,
    });

    if (error) {
      console.error('[events] insert error:', error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[events] error:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

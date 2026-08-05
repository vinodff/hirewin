import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Plan } from '@/types';
import { getEffectiveLimits } from '@/lib/usage';

const SHARES_NEEDED = 5;
const MAX_SHARES_STORED = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve a versionId from the request to a verified-owned UUID, or null.
 *  Critical: blocks paywall bypass by forging versionId strings. */
async function resolveOwnedVersionId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  raw: unknown
): Promise<string | null> {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) return null;
  const { data } = await supabase
    .from('resume_versions')
    .select('id')
    .eq('id', raw)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Count a user's shares for a version.
 *
 *  `.eq('version_id', null)` compiles to `version_id = NULL`, which is never
 *  true in SQL — so the no-version case always counted 0. That made the
 *  MAX_SHARES_STORED cap unreachable (unbounded row inserts) and pinned the
 *  displayed share count at 0. NULL needs `IS NULL`. */
function countShares(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  versionId: string | null
) {
  const q = supabase
    .from('share_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return versionId === null ? q.is('version_id', null) : q.eq('version_id', versionId);
}

export async function POST(req: NextRequest) {
  try {
    const { versionId: rawVersionId } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in to track shares' }, { status: 401 });
    }

    // SECURITY: only allow shares against versions the user owns.
    // Reject forged/foreign versionId — closes paywall bypass.
    const versionId = await resolveOwnedVersionId(supabase, user.id, rawVersionId);
    if (rawVersionId && !versionId) {
      return NextResponse.json({ error: 'Invalid version' }, { status: 400 });
    }

    const { count: existing } = await countShares(supabase, user.id, versionId);

    if ((existing ?? 0) >= MAX_SHARES_STORED) {
      const shareCount = Math.min(existing ?? 0, SHARES_NEEDED);
      return NextResponse.json({ shareCount, unlocked: shareCount >= SHARES_NEEDED });
    }

    await supabase.from('share_events').insert({
      user_id: user.id,
      version_id: versionId,
    });

    const shareCount = Math.min((existing ?? 0) + 1, SHARES_NEEDED);
    return NextResponse.json({ shareCount, unlocked: shareCount >= SHARES_NEEDED });
  } catch (e) {
    console.error('[share] error:', e);
    return NextResponse.json({ error: 'Failed to record share' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawVersionId = searchParams.get('versionId');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ shareCount: 0, unlocked: false, downloadsLeft: 0, planUnlimited: false, signedIn: false });
    }

    // SECURITY: filter share count to only versions the user owns.
    const versionId = await resolveOwnedVersionId(supabase, user.id, rawVersionId);

    const [{ count }, profileRes] = await Promise.all([
      countShares(supabase, user.id, versionId),
      supabase
        .from('profiles')
        .select('plan, downloads_used')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const shareCount = Math.min(count ?? 0, SHARES_NEEDED);
    const plan = (profileRes.data?.plan ?? 'free') as Plan;
    const downloadsUsed = profileRes.data?.downloads_used ?? 0;
    const limit = getEffectiveLimits(plan, user.email).downloads;
    const planUnlimited = limit === Infinity;
    const downloadsLeft = planUnlimited ? -1 : Math.max(0, limit - downloadsUsed);

    return NextResponse.json({
      shareCount,
      unlocked: shareCount >= SHARES_NEEDED,
      downloadsLeft,
      planUnlimited,
      signedIn: true,
    });
  } catch {
    return NextResponse.json({ shareCount: 0, unlocked: false, downloadsLeft: 0, planUnlimited: false, signedIn: false });
  }
}

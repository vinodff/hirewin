import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SHARES_NEEDED = 5;
// Allow at most 10 share events per version to prevent spam-clicking
const MAX_SHARES_STORED = 10;

export async function POST(req: NextRequest) {
  try {
    const { versionId } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Unauthenticated users can't earn server-side shares
    if (!user) {
      return NextResponse.json({ error: 'Sign in to track shares' }, { status: 401 });
    }

    // Count existing shares for this user+version
    const { count: existing } = await supabase
      .from('share_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('version_id', versionId ?? null);

    if ((existing ?? 0) >= MAX_SHARES_STORED) {
      // Already maxed out — return current count without inserting
      const shareCount = Math.min(existing ?? 0, SHARES_NEEDED);
      return NextResponse.json({ shareCount, unlocked: shareCount >= SHARES_NEEDED });
    }

    // Record the share
    await supabase.from('share_events').insert({
      user_id: user.id,
      version_id: versionId ?? null,
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
    const versionId = searchParams.get('versionId');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ shareCount: 0, unlocked: false });

    const { count } = await supabase
      .from('share_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('version_id', versionId ?? null);

    const shareCount = Math.min(count ?? 0, SHARES_NEEDED);
    return NextResponse.json({ shareCount, unlocked: shareCount >= SHARES_NEEDED });
  } catch {
    return NextResponse.json({ shareCount: 0, unlocked: false });
  }
}

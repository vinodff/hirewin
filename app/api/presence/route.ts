import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { path } = await req.json().catch(() => ({ path: null }));
  const userAgent = req.headers.get('user-agent')?.slice(0, 255) ?? null;

  await supabase
    .from('presence')
    .upsert({
      user_id: user.id,
      last_seen_at: new Date().toISOString(),
      path: typeof path === 'string' ? path.slice(0, 255) : null,
      user_agent: userAgent,
    });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { event, data, sessionHash } = await req.json();

    if (!event || typeof event !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createServiceClient();
    await supabase.from('events').insert({
      session_hash: sessionHash ?? 'unknown',
      event,
      data: data ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never break the app
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 15;

const MAX_RESUME_CHARS = 20_000;

/* Save the resume + target role the user entered on /linkedin-optimizer so the
   Chrome extension can optimize their LinkedIn profile against it. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.resumeText === 'string' && body.resumeText.trim()) {
    update.cv_text = body.resumeText.trim().slice(0, MAX_RESUME_CHARS);
  }
  if (typeof body.targetRole === 'string' && body.targetRole.trim()) {
    update.target_roles = [body.targetRole.trim().slice(0, 120)];
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to save' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) {
    console.error('[linkedin-prefs]', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

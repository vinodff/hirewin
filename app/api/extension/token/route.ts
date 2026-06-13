import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/extension-token';

/* Mint a connection token for the Chrome extension. Cookie-authed (called
   from the /connect-extension page where the user is logged in). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  return NextResponse.json({
    token: signToken(user.id),
    email: user.email ?? '',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCreditsResetEmail } from '@/lib/email';
import { PLAN_LIMITS } from '@/types';

export const maxDuration = 60;

// Vercel Cron: runs at 08:00 UTC on the 1st of every month
// vercel.json: { "crons": [{ "path": "/api/cron/monthly-reset", "schedule": "0 8 1 * *" }] }

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron (or our own CRON_SECRET)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-05"
  const prevMonthStr = (() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  // Fetch users who were active last month (usage_month = last month)
  // These users had their credits consumed and are being reset
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email: id, full_name, plan, improvements_used, usage_month')
    .eq('usage_month', prevMonthStr)
    .neq('plan', 'team'); // team plan users don't need reset emails

  if (error) {
    console.error('[monthly-reset] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No eligible profiles' });
  }

  // Fetch the actual emails from auth.users via service role
  const userIds = profiles.map((p: { id: string }) => p.id);
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, { email: u.email ?? '', name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? '' }])
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const profile of profiles as Array<{ id: string; full_name: string | null; plan: string; improvements_used: number; usage_month: string }>) {
    const auth = emailMap.get(profile.id);
    if (!auth?.email) continue;

    const freeCredits = PLAN_LIMITS[profile.plan as keyof typeof PLAN_LIMITS]?.improvements ?? 2;
    // Cap at a reasonable display number; Infinity plans get Infinity but show as "unlimited"
    const creditsDisplay = freeCredits === Infinity ? 20 : freeCredits;
    const name = profile.full_name || auth.name || auth.email.split('@')[0];

    try {
      await sendCreditsResetEmail({
        to: auth.email,
        name,
        usedLast: profile.improvements_used,
        freeCredits: creditsDisplay,
      });
      sent++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${auth.email}: ${msg}`);
      console.error('[monthly-reset] email failed:', auth.email, msg);
    }

    // Small delay to stay within Resend rate limits (2 req/s on free tier)
    await new Promise((r) => setTimeout(r, 600));
  }

  return NextResponse.json({ sent, failed, total: profiles.length, errors: errors.slice(0, 10) });
}

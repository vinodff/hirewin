import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendCreditsResetEmail } from '@/lib/email';
import { PLAN_LIMITS } from '@/types';

export const maxDuration = 60;

// Vercel Cron: runs at 08:00 UTC on the 1st of every month
// vercel.json: { "crons": [{ "path": "/api/cron/monthly-reset", "schedule": "0 8 1 * *" }] }
//
// HONESTY NOTE (batch 2, P1-7): despite the route name, this route does
// NOT reset usage. It only sends "credits reset" notification emails.
// The real reset is lazy: reset_monthly_usage_if_needed is called on
// analyze, download, and job-scan reads, and only then do counters
// zero for the new month. Renaming the URL would break the Vercel
// cron schedule, so the route keeps its path but its comment, response
// shape (resetPerformed: false), and this note say what it actually
// does. If a true server-side reset is wanted later, it must be a
// separate, explicitly-named job that updates profiles, not this email
// sender.

const PROFILES_PAGE_SIZE = 1000;
const USERS_PAGE_SIZE = 100;

type ProfileRow = {
  id: string;
  full_name: string | null;
  plan: string;
  improvements_used: number;
  usage_month: string;
};

async function fetchAllProfiles(
  supabase: SupabaseClient,
  prevMonthStr: string
): Promise<ProfileRow[]> {
  const all: ProfileRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, plan, improvements_used, usage_month')
      .eq('usage_month', prevMonthStr)
      .neq('plan', 'team') // team plan users don't need reset emails
      .range(offset, offset + PROFILES_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as ProfileRow[]));
    if (data.length < PROFILES_PAGE_SIZE) break;
    offset += PROFILES_PAGE_SIZE;
  }
  return all;
}

async function fetchAllUserEmails(
  supabase: SupabaseClient
): Promise<Map<string, { email: string; name: string }>> {
  const emailMap = new Map<string, { email: string; name: string }>();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      emailMap.set(u.id, {
        email: u.email ?? '',
        name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? '',
      });
    }
    if (users.length < USERS_PAGE_SIZE) break;
    page += 1;
  }
  return emailMap;
}

export async function GET(req: NextRequest) {
  // Fail closed (P1-7): previously, if CRON_SECRET was unset, ANY
  // unauthenticated GET ran the whole job. Now a missing secret is
  // itself a 401, and a mismatched secret is a 401.
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

  let profiles: ProfileRow[];
  let emailMap: Map<string, { email: string; name: string }>;
  try {
    profiles = await fetchAllProfiles(supabase, prevMonthStr);
    emailMap = await fetchAllUserEmails(supabase);
  } catch (error) {
    console.error('[monthly-reset] fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  if (profiles.length === 0) {
    return NextResponse.json({
      sent: 0,
      skippedAlreadySent: 0,
      failed: 0,
      total: 0,
      resetPerformed: false,
      message: 'No eligible profiles',
    });
  }

  // Idempotency (P1-7, migration 013): a user who already has a
  // (user_id, currentMonth) row in monthly_reset_notifications is
  // skipped, so a repeated cron run never re-sends to them. A user
  // whose email failed gets no row, so they are retried next run.
  // The log row is written only AFTER a successful send, for the
  // same reason: logging before sending would skip a user whose
  // email actually failed.
  const { data: alreadySentRows } = await supabase
    .from('monthly_reset_notifications')
    .select('user_id')
    .eq('month', currentMonth);
  const alreadySent = new Set((alreadySentRows ?? []).map((r: { user_id: string }) => r.user_id));

  let sent = 0;
  let skippedAlreadySent = 0;
  let failed = 0;

  for (const profile of profiles) {
    if (alreadySent.has(profile.id)) {
      skippedAlreadySent += 1;
      continue;
    }

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
      // Log only on success (see idempotency note above). A log
      // failure is recorded server-side and counted as failed, so
      // the next run retries rather than silently dropping the user.
      const { error: logError } = await supabase
        .from('monthly_reset_notifications')
        .insert({ user_id: profile.id, month: currentMonth });
      if (logError) {
        console.error('[monthly-reset] log insert failed:', profile.id, logError);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      // Email addresses are logged server-side only, never returned
      // in the response (previously up to 10 were returned).
      console.error('[monthly-reset] email failed:', auth.email, msg);
    }

    // Small delay to stay within Resend rate limits (2 req/s on free tier)
    await new Promise((r) => setTimeout(r, 600));
  }

  return NextResponse.json({
    sent,
    skippedAlreadySent,
    failed,
    total: profiles.length,
    resetPerformed: false,
    resetPath: 'lazy reset_monthly_usage_if_needed on analyze/download/job-scan reads',
  });
}

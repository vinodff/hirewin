/**
 * Admin actions on a single opportunity, plus "Run now".
 *
 * Separated from the read route so the polling GET stays a pure read and can
 * never be confused with a mutation — the console hits it four times a minute.
 *
 * Every action revalidates /opportunities, because all of them change what the
 * public page shows. That is the "automatically push to the website" half: an
 * admin removing a bad listing sees it gone from the live site immediately
 * rather than at the next hourly revalidation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { checkLiveness } from '@/lib/opportunities/liveness';
import { inspectApplyUrl } from '@/lib/opportunities/apply-link';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Action = 'remove' | 'restore' | 'approve' | 'recheck' | 'run';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: { action?: Action; id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const { action, id } = body;
  if (!action) return NextResponse.json({ error: 'No action given.' }, { status: 400 });

  const sb = await createServiceClient();

  // --- Run now -------------------------------------------------------------
  if (action === 'run') {
    /*
     * Calls the cron route rather than duplicating its three stages.
     *
     * `manual=1` makes it ignore both the schedule and the pause switch, and
     * record itself under the `manual` trigger so the ledger never conflates an
     * admin pressing a button with the scheduler firing. It carries CRON_SECRET
     * because that route's auth is the secret, not a session — which is exactly
     * what we want: one door, one check.
     */
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'CRON_SECRET is not configured, so the agent cannot be triggered.' },
        { status: 500 }
      );
    }

    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      new URL(req.url).origin;

    try {
      const response = await fetch(`${base}/api/cron/opportunities?manual=1`, {
        headers: { authorization: `Bearer ${secret}` },
        // A full run can take minutes; this route's own budget is 60s, so the
        // caller is told it started rather than being held open until it ends.
        signal: AbortSignal.timeout(55_000),
      });
      const result = await response.json();
      revalidatePath('/opportunities');
      return NextResponse.json({ ok: response.ok, result });
    } catch (error) {
      // A timeout here does NOT mean the run failed — it means it outlived this
      // request. The console polls, so the ledger will show the outcome.
      return NextResponse.json({
        ok: true,
        started: true,
        note: 'Run started. It is still going; this page will show the result when it finishes.',
        detail: (error as Error).message,
      });
    }
  }

  if (!id) return NextResponse.json({ error: 'No opportunity id given.' }, { status: 400 });

  // --- Remove --------------------------------------------------------------
  if (action === 'remove') {
    /*
     * Soft, like every other removal in this schema. `retired_by` is what makes
     * it a human decision rather than a crawler verdict, and the ingest path
     * must never silently undo it — see the note in ingest.ts about a returning
     * row clearing a stale retirement.
     */
    const { error } = await sb
      .from('opportunities')
      .update({
        retired_at: new Date().toISOString(),
        // The DB CHECK refuses a retirement with no reason.
        retired_reason: body.reason?.trim()
          ? `Removed by ${admin.email}: ${body.reason.trim().slice(0, 300)}`
          : `Removed by ${admin.email}`,
        retired_by: admin.id,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/opportunities');
    return NextResponse.json({ ok: true });
  }

  // --- Restore -------------------------------------------------------------
  if (action === 'restore') {
    const { error } = await sb
      .from('opportunities')
      .update({ retired_at: null, retired_reason: null, retired_by: null, check_failures: 0 })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/opportunities');
    return NextResponse.json({ ok: true });
  }

  // --- Approve a held row --------------------------------------------------
  if (action === 'approve') {
    /*
     * Promotes `pending` to `verified`.
     *
     * The database still has the final say: the CHECK in 013 refuses a verified
     * row on an `unknown` or `blocked` source tier, so an admin cannot approve a
     * link shortener even deliberately. Approving is allowed to overrule the
     * pipeline's caution, not its hard floor.
     */
    const { error } = await sb
      .from('opportunities')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      const friendly = error.message.includes('opportunities_verified_needs_trusted_source')
        ? 'This cannot be published: its source domain is not a known employer, ATS or job board.'
        : error.message;
      return NextResponse.json({ error: friendly }, { status: 400 });
    }
    revalidatePath('/opportunities');
    return NextResponse.json({ ok: true });
  }

  // --- Re-check one link on demand ----------------------------------------
  if (action === 'recheck') {
    const { data: row, error: readError } = await sb
      .from('opportunities')
      .select('id, apply_url, check_failures')
      .eq('id', id)
      .single();

    if (readError || !row) {
      return NextResponse.json({ error: readError?.message ?? 'Not found.' }, { status: 404 });
    }

    const result = await checkLiveness(row.apply_url as string);
    const link = inspectApplyUrl(row.apply_url as string);

    /*
     * A manual re-check reports; it does not retire.
     *
     * The two-strike rule exists because one bad response is not proof, and a
     * button that deletes a real listing on a single timeout would be worse
     * than no button. The admin reads the verdict and decides.
     */
    const { error: writeError } = await sb
      .from('opportunities')
      .update({
        last_checked_at: result.checkedAt,
        last_check_result: result.verdict,
        is_direct_apply: link.direct,
      })
      .eq('id', id);

    if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      verdict: result.verdict,
      evidence: result.evidence,
      httpStatus: result.httpStatus,
      directApply: link.direct,
      linkReason: link.reason,
    });
  }

  return NextResponse.json({ error: `Unknown action "${action}".` }, { status: 400 });
}

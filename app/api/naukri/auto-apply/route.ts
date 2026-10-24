import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { sessionDirForUser } from '@/lib/naukri/safety';
import { applyToNaukriJob, type AutoApplyResult } from '@/lib/naukri/headless-applier';
import { validateApplicantVault, type RealApplicantVault } from '@/lib/naukri/profile-vault';
import type { NaukriJobListing } from '@/lib/naukri/types';
import { localRunnerVerdict } from '@/lib/apply/local-only';

export const maxDuration = 300; // Allow sufficient time for multi-job background applications
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  /*
   * Superseded by /api/apply/runs (lib/apply). Kept reachable only locally:
   * with authentication relaxed, this launched browsers and submitted real
   * applications for any caller who could reach the URL.
   */
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.reason }, { status: 403 });
  }
  try {
    const body = await req.json();
    const {
      jobs,
      vault,
      dryRun = false,
      maxJobs = 5,
      testMode = false,
    }: {
      jobs: NaukriJobListing[];
      vault: RealApplicantVault;
      dryRun?: boolean;
      maxJobs?: number;
      testMode?: boolean;
    } = body;

    /*
     * Authentication – relaxed for testing: allow unauthenticated access
     * with IP-based rate limiting as fallback. A fallback 'test-user' ID
     * is used for session directory and DB writes when no user is present.
     */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const userId = user?.id ?? `test-user-${ip}`;
    const rateLimitKey = user ? `auto-apply:${user.id}` : `auto-apply:ip:${ip}`;
    const { success } = await checkRateLimit(rateLimitKey, {
      failClosed: true,
    });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before starting another auto-apply session.' },
        { status: 429 }
      );
    }
    void clientIp;

    // 3. Validate Real Data Vault
    const validation = validateApplicantVault(vault || {});
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Applicant profile validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json(
        { error: 'At least one target job is required to auto-apply.' },
        { status: 400 }
      );
    }

    /*
     * Clamp to a sane count.
     *
     * `Math.min(maxJobs, 10)` alone let a negative through, and
     * `slice(0, -5)` removes the LAST five entries rather than taking five —
     * so a negative maxJobs silently applied to a different set of jobs than
     * the caller named. Floor it at 1 and drop non-numbers.
     */
    const requested = Number.isFinite(maxJobs) ? Math.floor(maxJobs) : 5;
    const limit = Math.max(1, Math.min(requested, 10));
    const targetJobs = jobs.slice(0, limit);
    const results: AutoApplyResult[] = [];

    console.log(`[naukri/auto-apply] Starting background auto-apply for ${targetJobs.length} jobs. DryRun: ${dryRun}, TestMode: ${testMode}`);

    // Run sequentially in background
    for (const job of targetJobs) {
      try {
        const res = await applyToNaukriJob({
          job,
          vault,
          dryRun: dryRun || testMode,
          headless: true, // silent background execution
          // Per-user browser profile. Omitting this used to fall back to one
          // shared directory, so whoever logged into Naukri last was who
          // everyone else applied as.
          sessionDir: sessionDirForUser(userId),
        });

        // When Naukri requires login, ensure the status remains truthfully 'requires_login'
        if (res.status === 'requires_login') {
          res.message = 'Naukri account login required. The automated browser is not signed into Naukri. Connect your Naukri account or click "View Job on Naukri" to apply directly.';
        }

        // Attach job URL and test mode metadata
        (res as any).jobUrl = job.jobUrl;
        if (testMode || !user) {
          (res as any).isTestMode = true;
        }

        // Map filesystem proofScreenshotPath to HTTP API URL for web browser display
        if (res.proofScreenshotPath) {
          const fileName = path.basename(res.proofScreenshotPath);
          res.proofScreenshotPath = `/api/naukri/proof?file=${encodeURIComponent(fileName)}`;
        }

        results.push(res);

        // Record in Supabase/history if applied or form filled (only for authenticated users)
        if (user && (res.status === 'applied' || res.status === 'form_filled' || res.status === 'external_redirect')) {
          try {
            {
              // 1. Record in scan_history
              await supabase.from('scan_history').upsert(
                {
                  user_id: user.id,
                  job_url: job.jobUrl,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                },
                { onConflict: 'user_id,job_url' }
              );

              // 2. Record application in resume_versions with compliant schema
              await supabase.from('resume_versions').insert({
                user_id: user.id,
                role: job.title,
                company: job.company,
                // NULL, not 85 and 88.
                //
                // Those were hardcoded, and they landed in resume_versions —
                // the same table a real analysis writes to, rendered by the
                // same history UI. /api/analyze computes ATS scores
                // deterministically in lib/ats-score.ts precisely because
                // model-generated numbers "anchored on the prompt's example
                // numbers and returned the same 85-90 every run". A literal 85
                // beside those is that failure with none of the excuse: a
                // number nobody measured, indistinguishable from one somebody
                // did. company_type was 'startup' for every employer alive.
                company_type: null,
                ats_score: null,
                job_fit_score: null,
                career_level: vault.totalExperienceYears === 0 ? 'Junior' : 'Mid',
                original_resume: `${vault.fullName}\nSkills: ${vault.skills.join(', ')}\nLocation: ${vault.currentLocation}`,
                optimized_resume: `${vault.fullName}\nRole: ${job.title}\nCompany: ${job.company}\nApplied via Naukri Background Engine`,
                application_status: res.status === 'applied' ? 'applied' : 'evaluated',
                applied_at: res.status === 'applied' ? new Date().toISOString() : null,
                pipeline_note: `Auto-applied via HireWin background engine. ${res.filledFields.length > 0 ? `Fields filled: ${res.filledFields.join(', ')}` : ''}`,
              });
            }
          } catch (dbErr) {
            console.warn('[naukri/auto-apply] Failed to write to history database (ignoring):', dbErr);
          }
        }
      } catch (jobErr) {
        console.error(`[naukri/auto-apply] Failed job ${job.id}:`, jobErr);
        results.push({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          status: 'error',
          message: jobErr instanceof Error ? jobErr.message : 'Application execution failed',
          filledFields: [],
          durationMs: 0,
        });
      }
    }

    /*
     * Only `applied` counts. `form_filled` is a dry run and `needs_review`
     * means nothing was submitted — counting either as "successfully applied"
     * is the same lie the applier used to tell, moved up one layer.
     */
    const appliedCount = results.filter((r) => r.status === 'applied').length;
    const needsReviewCount = results.filter((r) => r.status === 'needs_review').length;

    return NextResponse.json({
      success: true,
      message:
        `Processed ${results.length} jobs. ${appliedCount} submitted` +
        (needsReviewCount > 0 ? `, ${needsReviewCount} need a human before they can be sent.` : '.'),
      appliedCount,
      needsReviewCount,
      results,
    });
  } catch (error) {
    console.error('[naukri/auto-apply] Server error:', error);
    const message = error instanceof Error ? error.message : 'Background auto-apply encountered an error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

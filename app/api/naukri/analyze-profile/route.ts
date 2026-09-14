import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { analyzeResumeForNaukri, buildNaukriSearchStrategy } from '@/lib/naukri/resume-analyzer';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    /*
     * Authentication first. This route reaches a PAID model, so an
     * unauthenticated caller is an unmetered Anthropic bill with a public
     * endpoint attached.
     */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to use this feature.' }, { status: 401 });
    }

    // Fails CLOSED: a Redis outage must not turn a paid-model endpoint into
    // an open bar, which is the rule /api/analyze already follows.
    const { success } = await checkRateLimit(`naukri-analyze:${user.id}`, { failClosed: true });
    if (!success) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Valid resume text is required (minimum 50 characters).' },
        { status: 400 }
      );
    }

    const profile = await analyzeResumeForNaukri(resumeText);
    const searchStrategy = buildNaukriSearchStrategy(profile);

    return NextResponse.json({
      success: true,
      profile,
      searchStrategy,
    });
  } catch (error) {
    console.error('[naukri/analyze-profile] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze resume profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

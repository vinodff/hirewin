import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { optimizeLinkedIn, type LinkedInProfileInput } from '@/lib/linkedin';
import { logUsage } from '@/lib/usage-log';

export const maxDuration = 60;

const MAX_FIELD_CHARS = 12_000;

function clamp(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, MAX_FIELD_CHARS);
}

export async function POST(req: NextRequest) {
  try {
    // --- Auth ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    // --- Rate limit ---
    const { success } = await checkRateLimit(`linkedin-optimize:${user.id}`);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Try again in an hour.' }, { status: 429 });
    }

    // --- Plan (gates About + Experience rewrites) ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    const plan = (profile?.plan ?? 'free') as string;
    const freeTier = plan === 'free';

    // --- Parse + sanitize input ---
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const rawExp = Array.isArray(body.experience) ? body.experience.slice(0, 10) : [];
    const experience = rawExp
      .map((e: Record<string, unknown>) => ({
        title: clamp(e?.title),
        company: clamp(e?.company),
        description: clamp(e?.description),
      }))
      .filter((e: { title?: string; company?: string }) => e.title || e.company);

    const input: LinkedInProfileInput = {
      name: clamp(body.name),
      headline: clamp(body.headline),
      about: clamp(body.about),
      experience,
      skills: Array.isArray(body.skills)
        ? body.skills.map((s: unknown) => clamp(s)).filter(Boolean).slice(0, 60) as string[]
        : undefined,
      education: clamp(body.education),
      resumeText: clamp(body.resumeText),
      targetRole: clamp(body.targetRole),
      jobDescription: clamp(body.jobDescription),
    };

    // Need at least something to work with
    const hasInput = input.headline || input.about || input.experience?.length || input.skills?.length || input.resumeText;
    if (!hasInput) {
      return NextResponse.json({ error: 'Paste at least your headline, about, or experience to optimize.' }, { status: 400 });
    }

    const { result, usage } = await optimizeLinkedIn(input, { freeTier });

    // Best-effort usage logging (don't block on failure)
    await logUsage({
      userId: user.id,
      endpoint: 'linkedin-optimize',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    });

    return NextResponse.json({
      result,
      locked: freeTier, // frontend shows upgrade CTA for About + Experience
    });
  } catch (err) {
    console.error('[linkedin-optimize]', err);
    return NextResponse.json({ error: 'Failed to optimize profile. Please try again.' }, { status: 500 });
  }
}

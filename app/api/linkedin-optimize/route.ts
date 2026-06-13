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

/* CORS — the Chrome extension calls this endpoint from its background service
   worker (origin: chrome-extension://<id>). Echo that origin and allow
   credentials so the user's hirewin.live session cookie authenticates them. */
function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && origin.startsWith('chrome-extension://')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
  }
  return {};
}

function withCors(res: NextResponse, origin: string | null): NextResponse {
  for (const [k, v] of Object.entries(corsHeaders(origin))) res.headers.set(k, v);
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    // --- Auth ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return withCors(NextResponse.json({ error: 'Sign in required' }, { status: 401 }), origin);

    // --- Rate limit ---
    const { success } = await checkRateLimit(`linkedin-optimize:${user.id}`);
    if (!success) {
      return withCors(NextResponse.json({ error: 'Too many requests. Try again in an hour.' }, { status: 429 }), origin);
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
      return withCors(NextResponse.json({ error: 'Invalid request body' }, { status: 400 }), origin);
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

    // Auto-load the user's latest HireWin resume as context when the caller
    // didn't supply one (e.g. the Chrome extension). Resume is the source of truth.
    if (!input.resumeText) {
      const { data: latest } = await supabase
        .from('resume_versions')
        .select('optimized_resume, original_resume')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const resume = (latest?.optimized_resume || latest?.original_resume || '').trim();
      if (resume) input.resumeText = resume.slice(0, MAX_FIELD_CHARS);
    }

    // Need at least something to work with
    const hasInput = input.headline || input.about || input.experience?.length || input.skills?.length || input.resumeText;
    if (!hasInput) {
      return withCors(NextResponse.json({ error: 'Paste at least your headline, about, or experience to optimize.' }, { status: 400 }), origin);
    }

    const { result, usage } = await optimizeLinkedIn(input, { freeTier });

    // Best-effort usage logging (don't block on failure)
    await logUsage({
      userId: user.id,
      endpoint: 'linkedin-optimize',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    });

    return withCors(NextResponse.json({
      result,
      locked: freeTier, // frontend shows upgrade CTA for About + Experience
    }), origin);
  } catch (err) {
    console.error('[linkedin-optimize]', err);
    return withCors(NextResponse.json({ error: 'Failed to optimize profile. Please try again.' }, { status: 500 }), origin);
  }
}

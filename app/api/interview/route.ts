import { NextRequest, NextResponse } from 'next/server';
import { route, extractJson } from '@/lib/ai/router';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isPaidUserPlan } from '@/lib/usage';
import type { Plan } from '@/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const MAX_RESUME_CHARS = 20_000;
const MAX_JD_CHARS = 10_000;

const INTERVIEW_SYSTEM = `You are an expert interview coach. Given a candidate's resume and job details, generate 8 interview questions across 4 categories with sample answers.

Return ONLY valid JSON in this exact shape:
{
  "questions": [
    {
      "category": "Behavioral" | "Technical" | "Role-Specific" | "Culture & Motivation",
      "question": "...",
      "tip": "One-line coaching tip (how to approach this question)",
      "sampleAnswer": "2-3 sentence model answer tailored to the candidate's background"
    }
  ]
}

Guidelines:
- 2 Behavioral (STAR-method questions about past experience)
- 2 Technical (skill/knowledge questions matching the JD requirements)
- 2 Role-Specific (scenario questions about the actual job tasks)
- 2 Culture & Motivation (why this company/role, career goals)
- Sample answers should reference the candidate's actual experience from their resume
- Keep each sample answer to 2-3 sentences — concise and punchy
- Tip should be ≤ 12 words`;

export async function POST(req: NextRequest) {
  try {
    // --- Auth ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    // --- Paid plan gate ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();

    const plan = (profile?.plan ?? 'free') as Plan;
    if (!isPaidUserPlan(plan, user.email)) {
      return NextResponse.json(
        { error: 'Pro feature. Please upgrade your plan to unlock interview question preparation.' },
        { status: 402 }
      );
    }

    // --- Rate limit ---
    const { success } = await checkRateLimit(`interview:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests. Try again in an hour.' }, { status: 429 });

    const { resumeText, role, company, jdText } = await req.json();

    if (typeof resumeText !== 'string' || typeof role !== 'string' || typeof company !== 'string' ||
        !resumeText.trim() || !role.trim() || !company.trim()) {
      return NextResponse.json({ error: 'resumeText, role, and company are required.' }, { status: 400 });
    }
    if (resumeText.length > MAX_RESUME_CHARS) {
      return NextResponse.json({ error: 'Resume too long' }, { status: 413 });
    }
    if (typeof jdText === 'string' && jdText.length > MAX_JD_CHARS) {
      return NextResponse.json({ error: 'Job description too long' }, { status: 413 });
    }

    const userMsg = `Resume:\n${resumeText}\n\nRole: ${role}\nCompany: ${company}${jdText ? `\n\nJob Description:\n${jdText}` : ''}`;

    const result = await route('interview-question', {
      messages: [
        { role: 'system', content: INTERVIEW_SYSTEM },
        { role: 'user', content: userMsg },
      ],
    });

    const parsed = extractJson(result.text);
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'AI returned malformed response' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[interview]', e);
    return NextResponse.json({ error: 'Failed to generate questions. Try again.' }, { status: 500 });
  }
}

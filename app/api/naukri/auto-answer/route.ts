import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, CHEAP_MODEL_NAME } from '@/lib/anthropic';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobTitle, company, question, questionType } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    /*
     * Authentication – relaxed for testing: allow unauthenticated access
     * with IP-based rate limiting as fallback.
     */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const rateLimitKey = user ? `auto-answer:${user.id}` : `auto-answer:ip:${ip}`;
    const { success } = await checkRateLimit(rateLimitKey, { failClosed: true });
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const anthropic = getAnthropicClient();

    const prompt = `You are an AI application assistant helping a candidate apply for a job on Naukri.com.
Job Title: ${jobTitle || 'Software Engineer'}
Company: ${company || 'Hiring Company'}

Candidate's Resume Context:
${(resumeText || '').slice(0, 4000)}

Recruiter's Screening Question:
"${question}"

Instructions:
1. Provide a concise, highly professional, direct answer grounded STRICTLY in the candidate's resume.
2. If the candidate is a fresher / student and the question asks about years of experience, answer honestly (e.g., "0 years full-time, but 1+ years building hands-on production-grade projects in [relevant tech]").
3. If it is a multiple-choice question, return the best matching option.
4. Keep the answer under 3-4 sentences. Do NOT include greetings, placeholders, or preamble.

Format your response as a JSON object:
{
  "suggestedAnswer": "the exact answer text to fill in the form field",
  "confidenceScore": 95
}`;

    const res = await anthropic.messages.create({
      model: CHEAP_MODEL_NAME,
      max_tokens: 300,
      system: 'Return only valid JSON without markdown formatting.',
      messages: [{ role: 'user', content: prompt }],
    });

    // res.content can come back empty; `res.content[0].type` then throws and
    // lands in the catch, which used to answer the recruiter anyway.
    const first = res.content[0];
    const raw = first && first.type === 'text' ? first.text : '';
    if (!raw.trim()) {
      return NextResponse.json(
        { success: false, error: 'The model returned nothing. Please answer this question yourself.' },
        { status: 502 }
      );
    }
    const clean = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({
      success: true,
      question,
      suggestedAnswer: parsed.suggestedAnswer || '',
      // `??`, not `||`: a model reporting confidence 0 means "I do not know",
      // and `||` silently rewrote that to 85.
      confidenceScore: parsed.confidenceScore ?? null,
    });
  } catch (err) {
    console.error('[naukri/auto-answer] Error:', err);
    /*
     * FAILS as a failure. It used to return HTTP 200 with success: true, a
     * canned sentence, and confidenceScore: 70.
     *
     * Every error path landed there — model outage, bad key, rate limit,
     * unparseable JSON — and the caller could not tell a real answer from a
     * total failure. The canned sentence then went into a recruiter's
     * screening question as the candidate's own words, and the 70 was a
     * confidence figure for an answer no model had produced.
     *
     * No answer is recoverable. A wrong answer submitted under someone's name
     * is not.
     */
    return NextResponse.json(
      {
        success: false,
        error: 'Could not generate an answer. Please answer this question yourself.',
      },
      { status: 502 }
    );
  }
}

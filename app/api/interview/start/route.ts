import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const START_SYSTEM = `You are a professional recruiter conducting a live job interview. You are warm, curious, and direct.

Given the candidate's resume and the role they're applying for, ask the FIRST interview question.

Start with a variation of "Tell me about yourself" or ask about their background — but make it feel personal and specific to the role and company. Do NOT say "Welcome" or "Thank you for your interest." Just ask the question naturally.

Return ONLY valid JSON (no markdown, no preamble):
{ "question": "..." }

The question must be 1–2 sentences. Conversational, not corporate.`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { success } = await checkRateLimit(`interview-voice:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });

    const { resumeText, role, company, jdText } = await req.json();

    if (!resumeText?.trim() || !role?.trim() || !company?.trim()) {
      return NextResponse.json({ error: 'resumeText, role, and company are required.' }, { status: 400 });
    }

    const userMsg = [
      `Role: ${role} at ${company}`,
      `Resume:\n${String(resumeText).slice(0, 8000)}`,
      jdText ? `Job Description:\n${String(jdText).slice(0, 4000)}` : '',
    ].filter(Boolean).join('\n\n');

    const message = await getAnthropicClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: START_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: { question: string };
    try { parsed = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: 'AI returned malformed response.' }, { status: 500 }); }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[interview/start]', e);
    return NextResponse.json({ error: 'Failed to start interview.' }, { status: 500 });
  }
}

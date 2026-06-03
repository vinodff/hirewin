import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const NEXT_SYSTEM = `You are a professional recruiter conducting a live job interview. You are adaptive, sharp, and human.

Based on the interview conversation so far, decide your next move:
- If the candidate gave a vague or weak answer, probe deeper with a targeted follow-up
- If they gave a strong answer, acknowledge it briefly and move on to a new area
- Cover a natural mix across: past experience, technical skills, situational judgment, cultural fit, motivation
- Questions must feel like a real recruiter asking them — conversational, not scripted
- After exactly 6 questions total have been asked (check questionNumber), signal the interview is complete

Return ONLY valid JSON (no markdown):
{ "question": "next question here", "done": false }

When it's time to end (questionNumber >= 6), return:
{ "question": "", "done": true }

Keep questions to 1–2 sentences. Do NOT repeat topics already covered well.`;

type QAPair = { question: string; answer: string };

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { success } = await checkRateLimit(`interview-voice:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { history, resumeText, role, company, jdText, questionNumber } = await req.json();

    if (!Array.isArray(history) || !resumeText?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Hard cap — no need to call AI
    if (Number(questionNumber) >= 6) {
      return NextResponse.json({ question: '', done: true });
    }

    const historyText = (history as QAPair[])
      .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
      .join('\n\n');

    const userMsg = [
      `Role: ${role} at ${company}`,
      `Resume:\n${String(resumeText).slice(0, 6000)}`,
      jdText ? `JD:\n${String(jdText).slice(0, 3000)}` : '',
      `\n--- INTERVIEW SO FAR (${questionNumber} questions asked) ---\n${historyText}`,
      `\nAsk question ${Number(questionNumber) + 1}. If questionNumber >= 6, return done: true.`,
    ].filter(Boolean).join('\n\n');

    const message = await getAnthropicClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: NEXT_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: { question: string; done: boolean };
    try { parsed = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: 'AI returned malformed response.' }, { status: 500 }); }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[interview/next]', e);
    return NextResponse.json({ error: 'Failed to get next question.' }, { status: 500 });
  }
}

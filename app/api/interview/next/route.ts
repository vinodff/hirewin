import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const MIN_Q = 4;   // never end before this many
const MAX_Q = 10;  // hard ceiling — force end here

const NEXT_SYSTEM = `You are a professional recruiter conducting a live job interview. You are adaptive, sharp, and human.

YOU decide how long the interview runs — just like a real recruiter. A focused candidate who covers everything well might finish in ${MIN_Q}–6 questions; someone with gaps worth probing might go to 8–${MAX_Q}. Let the conversation dictate the length, not a fixed script.

Based on the interview conversation so far, decide your next move:
- If the candidate gave a vague or weak answer, probe deeper with a targeted follow-up on the SAME topic
- If they gave a strong answer, acknowledge it in a few words and move to a new area
- Cover a natural mix across: past experience, technical depth, situational judgment, cultural fit, motivation
- Questions must feel like a real recruiter asking them — conversational, reactive to what they JUST said, not scripted
- Reference something specific from their last answer when it makes the follow-up feel natural

DECIDE WHEN TO END:
- You MUST ask at least ${MIN_Q} questions before ending.
- End (done: true) once you've covered the key areas AND have enough signal to assess the candidate — typically after 5–8 questions.
- If the candidate is giving rich, complete answers, you can end sooner. If answers are thin or raise new questions, keep going (up to ${MAX_Q}).

Return ONLY valid JSON (no markdown). To ask another question:
{ "question": "next question here", "done": false }

To end the interview:
{ "question": "", "done": true }

Keep questions to 1–2 sentences. Never repeat a topic already covered well.`;

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

    const qNum = Number(questionNumber) || 0;

    // Hard ceiling — force end without calling AI
    if (qNum >= MAX_Q) {
      return NextResponse.json({ question: '', done: true });
    }

    const historyText = (history as QAPair[])
      .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
      .join('\n\n');

    const endGuidance = qNum < MIN_Q
      ? `You have asked ${qNum} question(s). You MUST ask at least ${MIN_Q}, so ask question ${qNum + 1} now (done: false).`
      : `You have asked ${qNum} question(s). Decide: ask question ${qNum + 1}, or end now if you have enough signal (done: true). Hard limit is ${MAX_Q}.`;

    const userMsg = [
      `Role: ${role} at ${company}`,
      `Resume:\n${String(resumeText).slice(0, 6000)}`,
      jdText ? `JD:\n${String(jdText).slice(0, 3000)}` : '',
      `\n--- INTERVIEW SO FAR (${qNum} questions asked) ---\n${historyText}`,
      `\n${endGuidance}`,
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

    // Enforce floor: never let the AI end before MIN_Q questions.
    if (parsed.done && qNum < MIN_Q && parsed.question?.trim()) {
      parsed.done = false;
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[interview/next]', e);
    return NextResponse.json({ error: 'Failed to get next question.' }, { status: 500 });
  }
}

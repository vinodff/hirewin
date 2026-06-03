import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const REPORT_SYSTEM = `You are an expert interview coach. Analyse a completed mock interview transcript and provide honest, actionable feedback.

Return ONLY valid JSON in this exact shape (no markdown, no preamble):
{
  "overallScore": 72,
  "selectionChance": "High",
  "summary": "2–3 sentence overall assessment. Be honest but constructive.",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["what to work on 1", "what to work on 2", "what to work on 3"],
  "questionFeedback": [
    {
      "question": "...",
      "score": 8,
      "feedback": "What was good and what was missing in their answer.",
      "betterAnswer": "A stronger, concise version of their answer they can learn from."
    }
  ]
}

Scoring guide:
- 85–100: Excellent. Strong hire signal — clear, confident, specific answers with real evidence.
- 70–84: Good. Likely to proceed — mostly strong but a couple of gaps.
- 55–69: Borderline — good moments but too vague or missing key points.
- Below 55: Needs significant work — answers were too short, vague, or off-topic.

selectionChance: "High" if overallScore >= 75, "Medium" if 55–74, "Low" if below 55.

Per-question score (1–10):
- 9–10: Specific, structured (STAR), compelling evidence from their resume
- 7–8: Good but missing one specific example or metric
- 5–6: Generic, vague, or incomplete
- Below 5: Off-topic, too short, or showed a clear knowledge gap

betterAnswer: Write a 2–3 sentence model answer grounded in what they ACTUALLY said — don't invent new experience. Help them say it better.
Be specific. Reference exact things they said. Never give generic advice like "be more confident."`;

type QAPair = { question: string; answer: string };

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { success } = await checkRateLimit(`interview-report:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { history, resumeText, role, company, jdText } = await req.json();

    if (!Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: 'No interview history provided.' }, { status: 400 });
    }

    const historyText = (history as QAPair[])
      .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
      .join('\n\n');

    const userMsg = [
      `Role: ${role} at ${company}`,
      `Resume:\n${String(resumeText).slice(0, 6000)}`,
      jdText ? `JD:\n${String(jdText).slice(0, 3000)}` : '',
      `\n--- FULL INTERVIEW TRANSCRIPT ---\n${historyText}`,
    ].filter(Boolean).join('\n\n');

    const message = await getAnthropicClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: REPORT_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: 'AI returned malformed response.' }, { status: 500 }); }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[interview/report]', e);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}

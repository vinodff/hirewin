import { NextRequest, NextResponse } from 'next/server';
import { route, extractJson } from '@/lib/ai/router';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isPaidUserPlan } from '@/lib/usage';
import type { Plan } from '@/types';

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

    // Gate: Pro / paid plan required
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();

    const plan = (profile?.plan ?? 'free') as Plan;
    if (!isPaidUserPlan(plan, user.email)) {
      return NextResponse.json(
        { error: 'Pro feature. Please upgrade your plan to unlock interview evaluation reports.' },
        { status: 402 }
      );
    }

    const { success } = await checkRateLimit(`interview-report:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { history, resumeText, role, company, jdText, versionId } = await req.json();

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

    const result = await route('interview-report', {
      messages: [
        { role: 'system', content: REPORT_SYSTEM },
        { role: 'user', content: userMsg },
      ],
    });

    const parsed = extractJson(result.text);
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'AI returned malformed response.' }, { status: 500 });
    }

    // Save interview results to database if versionId is provided
    if (versionId) {
      const { error: updateError } = await supabase
        .from('resume_versions')
        .update({
          interview_questions: history,
          evaluation_report: JSON.stringify(parsed),
        })
        .eq('id', versionId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[interview/report] Failed to save results:', updateError);
        // Don't fail the request, just log it
      }
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[interview/report]', e);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}

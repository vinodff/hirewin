import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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
    const { resumeText, role, company, jdText } = await req.json();

    if (!resumeText || !role || !company) {
      return NextResponse.json({ error: 'resumeText, role, and company are required.' }, { status: 400 });
    }

    const userMsg = `Resume:\n${resumeText}\n\nRole: ${role}\nCompany: ${company}${jdText ? `\n\nJob Description:\n${jdText}` : ''}`;

    const message = await getAnthropicClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: INTERVIEW_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[interview]', e);
    return NextResponse.json({ error: 'Failed to generate questions. Try again.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const MAX_RESUME_CHARS = 20_000;
const MAX_JD_CHARS = 10_000;

const SELF_DESC_SYSTEM = `You are an expert interview coach who specialises in crafting compelling, authentic self-introductions for job interviews.

Given a candidate's resume, role, company, and optional job description, produce THREE versions of a self-introduction — brief pitch, full introduction, and a casual version — tailored specifically to the role and company.

Return ONLY valid JSON in this exact shape (no markdown, no preamble):
{
  "versions": {
    "brief": {
      "label": "30-Second Pitch",
      "duration": "~30 seconds",
      "text": "..."
    },
    "full": {
      "label": "Full Introduction",
      "duration": "~2 minutes",
      "text": "..."
    },
    "casual": {
      "label": "Casual Version",
      "duration": "~1 minute",
      "text": "..."
    }
  },
  "keyStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "careerNarrative": "One crisp sentence summarising the candidate's career story and direction."
}

WRITING RULES — apply to all three versions:
- Write in FIRST PERSON as if the candidate is speaking aloud
- Sound confident, warm, and grounded — not corporate, not robotic
- Use ONLY achievements, skills, and experience that appear in the resume — never fabricate metrics or projects
- Tailor to the specific role and company provided
- Do NOT start with "Hello, my name is..." — start with something more engaging
- End each version with why you're excited about THIS specific role/company

VERSION GUIDELINES:

Brief (30 seconds / ~80 words):
- 3–4 punchy sentences
- Structure: who you are + top 2 skills relevant to this JD + one standout fact + why this role

Full (2 minutes / ~220 words):
- 8–10 natural sentences in flowing paragraphs (no bullet points)
- Structure: background + education/career journey → key skills/tech aligned with JD → one or two concrete achievements from resume → career aspiration → why this company and role specifically
- Sound like a human storytelling, not a CV being read aloud
- Include a concrete result or project only if it appears in the resume

Casual (1 minute / ~130 words):
- Conversational tone — as if meeting a new colleague
- Shorter sentences, relaxed language, slight energy
- Best for startups, product companies, creative agencies
- Avoid formal phrases like "I am pleased to introduce myself"

KEY STRENGTHS:
- 3 items, each under 6 words (e.g. "Full-stack web development", "Cross-functional collaboration", "Data-driven problem solving")
- Grounded in the resume — no invented strengths

CAREER NARRATIVE:
- Single sentence, max 20 words, describes the through-line of the candidate's career
- Forward-looking and honest`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { success } = await checkRateLimit(`self-description:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests. Try again in an hour.' }, { status: 429 });

    const { resumeText, role, company, jdText } = await req.json();

    if (typeof resumeText !== 'string' || typeof role !== 'string' || typeof company !== 'string' ||
        !resumeText.trim() || !role.trim() || !company.trim()) {
      return NextResponse.json({ error: 'resumeText, role, and company are required.' }, { status: 400 });
    }
    if (resumeText.length > MAX_RESUME_CHARS) {
      return NextResponse.json({ error: 'Resume too long.' }, { status: 413 });
    }
    if (typeof jdText === 'string' && jdText.length > MAX_JD_CHARS) {
      return NextResponse.json({ error: 'Job description too long.' }, { status: 413 });
    }

    const userMsg = [
      `Resume:\n${resumeText}`,
      `\nRole: ${role}`,
      `Company: ${company}`,
      jdText ? `\nJob Description:\n${jdText}` : '',
    ].join('\n');

    const message = await getAnthropicClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SELF_DESC_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });

    const firstBlock = message.content?.[0];
    const raw = firstBlock?.type === 'text' ? firstBlock.text : '';
    const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'AI returned malformed response.' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[self-description]', e);
    return NextResponse.json({ error: 'Failed to generate self-description. Try again.' }, { status: 500 });
  }
}

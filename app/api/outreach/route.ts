import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL_NAME } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

const MAX_RESUME_CHARS = 20_000;
const MAX_JD_CHARS = 10_000;

export async function POST(req: NextRequest) {
  try {
    // --- Auth ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    // --- Rate limit ---
    const { success } = await checkRateLimit(`outreach:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests. Try again in an hour.' }, { status: 429 });

    const { optimizedResume, role, company, jdText } = await req.json();

    // --- Validation ---
    if (typeof optimizedResume !== 'string' || typeof role !== 'string' || !optimizedResume.trim() || !role.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (optimizedResume.length > MAX_RESUME_CHARS) {
      return NextResponse.json({ error: 'Resume too long' }, { status: 413 });
    }
    if (typeof jdText === 'string' && jdText.length > MAX_JD_CHARS) {
      return NextResponse.json({ error: 'Job description too long' }, { status: 413 });
    }

    const prompt = `You are an expert job application coach. Based on the candidate's resume and the job details below, write two short outreach messages.

Role: ${role}
Company: ${company || 'the company'}

Job Description (excerpt):
${jdText ? jdText.slice(0, 800) : 'Not provided'}

Candidate's optimized resume:
${optimizedResume.slice(0, 1200)}

Return ONLY a JSON object with exactly these two fields:
- "email": A 3-4 sentence cold email. Honest, specific to the role. Reference one genuine strength from the candidate's background. Professional and warm. Start with "Hi [Hiring Manager Name],".
- "linkedin": A 2-3 sentence LinkedIn connection note. Mentions the role and one genuine thing from their background. Not generic. Start with "Hi [Name] —".

Return ONLY the JSON. No markdown, no explanation.`;

    const message = await getAnthropicClient().messages.create({
      model: MODEL_NAME,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const firstBlock = message.content?.[0];
    const raw = firstBlock?.type === 'text' ? firstBlock.text.trim() : '';
    if (!raw) return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });

    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let parsed: { email?: string; linkedin?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'AI returned malformed response' }, { status: 500 });
    }

    return NextResponse.json({ email: parsed.email ?? '', linkedin: parsed.linkedin ?? '' });
  } catch (err) {
    console.error('[outreach]', err);
    return NextResponse.json({ error: 'Failed to generate outreach' }, { status: 500 });
  }
}

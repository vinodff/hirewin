import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL_NAME } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  try {
    const { optimizedResume, role, company, jdText } = await req.json();

    if (!optimizedResume || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({ email: parsed.email ?? '', linkedin: parsed.linkedin ?? '' });
  } catch (err) {
    console.error('[outreach]', err);
    return NextResponse.json({ error: 'Failed to generate outreach' }, { status: 500 });
  }
}

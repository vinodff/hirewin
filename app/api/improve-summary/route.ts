import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

const MAX_CONTEXT_CHARS = 8_000;

export async function POST(req: NextRequest) {
  try {
    // --- Auth ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    // --- Rate limit ---
    const { success } = await checkRateLimit(`improve-summary:${user.id}`);
    if (!success) return NextResponse.json({ error: 'Too many requests. Try again in an hour.' }, { status: 429 });

    const { context } = await req.json();
    if (typeof context !== 'string' || !context.trim()) {
      return NextResponse.json({ error: 'context required' }, { status: 400 });
    }
    if (context.length > MAX_CONTEXT_CHARS) {
      return NextResponse.json({ error: 'context too long' }, { status: 413 });
    }

    const message = await getAnthropicClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Write a concise, compelling professional summary (3–4 sentences) for a resume based on this context. Return ONLY the summary text, no labels or quotes.\n\n${context}`,
        },
      ],
    });

    const firstBlock = message.content?.[0];
    const summary = firstBlock?.type === 'text' ? firstBlock.text.trim() : '';
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[improve-summary]', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

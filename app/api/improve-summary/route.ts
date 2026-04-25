import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { context } = await req.json();
  if (!context) return NextResponse.json({ error: 'context required' }, { status: 400 });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a concise, compelling professional summary (3–4 sentences) for a resume based on this context. Return ONLY the summary text, no labels or quotes.\n\n${context}`,
      },
    ],
  });

  const summary = (message.content[0] as { type: string; text: string }).text?.trim() ?? '';
  return NextResponse.json({ summary });
}

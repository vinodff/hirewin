import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// "Rachel" — conversational professional female voice
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';
const MODEL_ID = 'eleven_turbo_v2_5';
// ElevenLabs bills per character. One interview line is well under this.
const MAX_TTS_CHARS = 1000;

export async function POST(req: NextRequest) {
  // This proxies our ElevenLabs key and is billed per character. Unauthenticated
  // it was a free text-to-speech API for the internet, charged to us.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { success } = await checkRateLimit(`tts:${user.id}`, { failClosed: true });
  if (!success) {
    return NextResponse.json({ error: 'Too many requests — try again shortly.' }, { status: 429 });
  }

  const { text } = await req.json().catch(() => ({ text: null }));
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (text.length > MAX_TTS_CHARS) {
    return NextResponse.json({ error: 'Text too long' }, { status: 413 });
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'no_api_key' }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.52,
            similarity_boost: 0.80,
            style: 0.08,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!res.ok) {
      // Log upstream detail server-side; don't relay provider errors (which can
      // carry account and quota details) to the browser.
      console.error('[tts] ElevenLabs error:', res.status, await res.text());
      return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'TTS failed' },
      { status: 500 },
    );
  }
}

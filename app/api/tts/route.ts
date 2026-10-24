import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// "Rachel" — conversational professional female voice
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';
const MODEL_ID = 'eleven_turbo_v2_5';

// Batch 2 (P1-10): TTS was unauthenticated, un-rate-limited, and
// uncapped, so anyone could spend ElevenLabs credit on unbounded
// text. Now: signed-in users only, per-user rate limit, and a
// 5,000-char cap (interview questions spoken here are short; the
// cap is generous, not a product limit). Behaviour note: the voice
// interview client already falls back to browser speech synthesis
// when this endpoint returns non-200, so signed-out users degrade
// to browser TTS instead of breaking. Upstream failures now return
// a generic error, not the raw upstream body/status.
const MAX_TEXT_CHARS = 5000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = body?.text;
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json({ error: 'text too long' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { success } = await checkRateLimit(`tts:${user.id}`);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again in an hour.' }, { status: 429 });
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
      console.error('[tts] upstream failure:', res.status);
      return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[tts] error:', e);
    return NextResponse.json(
      { error: 'TTS failed' },
      { status: 500 },
    );
  }
}

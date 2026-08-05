import { NextRequest, NextResponse } from 'next/server';
import { parsePdf } from '@/lib/pdf-parser';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Stays usable signed-out (the analyze flow parses before sign-in), but
  // metered: parsing a 5 MB PDF is CPU-heavy and was completely unthrottled.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { success } = await checkRateLimit(
    user ? `parse-pdf:${user.id}` : `parse-pdf:ip:${clientIp(req)}`,
    { tier: user ? 'default' : 'anon' }
  );
  if (!success) {
    return NextResponse.json({ error: 'Too many uploads — try again later.' }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large — max 5 MB' }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const text = await parsePdf(Buffer.from(bytes));
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to parse PDF';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

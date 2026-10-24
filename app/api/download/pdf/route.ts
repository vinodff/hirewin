import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePdf } from '@/lib/pdf';
import { authorizeDownload, consumeDownloadCredit } from '@/lib/download-guard';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { resumeText, versionId } = await req.json();

    if (typeof resumeText !== 'string' || !resumeText.trim()) {
      return NextResponse.json({ error: 'No resume text provided' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    await supabase.rpc('reset_monthly_usage_if_needed', { profile_id: user.id });
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, downloads_used')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    // Server-side authorization — never trust shareUnlocked from the client body.
    // Share-unlocked downloads serve the stored version text, not supplied text.
    const authz = await authorizeDownload(
      supabase,
      user.id,
      profile.plan,
      profile.downloads_used,
      versionId
    );

    if (authz.kind === 'denied') {
      return NextResponse.json({ error: 'locked' }, { status: 403 });
    }

    const textToRender = authz.kind === 'share' ? authz.downloadText : resumeText;

    // Generate FIRST, consume credit only on success, so a generation
    // failure never burns a credit (P1-4).
    const pdfBuffer = await generatePdf(textToRender);

    if (authz.kind === 'plan') {
      const consumed = await consumeDownloadCredit(supabase, user.id, authz.limit);
      if (!consumed) {
        // Quota lost in a race between the check and the atomic increment.
        return NextResponse.json({ error: 'locked' }, { status: 403 });
      }
    }

    const filename = versionId && typeof versionId === 'string'
      ? `resume-${versionId.slice(0, 8)}.pdf`
      : 'resume-optimized.pdf';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (e) {
    console.error('PDF generation error:', e);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

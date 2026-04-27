import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDocx } from '@/lib/docx';
import { canDownload } from '@/lib/usage';

export const maxDuration = 30;

const SHARES_NEEDED = 5;

export async function POST(req: NextRequest) {
  try {
    const { resumeText, versionId } = await req.json();

    if (!resumeText?.trim()) {
      return NextResponse.json({ error: 'No resume text provided' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.rpc('reset_monthly_usage_if_needed', { profile_id: user.id });
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, downloads_used')
        .eq('id', user.id)
        .single();

      const planAllows = profile && canDownload(profile.plan, profile.downloads_used);

      // Check server-side share count — never trust shareUnlocked from the client body
      let shareUnlocked = false;
      if (!planAllows) {
        const { count } = await supabase
          .from('share_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('version_id', versionId ?? null);
        shareUnlocked = (count ?? 0) >= SHARES_NEEDED;
      }

      if (!planAllows && !shareUnlocked) {
        return NextResponse.json({ error: 'locked' }, { status: 403 });
      }

      if (profile && planAllows) {
        await supabase
          .from('profiles')
          .update({ downloads_used: profile.downloads_used + 1 })
          .eq('id', user.id);
      }
    }

    const docxBuffer = await generateDocx(resumeText);
    const filename = versionId ? `resume-${versionId.slice(0, 8)}.docx` : 'resume-optimized.docx';

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(docxBuffer.length),
      },
    });
  } catch (e) {
    console.error('DOCX generation error:', e);
    return NextResponse.json({ error: 'DOCX generation failed' }, { status: 500 });
  }
}

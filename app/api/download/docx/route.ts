import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDocx } from '@/lib/docx';
import { checkDownload, commitDownload } from '@/lib/download-gate';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { resumeText, versionId } = await req.json();

    if (!resumeText?.trim()) {
      return NextResponse.json({ error: 'No resume text provided' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const grant = await checkDownload(supabase, user.id, versionId, user.email);
    if (!grant.allowed) {
      return NextResponse.json({ error: grant.error }, { status: grant.status });
    }

    // Generate BEFORE charging — a failure here must not cost the user a credit.
    const docxBuffer = await generateDocx(resumeText);

    if (!(await commitDownload(supabase, user.id, grant.spendLimit))) {
      // A concurrent request took the last credit between check and commit.
      return NextResponse.json({ error: 'locked' }, { status: 403 });
    }

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

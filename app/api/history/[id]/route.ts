import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/types';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('resume_versions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ version: data });
}

// Status transitions stamp the matching timestamp column automatically.
// This way the pipeline view can show "Applied 3 days ago" without extra UI.
const statusTimestamp: Record<ApplicationStatus, string | null> = {
  evaluated: null,
  applied: 'applied_at',
  responded: 'responded_at',
  interview: 'interview_at',
  offer: 'closed_at',
  rejected: 'closed_at',
  discarded: 'closed_at',
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body.status as ApplicationStatus | undefined;
  const note = typeof body.note === 'string' ? body.note : undefined;

  if (!status && typeof note === 'undefined') {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  if (status && !APPLICATION_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (status) {
    update.application_status = status;
    const stampCol = statusTimestamp[status];
    if (stampCol) update[stampCol] = new Date().toISOString();
  }
  if (typeof note !== 'undefined') {
    update.pipeline_note = note.trim() || null;
  }

  const { data, error } = await supabase
    .from('resume_versions')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ version: data });
}

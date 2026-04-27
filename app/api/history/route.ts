import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan ?? 'free';
  const historyMonths = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.historyMonths ?? 1;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - historyMonths);

  const { data: versions, error } = await supabase
    .from('resume_versions')
    .select('id, created_at, company, role, company_type, ats_score, job_fit_score, career_level, keywords_matched, keywords_missing, skill_gaps, application_status, applied_at, responded_at, interview_at, closed_at, pipeline_note')
    .eq('user_id', user.id)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ versions: versions ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, application_status, pipeline_note } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (application_status !== undefined) updates.application_status = application_status;
  if (pipeline_note !== undefined) updates.pipeline_note = pipeline_note;

  const now = new Date().toISOString();
  if (application_status === 'applied') updates.applied_at = now;
  if (application_status === 'responded') updates.responded_at = now;
  if (application_status === 'interview') updates.interview_at = now;
  if (application_status === 'offer' || application_status === 'rejected' || application_status === 'discarded') {
    updates.closed_at = now;
  }

  const { error } = await supabase
    .from('resume_versions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('resume_versions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

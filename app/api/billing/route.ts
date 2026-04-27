import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [profileRes, ordersRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, improvements_used, downloads_used, roadmaps_used')
      .eq('id', user.id)
      .single(),
    supabase
      .from('orders')
      .select('id, plan, amount_paise, currency, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const plan = (profileRes.data?.plan ?? 'free') as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  const usage = {
    improvements_used: profileRes.data?.improvements_used ?? 0,
    downloads_used: profileRes.data?.downloads_used ?? 0,
    roadmaps_used: profileRes.data?.roadmaps_used ?? 0,
    deep_evals_used: 0,
  };
  const orders = ordersRes.data ?? [];

  return NextResponse.json({ plan, limits, usage, orders });
}

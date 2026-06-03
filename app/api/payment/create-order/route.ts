import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PLAN_PRICES } from '@/lib/usage';
import { checkRateLimit } from '@/lib/rate-limit';

const VALID_PLANS = new Set(['starter', 'pro', 'power']);

export async function POST(req: NextRequest) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: 'Payments not configured yet' }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to purchase' }, { status: 401 });
    }

    // Rate limit: prevent order-creation spam (can rack up Razorpay API calls + DB writes)
    const { success } = await checkRateLimit(`create-order:${user.id}`);
    if (!success) {
      return NextResponse.json({ error: 'Too many checkout attempts. Try again in an hour.' }, { status: 429 });
    }

    const body = await req.json();
    const plan = typeof body?.plan === 'string' ? body.plan : '';
    const isYearly = body?.isYearly === true; // strict boolean check — reject string "true"

    if (!VALID_PLANS.has(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Calculate amount
    let amountPaise = 0;
    if (plan === 'starter') {
      amountPaise = PLAN_PRICES.starter.one_time_paise;
    } else if (plan === 'pro') {
      amountPaise = isYearly ? PLAN_PRICES.pro.yearly_paise : PLAN_PRICES.pro.monthly_paise;
    } else if (plan === 'power') {
      amountPaise = isYearly ? PLAN_PRICES.power.yearly_paise : PLAN_PRICES.power.monthly_paise;
    }

    if (!amountPaise || amountPaise <= 0) {
      return NextResponse.json({ error: 'Invalid plan amount' }, { status: 400 });
    }

    // Create Razorpay order
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `hw_${user.id.slice(0, 8)}_${Date.now()}`,
    });

    // Record in DB
    const serviceSupabase = await createServiceClient();
    const { error: insertError } = await serviceSupabase.from('orders').insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      plan,
      amount_paise: amountPaise,
      currency: 'INR',
      status: 'created',
      is_yearly: !!isYearly,
    });

    if (insertError) {
      console.error('[create-order] DB insert failed:', insertError);
      return NextResponse.json({ error: 'Failed to record order. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      userName:  (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || '',
      userEmail: user.email ?? '',
    });
  } catch (e) {
    console.error('Order creation error:', e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

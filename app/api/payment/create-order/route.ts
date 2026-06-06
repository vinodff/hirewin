import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PLAN_PRICES } from '@/lib/usage';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

const VALID_PLANS = new Set(['starter', 'pro', 'power']);

const PRODUCT_LABELS: Record<string, string> = {
  starter: 'HireWin Starter Plan',
  pro:     'HireWin Pro Plan',
  power:   'HireWin Power Plan',
};

function payuHash(key: string, txnid: string, amount: string, productinfo: string, firstname: string, email: string, udf1: string, salt: string): string {
  // PayU forward hash: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const str = [key, txnid, amount, productinfo, firstname, email, udf1, '', '', '', '', '', '', '', '', '', salt].join('|');
  return crypto.createHash('sha512').update(str).digest('hex');
}

export async function POST(req: NextRequest) {
  if (!process.env.PAYU_KEY || !process.env.PAYU_SALT) {
    return NextResponse.json({ error: 'Payments not configured yet' }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to purchase' }, { status: 401 });
    }

    const { success } = await checkRateLimit(`create-order:${user.id}`);
    if (!success) {
      return NextResponse.json({ error: 'Too many checkout attempts. Try again in an hour.' }, { status: 429 });
    }

    const body = await req.json();
    const plan = typeof body?.plan === 'string' ? body.plan : '';
    const isYearly = body?.isYearly === true;

    if (!VALID_PLANS.has(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Amount in paise for DB storage, convert to INR string for PayU
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

    const amountINR = (amountPaise / 100).toFixed(2); // PayU needs INR as decimal string
    const txnid     = `hw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const firstname = ((user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || 'User').split(' ')[0];
    const email     = user.email ?? '';
    const productinfo = PRODUCT_LABELS[plan];

    const hash = payuHash(
      process.env.PAYU_KEY,
      txnid,
      amountINR,
      productinfo,
      firstname,
      email,
      plan, // udf1 stores plan for callback lookup
      process.env.PAYU_SALT,
    );

    // Save order to DB (reuse razorpay_order_id column for txnid)
    const serviceSupabase = await createServiceClient();
    const { error: insertError } = await serviceSupabase.from('orders').insert({
      user_id:           user.id,
      razorpay_order_id: txnid,
      plan,
      amount_paise:      amountPaise,
      currency:          'INR',
      status:            'created',
      is_yearly:         !!isYearly,
    });

    if (insertError) {
      console.error('[create-order] DB insert failed:', insertError);
      return NextResponse.json({ error: 'Failed to record order. Please try again.' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hirewin.live';

    return NextResponse.json({
      key:         process.env.PAYU_KEY,
      txnid,
      amount:      amountINR,
      productinfo,
      firstname,
      email,
      udf1:        plan,
      hash,
      surl:        `${baseUrl}/api/payment/verify`,
      furl:        `${baseUrl}/payment/failed?reason=cancelled`,
      payuUrl:     process.env.PAYU_URL ?? 'https://secure.payu.in/_payment',
    });
  } catch (e) {
    console.error('Order creation error:', e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

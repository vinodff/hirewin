import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PLAN_PRICES } from '@/lib/usage';
import { checkRateLimit } from '@/lib/rate-limit';

const VALID_PLANS = new Set(['starter', 'pro', 'power']);

export async function POST(req: NextRequest) {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
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

    // Amount in paise for DB storage, convert to INR string/number for Cashfree
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

    const amountINR = (amountPaise / 100).toFixed(2);
    const txnid     = `hw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const email     = user.email ?? '';

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
    const isProd = process.env.CASHFREE_ENV === 'production';
    const cashfreeUrl = isProd 
      ? 'https://api.cashfree.com/pg/orders' 
      : 'https://sandbox.cashfree.com/pg/orders';

    // Call Cashfree API to create the order
    const response = await fetch(cashfreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify({
        order_id: txnid,
        order_amount: Number(amountINR),
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id,
          customer_email: email,
          customer_phone: user.phone || '9999999999', // Cashfree requires valid 10-digit number
        },
        order_meta: {
          return_url: `${baseUrl}/api/payment/verify?order_id={order_id}`,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[create-order] Cashfree API failed:', errorText);
      return NextResponse.json({ error: 'Failed to create order on payment gateway' }, { status: 500 });
    }

    const cfData = await response.json();
    
    return NextResponse.json({
      payment_session_id: cfData.payment_session_id,
      order_id: txnid,
      cf_env: isProd ? 'production' : 'sandbox',
    });
  } catch (e) {
    console.error('Order creation error:', e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

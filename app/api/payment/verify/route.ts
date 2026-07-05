import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hirewin.live';

function redirect(url: string) {
  return NextResponse.redirect(url, { status: 302 });
}

async function verifyPayment(orderId: string | null) {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    return redirect(`${BASE_URL}/payment/failed?reason=not_configured`);
  }

  if (!orderId) {
    return redirect(`${BASE_URL}/payment/failed?reason=order_not_found`);
  }

  try {
    const isProd = process.env.CASHFREE_ENV === 'production';
    const cashfreeUrl = isProd 
      ? `https://api.cashfree.com/pg/orders/${orderId}` 
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    // Fetch order status from Cashfree
    const response = await fetch(cashfreeUrl, {
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'x-api-version': '2023-08-01',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[payment/verify] Cashfree verification failed:', errorText);
      return redirect(`${BASE_URL}/payment/failed?reason=verification_failed`);
    }

    const cfData = await response.json();
    const orderStatus = String(cfData.order_status || 'unknown'); // PAID, ACTIVE, EXPIRED, TERMINATED

    if (orderStatus !== 'PAID') {
      console.warn('[payment/verify] order not paid yet:', { orderId, orderStatus });
      return redirect(`${BASE_URL}/payment/failed?reason=${orderStatus === 'ACTIVE' ? 'cancelled' : orderStatus.toLowerCase()}`);
    }

    const serviceSupabase = await createServiceClient();

    // Fetch order from DB by orderId (stored in razorpay_order_id)
    const { data: order, error: orderFetchError } = await serviceSupabase
      .from('orders')
      .select('id, plan, is_yearly, user_id, status')
      .eq('razorpay_order_id', orderId)
      .single();

    if (orderFetchError || !order) {
      console.error('[payment/verify] order lookup failed', { orderId, error: orderFetchError });
      return redirect(`${BASE_URL}/payment/failed?reason=order_not_found`);
    }

    // Idempotency: already paid — redirect to success page
    if (order.status === 'paid') {
      return redirect(`${BASE_URL}/payment/success?plan=${order.plan}`);
    }

    const targetUserId = order.user_id;
    if (!targetUserId) {
      console.error('[payment/verify] order has no user_id', { orderId });
      return redirect(`${BASE_URL}/payment/failed?reason=no_user`);
    }

    // Fetch payment details to get Cashfree payment ID (cf_payment_id)
    const paymentsUrl = isProd
      ? `https://api.cashfree.com/pg/orders/${orderId}/payments`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}/payments`;

    const paymentsRes = await fetch(paymentsUrl, {
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'x-api-version': '2023-08-01',
      }
    });

    let cfPaymentId = '';
    if (paymentsRes.ok) {
      const payments = await paymentsRes.json();
      const successPayment = Array.isArray(payments) && payments.find((p: any) => p.payment_status === 'SUCCESS');
      if (successPayment) {
        cfPaymentId = String(successPayment.cf_payment_id);
      }
    }
    if (!cfPaymentId) {
      cfPaymentId = orderId; // fallback
    }

    // Atomic conditional update — only the first concurrent request proceeds
    const { data: claimed, error: orderUpdateError } = await serviceSupabase
      .from('orders')
      .update({ status: 'paid', razorpay_payment_id: cfPaymentId })
      .eq('razorpay_order_id', orderId)
      .eq('status', 'created')
      .select('id');

    if (orderUpdateError) {
      console.error('[payment/verify] order update error', { orderId, error: orderUpdateError });
      return redirect(`${BASE_URL}/payment/failed?reason=db_error`);
    }

    if (!claimed || claimed.length === 0) {
      // Already claimed by a concurrent request — safe to redirect to success
      return redirect(`${BASE_URL}/payment/success?plan=${order.plan}`);
    }

    // Upgrade plan — retry once on transient failure
    let planUpgradeError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await serviceSupabase
        .from('profiles')
        .update({ plan: order.plan })
        .eq('id', targetUserId);
      if (!error) { planUpgradeError = null; break; }
      planUpgradeError = error;
    }

    if (planUpgradeError) {
      console.error('[payment/verify] CRITICAL plan upgrade failed after payment', {
        user_id: targetUserId,
        orderId,
        cfPaymentId,
        plan: order.plan,
        error: planUpgradeError,
      });
      // Payment went through — redirect to success so user knows; our team can fix plan manually
      return redirect(`${BASE_URL}/payment/success?plan=${order.plan}&upgrade_failed=1`);
    }

    return redirect(`${BASE_URL}/payment/success?plan=${order.plan}`);
  } catch (e) {
    console.error('[payment/verify] Error verifying payment:', e);
    return redirect(`${BASE_URL}/payment/failed?reason=verification_error`);
  }
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id');
  return verifyPayment(orderId);
}

export async function POST(req: NextRequest) {
  let orderId = req.nextUrl.searchParams.get('order_id');
  if (!orderId) {
    try {
      const formData = await req.formData();
      orderId = formData.get('order_id') as string;
    } catch {
      try {
        const body = await req.json();
        orderId = body?.order_id || body?.orderId;
      } catch {}
    }
  }
  return verifyPayment(orderId);
}

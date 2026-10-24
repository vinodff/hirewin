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

  // orderId is interpolated into the Cashfree URL below; reject anything
  // that is not a plain order identifier (blocks path traversal via
  // crafted order_id values, e.g. "../"). Cashfree order ids created by
  // create-order are `hw_<timestamp>_<random>` and match this shape.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    console.error('[payment/verify] invalid order_id format', { orderId });
    return redirect(`${BASE_URL}/payment/failed?reason=verification_failed`);
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

    // Fetch order from DB by orderId (stored in razorpay_order_id).
    // amount_paise/currency are fetched here so they can be validated
    // against Cashfree BEFORE any claim or plan upgrade below.
    const { data: order, error: orderFetchError } = await serviceSupabase
      .from('orders')
      .select('id, plan, is_yearly, user_id, status, amount_paise, currency')
      .eq('razorpay_order_id', orderId)
      .single();

    if (orderFetchError || !order) {
      console.error('[payment/verify] order lookup failed', { orderId, error: orderFetchError });
      return redirect(`${BASE_URL}/payment/failed?reason=order_not_found`);
    }

    const targetUserId = order.user_id;
    if (!targetUserId) {
      console.error('[payment/verify] order has no user_id', { orderId });
      return redirect(`${BASE_URL}/payment/failed?reason=no_user`);
    }

    // Validate the Cashfree order against the DB order BEFORE claiming.
    // create-order derives amount_paise server-side from plan+isYearly
    // and creates the Cashfree order with that amount in INR and
    // customer_id = user.id, so a genuine payment must match all three.
    // UNCERTAINTY (flagged, not guessed away): this assumes the Cashfree
    // GET /pg/orders response carries order_amount (INR number),
    // order_currency, and customer_details.customer_id, as create-order
    // sent them. If the live Cashfree response shape differs, genuine
    // verifies will fail closed here -- confirm against one real
    // Cashfree order response before deploying this change.
    const expectedAmountInr = (order.amount_paise ?? 0) / 100;
    const cfAmount = Number(cfData.order_amount);
    if (
      cfData.order_amount == null ||
      !Number.isFinite(cfAmount) ||
      Math.abs(cfAmount - expectedAmountInr) > 0.009
    ) {
      console.error('[payment/verify] amount mismatch', {
        orderId, expectedAmountInr, cfAmount: cfData.order_amount, dbAmountPaise: order.amount_paise,
      });
      return redirect(`${BASE_URL}/payment/failed?reason=amount_mismatch`);
    }

    const expectedCurrency = String(order.currency ?? 'INR').toUpperCase();
    const cfCurrency = typeof cfData.order_currency === 'string' ? cfData.order_currency.toUpperCase() : '';
    if (!cfCurrency || cfCurrency !== expectedCurrency) {
      console.error('[payment/verify] currency mismatch', {
        orderId, expectedCurrency, cfCurrency: cfData.order_currency,
      });
      return redirect(`${BASE_URL}/payment/failed?reason=currency_mismatch`);
    }

    const cfCustomerId = cfData.customer_details?.customer_id;
    if (!cfCustomerId || String(cfCustomerId) !== String(targetUserId)) {
      console.error('[payment/verify] customer mismatch', {
        orderId, cfCustomerId: cfCustomerId ?? null,
      });
      return redirect(`${BASE_URL}/payment/failed?reason=customer_mismatch`);
    }

    // Idempotency: already paid — redirect to success page. This runs
    // AFTER validation above, so a replayed verify cannot succeed on a
    // mismatched payment even for an already-paid order.
    if (order.status === 'paid') {
      return redirect(`${BASE_URL}/payment/success?plan=${order.plan}`);
    }

    // A non-created, non-paid order (e.g. failed) must never redirect to
    // success, even if Cashfree reports PAID: nothing is granted for it.
    if (order.status !== 'created') {
      console.error('[payment/verify] order in unexpected status', { orderId, status: order.status });
      return redirect(`${BASE_URL}/payment/failed?reason=invalid_order_state`);
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

    // A SUCCESS payment must actually exist. Previously a missing
    // payment fell back to cfPaymentId = orderId and the order was still
    // marked paid, masking a missing payment in the audit trail. That
    // fallback is removed: no SUCCESS payment => no claim.
    let cfPaymentId = '';
    if (!paymentsRes.ok) {
      const paymentsError = await paymentsRes.text();
      console.error('[payment/verify] Cashfree payments fetch failed', { orderId, error: paymentsError });
      return redirect(`${BASE_URL}/payment/failed?reason=payment_not_found`);
    }
    const paymentsBody = await paymentsRes.json();
    // Cashfree returns the payments list as an array; tolerate the
    // wrapped { payments: [...] } shape defensively.
    const paymentsList = Array.isArray(paymentsBody)
      ? paymentsBody
      : Array.isArray(paymentsBody?.payments)
        ? paymentsBody.payments
        : [];
    const successPayment = paymentsList.find((p: any) => p.payment_status === 'SUCCESS');
    if (successPayment?.cf_payment_id) {
      cfPaymentId = String(successPayment.cf_payment_id);
    }
    if (!cfPaymentId) {
      console.error('[payment/verify] no SUCCESS payment found', { orderId });
      return redirect(`${BASE_URL}/payment/failed?reason=payment_not_found`);
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
      // The claim lost a race. Success is only safe if the order is now
      // actually paid (the concurrent winner claimed it); otherwise this
      // was a non-created order slipping through, and it must fail, not
      // redirect to success. (Non-created orders are already rejected
      // above, so this re-check is defence-in-depth.)
      const { data: rechecked } = await serviceSupabase
        .from('orders')
        .select('status')
        .eq('razorpay_order_id', orderId)
        .single();
      if (rechecked?.status === 'paid') {
        return redirect(`${BASE_URL}/payment/success?plan=${order.plan}`);
      }
      console.error('[payment/verify] claim lost and order is not paid', {
        orderId, status: rechecked?.status ?? null,
      });
      return redirect(`${BASE_URL}/payment/failed?reason=claim_failed`);
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

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hirewin.live';

function payuResponseHash(salt: string, status: string, udf5: string, udf4: string, udf3: string, udf2: string, udf1: string, email: string, firstname: string, productinfo: string, amount: string, txnid: string, key: string): string {
  // Response hash: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  const str = [salt, status, '', '', '', '', '', udf5, udf4, udf3, udf2, udf1, email, firstname, productinfo, amount, txnid, key].join('|');
  return crypto.createHash('sha512').update(str).digest('hex');
}

function redirect(url: string) {
  return NextResponse.redirect(url, { status: 302 });
}

export async function POST(req: NextRequest) {
  if (!process.env.PAYU_KEY || !process.env.PAYU_SALT) {
    return redirect(`${BASE_URL}/payment/failed?reason=not_configured`);
  }

  let fields: Record<string, string>;
  try {
    const formData = await req.formData();
    fields = Object.fromEntries(
      [...formData.entries()].map(([k, v]) => [k, String(v)])
    );
  } catch {
    return redirect(`${BASE_URL}/payment/failed?reason=invalid_callback`);
  }

  const {
    mihpayid = '',
    status = '',
    txnid = '',
    amount = '',
    productinfo = '',
    firstname = '',
    email = '',
    udf1 = '',
    udf2 = '',
    udf3 = '',
    udf4 = '',
    udf5 = '',
    hash: receivedHash = '',
  } = fields;

  // Verify response hash before trusting anything
  const expectedHash = payuResponseHash(
    process.env.PAYU_SALT,
    status,
    udf5, udf4, udf3, udf2, udf1,
    email, firstname, productinfo, amount, txnid,
    process.env.PAYU_KEY,
  );

  if (expectedHash !== receivedHash) {
    console.error('[payment/verify] hash mismatch', { txnid, status });
    return redirect(`${BASE_URL}/payment/failed?reason=hash_mismatch`);
  }

  if (status !== 'success') {
    console.warn('[payment/verify] non-success status', { txnid, status });
    return redirect(`${BASE_URL}/payment/failed?reason=${encodeURIComponent(status)}`);
  }

  const serviceSupabase = await createServiceClient();

  // Fetch order by txnid (stored in razorpay_order_id column)
  const { data: order, error: orderFetchError } = await serviceSupabase
    .from('orders')
    .select('id, plan, is_yearly, user_id, status')
    .eq('razorpay_order_id', txnid)
    .single();

  if (orderFetchError || !order) {
    console.error('[payment/verify] order lookup failed', { txnid, error: orderFetchError });
    return redirect(`${BASE_URL}/payment/failed?reason=order_not_found`);
  }

  // Idempotency: already paid — just redirect to success
  if (order.status === 'paid') {
    return redirect(`${BASE_URL}/payment/success?plan=${order.plan}`);
  }

  const targetUserId = order.user_id;
  if (!targetUserId) {
    console.error('[payment/verify] order has no user_id', { txnid });
    return redirect(`${BASE_URL}/payment/failed?reason=no_user`);
  }

  // Atomic conditional update — only the first concurrent request claiming status='created' proceeds
  const { data: claimed, error: orderUpdateError } = await serviceSupabase
    .from('orders')
    .update({ status: 'paid', razorpay_payment_id: mihpayid })
    .eq('razorpay_order_id', txnid)
    .eq('status', 'created')
    .select('id');

  if (orderUpdateError) {
    console.error('[payment/verify] order update error', { txnid, error: orderUpdateError });
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
      txnid,
      mihpayid,
      plan: order.plan,
      error: planUpgradeError,
    });
    // Payment went through — redirect to success so user knows; our team can fix plan manually
    return redirect(`${BASE_URL}/payment/success?plan=${order.plan}&upgrade_failed=1`);
  }

  return redirect(`${BASE_URL}/payment/success?plan=${order.plan}`);
}

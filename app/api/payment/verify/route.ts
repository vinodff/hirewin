import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // The HMAC signature IS the trust. We intentionally do NOT require a live session here —
    // a user whose Supabase session expired mid-checkout would otherwise be charged but
    // never plan-upgraded. The order row (created at checkout-start) holds the authoritative user_id.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sessionUserId = user?.id ?? null;

    const serviceSupabase = await createServiceClient();

    // Fetch the order — query by order_id only (signature already verified above, so order_id is trusted)
    const { data: order, error: orderFetchError } = await serviceSupabase
      .from('orders')
      .select('plan, is_yearly, user_id, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (orderFetchError || !order) {
      console.error('[payment/verify] order lookup failed', { razorpay_order_id, error: orderFetchError });
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // IDEMPOTENCY: if already paid, return success without re-touching the plan.
    // Prevents replay of an old signature from downgrading a user who has since upgraded further.
    if (order.status === 'paid') {
      return NextResponse.json({ ok: true, plan: order.plan, alreadyProcessed: true });
    }

    // Use the order's user_id as the authoritative reference for the plan upgrade.
    // Falls back to the session user (if any) only when the order somehow lacks one.
    const targetUserId = order.user_id || sessionUserId;
    if (!targetUserId) {
      console.error('[payment/verify] no user_id on order and no session', { razorpay_order_id });
      return NextResponse.json({ error: 'Order has no associated user' }, { status: 500 });
    }

    // Mark order as paid — atomic conditional update guards against races.
    // Only the request that flips status from 'created' → 'paid' proceeds to upgrade the plan.
    const { data: claimed, error: orderUpdateError } = await serviceSupabase
      .from('orders')
      .update({ status: 'paid', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('status', 'created')
      .select('id');

    if (!orderUpdateError && (!claimed || claimed.length === 0)) {
      // Another concurrent request already claimed it — that one will upgrade the plan.
      return NextResponse.json({ ok: true, plan: order.plan, alreadyProcessed: true });
    }

    if (orderUpdateError) {
      console.error('[payment/verify] order update failed', { razorpay_order_id, error: orderUpdateError });
      return NextResponse.json({ error: 'Payment recorded but order update failed. Contact support with your payment ID.' }, { status: 500 });
    }

    // Upgrade user's plan — retry once on failure to guard against transient DB errors
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
      // Log for manual repair: user was charged but plan not upgraded
      console.error('[payment/verify] CRITICAL plan upgrade failed after payment', {
        user_id: targetUserId,
        razorpay_order_id,
        razorpay_payment_id,
        plan: order.plan,
        error: planUpgradeError,
      });
      return NextResponse.json({
        error: 'Payment received but plan upgrade failed. Our team will fix this within 24 hours. Contact support@hirewin.in with your payment ID.',
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, plan: order.plan });
  } catch (e) {
    console.error('Payment verify error:', e);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

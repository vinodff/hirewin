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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceSupabase = await createServiceClient();

    // Fetch the order to get the plan
    const { data: order } = await serviceSupabase
      .from('orders')
      .select('plan, is_yearly')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Mark order as paid
    const { error: orderUpdateError } = await serviceSupabase
      .from('orders')
      .update({ status: 'paid', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id);

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
        .eq('id', user.id);
      if (!error) { planUpgradeError = null; break; }
      planUpgradeError = error;
    }

    if (planUpgradeError) {
      // Log for manual repair: user was charged but plan not upgraded
      console.error('[payment/verify] CRITICAL plan upgrade failed after payment', {
        user_id: user.id,
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

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Test the HMAC signature logic in isolation
// (mirroring the exact logic in app/api/payment/verify/route.ts)
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
}

describe('Razorpay HMAC signature verification', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_test123';
  const paymentId = 'pay_test456';

  it('accepts a valid signature', () => {
    const body = `${orderId}|${paymentId}`;
    const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyRazorpaySignature(orderId, paymentId, validSig, secret)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    expect(verifyRazorpaySignature(orderId, paymentId, 'deadbeef', secret)).toBe(false);
  });

  it('rejects if order ID is swapped', () => {
    const body = `order_other|${paymentId}`;
    const sigForOtherOrder = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyRazorpaySignature(orderId, paymentId, sigForOtherOrder, secret)).toBe(false);
  });

  it('rejects if payment ID is swapped', () => {
    const body = `${orderId}|pay_other`;
    const sigForOtherPay = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyRazorpaySignature(orderId, paymentId, sigForOtherPay, secret)).toBe(false);
  });
});

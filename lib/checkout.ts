'use client';

/** Display prices (rupees). Server truth lives in PLAN_PRICES (lib/usage.ts) —
 *  __tests__/pricing.test.ts asserts the two never drift apart. */
export const PRICING = {
  starter: { price: 19, mrp: 45, downloads: 1 },
  pack3:   { price: 49, mrp: 135, downloads: 3 },
  pro:     { price: 199 },
  power:   { price: 399 },
} as const;

/** What a resume writer charges in India — the honest anchor for ₹19. */
export const WRITER_PRICE_INR = 2000;

/** A real, fixed launch-price deadline. Deliberately NOT a per-session countdown:
 *  a timer that resets when the user opens a second tab costs more trust than
 *  the urgency is worth. Move this date when you actually change the price. */
export const LAUNCH_PRICE_ENDS = new Date('2026-08-31T23:59:59+05:30');

export type PaidPlan = keyof typeof PRICING;

export const RETURN_KEY = 'hw_return';

/** Wait for the Cashfree SDK (loaded afterInteractive) rather than failing the
 *  click if the user is faster than the script. */
async function waitForCashfree(timeoutMs = 6000): Promise<boolean> {
  const start = Date.now();
  while (!window.Cashfree && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return !!window.Cashfree;
}

/**
 * One-click checkout: create order → open Cashfree → gateway redirects back.
 * Returns an error message to show, or null when the redirect is under way.
 */
export async function startCheckout(plan: PaidPlan, isYearly = false): Promise<string | null> {
  const here = window.location.pathname + window.location.search;
  try { localStorage.setItem(RETURN_KEY, here); } catch { /* private mode */ }

  let res: Response;
  try {
    res = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, isYearly }),
    });
  } catch {
    return 'Network error. Please try again.';
  }

  if (res.status === 401) {
    window.location.href = `/auth/login?next=${encodeURIComponent(here)}`;
    return null;
  }
  if (res.status === 503) return 'Payments are being set up. Please try again shortly.';

  const data = await res.json().catch(() => ({ error: 'Unexpected response' }));
  if (data.error) return data.error;

  if (!(await waitForCashfree())) return 'Checkout is still loading. Tap again in a moment.';

  window.Cashfree({ mode: data.cf_env === 'production' ? 'production' : 'sandbox' })
    .checkout({ paymentSessionId: data.payment_session_id, redirectTarget: '_self' });

  return null;
}

import { describe, it, expect } from 'vitest';
import { resolvePurchaseUpdate, PLAN_LIMITS, type Plan } from '@/types';

/**
 * What a payment does to a profile. Every case here is money: getting one
 * wrong either hands out free downloads or destroys a subscription somebody
 * is paying for.
 */
describe('resolvePurchaseUpdate', () => {
  describe('one-time packs grant credits', () => {
    it('a free user buying ₹19 becomes starter with credits reset', () => {
      expect(resolvePurchaseUpdate('starter', 'free')).toEqual({
        plan: 'starter',
        downloads_used: 0,
      });
    });

    it('a free user buying ₹49 becomes pack3 with credits reset', () => {
      expect(resolvePurchaseUpdate('pack3', 'free')).toEqual({
        plan: 'pack3',
        downloads_used: 0,
      });
    });

    it('a spent starter re-buying ₹19 gets a fresh credit', () => {
      // Without the reset the counter is already at the limit and the repeat
      // purchase would grant nothing at all.
      expect(resolvePurchaseUpdate('starter', 'starter')).toEqual({
        plan: 'starter',
        downloads_used: 0,
      });
    });

    it('upgrading starter → pack3 moves the plan and resets', () => {
      expect(resolvePurchaseUpdate('pack3', 'starter')).toEqual({
        plan: 'pack3',
        downloads_used: 0,
      });
    });
  });

  describe('a pack purchase never destroys a subscription', () => {
    // The original bug: verify set plan = order.plan unconditionally, so a Pro
    // subscriber who tapped "Pay ₹19" in the download modal was silently
    // downgraded to starter and lost unlimited downloads.
    it.each(['pro', 'power', 'team'] as Plan[])(
      'a %s subscriber buying ₹19 keeps their plan',
      (plan) => {
        const update = resolvePurchaseUpdate('starter', plan);
        expect(update.plan).toBeUndefined();
        expect(update.downloads_used).toBe(0);
      }
    );

    it.each(['pro', 'power', 'team'] as Plan[])(
      'a %s subscriber buying ₹49 keeps their plan',
      (plan) => {
        expect(resolvePurchaseUpdate('pack3', plan).plan).toBeUndefined();
      }
    );

    it('subscribers keep unlimited downloads after a pack purchase', () => {
      const update = resolvePurchaseUpdate('starter', 'pro');
      const effective = update.plan ?? 'pro';
      expect(PLAN_LIMITS[effective as Plan].downloads).toBe(Infinity);
    });
  });

  describe('a pack purchase never shrinks a bigger pack', () => {
    it('a pack3 holder buying ₹19 stays on pack3', () => {
      const update = resolvePurchaseUpdate('starter', 'pack3');
      expect(update.plan).toBeUndefined();
      expect(update.downloads_used).toBe(0);
    });
  });

  describe('subscriptions still apply normally', () => {
    it.each(['pro', 'power'] as Plan[])('buying %s sets the plan', (plan) => {
      expect(resolvePurchaseUpdate(plan, 'free')).toEqual({ plan });
    });

    it('a subscription purchase does not touch the download counter', () => {
      expect(resolvePurchaseUpdate('pro', 'starter').downloads_used).toBeUndefined();
    });

    it('upgrading pro → power applies', () => {
      expect(resolvePurchaseUpdate('power', 'pro')).toEqual({ plan: 'power' });
    });
  });

  it('never returns an empty update — every purchase changes something', () => {
    const plans: Plan[] = ['free', 'starter', 'pack3', 'pro', 'power', 'team'];
    for (const order of ['starter', 'pack3', 'pro', 'power'] as Plan[]) {
      for (const current of plans) {
        expect(Object.keys(resolvePurchaseUpdate(order, current)).length).toBeGreaterThan(0);
      }
    }
  });
});

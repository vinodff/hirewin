import { describe, it, expect } from 'vitest';
import { PLAN_PRICES } from '@/lib/usage';
import { PRICING } from '@/lib/checkout';
import { PLAN_LIMITS, ONE_TIME_PLANS, SUBSCRIPTION_PLANS, type Plan } from '@/types';
import { costUsd, CHEAP_MODEL_NAME, MODEL_NAME } from '@/lib/anthropic';

/** The price on the button must be the price we charge. */
describe('pricing', () => {
  it('displayed prices match the amounts the server charges', () => {
    expect(PRICING.starter.price * 100).toBe(PLAN_PRICES.starter.one_time_paise);
    expect(PRICING.starter.mrp * 100).toBe(PLAN_PRICES.starter.mrp_paise);
    expect(PRICING.pack3.price * 100).toBe(PLAN_PRICES.pack3.one_time_paise);
    expect(PRICING.pack3.mrp * 100).toBe(PLAN_PRICES.pack3.mrp_paise);
    expect(PRICING.pro.price * 100).toBe(PLAN_PRICES.pro.monthly_paise);
    expect(PRICING.power.price * 100).toBe(PLAN_PRICES.power.monthly_paise);
  });

  it('the discount is real', () => {
    expect(PRICING.starter.mrp).toBeGreaterThan(PRICING.starter.price);
    expect(PRICING.pack3.mrp).toBeGreaterThan(PRICING.pack3.price);
  });

  it('the pack is genuinely cheaper per download than the single', () => {
    const single = PRICING.starter.price / PRICING.starter.downloads;
    const pack = PRICING.pack3.price / PRICING.pack3.downloads;
    expect(pack).toBeLessThan(single);
  });

  it('advertised download counts match the enforced plan limits', () => {
    expect(PLAN_LIMITS.starter.downloads).toBe(PRICING.starter.downloads);
    expect(PLAN_LIMITS.pack3.downloads).toBe(PRICING.pack3.downloads);
  });
});

describe('plan economics', () => {
  it('the free tier grants no downloads — the file is the paid product', () => {
    expect(PLAN_LIMITS.free.downloads).toBe(0);
  });

  it('no plan is unmetered on job scans — a scan is our costliest call', () => {
    for (const [plan, limits] of Object.entries(PLAN_LIMITS)) {
      expect(limits.scansPerMonth, `${plan} scans`).toBeLessThan(Infinity);
    }
  });

  it('one-time packs and subscriptions do not overlap', () => {
    for (const p of ONE_TIME_PLANS) {
      expect(SUBSCRIPTION_PLANS).not.toContain(p);
    }
  });

  it('every one-time pack is a real plan with at least one download', () => {
    for (const p of ONE_TIME_PLANS) {
      expect(PLAN_LIMITS[p as Plan].downloads).toBeGreaterThan(0);
    }
  });
});

describe('token cost model', () => {
  it('prices cached reads far below fresh input', () => {
    const fresh = costUsd(4000, 0);
    const cached = costUsd(0, 0, { cacheReadTokens: 4000 });
    expect(cached).toBeCloseTo(fresh * 0.1, 10);
  });

  it('prices cache writes above fresh input', () => {
    const fresh = costUsd(4000, 0);
    const written = costUsd(0, 0, { cacheCreationTokens: 4000 });
    expect(written).toBeCloseTo(fresh * 1.25, 10);
  });

  it('the cheap model actually costs less than the default', () => {
    const std = costUsd(5000, 2000, { model: MODEL_NAME });
    const cheap = costUsd(5000, 2000, { model: CHEAP_MODEL_NAME });
    expect(cheap).toBeLessThan(std);
  });
});

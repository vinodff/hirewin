/**
 * Failover behaviour, proven without touching a network.
 *
 * The provider adapter and the limiter are mocked so every branch the router
 * only reaches under real load — a 429, an empty 200, JSON that will not parse,
 * a budget running out — can be produced on demand. Those are exactly the paths
 * that are impossible to exercise reliably against a live free tier, and the
 * ones where being wrong costs a user their answer.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

const callProvider = vi.fn();
const reserve = vi.fn();
const penalise = vi.fn();

vi.mock('@/lib/ai/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/providers')>();
  return {
    ...actual,
    callProvider: (...args: unknown[]) => callProvider(...args),
    // Every provider has a key in these tests unless a case says otherwise.
    hasKey: () => true,
  };
});

vi.mock('@/lib/ai/limiter', () => ({
  reserve: (...args: unknown[]) => reserve(...args),
  penalise: (...args: unknown[]) => penalise(...args),
  limiterAvailable: () => true,
}));

const { route, routeJson, extractJson } = await import('@/lib/ai/router');
const { TASK_SPECS } = await import('@/lib/ai/models');
const { PROVIDERS } = await import('@/lib/ai/providers');
const { AllProvidersFailedError } = await import('@/lib/ai/types');

const ok = (text: string) => ({
  ok: true,
  text,
  usage: { inputTokens: 10, outputTokens: 5, costUsd: 0 },
  status: 200,
  error: null,
  retryAfterSeconds: null,
});

const fail = (status: number | null, error: string, retryAfterSeconds: number | null = null) => ({
  ok: false,
  text: '',
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
  status,
  error,
  retryAfterSeconds,
});

const REQ = { messages: [{ role: 'user' as const, content: 'hi' }] };

beforeEach(() => {
  callProvider.mockReset();
  reserve.mockReset().mockResolvedValue({ allowed: true, reason: null });
  penalise.mockReset().mockResolvedValue(undefined);
});

describe('failover', () => {
  test('returns the first candidate that answers', async () => {
    callProvider.mockResolvedValueOnce(ok('first'));
    const result = await route('improve-summary', REQ);

    expect(result.text).toBe('first');
    expect(result.attempts).toHaveLength(1);
    expect(callProvider).toHaveBeenCalledTimes(1);
  });

  test('moves to the next model on a 429', async () => {
    callProvider.mockResolvedValueOnce(fail(429, 'rate limited')).mockResolvedValueOnce(ok('second'));

    const result = await route('improve-summary', REQ);

    expect(result.text).toBe('second');
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].ok).toBe(false);
    expect(result.attempts[0].status).toBe(429);
  });

  test('a real 429 takes the provider out of rotation', async () => {
    // The provider knows its own state better than our counter does, so a 429
    // must drain the local window — otherwise sibling instances keep walking
    // into the same wall.
    callProvider.mockResolvedValueOnce(fail(429, 'rate limited', 30)).mockResolvedValueOnce(ok('x'));
    await route('improve-summary', REQ);

    expect(penalise).toHaveBeenCalledTimes(1);
    expect(penalise.mock.calls[0][1]).toBe(30);
  });

  test('does not penalise on a 500 — that is not a quota problem', async () => {
    callProvider.mockResolvedValueOnce(fail(500, 'server error')).mockResolvedValueOnce(ok('x'));
    await route('improve-summary', REQ);
    expect(penalise).not.toHaveBeenCalled();
  });

  test('never retries the same model twice', async () => {
    // A tier that just refused will refuse again a millisecond later. Moving
    // sideways to a different account is both faster and likelier to work.
    callProvider.mockResolvedValue(fail(429, 'rate limited'));
    await expect(route('improve-summary', REQ)).rejects.toThrow(AllProvidersFailedError);

    const models = callProvider.mock.calls.map((c) => c[1]);
    expect(new Set(models).size).toBe(models.length);
  });

  test('falls through to paid only after every free option failed', async () => {
    // Derived from the registry, not hardcoded: the candidate list grows every
    // time a provider is added, and a fixed count of mocked failures would make
    // this test fail for a reason that has nothing to do with the behaviour.
    const freeCount = TASK_SPECS['improve-summary'].candidates.filter(
      (c) => !PROVIDERS[c.provider].paid
    ).length;

    for (let i = 0; i < freeCount; i += 1) {
      callProvider.mockResolvedValueOnce(fail(429, 'rate limited'));
    }
    callProvider.mockResolvedValueOnce(ok('rescued'));

    const result = await route('improve-summary', REQ);

    expect(result.text).toBe('rescued');
    expect(result.provider).toBe('anthropic');
    expect(result.usedPaidFallback).toBe(true);
    // Every free option really was tried before the paid one.
    expect(callProvider).toHaveBeenCalledTimes(freeCount + 1);
  });

  test('each task steps across PROVIDERS, not just models', async () => {
    // The capacity argument depends on this. Four models on one account share
    // that account's per-minute ceiling, so a same-provider list buys nothing
    // under load; independent accounts are what multiply the ceiling.
    for (const task of Object.keys(TASK_SPECS) as (keyof typeof TASK_SPECS)[]) {
      const free = TASK_SPECS[task].candidates.filter((c) => !PROVIDERS[c.provider].paid);
      const distinctProviders = new Set(free.map((c) => c.provider));
      expect(distinctProviders.size).toBeGreaterThanOrEqual(2);
    }
  });

  test('freeOnly refuses to reach the paid fallback', async () => {
    callProvider.mockResolvedValue(fail(429, 'rate limited'));

    await expect(route('improve-summary', REQ, { freeOnly: true })).rejects.toThrow(
      AllProvidersFailedError
    );
    // The paid candidate must never have been called.
    expect(callProvider.mock.calls.some((c) => c[0] === 'anthropic')).toBe(false);
  });

  test('the error carries the whole trail, not just the last failure', async () => {
    callProvider.mockResolvedValue(fail(429, 'rate limited'));
    try {
      await route('improve-summary', REQ);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AllProvidersFailedError);
      const trail = (error as InstanceType<typeof AllProvidersFailedError>).attempts;
      expect(trail.length).toBeGreaterThan(1);
      expect(trail.every((a) => !a.ok)).toBe(true);
    }
  });
});

describe('a 200 is not automatically a success', () => {
  test('an empty body fails over', async () => {
    // Free tiers return 200-with-nothing under load often enough that trusting
    // the status line would hand callers an empty answer and call it a win.
    callProvider
      .mockResolvedValueOnce({ ...ok(''), text: '   ' })
      .mockResolvedValueOnce(ok('real answer'));

    const result = await route('improve-summary', REQ);
    expect(result.text).toBe('real answer');
    expect(result.attempts[0].error).toContain('empty');
  });

  test('unparseable output fails over when JSON was requested', async () => {
    callProvider
      .mockResolvedValueOnce(ok('Sure! Here you go, but not as JSON.'))
      .mockResolvedValueOnce(ok('{"score": 91}'));

    const result = await route('job-scan', REQ);
    expect(result.text).toBe('{"score": 91}');
    expect(result.attempts[0].error).toContain('JSON');
  });

  test('prose is fine when JSON was not requested', async () => {
    callProvider.mockResolvedValueOnce(ok('just a sentence'));
    const result = await route('improve-summary', REQ);
    expect(result.text).toBe('just a sentence');
  });
});

describe('the local limiter', () => {
  test('a predicted 429 skips the call entirely', async () => {
    reserve
      .mockResolvedValueOnce({ allowed: false, reason: 'local limiter: at ceiling' })
      .mockResolvedValue({ allowed: true, reason: null });
    callProvider.mockResolvedValueOnce(ok('second'));

    const result = await route('improve-summary', REQ);

    expect(result.text).toBe('second');
    expect(result.attempts[0].skipped).toBe(true);
    // The whole point: no request was sent for the skipped candidate.
    expect(callProvider).toHaveBeenCalledTimes(1);
  });
});

describe('the overall budget', () => {
  test('stops starting attempts once the clock is gone', async () => {
    callProvider.mockImplementation(
      async () => new Promise((r) => setTimeout(() => r(fail(500, 'slow')), 30))
    );

    const result = await route('improve-summary', REQ, { budgetMs: 40 }).catch((e) => e);

    expect(result).toBeInstanceOf(AllProvidersFailedError);
    const trail = (result as InstanceType<typeof AllProvidersFailedError>).attempts;
    // Later candidates are recorded as skipped-for-time, not silently dropped:
    // "we ran out of clock" and "everything refused us" are different stories.
    expect(trail.some((a) => a.skipped && a.error?.includes('budget'))).toBe(true);
  });
});

describe('extractJson', () => {
  test('parses a bare object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  test('unwraps a ```json fence', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  test('unwraps a bare fence', () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  test('digs an object out of surrounding prose', () => {
    // Worth the leniency: failing over on this would discard a correct answer
    // because the model was chatty.
    expect(extractJson('Here is the result: {"a":1} — hope that helps!')).toEqual({ a: 1 });
  });

  test('returns null when there is no JSON at all', () => {
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('')).toBeNull();
    expect(extractJson('{ not valid }')).toBeNull();
  });
});

describe('routeJson', () => {
  test('hands back parsed data alongside the raw result', async () => {
    callProvider.mockResolvedValueOnce(ok('```json\n{"score":88}\n```'));
    const { data, result } = await routeJson<{ score: number }>('job-scan', REQ);

    expect(data.score).toBe(88);
    expect(result.provider).toBeTruthy();
  });
});

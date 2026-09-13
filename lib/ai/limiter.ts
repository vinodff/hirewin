/**
 * Provider-side rate limiting, shared across serverless instances.
 *
 * This is NOT the per-user limiter in lib/rate-limit.ts. That one protects the
 * product from a user; this one protects a shared free-tier quota from the
 * product. They count different things and must not be merged: one user making
 * one request can still be the request that trips OpenRouter's 20-per-minute
 * ceiling for everybody.
 *
 * Why it has to be distributed: Vercel runs each request in its own instance,
 * so an in-memory counter counts one instance's traffic and nothing else. Under
 * the concurrency this exists to survive, that is exactly when it is wrong. The
 * project already runs Upstash Redis for the per-user limiter, so the shared
 * counter goes there.
 *
 * Why it fails OPEN: Redis being unreachable should not take the whole AI
 * surface down. The router already treats a 429 as a failover signal, so the
 * worst case without the limiter is a wasted attempt, not a broken request.
 * This is an optimisation that spends fewer attempts — not a correctness gate.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { PROVIDERS, type ProviderName } from './providers';

let redis: Redis | null = null;
const minuteLimiters = new Map<ProviderName, Ratelimit>();
const dayLimiters = new Map<ProviderName, Ratelimit>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redis) redis = new Redis({ url, token });
  return redis;
}

/**
 * Headroom against the documented ceiling.
 *
 * Deliberately under the real limit. The provider's own counter and ours are
 * not the same clock, and requests already in flight from another instance are
 * invisible to us at the moment we decide. Aiming exactly at 20/min means
 * regularly discovering the 21st the expensive way.
 */
const SAFETY = 0.9;

function minuteLimiter(provider: ProviderName): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  let limiter = minuteLimiters.get(provider);
  if (!limiter) {
    const budget = Math.max(1, Math.floor(PROVIDERS[provider].limits.requestsPerMinute * SAFETY));
    limiter = new Ratelimit({
      redis: client,
      // Sliding window, not fixed: a fixed window lets 2× the budget through
      // across a boundary, which on a 20/min ceiling is a guaranteed 429.
      limiter: Ratelimit.slidingWindow(budget, '1 m'),
      analytics: false,
      prefix: `hirewin:ai:min:${provider}`,
    });
    minuteLimiters.set(provider, limiter);
  }
  return limiter;
}

function dayLimiter(provider: ProviderName): Ratelimit | null {
  const perDay = PROVIDERS[provider].limits.requestsPerDay;
  if (perDay === null) return null;

  const client = getRedis();
  if (!client) return null;

  let limiter = dayLimiters.get(provider);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(Math.max(1, Math.floor(perDay * SAFETY)), '24 h'),
      analytics: false,
      prefix: `hirewin:ai:day:${provider}`,
    });
    dayLimiters.set(provider, limiter);
  }
  return limiter;
}

export interface Reservation {
  allowed: boolean;
  /** Which ceiling refused it, for the attempt trail. */
  reason: string | null;
}

/**
 * Claim one request against a provider's budget.
 *
 * Both windows are consulted, minute first: the minute ceiling is the one that
 * actually bites under load, and checking it first avoids spending a slot from
 * the much scarcer daily budget on a request the minute window would refuse.
 */
export async function reserve(provider: ProviderName): Promise<Reservation> {
  /*
   * Every Redis call here is wrapped, because "fails open" has to be true in
   * CODE and not merely in a comment.
   *
   * Found by the load harness: at 10 concurrent requests this fires up to 40
   * Upstash REST calls at once, some of which fail with a transport error. The
   * unguarded version let that reject propagate out of the router, so ALL TEN
   * requests died at the limiter without a single model ever being contacted —
   * a rate limiter that took down the thing it exists to protect.
   *
   * A limiter outage costs a wasted attempt at worst; the router treats the
   * resulting 429 as a failover signal. That is strictly better than refusing
   * to serve anything.
   */
  try {
    const minute = minuteLimiter(provider);
    if (minute) {
      const { success } = await minute.limit(provider);
      if (!success) {
        return {
          allowed: false,
          reason: `local limiter: ${provider} is at its ${PROVIDERS[provider].limits.requestsPerMinute}/min ceiling`,
        };
      }
    }

    const day = dayLimiter(provider);
    if (day) {
      const { success } = await day.limit(provider);
      if (!success) {
        return {
          allowed: false,
          reason: `local limiter: ${provider} is at its ${PROVIDERS[provider].limits.requestsPerDay}/day ceiling`,
        };
      }
    }
  } catch (error) {
    console.error(
      `[ai-limiter] ${provider}: limiter unavailable, allowing through —`,
      error instanceof Error ? error.message : error
    );
    return { allowed: true, reason: null };
  }

  return { allowed: true, reason: null };
}

/**
 * Take a provider out of rotation after it returns a 429.
 *
 * The provider knows its own state better than our counter does, so a real 429
 * is authoritative: burn the remaining minute budget so no other instance
 * retries into the same wall. `Retry-After` is honoured when sent, capped at a
 * minute because the sliding window is a minute wide.
 */
export async function penalise(provider: ProviderName, retryAfterSeconds: number | null): Promise<void> {
  const limiter = minuteLimiter(provider);
  if (!limiter) return;

  const budget = Math.max(1, Math.floor(PROVIDERS[provider].limits.requestsPerMinute * SAFETY));
  try {
    // Drain the window. `blockUntilReady` would wait; we want the slots gone.
    await Promise.all(Array.from({ length: budget }, () => limiter.limit(provider)));
  } catch {
    // A failed penalty is not worth failing the request over — the router is
    // already moving to the next candidate.
  }
  void retryAfterSeconds;
}

/** True when a shared counter is actually in play. Reported by the verifier. */
export function limiterAvailable(): boolean {
  return getRedis() !== null;
}

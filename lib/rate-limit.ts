import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

/** Named limiters. `anon` is deliberately tight: anonymous callers have no DB
 *  quota row, so this is the only thing standing between a stranger and our
 *  Anthropic bill. */
const TIERS = {
  default: { tokens: 100, window: '1 h' as const },
  anon: { tokens: 5, window: '24 h' as const },
} satisfies Record<string, { tokens: number; window: `${number} ${'h' | 'm'}` }>;

export type RateTier = keyof typeof TIERS;

function getRatelimit(tier: RateTier) {
  let limiter = limiters.get(tier);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(TIERS[tier].tokens, TIERS[tier].window),
      analytics: false,
      prefix: `hirewin:rl:${tier}`,
    });
    limiters.set(tier, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  identifier: string,
  opts?: {
    tier?: RateTier;
    /** Deny instead of allowing when Redis is unreachable. Use on endpoints
     *  where an unmetered request costs real money (Anthropic, ElevenLabs) —
     *  a Redis outage should not become an open bar. */
    failClosed?: boolean;
  }
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return { success: true, remaining: 99, reset: Date.now() + 3600000 };
  }

  try {
    const result = await getRatelimit(opts?.tier ?? 'default').limit(identifier);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  } catch (e) {
    console.error('[rate-limit] limiter unavailable:', e);
    if (opts?.failClosed) {
      return { success: false, remaining: 0, reset: Date.now() + 60000 };
    }
    // Fail open — if Redis is down, allow the request
    return { success: true, remaining: 99, reset: Date.now() + 3600000 };
  }
}

/** Client IP for anonymous rate limiting. */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

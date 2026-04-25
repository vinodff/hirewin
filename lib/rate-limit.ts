import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

function getRatelimit() {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(100, '1 h'),
      analytics: false,
      prefix: 'hirewin:rl',
    });
  }
  return ratelimit;
}

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
}> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return { success: true, remaining: 99, reset: Date.now() + 3600000 };
  }

  try {
    const result = await getRatelimit().limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    // Fail open — if Redis is down, allow the request
    return { success: true, remaining: 99, reset: Date.now() + 3600000 };
  }
}

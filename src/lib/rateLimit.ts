/**
 * In-memory sliding-window rate limiter for production edge protection.
 * Can be augmented with Redis in multi-instance horizontal scaling.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowSeconds: 60 }
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: options.limit - 1,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= options.limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: options.limit - existing.count,
    retryAfterSeconds: 0,
  };
}

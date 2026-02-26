// services/user/src/middleware/rateLimit.ts
//
// Phase 0: in-memory rate limiter. No Redis needed yet.
// Design: keyed by IP + route. Sliding window.
//
// Phase 1 swap: replace the Map store with Redis so limits
// are shared across multiple EC2 instances. The interface stays identical —
// only the storage backend changes.
//
// Why not use express-rate-limit package?
// It's fine. But rolling your own for Phase 0 means:
// - Zero extra dependencies
// - You understand exactly what's happening
// - Easier to swap to Redis-backed in Phase 1

import { Request, Response, NextFunction } from 'express';

interface RateWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateWindow>();

// Clean up stale entries every 5 minutes to prevent memory leak
// in long-running processes. Without this, the Map grows unbounded
// since old IPs are never evicted.
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of store.entries()) {
    if (window.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;    // time window in milliseconds
  maxRequests: number; // max requests per window per IP
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Key: IP + path prevents one route's limit bleeding into another
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const existing = store.get(key);

    if (!existing || existing.resetAt < now) {
      // First request in this window, or window has expired — start fresh
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: options.message ?? 'Too many requests. Please try again later.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    existing.count += 1;
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', options.maxRequests - existing.count);
    return next();
  };
}

// Pre-built limiters for the routes that need them
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,           // 20 login/register attempts per 15 min per IP
  message: 'Too many auth attempts. Please wait 15 minutes.',
});

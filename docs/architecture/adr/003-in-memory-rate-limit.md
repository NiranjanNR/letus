# ADR-003: In-Memory Rate Limiting (Phase 0)

**Status:** Accepted — superseded by Kong Gateway rate limiting in Phase 1
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0 → Phase 1 supersedes

## Context
The auth endpoints (especially /register and /login) are vulnerable to brute-force and
credential stuffing attacks. A rate limiter is required from day one. Phase 0 has no
Redis instance, no API gateway, and runs as a single process on one EC2 instance.

## Decision
Implement rate limiting using an in-memory sliding window counter (a plain `Map` in the
Express process). Default: 20 requests per 15 minutes per IP address for auth routes.

## Implementation Location
`services/user/src/middleware/rateLimit.ts`

The `createRateLimiter(options)` factory function returns Express middleware. A pre-configured
`authLimiter` instance is imported directly in `routes/auth.ts`.

```typescript
// Usage in any route file:
import { createRateLimiter } from '../middleware/rateLimit';
const limiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 20 });
router.post('/sensitive', limiter, handler);
```

## Consequences

**Good:**
- Zero infrastructure dependencies — works with just Node.js
- Fast (Map lookup is O(1))
- The `createRateLimiter` factory interface is identical to what a Redis-backed implementation
  would expose — call sites do not change in Phase 1

**Bad / trade-offs:**
- State is not shared across process restarts: a redeploy resets all counters
- State is not shared across multiple instances: cannot horizontal-scale while keeping limits
- Memory grows with unique IP count (bounded by Map GC when windows expire)

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| Redis + rate-limit library immediately | Adds Redis as a Phase 0 dependency; overkill for single instance |
| No rate limiting until Phase 1 | Auth endpoints unprotected during early user testing; unacceptable |
| express-rate-limit package | Would work but adds a dependency; custom implementation is 30 lines and teaches the pattern |

## Phase Transition
**Phase 1:** Kong API Gateway is added in front of all services. Rate limiting moves to Kong
(plugin: `rate-limiting` with Redis backend). The in-memory middleware in `rateLimit.ts` is
removed from auth routes. The `createRateLimiter` factory is kept in the codebase for any
service-internal rate limiting that doesn't go through Kong.

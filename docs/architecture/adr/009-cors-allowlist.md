# ADR-009: CORS Allowlist (Not Wildcard)

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
The Express API is called from the React Native mobile app and potentially from a future web
dashboard. CORS headers must be set. Using `origin: '*'` (wildcard) is the default "just
make it work" choice, but it allows any website in any browser to make credentialed requests
to the API — defeating cookie and Authorization header protection in browser contexts. It
also masks configuration errors (a misconfigured origin is silently accepted).

## Decision
CORS is configured with an explicit allowlist read from the `ALLOWED_ORIGINS` environment
variable. Any origin not in the list receives a CORS rejection. The list is comma-separated
in `.env` and split at boot.

## Implementation Location
`services/user/src/index.ts` — CORS middleware configuration

```typescript
import cors from 'cors';

const allowedOrigins = config.allowedOrigins.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (React Native, curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
```

**Default `ALLOWED_ORIGINS`:**
```
http://localhost:3000,http://localhost:8081,exp://localhost:8081
```

## Consequences

**Good:**
- Web browser requests from unknown origins are rejected at the CORS preflight level
- React Native (no `origin` header) and Expo Go (`exp://`) are explicitly allowed
- Misconfigured origins surface as clear CORS errors rather than silent failures
- Adding a web dashboard requires adding its origin to the env var — a deliberate act

**Bad / trade-offs:**
- Every new Expo Go tunnel URL (which changes each session) needs to be in ALLOWED_ORIGINS.
  In practice, `exp://localhost:8081` covers LAN development; tunnel URLs are only needed
  for remote testers.

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| `origin: '*'` wildcard | Allows any browser origin to make credentialed requests |
| No CORS middleware | React Native doesn't need CORS (no browser), but web dashboard will |
| Hardcode origins in source | Origins change between environments; env var is the correct seam |

## Phase Transition
**Phase 1:** When a web admin dashboard is added, its URL is added to `ALLOWED_ORIGINS` in
the EC2 production `.env`. The CORS configuration code does not change.

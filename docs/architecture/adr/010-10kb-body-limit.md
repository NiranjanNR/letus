# ADR-010: 10kb Request Body Size Limit

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
Express's `express.json()` middleware parses the entire request body into memory before any
route handler runs. Without a size limit, an attacker can send arbitrarily large JSON
payloads (e.g., a 100MB string as a username field), exhausting the server's memory and
causing a crash or extreme slowdown. This is a trivial, low-skill denial-of-service vector.

## Decision
Set the `limit` option on `express.json()` to `'10kb'`. Auth endpoints (register, login)
only need username + email + password — well under 1kb. 10kb provides generous headroom
for future endpoint additions while remaining a practical limit.

## Implementation Location
`services/user/src/index.ts`

```typescript
app.use(express.json({ limit: '10kb' }));
```

## Consequences

**Good:**
- Memory exhaustion via large payloads is prevented at the framework level
- Express returns `413 Payload Too Large` before any route handler or database query runs
- Zero impact on legitimate requests (all Phase 0 payloads are < 1kb)

**Bad / trade-offs:**
- When the Media Service is added in Phase 1 (image upload), binary uploads will not go
  through this Express service — they go directly to a presigned S3 URL from the client.
  So 10kb will never be hit by legitimate Phase 1 requests either.

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| No limit | Default Express behavior accepts unlimited body size — DoS vector |
| 1kb limit | Too small — leaves no headroom for metadata-rich future endpoints |
| Validate body size in each route handler | Too late — body is already in memory; and easy to forget |

## Phase Transition
**Phase 1 Media Service:** The media service (Python + FastAPI) handles multipart file
uploads, which have a different and larger body limit configured at the FastAPI/nginx level.
This 10kb limit in the user service is appropriate and permanent.
**Phase 1 Place Service (Go):** Uses its own body limit configuration in Gin.

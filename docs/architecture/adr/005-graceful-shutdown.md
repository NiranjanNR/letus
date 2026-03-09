# ADR-005: Graceful SIGTERM Shutdown

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
EC2 deploys via GitHub Actions restart the Node.js process using PM2 (`pm2 restart`). PM2
sends SIGTERM before killing a process. Without a SIGTERM handler, the process exits
immediately — dropping in-flight requests and leaving database connections in a half-open
state that PostgreSQL must clean up with its own timeout (default 10 minutes). This causes
intermittent 500 errors during every deployment.

## Decision
Register a `process.on('SIGTERM')` handler that:
1. Stops the HTTP server from accepting new connections
2. Waits for in-flight requests to complete (server.close callback)
3. Closes the database connection pool
4. Exits with code 0

## Implementation Location
`services/user/src/index.ts` — bottom of file, after `server.listen()`

```typescript
const shutdown = async (signal: string) => {
  console.log(`[user-service] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    await closeDatabasePool();
    console.log('[user-service] shutdown complete');
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Consequences

**Good:**
- Zero dropped requests during rolling deploys
- Database pool closed cleanly — no orphaned connections
- SIGINT (Ctrl+C in dev) is also handled, consistent local and production behavior
- Exit code 0 tells PM2 the restart was intentional (not a crash)

**Bad / trade-offs:**
- `server.close()` only stops new connections; long-running requests delay shutdown.
  A timeout (e.g., 30s) should be added if any route could run longer than a deploy window.
  Phase 0 routes are all < 500ms so this is not yet a concern.

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| Let PM2 kill the process with SIGKILL | Drops in-flight requests; leaves DB connections open for up to 10 min |
| Add timeout to DB pool only | Doesn't stop HTTP server — new requests can arrive during shutdown |

## Phase Transition
No change planned. When Phase 1 adds more services, each must implement the same pattern.
The shutdown handler template in `services/user/src/index.ts` is the reference implementation.

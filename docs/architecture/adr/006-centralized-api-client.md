# ADR-006: Centralized API Client with Token Refresh

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
Every authenticated screen in the mobile app needs to call the API with a valid access
token. Access tokens expire after 15 minutes. Without a central refresh mechanism, each
screen would need to handle 401 responses, call `/auth/refresh`, retry the original request,
and update stored tokens — four complex async operations duplicated across every API call
site. Worse, if two components fire API calls simultaneously and both get 401s, two
concurrent refresh calls would race — the second would fail because the first already
rotated the refresh token (see ADR-002).

## Decision
All API calls go through a single `apiFetch()` wrapper in `apps/mobile/lib/apiClient.ts`.
This wrapper:
1. Attaches the `Authorization: Bearer <accessToken>` header automatically
2. On 401 response, calls `/auth/refresh` once
3. Retries the original request with the new token
4. Queues any concurrent 401 responses until the refresh completes, then replays them
5. If refresh fails, calls `authStore.logout()` and throws

## Implementation Location
`apps/mobile/lib/apiClient.ts`

Key pattern — the refresh queue:
```typescript
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise; // All concurrent callers await the same promise
}
```

## Consequences

**Good:**
- Token refresh logic lives in exactly one place — one file to audit, one file to fix
- Concurrent 401s are deduplicated: refresh runs once regardless of how many calls triggered it
- Every screen gets token refresh for free just by using `apiFetch()` instead of `fetch()`
- `API_URL` and `setTokens()` are also exported, making the client the single source of truth for API config

**Bad / trade-offs:**
- `apiFetch` must be imported everywhere instead of using native `fetch`. This is enforced by
  convention (see `docs/helpers/index.md`) not by linting — a future task is to add an eslint
  rule banning direct `fetch` calls in the `apps/mobile` workspace.

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| Handle 401 in each screen's useEffect | Logic duplicated N times; concurrent refresh race condition guaranteed |
| React Query's `onError` callback | RQ doesn't have built-in token refresh; still requires central refresh logic |
| Axios interceptors | Would work equivalently; `fetch` is preferred as a native API with no dependency |

## Phase Transition
No change planned. When Phase 1 adds new API endpoints (Place Service, Feed Service),
all calls go through the same `apiFetch()`. If Kong Gateway is added, only `API_URL` in
`apiClient.ts` needs updating — all call sites are unaffected.

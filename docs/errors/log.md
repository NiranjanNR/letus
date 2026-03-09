# Error Log — Patterns to Avoid

**Rule:** Entries are permanent. Never delete — only mark as RESOLVED or OPEN.
**Format:** SYMPTOM → ROOT CAUSE → PATTERN TO AVOID → FIX → FILE(S)

When you find a new bug, add it here before closing the task.
Format: `### ERR-NNN: Short title` then the fields below.

---

## AUTH

### ERR-001: Login timing oracle
**Status:** RESOLVED (Phase 0)
**Symptom:** Login returns in ~1ms for unknown emails, ~100ms for wrong passwords — detectable timing difference
**Root Cause:** Early `return res.status(401)` before `bcrypt.compare()` when user not found
**Pattern to avoid:** Any early-return in login handler before bcrypt runs
**Fix:** Always call `bcrypt.compare(password, dummyHash)` when user is not found, where `dummyHash` is a pre-computed static hash that always fails
**File:** `services/user/src/routes/auth.ts` — POST /auth/login handler
**ADR:** `docs/architecture/adr/001-timing-safe-auth.md`

---

### ERR-002: Refresh token still valid after logout
**Status:** RESOLVED (Phase 0)
**Symptom:** After "logout", old refresh token could still obtain new access tokens
**Root Cause:** Client-side logout only cleared Zustand state and SecureStore — never called `POST /auth/logout` to invalidate the server-side token record
**Pattern to avoid:** Auth state reset without server-side token invalidation. Client logout ≠ server logout.
**Fix:** `authStore.logout()` calls `POST /auth/logout` with the current refresh token before clearing local state. Server DELETEs the row from `refresh_tokens` table.
**File:** `apps/mobile/store/authStore.ts`

---

### ERR-003: Auth redirect flash on app startup
**Status:** RESOLVED (Phase 0)
**Symptom:** Authenticated users briefly see the login screen before being redirected to the map
**Root Cause:** Two separate `useEffect()` hooks in `_layout.tsx` — the redirect effect fired before `loadFromStorage()` finished, so `user` was null during the first render
**Pattern to avoid:** Separate effects for storage load and navigation redirect without coordination. Never redirect based on auth state before hydration is confirmed.
**Fix:** Redirect effect is gated on `!isLoading && hydrated` — it does nothing until the storage load is complete
**File:** `apps/mobile/app/_layout.tsx`

---

### ERR-004: Multiple `loadFromStorage` calls racing
**Status:** RESOLVED (Phase 0)
**Symptom:** Second call to `loadFromStorage()` overwrites the first with stale/partial state; unpredictable login state on app resume
**Root Cause:** Navigation lifecycle events could trigger multiple `loadFromStorage()` calls concurrently. No guard against re-entrance.
**Pattern to avoid:** Async initialization functions without an idempotency guard. Storage loads and network calls must be idempotent.
**Fix:** `hydrated` boolean flag in Zustand store. `loadFromStorage()` returns immediately if `hydrated === true`. Set `hydrated = true` at end of first successful load.
**File:** `apps/mobile/store/authStore.ts`

---

## MOBILE

### ERR-005: QueryClient cache wiped on hot reload
**Status:** RESOLVED (Phase 0)
**Symptom:** React Query cache is lost on every hot reload in dev; perceived as "always re-fetching"
**Root Cause:** `const queryClient = new QueryClient()` at module scope. In React Native with Metro HMR, the module re-evaluates on hot reload, creating a fresh QueryClient and discarding all cached data.
**Pattern to avoid:** Module-level `new QueryClient()` in React Native. Unlike Next.js (where module scope persists between requests), RN HMR re-evaluates modules.
**Fix:** Create QueryClient inside the component using `useRef` initialized lazily:
```typescript
const queryClientRef = useRef<QueryClient>();
if (!queryClientRef.current) queryClientRef.current = new QueryClient();
```
**File:** `apps/mobile/app/_layout.tsx`

---

## DATABASE

### ERR-006: `updated_at` column never updates
**Status:** RESOLVED (Phase 0)
**Symptom:** `users.updated_at` always equals `users.created_at` regardless of profile changes
**Root Cause:** Migration `001_init.sql` created the `updated_at` column with `DEFAULT NOW()` but no `BEFORE UPDATE` trigger was attached. PostgreSQL does not auto-update timestamp columns.
**Pattern to avoid:** Adding `updated_at` columns without a trigger. `DEFAULT NOW()` only sets the value on INSERT, not UPDATE.
**Fix:** Migration `002_triggers_and_cleanup.sql` creates `set_updated_at()` trigger function and attaches it `BEFORE UPDATE ON users`
**File:** `services/user/src/db/migrations/002_triggers_and_cleanup.sql`

---

### ERR-007: `refresh_tokens` table grows unbounded
**Status:** OPEN — Phase 1 action required
**Symptom:** `refresh_tokens` accumulates expired rows indefinitely; table bloat causes increasingly expensive VACUUM operations at scale
**Root Cause:** No scheduled cleanup job. Tokens expire logically (checked at runtime) but are never physically deleted.
**Pattern to avoid:** Soft-expiry without a scheduled hard-delete. Logical expiry ≠ storage reclamation.
**Fix (partial):** `purge_expired_refresh_tokens()` PL/pgSQL function created in migration 002. Deletes all rows WHERE `expires_at < NOW()`, returns count.
**Remaining action (Phase 1):** Schedule this function as a BullMQ repeatable job, daily at 3am:
```javascript
// In feed service or a dedicated scheduler:
await queue.add('purge-tokens', {}, { repeat: { cron: '0 3 * * *' } });
```
**File:** `services/user/src/db/migrations/002_triggers_and_cleanup.sql`

---

## INFRASTRUCTURE

### ERR-008: EC2 first deploy fails silently
**Status:** DOCUMENTED (not a code bug — operational)
**Symptom:** GitHub Actions SSH deploy succeeds (exit 0) but service is not running on EC2
**Root Cause:** Deploy script assumes `/srv/letus` exists and PM2 is already managing `letus-user`. On first deploy, neither is true. `pm2 restart letus-user` fails if app never started; `pm2 start` succeeds but the process path may be wrong.
**Pattern to avoid:** Deploy scripts that assume pre-existing server state. First-deploy and subsequent deploys are different operations.
**Fix:** Manual one-time EC2 setup required before enabling Actions. See `docs/infra/ec2-deploy.md` for the exact setup sequence.
**File:** `.github/workflows/deploy-backend.yml`

---

### ERR-009: Google Maps renders grey tiles
**Status:** DOCUMENTED (not a code bug — configuration)
**Symptom:** Map screen loads but shows solid grey instead of map tiles; no error thrown in JS
**Root Cause:** `EXPO_PUBLIC_GOOGLE_MAPS_KEY` environment variable is not enough. Expo bakes native API keys into the compiled binary via `app.json`. If `app.json` `ios.config.googleMapsApiKey` / `android.config.googleMaps.apiKey` are not set, the native Maps SDK never receives the key — even if the JS `.env` is correct.
**Pattern to avoid:** Assuming `.env` env vars reach native SDKs. Expo's `EXPO_PUBLIC_*` vars are JS-only. Native SDKs need keys in `app.json` or `app.config.ts`.
**Fix:** Set API key in BOTH:
1. `apps/mobile/.env` → `EXPO_PUBLIC_GOOGLE_MAPS_KEY=...`
2. `apps/mobile/app.json` → `ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey`
Then rebuild (not just reload) the native app.
**File:** `apps/mobile/app.json`

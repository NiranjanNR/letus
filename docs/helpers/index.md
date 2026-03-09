# Reusable Helpers Index

**Rule for agents:** Before writing any utility function, grep this file.
If something equivalent exists, use it. Do not duplicate.

**Update this file** when you create a new reusable utility, pattern, or helper.

---

## Backend — User Service

### `config` — Validated environment object
**File:** `services/user/src/config/index.ts`
**Export:** `config` (readonly, fully typed)

```typescript
import { config } from '../config';

// Use:
config.jwtSecret          // string (min 32 chars)
config.refreshSecret      // string
config.port               // number
config.db.max             // number (pool size)
config.allowedOrigins     // string (comma-separated)
config.rateLimitMax       // number
```

**Rule:** Never access `process.env` directly in route or middleware files.
`config` validates at boot and crashes if anything is wrong. `process.env` silently gives
`undefined`.

---

### `pool` — PostgreSQL connection pool
**File:** `services/user/src/db/connection.ts`
**Exports:** `pool`, `verifyDatabaseConnection()`, `closeDatabasePool()`

```typescript
import { pool } from '../db/connection';

// Single query:
const result = await pool.query(
  'SELECT id, username FROM users WHERE id = $1',
  [userId]
);
const user = result.rows[0];

// Transaction:
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', [...]);
  await client.query('UPDATE ...', [...]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();  // Always release back to pool
}
```

**Rule:** Never create a new `pg.Pool` in a route file. One pool per service process.

---

### `requireAuth` — JWT verification middleware
**File:** `services/user/src/middleware/jwt.ts`
**Exports:** `requireAuth` (Express middleware), `AuthRequest` (type)

```typescript
import { requireAuth, AuthRequest } from '../middleware/jwt';
import { Router, Response } from 'express';

const router = Router();

router.get('/protected', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;  // string — guaranteed by requireAuth
  // ... handler logic
});
```

`requireAuth` reads the `Authorization: Bearer <token>` header, verifies the JWT signature
using `config.jwtSecret`, and attaches `req.userId` (the `sub` claim). Returns `401` if
the header is missing, malformed, expired, or has an invalid signature.

---

### `createRateLimiter` — In-memory rate limiter factory
**File:** `services/user/src/middleware/rateLimit.ts`
**Exports:** `createRateLimiter(options)`, `authLimiter` (pre-configured instance)

```typescript
import { createRateLimiter, authLimiter } from '../middleware/rateLimit';

// Use the pre-configured auth limiter:
router.post('/login', authLimiter, handler);

// Or create a custom limiter:
const strictLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
router.post('/sensitive', strictLimiter, handler);
```

**Phase 0:** In-memory (Map). Resets on process restart, not shared across instances.
**Phase 1:** Replace with Kong Gateway plugin — call sites unchanged, just remove middleware import.

---

### Standard error handler pattern
**Not a file — a code convention.**

Use this pattern in every route handler:

```typescript
router.post('/route', async (req, res) => {
  try {
    // ... handler logic

    // PostgreSQL unique violation:
    // if (e.code === '23505') return res.status(409).json({ error: 'Already exists' });

    return res.status(200).json({ result });
  } catch (e: any) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Email or username already taken' });
    }
    console.error('[user-service] /route error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
});
```

Rules:
- Log with `[service-name]` prefix so logs are greppable by service
- Never send `e.message` to the client — it may contain SQL or internal details
- Handle `pg` error code `23505` (unique violation) explicitly as 409
- Handle `pg` error code `23503` (foreign key violation) explicitly as 400

---

## Mobile — React Native

### `apiFetch` — Central API client
**File:** `apps/mobile/lib/apiClient.ts`
**Exports:** `apiFetch`, `setTokens`, `API_URL`

```typescript
import { apiFetch } from '@/lib/apiClient';

// Use exactly like fetch():
const res = await apiFetch('/auth/me');
if (!res.ok) throw new Error('Failed');
const data = await res.json();

// POST:
const res = await apiFetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

**What apiFetch does automatically:**
- Prepends `API_URL` (from env) to the path
- Attaches `Authorization: Bearer <accessToken>` if a token is set
- On 401 response: calls `POST /auth/refresh`, retries with new token
- Queues concurrent requests that get 401 — runs refresh only once
- If refresh fails: calls `authStore.logout()` and throws

**Rule:** Never use `fetch()` directly in screen files. Always use `apiFetch`.
Direct `fetch()` skips auth headers and the token refresh logic.

---

### `useAuthStore` — Zustand auth store
**File:** `apps/mobile/store/authStore.ts`
**Export:** `useAuthStore` (Zustand hook)

```typescript
import { useAuthStore } from '@/store/authStore';

// In a component:
const { user, isLoading, hydrated } = useAuthStore();
const { login, logout, loadFromStorage } = useAuthStore();

// Check auth state:
if (!hydrated || isLoading) return <LoadingScreen />;
if (!user) return <LoginPrompt />;
return <AuthenticatedContent user={user} />;
```

**Key fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user` | User \| null | Current user object, null if not logged in |
| `accessToken` | string \| null | Current access token |
| `isLoading` | boolean | True while storage read or network call is in progress |
| `hydrated` | boolean | True after `loadFromStorage()` completes (idempotent guard) |

**Key actions:**
| Action | Description |
|--------|-------------|
| `login(user, accessToken, refreshToken)` | Sets state, persists to Keychain, syncs to apiClient |
| `logout()` | Calls `POST /auth/logout`, clears Keychain, resets state |
| `loadFromStorage()` | Reads Keychain, validates refresh token. Safe to call multiple times. |

**Rule:** Always check `hydrated === true` before making redirect decisions based on `user`.
The store is not synchronously initialized — Keychain reads are async.

---

## Patterns

### Explicit column SELECT
```sql
-- Always:
SELECT id, username, email, avatar_url, is_verified, xp FROM users WHERE id = $1

-- Never:
SELECT * FROM users WHERE id = $1
```
Why: New columns (like `password_hash`, internal audit fields) must be explicitly opted in.
See: `docs/architecture/adr/007-no-select-star.md`

### `config.X` not `process.env.X`
```typescript
// Always:
import { config } from '../config';
const secret = config.jwtSecret;

// Never:
const secret = process.env.JWT_SECRET;
```
Why: `process.env` gives `undefined` silently. `config` crashes at boot.
See: `docs/architecture/adr/008-config-validation-at-boot.md`

### QueryClient initialization in React Native
```typescript
// Always (inside component with useRef):
const queryClientRef = useRef<QueryClient>();
if (!queryClientRef.current) {
  queryClientRef.current = new QueryClient({ defaultOptions: { ... } });
}

// Never (module scope):
const queryClient = new QueryClient();
```
Why: Module-level instantiation loses cache on Metro hot reload.
See: `docs/errors/log.md` ERR-005

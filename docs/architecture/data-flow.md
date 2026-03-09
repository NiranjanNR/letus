# Data Flow — Request Lifecycle

## Login Flow (Cold Start)

```
User types email + password → taps Login
        │
        ▼
login.tsx
  • Calls apiFetch('POST /auth/login', { email, password })
        │
        ▼
apiClient.ts → apiFetch()
  • Constructs: POST http://localhost:3000/auth/login
  • Headers: Content-Type: application/json
  • Body: { email, password }
  • No Authorization header (login is unauthenticated)
        │
        ▼ HTTPS
        │
services/user/src/index.ts
  • express.json({ limit: '10kb' }) parses body
  • cors() checks origin
        │
        ▼
services/user/src/middleware/rateLimit.ts (authLimiter)
  • Checks IP in in-memory Map
  • If > 20 requests in 15 min window → 429 Too Many Requests
        │ (passes)
        ▼
services/user/src/routes/auth.ts → POST /auth/login
  • Validates body with zod: { email: string, password: string }
  • SELECT id, username, email, password_hash FROM users WHERE email = $1
  │
  ├── User NOT found:
  │   • bcrypt.compare(password, DUMMY_HASH) — always runs (~100ms)
  │   • Returns 401 { error: 'Invalid credentials' }
  │
  └── User found:
      • bcrypt.compare(password, user.password_hash) — ~100ms
      │
      ├── Password wrong:
      │   • Returns 401 { error: 'Invalid credentials' }
      │
      └── Password correct:
          • jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '15m' })
            → accessToken
          • jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: '7d' })
            → refreshToken
          • INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (...)
          • Returns 200 { user: { id, username, email, ... }, accessToken, refreshToken }
        │
        ▼ Response
        │
apiClient.ts → apiFetch() returns Response
        │
        ▼
login.tsx
  • res.json() → { user, accessToken, refreshToken }
  • authStore.login(user, accessToken, refreshToken)
        │
        ▼
authStore.ts → login()
  • SecureStore.setItem('accessToken', accessToken)
  • SecureStore.setItem('refreshToken', refreshToken)
  • SecureStore.setItem('user', JSON.stringify(user))
  • Sets Zustand state: { user, accessToken, isLoading: false }
  • Calls setTokens(accessToken, refreshToken) → apiClient.ts stores tokens in module scope
        │
        ▼
_layout.tsx
  • useAuthStore watches user
  • user is now set → router.replace('/(tabs)') — navigate to map
```

---

## Authenticated Request (e.g., GET /auth/me)

```
profile.tsx mounts → fires apiFetch('/auth/me')
        │
        ▼
apiClient.ts → apiFetch()
  • Authorization: Bearer <accessToken> (from module-scope token variable)
  • GET http://localhost:3000/auth/me
        │
        ▼
routes/auth.ts → GET /auth/me
  • requireAuth middleware:
      jwt.verify(token, JWT_SECRET) → { sub: userId, exp: ... }
      if expired → 401
      req.userId = userId
  • SELECT id, username, email, avatar_url, bio, district, is_verified, xp
    FROM users WHERE id = $1
  • Returns 200 { user: { ... } }
```

---

## Token Refresh Flow (Access Token Expired)

```
Any screen fires apiFetch('/some-endpoint')
        │
        ▼
apiClient.ts → apiFetch()
  • Attaches expired accessToken
  • Server returns 401 Unauthorized
        │
        ▼
apiClient.ts → on 401
  • Is a refresh already in progress?
  │
  ├── YES: Enqueue this request, await existing refresh promise
  │
  └── NO: Start refresh
      • refreshPromise = doRefresh()
      • POST /auth/refresh { refreshToken }
              │
              ▼
      routes/auth.ts → POST /auth/refresh
        • Verify refreshToken JWT signature
        • SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()
        │
        ├── Not found (used/expired/revoked):
        │   • Returns 401
        │   • apiClient calls authStore.logout()
        │   • User sees login screen
        │
        └── Found:
            • DELETE FROM refresh_tokens WHERE token = $1
            • Generate new accessToken (15m) + new refreshToken (7d)
            • INSERT INTO refresh_tokens (new token)
            • Returns 200 { accessToken, refreshToken }
              │
              ▼
      apiClient.ts
        • setTokens(newAccessToken, newRefreshToken) — updates module scope
        • authStore updates SecureStore
        • Retries original request with new accessToken
        • Resolves all queued requests with same new token
```

---

## App Cold Start (Returning User)

```
App launches → _layout.tsx mounts
        │
        ▼
useEffect: authStore.loadFromStorage()
  • if (hydrated) return; // idempotency guard
  • SecureStore.getItem('user') → JSON.parse
  • SecureStore.getItem('accessToken')
  • SecureStore.getItem('refreshToken')
        │
        ├── Nothing in storage (new install / logged out):
        │   • Sets user = null, isLoading = false
        │   • _layout effect: !user + !isLoading → router.replace('/auth/login')
        │
        └── Tokens found in storage:
            • Attempt POST /auth/refresh (validate stored refresh token is still valid)
            │
            ├── Refresh succeeds → store new tokens, set user in state
            │   • _layout: user set → router.replace('/(tabs)') → map screen
            │
            └── Refresh fails (7-day token expired):
                • authStore.logout() clears storage
                • router.replace('/auth/login')
```

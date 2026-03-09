# Feature: Authentication

## What It Does (Plain English)

Users can create accounts, log in, and stay logged in for up to 7 days without entering
their password again. The app automatically renews their session in the background. If a
session expires or is stolen, the user is safely logged out.

---

## The Token System

Authentication uses **two tokens**:

| Token | Lifespan | Stored In | Used For |
|-------|----------|-----------|----------|
| Access Token | 15 minutes | Memory (Zustand) | Every API request |
| Refresh Token | 7 days | iOS Keychain | Getting a new access token |

### Why two tokens instead of one long-lived token?

If you had a single 7-day token and it was stolen from an HTTP log, the attacker has 7 days
of unrestricted access. With two tokens:

- The **access token** that's sent with every request expires in 15 minutes. A stolen access
  token is useless after 15 minutes.
- The **refresh token** that could renew it lives only in the iOS Keychain — not in logs,
  not in memory, not in HTTP headers (except when explicitly refreshing).

---

## Token Rotation — How Theft Is Detected

Every time a refresh token is used, the server **deletes it** and issues a new one.
This is called "single-use rotation."

**What happens if a token is stolen:**
1. Attacker steals the refresh token from a device
2. Attacker uses it to get a new access token — server rotates (deletes old, issues new)
3. The original device's next refresh call fails — that token no longer exists
4. User is forced to log in again
5. The new login invalidates the attacker's access token after 15 minutes

See: `docs/architecture/adr/002-refresh-token-rotation.md`

---

## Registration

[SCREENSHOT: Signup screen with username, email, password fields]

**Endpoint:** `POST /auth/register`

**Request:**
```json
{ "username": "niranjan", "email": "niranjan@example.com", "password": "mypassword123" }
```

**Validation:**
- Username: 3–30 characters, alphanumeric + underscore only
- Password: minimum 8 characters
- Email: stored lowercase and trimmed

**Response:**
```json
{
  "user": { "id": "...", "username": "niranjan", "email": "...", "xp": 0 },
  "accessToken": "<15-min JWT>",
  "refreshToken": "<7-day JWT>"
}
```

After successful registration, the mobile app immediately calls `authStore.login()` and
navigates to the map — no separate login step required.

---

## Login

[SCREENSHOT: Login screen with email and password fields]

**Endpoint:** `POST /auth/login`

**Security note:** The server always runs `bcrypt.compare()` regardless of whether the email
exists. This prevents attackers from timing the response to discover valid email addresses.
See: `docs/architecture/adr/001-timing-safe-auth.md`

---

## Session Persistence (App Restart)

When the app launches, `_layout.tsx` calls `authStore.loadFromStorage()`:
1. Reads tokens from iOS Keychain (expo-secure-store)
2. Tries `POST /auth/refresh` to validate the stored refresh token
3. If valid → user is silently logged in, navigated to map
4. If expired/invalid → user sees login screen

This means users stay logged in across app restarts for up to 7 days.

---

## Files Involved

| File | Role |
|------|------|
| `services/user/src/routes/auth.ts` | All 5 endpoints |
| `services/user/src/middleware/jwt.ts` | `requireAuth` middleware |
| `services/user/src/middleware/rateLimit.ts` | Brute-force protection |
| `services/user/src/db/migrations/001_init.sql` | `users` + `refresh_tokens` tables |
| `apps/mobile/lib/apiClient.ts` | Auto-refresh on 401 responses |
| `apps/mobile/store/authStore.ts` | Token persistence and state |
| `apps/mobile/app/auth/login.tsx` | Login screen |
| `apps/mobile/app/auth/signup.tsx` | Signup screen |
| `apps/mobile/app/_layout.tsx` | Auth guard + session restore |

---

## API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Get tokens |
| POST | `/auth/refresh` | No (refresh token in body) | Rotate tokens |
| POST | `/auth/logout` | No (refresh token in body) | Invalidate refresh token |
| GET | `/auth/me` | Yes (Bearer token) | Get current user profile |

---

## Rate Limiting

Auth endpoints are protected by an in-memory rate limiter:
- **Limit:** 20 requests per 15 minutes per IP address
- **Response on limit:** `429 Too Many Requests`
- **Phase 1:** This moves to Kong API Gateway with Redis backend

See: `docs/architecture/adr/003-in-memory-rate-limit.md`

---

## Common Mistakes to Avoid

- **ERR-001:** Don't return early before bcrypt if user not found — see `docs/errors/log.md`
- **ERR-002:** Don't logout client-side only — always call `POST /auth/logout` first
- **ERR-003:** Don't redirect based on auth state before `hydrated === true`
- **ERR-004:** Don't call `loadFromStorage()` without idempotency guard

---

## What Phase 1 Adds

- Email verification (send code, verify, set `is_verified = true`)
- Password reset flow (forgot password → email link → new password)
- Google OAuth sign-in
- `POST /auth/revoke-all` — logout from all devices simultaneously
- Move rate limiting to Kong Gateway

## What Phase 2 Adds

- SMS verification (for the `phone` column already in schema)
- 2FA (TOTP)

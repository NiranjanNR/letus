# User Service — Complete Reference

**Location:** `services/user/`
**Status:** Phase 0 — implemented and ready for first deployment
**Stack:** Node.js 20 + Express + TypeScript + PostgreSQL (pg) + bcryptjs + jsonwebtoken + zod

---

## Purpose

Handles all user identity concerns: registration, login, session management (JWT + refresh
tokens), and user profile retrieval. Phase 0's only backend service.

---

## API Endpoints

### `POST /auth/register`
Create a new user account.

**Request body:**
```json
{ "username": "string (3-30 chars)", "email": "string", "password": "string (8+ chars)" }
```

**Success (201):**
```json
{
  "user": { "id": "uuid", "username": "string", "email": "string", "xp": 0, "created_at": "iso8601" },
  "accessToken": "string (JWT, 15min)",
  "refreshToken": "string (JWT, 7d)"
}
```

**Errors:**
- `400` — validation failed (missing fields, password too short, etc.)
- `409` — email or username already exists (pg error code `23505`)
- `429` — rate limited

---

### `POST /auth/login`
Authenticate with email + password.

**Request body:**
```json
{ "email": "string", "password": "string" }
```

**Success (200):** Same shape as register response.

**Errors:**
- `400` — missing fields
- `401` — invalid credentials (always runs bcrypt — see ADR-001)
- `429` — rate limited

---

### `POST /auth/refresh`
Exchange a valid refresh token for a new access + refresh token pair.

**Request body:**
```json
{ "refreshToken": "string" }
```

**Success (200):**
```json
{ "accessToken": "string (JWT, 15min)", "refreshToken": "string (JWT, 7d)" }
```

**Errors:**
- `400` — missing refreshToken
- `401` — token not found in DB (used, expired, or revoked)
- `401` — token JWT signature invalid

**Side effect:** Old refresh token is deleted from DB. New token inserted.

---

### `POST /auth/logout`
Invalidate a refresh token server-side.

**Request body:**
```json
{ "refreshToken": "string" }
```

**Success (200):**
```json
{ "success": true }
```

This endpoint always returns 200 — even if the token wasn't found (idempotent logout).

---

### `GET /auth/me`
Get the current user's profile. Requires a valid access token.

**Headers:** `Authorization: Bearer <accessToken>`

**Success (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "avatar_url": null,
    "bio": null,
    "district": null,
    "is_verified": false,
    "xp": 0,
    "created_at": "iso8601"
  }
}
```

**Errors:**
- `401` — missing, invalid, or expired token

---

### `GET /health`
Health check for load balancers and deploy scripts.

**Success (200):**
```json
{ "status": "ok", "timestamp": "iso8601" }
```

This endpoint also verifies the DB connection is alive. If the DB is down, it returns 503.

---

## Internal Architecture

```
index.ts
  └── Registers middleware: cors, json body parser, routes
  └── Starts HTTP server
  └── Registers SIGTERM/SIGINT handler (graceful shutdown)

config/index.ts
  └── Reads + validates all env vars with Zod at startup
  └── Crashes process.exit(1) if any required var missing

db/connection.ts
  └── Creates single pg.Pool instance (max 20 connections)
  └── Exports: pool, verifyDatabaseConnection(), closeDatabasePool()

middleware/jwt.ts
  └── requireAuth: verifies Bearer token, attaches req.userId
  └── AuthRequest type extends Express.Request with userId: string

middleware/rateLimit.ts
  └── createRateLimiter(options) factory function
  └── authLimiter: pre-configured instance for auth routes

routes/auth.ts
  └── All 5 endpoints
  └── Uses pool directly (no ORM)
  └── All queries use explicit column lists (ADR-007)

scripts/migrate.js
  └── Reads all .sql files from db/migrations/ alphabetically
  └── Executes each in a transaction
  └── Run with: cd services/user && yarn migrate
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Min 32 chars; signs access tokens |
| `REFRESH_SECRET` | Yes | — | Min 32 chars; signs refresh tokens; different from JWT_SECRET |
| `PORT` | No | 3000 | HTTP server port |
| `NODE_ENV` | No | development | `production` disables stack traces in errors |
| `ALLOWED_ORIGINS` | No | localhost variants | Comma-separated CORS allowlist |
| `DB_POOL_MAX` | No | 20 | Max PostgreSQL connections |
| `DB_IDLE_TIMEOUT_MS` | No | 30000 | Idle connection timeout |
| `DB_CONNECT_TIMEOUT_MS` | No | 5000 | Connection acquisition timeout |
| `RATE_LIMIT_MAX` | No | 20 | Requests per window per IP |

---

## Running Locally

```bash
# From repo root
cd infra && docker compose up -d      # Start Postgres
cd ../services/user
cp ../../.env.example .env            # Edit .env with real secrets
yarn install
yarn migrate                          # Run migrations
yarn dev                              # Start with ts-node (watch mode)
```

---

## Security Checklist

- [x] Config validation crashes at boot (ADR-008)
- [x] bcrypt cost 12 with timing-safe auth (ADR-001)
- [x] Single-use refresh token rotation (ADR-002)
- [x] In-memory rate limiting 20/15min/IP (ADR-003)
- [x] CORS allowlist (ADR-009)
- [x] 10kb body limit (ADR-010)
- [x] Graceful shutdown (ADR-005)
- [x] No SELECT * (ADR-007)
- [x] Explicit column RETURNING in INSERT (ADR-007)
- [x] Password hash never returned to client
- [x] Errors log with `[service]` prefix, never expose e.message to client

---

## What Phase 1 Adds

- `/auth/verify-email` — verify email with one-time code
- `/auth/forgot-password` + `/auth/reset-password`
- `/auth/revoke-all` — invalidate all refresh tokens for a user
- `/users/:id` — public profile endpoint
- `/users/:id/follow` — Phase 2 (after Neo4j social graph)
- Rate limiting moves to Kong Gateway (in-memory limiter removed)

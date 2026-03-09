# Learn Letus — A First-Principles Engineering Guide

> For junior engineers joining the Letus project. This document explains **what** we built, **why** we made each technical decision, and **how** everything fits together — from first principles, not just convention.

---

## Table of Contents

1. [What Is Letus?](#1-what-is-letus)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [System Architecture — The Big Picture](#3-system-architecture--the-big-picture)
4. [Why a Monorepo?](#4-why-a-monorepo)
5. [The Backend: Node.js + Express](#5-the-backend-nodejs--express)
6. [The Database: PostgreSQL + PostGIS](#6-the-database-postgresql--postgis)
7. [Authentication — Deep Dive](#7-authentication--deep-dive)
8. [The Mobile App: React Native + Expo](#8-the-mobile-app-react-native--expo)
9. [Infrastructure: Docker, EC2, GitHub Actions](#9-infrastructure-docker-ec2-github-actions)
10. [Security Rules and Why They Exist](#10-security-rules-and-why-they-exist)
11. [The Phase Roadmap — How We Think About Growth](#11-the-phase-roadmap--how-we-think-about-growth)
12. [Key Patterns You Must Follow](#12-key-patterns-you-must-follow)
13. [How to Navigate the Codebase](#13-how-to-navigate-the-codebase)

---

## 1. What Is Letus?

Letus is a **city-based social discovery platform**. Imagine Google Maps combined with Instagram Stories, but scoped entirely to your city.

The core loop:
- A user walks into a coffee shop, records a short moment, and posts it from that location.
- Other users nearby see that post appear as a pin on a live map.
- The city becomes a canvas of real-time human activity.

**Phase 0 (where we are today):** The foundation is complete — user accounts, authentication, and the map screen with a GPS blue dot. No posts or discovery yet; that is Phase 1.

---

## 2. The Problem We're Solving

Before writing a single line of code, good engineers ask: **what is the actual problem?**

| User Problem | Engineering Problem |
|---|---|
| "I don't know what's happening near me right now." | Real-time geospatial queries on posts |
| "I want to discover places through people, not algorithms." | Location-first feed ranking |
| "Social apps feel global and anonymous." | City-scoped identity and content |

From these problems flow the architectural choices. Every decision in this document traces back to one of these three user needs.

---

## 3. System Architecture — The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS Device                               │
│   React Native (Expo) — Map UI, Auth UI, Feed (Phase 1)        │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTPS (JSON REST)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EC2 t3.micro (Ubuntu 22.04)                   │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              User Service (Node.js + Express)            │  │
│   │   /auth/register  /auth/login  /auth/refresh             │  │
│   │   /auth/logout    /auth/me     /health                   │  │
│   └────────────────────────┬─────────────────────────────────┘  │
│                            │  pg (node-postgres)                │
│   ┌────────────────────────▼─────────────────────────────────┐  │
│   │           PostgreSQL 15 + PostGIS extension               │  │
│   │   users · refresh_tokens · posts (skeleton)              │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**The key insight:** In Phase 0, everything lives in one box. One EC2 instance, one process, one database. This is intentional — not laziness.

### Why Start Simple?

First-principles thinking applied to distributed systems: **complexity has a cost**. Every microservice you add is:
- Another thing that can fail
- Another network hop that adds latency
- Another deployment you must maintain
- Another place a bug can hide

The architecture evolves only when the problem demands it. Phase 0 proves the product works. Phase 1 adds services when user load and feature complexity justify it.

---

## 4. Why a Monorepo?

A **monorepo** means all code — mobile app, backend services, infrastructure config — lives in one Git repository.

```
letus/
├── apps/mobile/          ← React Native app
├── services/user/        ← Backend (Phase 0, only working service)
├── services/feed/        ← Phase 1 stub
├── services/media/       ← Phase 1 stub
├── infra/                ← Docker Compose
├── docs/                 ← All documentation
└── .github/workflows/    ← CI/CD pipelines
```

**Why not separate repos?**

| Separate Repos | Monorepo |
|---|---|
| Share types between mobile + backend? Copy-paste or publish npm package | Import directly, always in sync |
| Change an API endpoint? Update 2 repos, coordinate PRs | One PR, one review, atomic change |
| Find where a bug originates? Switch repos, match commit times | `git log` across everything |
| Onboard a new engineer? Clone 5 repos, set up 5 environments | Clone one repo |

The cost: the repo gets larger. At our scale (Phase 0 → Phase 1), that cost is near zero.

---

## 5. The Backend: Node.js + Express

### Why Node.js?

First-principles question: **what does our backend actually do?**

A REST API for a social app is almost entirely **I/O bound**:
- Wait for the database to return rows
- Wait for the network to send bytes
- Wait for bcrypt to hash a password

It is almost never **CPU bound** (doing heavy computation).

Node.js is built on an **event loop** — a single thread that handles thousands of concurrent connections by not blocking while waiting for I/O. When a database query runs, Node doesn't sit idle; it handles other requests. This makes Node.js exceptionally efficient for I/O-heavy workloads.

**Why not Go or Python?**
- Python (Flask/FastAPI): Fine choice, but the team knows JS/TS.
- Go: Excellent for CPU-heavy or high-concurrency services — we use it for the Place Service in Phase 1 precisely because proximity queries are CPU-heavier.
- Node + Express: Fast to write, TypeScript gives you type safety, massive ecosystem.

### Why Express over NestJS, Fastify, etc.?

Express is the minimum viable framework. It does routing and middleware — nothing more. You see every line of code that runs. For a Phase 0 project with 6 endpoints, adding NestJS's decorators, DI container, and module system would be over-engineering.

**Rule of thumb:** Add abstraction only when the pain of not having it is real, not anticipated.

### Why TypeScript?

Type safety at compile time catches entire categories of bugs before they reach production:
- Passing a `string` where a `number` is expected
- Forgetting to handle a `null` case
- Misspelling a property name

TypeScript pays for itself the first time it saves you a 2am debugging session.

---

## 6. The Database: PostgreSQL + PostGIS

### Why PostgreSQL?

PostgreSQL is the correct default database for 99% of applications. Here's why:

| Feature | Why It Matters for Letus |
|---|---|
| ACID transactions | User register + token insert either both succeed or both fail. No partial state. |
| Strong consistency | A user logs out; the token is immediately invalid everywhere. No eventual consistency lag. |
| Rich query language | Complex geospatial queries, JOINs, aggregations — SQL handles it all. |
| PostGIS extension | Geospatial superpowers built into the database itself. |
| UUID primary keys | No sequential ID leakage, globally unique across services. |

**Why not MongoDB?** MongoDB is a document store optimized for flexible schemas and horizontal write scaling. Letus has a well-defined, relational schema (users have posts; posts have locations; tokens belong to users). A relational database with strong guarantees is the right tool.

**Why not Redis as the primary store?** Redis lives in RAM — it's fast but expensive and not durable by default. It becomes valuable in Phase 1 as a cache layer (feed ranking, session storage), but not as the source of truth.

### Why PostGIS? (First Principles on Geospatial Data)

Letus is fundamentally a location app. The core query is: **"give me all posts within X meters of this point."**

Naive approach: Store latitude and longitude as two floats, fetch all posts, filter in application code.

Problems with naive approach:
1. Fetches millions of rows over the network
2. Filters in the application process (single-threaded, slow)
3. No index on a float pair means full table scan
4. Distance calculation in a flat coordinate system is wrong near the poles

PostGIS solution:
- Stores coordinates as `GEOGRAPHY(POINT, 4326)` — a proper sphere-aware type
- Uses GIST spatial indexes — tree structures that partition space so queries touch only relevant rows
- `ST_DWithin(location, center_point, radius_meters)` runs inside the database, returns only matching rows
- Correct distance calculations on a sphere (WGS84 ellipsoid, what GPS uses)

**Rule: Use PostGIS from day one.** Adding it later means migrating existing location data. The cost of enabling it early is near zero; the cost of adding it later is high.

### Database Schema Design

```
users
  id              UUID PRIMARY KEY
  email           TEXT UNIQUE NOT NULL
  username        TEXT UNIQUE NOT NULL
  password_hash   TEXT NOT NULL          ← never store plaintext passwords
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ            ← auto-updated by trigger

refresh_tokens
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE
  token_hash      TEXT UNIQUE NOT NULL   ← never store raw tokens
  expires_at      TIMESTAMPTZ NOT NULL
  created_at      TIMESTAMPTZ

posts (Phase 1 skeleton)
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  location        GEOGRAPHY(POINT, 4326) ← PostGIS type
  created_at      TIMESTAMPTZ
```

**Why UUIDs instead of auto-incrementing integers?**

If you use `id = 1, 2, 3...`, an attacker can:
- Enumerate all users by guessing IDs
- Know your total user count from the highest ID
- Guess adjacent records

UUIDs are 128-bit random values. There's no pattern to enumerate. When you eventually split into multiple services (Phase 1+), each service can generate IDs independently without coordination, because UUID collisions are statistically impossible.

### Migrations

A **migration** is a versioned SQL file that transforms the database schema. Instead of manually running `ALTER TABLE` statements in production (terrifying), we have:

```
migrations/
  001_init.sql              ← creates users, refresh_tokens, posts tables
  002_triggers_and_cleanup.sql ← auto-updates updated_at, adds purge function
```

Migrations run in alphabetical order. They are **append-only** — never edit an existing migration. If you need to change something, write a new migration (`003_...sql`). This creates an auditable history of every schema change.

---

## 7. Authentication — Deep Dive

Authentication is the most security-critical part of the system. Every decision here was made to prevent real attack vectors.

### The Token System: Two-Token Architecture

We use **two JWT tokens**, not one:

```
Access Token  ← short-lived (15 minutes), sent with every API request
Refresh Token ← long-lived (7 days), used only to get new access tokens
```

**Why two tokens?**

If you only had one long-lived token:
- Stored in memory (lost on app close) → user logs in constantly
- Stored on disk → if stolen, attacker has 7-day access
- No way to revoke without a database check on every request

The two-token pattern solves this:
- **Access token** is short-lived → if stolen, expires in 15 minutes
- **Refresh token** is long-lived but stored in the database → can be revoked instantly
- Every API call validates the access token **without hitting the database** (JWT is cryptographically self-verifying)
- Database is only hit at refresh time (every 15 minutes), not on every request

### Refresh Token Rotation (Single-Use)

Every time you use a refresh token to get a new access token, the old refresh token is **deleted** and a new one is issued.

**Why?** This detects token theft:
- Attacker steals your refresh token
- You and attacker both try to refresh
- One of you succeeds, the other gets a "token already used" error
- The server detects the collision and can invalidate all tokens for that user

Without rotation, a stolen refresh token gives an attacker silent 7-day access.

### Timing-Safe Authentication

Naive login check:
```
1. Find user by email → if not found, return "Invalid credentials"
2. Check password → if wrong, return "Invalid credentials"
```

**Attack:** An attacker sends login attempts with different emails. Step 1 fails fast (no database row). If the email exists, step 2 runs bcrypt (slow, ~100ms). Attacker measures response time → emails that take longer exist in the system.

This is a **timing oracle** — information leak through response time.

Our fix: **always run bcrypt**, even when the user doesn't exist (compare against a dummy hash). Both code paths take the same time. Response time reveals nothing.

### Rate Limiting

All auth endpoints are rate-limited: **20 requests per 15 minutes per IP address**.

This defeats brute-force attacks. Without rate limiting, an attacker can try millions of password combinations. With it, they can try 20. bcrypt makes each attempt take ~100ms, so 20 attempts × 100ms = 2 seconds to exhaust the rate limit window for that IP.

### Password Storage

Passwords are **never stored in plaintext or even with fast hashes** (MD5, SHA-256). We use **bcrypt** — a deliberately slow hashing algorithm. Even if the database is stolen, cracking bcrypt hashes requires years of computation per password (with modern hardware and proper cost factor).

---

## 8. The Mobile App: React Native + Expo

### Why React Native?

Letus is iOS-first (Phase 0). The options:

| Option | Pros | Cons |
|---|---|---|
| Swift (native iOS) | Best performance, full API access | iOS only, different codebase from Android |
| React Native | One codebase for iOS + Android, web-like dev experience | Thin JS-to-native bridge layer |
| Flutter | One codebase, compiled, good performance | Different language (Dart), smaller ecosystem |

React Native wins for a startup because:
- Web developers can contribute immediately (JavaScript/TypeScript)
- One codebase serves iOS today, Android later
- Expo abstracts away Xcode configuration pain

### Why Expo?

Expo is a layer on top of React Native that:
- Handles native build configuration (no touching Xcode project files for standard features)
- Provides `expo-location` (GPS), `expo-secure-store` (Keychain), `expo-camera`, etc. — pre-integrated native modules
- Enables **EAS Build** — cloud-based iOS builds (no Mac required for CI)
- Enables **OTA updates** — push JavaScript updates without App Store review

**SDK 52** is the current version. Expo releases major SDK versions every ~6 months.

### State Management: Zustand

Zustand is a minimal state management library. The auth state lives here:

```
authStore:
  user            ← the logged-in user object (or null)
  accessToken     ← current JWT (or null)
  isLoading       ← are we checking the stored session?
  login()         ← stores tokens, updates user
  logout()        ← clears everything
  loadFromStorage() ← called once on app start, restores session from Keychain
```

**Why not Redux?** Redux requires boilerplate (actions, reducers, selectors) that is out of proportion to our state complexity. Zustand is 3-5x less code for the same result.

**Why not React Context?** Context re-renders every subscriber on every change. For auth state (changes rarely), it's fine, but Zustand's selector system means components only re-render when the specific slice they subscribe to changes.

### Secure Token Storage: Keychain

Tokens are stored in the **iOS Keychain** via `expo-secure-store`, not in `AsyncStorage`.

- `AsyncStorage` → plain text file on disk → accessible if device is compromised
- iOS Keychain → encrypted, hardware-backed on devices with Secure Enclave, not backed up to iCloud in plaintext

Tokens are secrets. Store them in the secrets vault the OS provides.

### The Central API Client (`apiFetch`)

Every network request goes through `apps/mobile/lib/apiClient.ts`. It:
1. Attaches the `Authorization: Bearer <token>` header automatically
2. Detects `401 Unauthorized` responses
3. Automatically calls `/auth/refresh` to get new tokens
4. Retries the original request with the new token
5. Logs the user out if refresh also fails

**Why centralize this?** The alternative is handling token expiry in every single screen component. That's 20 different places that could have subtle bugs. Centralizing it means the logic is written and tested once.

**Rule: Never use `fetch()` directly in mobile code. Always use `apiFetch()`.** (ADR-006)

### Map Screen Architecture

The home screen is the core product surface:
- **Google Maps** renders the base map with satellite/terrain imagery
- **`expo-location`** gets the user's GPS coordinates
- A **blue dot** (user location) updates as the user moves
- A **bottom sheet** slides up with a draggable handle (snap points: 10%, 40%, 90%)
- **Filter chips** (Hot Now, Cafés, Food, Nightlife, Parks) sit above the sheet — Phase 1 will wire these to actual queries

The bottom sheet uses the library `@gorhom/bottom-sheet` which handles the gesture animation, snap points, and keyboard avoidance correctly on iOS. Building this from scratch with Animated API would take weeks and still not handle all edge cases.

---

## 9. Infrastructure: Docker, EC2, GitHub Actions

### Local Development: Docker Compose

Running PostgreSQL + PostGIS locally requires:
- PostgreSQL 15 installed with PostGIS extension
- Correct configuration, user, password, database name

Without Docker, every developer runs a slightly different setup → "works on my machine" bugs.

With Docker Compose (`infra/docker-compose.yml`):
```
docker compose up -d
```
Every developer runs identical Postgres with PostGIS, same version, same config. The database is ephemeral and disposable — trash it, recreate it in seconds.

### Production: EC2 t3.micro

**Why not serverless (Lambda)?**
- Lambda cold starts add 500ms-1s latency to the first request after idle
- Long-lived database connections (connection pooling) don't work well on Lambda — each invocation might open a new connection, exhausting PostgreSQL's connection limit
- Express + pg pool is designed for a long-running process; it fits EC2 naturally

**Why t3.micro?**
- Phase 0: Zero users. A t3.micro (2 vCPU burstable, 1GB RAM) comfortably runs the Node process + PostgreSQL for dev/early prod.
- Cost: ~$8/month
- Scaling plan: Vertical scale first (t3.small → t3.medium → t3.large), horizontal scale (multiple EC2 behind load balancer) in Phase 1, Kubernetes in Phase 3.

**Why PM2?**
PM2 is a process manager for Node.js. It:
- Restarts the server automatically if it crashes
- Runs the process in the background (survives SSH session close)
- Provides `pm2 logs` for real-time log streaming
- Supports zero-downtime restarts (`pm2 reload`)

Systemd is the alternative, but PM2 is purpose-built for Node and easier to configure.

### CI/CD: GitHub Actions

Two pipelines:

**Backend Deploy** (`.github/workflows/deploy-backend.yml`):
```
Push to main → SSH into EC2 → git pull → yarn install → yarn migrate → pm2 reload
```
Every push to `main` automatically deploys to production. No manual SSH needed.

**iOS Build** (`.github/workflows/eas-build.yml`):
```
Push to main → EAS cloud builds iOS binary → submits to TestFlight → testers install
```
EAS (Expo Application Services) builds the iOS binary in Expo's cloud infrastructure — no Mac, no Xcode, no certificate management on the developer's machine.

### Graceful Shutdown (SIGTERM)

When EC2 reboots or `pm2 reload` runs, the OS sends SIGTERM to our process. If the process dies immediately:
- In-flight requests are killed mid-response → client gets a connection reset error
- Database transactions are abandoned → potential data corruption

Our server listens for SIGTERM and:
1. Stops accepting new connections
2. Waits for in-flight requests to complete (up to 10 seconds)
3. Closes the database pool cleanly
4. Exits

This is called **graceful shutdown**. It's the difference between users occasionally seeing errors during deployments vs. never noticing deployments.

---

## 10. Security Rules and Why They Exist

These 10 rules (ADRs) are non-negotiable. Here's the first-principles reasoning for each:

| Rule | Why It Exists |
|---|---|
| **Always run bcrypt** (ADR-001) | Prevent timing oracles from leaking which emails exist |
| **Rotate refresh tokens** (ADR-002) | Detect stolen tokens; limit the blast radius of credential theft |
| **Rate limit all auth routes** (ADR-003) | Defeat brute-force and credential stuffing attacks |
| **PostGIS from day one** (ADR-004) | Retroactively adding geospatial requires painful data migration |
| **Graceful SIGTERM** (ADR-005) | Users don't see errors during deployments |
| **Central `apiFetch()`** (ADR-006) | Token refresh logic written once, tested once, correct everywhere |
| **No `SELECT *`** (ADR-007) | Schema changes can silently break queries that assumed column order; explicit columns are resilient |
| **`config.X` not `process.env.X`** (ADR-008) | Missing env vars cause cryptic runtime errors; validating at boot gives immediate, clear failure |
| **CORS allowlist** (ADR-009) | Wildcard CORS (`*`) allows any website to make authenticated requests on behalf of your users |
| **10kb body limit** (ADR-010) | Without it, a single malicious request with a 1GB body can exhaust server RAM and cause denial of service |

---

## 11. The Phase Roadmap — How We Think About Growth

Good system design evolves the architecture in response to real constraints, not hypothetical future needs.

### Phase 0 — Foundation (COMPLETE)
**What:** Auth + map scaffold
**Architecture:** Single EC2, single Node process, single PostgreSQL
**Why stop here?** There are no users yet. Complexity would slow down the product iteration needed to find product-market fit.

### Phase 1 — Core Discovery Loop (PLANNED)
**What:** Users can post from locations; nearby users see those posts on the map
**New additions:**
- **Place Service** (Go) — reverse geocoding, place CRUD, PostGIS proximity queries. Go is chosen because proximity queries are CPU-heavier than auth, and Go's goroutines handle concurrent geospatial computation more efficiently.
- **Feed Service** (Node.js) — assembles what posts you see, ranks by "vibe score" (recency × engagement × distance). Uses **BullMQ** (Redis-backed job queue) for async fan-out (when you post, your post is fanned out to nearby users' feeds).
- **Media Service** (Python) — video/image processing. Python is chosen because the ML ecosystem (FFmpeg, Pillow, boto3) is richest in Python. Generates presigned S3 URLs so mobile uploads directly to S3 without routing through the server.
- **Kong API Gateway** — replaces the in-memory rate limiter. Kong sits in front of all services: rate limiting, auth, routing in one place.

### Phase 2 — Social Graph (PLANNED)
**What:** Friends, follows, XP system, push notifications
**New additions:**
- **Neo4j** graph database for the social graph — "show me posts from people within 2 hops of my friend network who are near me." Graph databases traverse relationships orders of magnitude faster than SQL JOINs on friend tables.
- **Notification Service** (NestJS) — FCM push notifications.

### Phase 3 — Scale (FUTURE)
**What:** 10,000+ daily active users
**Changes:** PostgreSQL read replicas, Kubernetes for horizontal scaling, Redis Cluster.

**First-principles lesson:** Don't build Phase 3 infrastructure for Phase 0 users. The cost is engineer-months; the benefit is handling load that may never materialize. Solve the problem you have.

---

## 12. Key Patterns You Must Follow

### Config Validation at Boot

```typescript
// CORRECT — crashes immediately with clear error if JWT_SECRET is missing
const secret = config.JWT_SECRET;

// WRONG — crashes at runtime with cryptic "Cannot sign undefined" error
const secret = process.env.JWT_SECRET;
```

**Why:** `config/index.ts` validates all required environment variables when the server starts. Missing config kills the server immediately with a clear message. Without this, missing env vars cause mysterious errors deep in request handlers.

### Explicit SQL Columns

```sql
-- CORRECT
SELECT id, email, username, created_at FROM users WHERE id = $1;

-- WRONG
SELECT * FROM users WHERE id = $1;
```

**Why:** If someone adds a column to `users` (say, `internal_notes`), `SELECT *` silently returns it to the client. Worse, if column order changes, code that uses positional array access breaks silently.

### Error Handling Pattern

```typescript
// All async route handlers catch errors and pass to Express error handler
router.post('/register', async (req, res, next) => {
  try {
    // ...
  } catch (err) {
    next(err); // never swallow errors silently
  }
});
```

### Helpers — Check Before Writing

Before writing any utility function, check `docs/helpers/index.md`. The following already exist:
- Auth middleware (`requireAuth`) — protects routes
- Rate limiter factory (`createRateLimiter`) — creates rate limiters with custom config
- Database pool singleton — shared connection pool
- `apiFetch()` — mobile API client with auto-refresh

Do not duplicate these.

---

## 13. How to Navigate the Codebase

### Finding Any File

```
docs/file-index.md — lists every source file with its purpose and phase
```
Grep it: `grep "auth" docs/file-index.md` to find all auth-related files.

### Understanding Any Decision

```
docs/architecture/adr/   — 10 Architecture Decision Records
```
Every non-obvious technical choice has a numbered ADR explaining the alternatives considered, the decision made, and the rationale.

### Known Bugs and Gotchas

```
docs/errors/log.md   — 9 documented bugs (never delete entries, mark RESOLVED)
```
Before debugging a strange issue, check here first. ERR-009 (Google Maps grey tiles) will save you an hour of confusion.

### Running the System

```bash
# 1. Start the database
cd infra && docker compose up -d

# 2. Run migrations
cd services/user && yarn migrate

# 3. Start the backend
cd services/user && yarn dev

# 4. Verify it works
curl http://localhost:3000/health

# 5. Start the mobile app
cd apps/mobile && npx expo start
# Press 'i' for iOS simulator
```

### Environment Variables

Copy `.env.example` to `.env` and fill in values. Never commit `.env`. The server crashes at boot if required variables are missing — this is by design.

---

## Summary: The First-Principles Mindset

Every decision in Letus follows the same reasoning pattern:

1. **What is the actual problem?** (Not "what's the trendy solution?")
2. **What are the constraints?** (Team size, budget, user count, timeline)
3. **What is the simplest solution that solves the problem within constraints?**
4. **What are the failure modes?** (Security, reliability, data integrity)
5. **When will this solution stop working?** (Plan the next evolution, don't build it yet)

The codebase you're joining was designed with these questions in mind. When you write new code, ask the same questions. When you disagree with a decision, write an ADR proposing the alternative.

Welcome to Letus. Build something worth discovering.

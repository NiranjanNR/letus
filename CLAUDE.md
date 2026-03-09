# CLAUDE.md — Letus AI Context
# READ THIS FIRST. Every agent session starts here.

## What Is Letus
City-based social discovery platform: users post from real locations, others see those posts
on a live map when nearby. Think Google Maps + Instagram Stories scoped to your city.
Phase 0 is complete (auth + map scaffold). Phase 1 adds posting, discovery, and the feed.

## Monorepo Structure
```
letus/
├── apps/mobile/          React Native + Expo SDK 52
├── services/user/        Node.js + Express (ONLY implemented service)
├── services/{feed,media,notification,place,search}/  Phase 1+ stubs
├── infra/                Docker Compose (Postgres + PostGIS)
├── .github/workflows/    EC2 deploy + EAS TestFlight
└── docs/                 All documentation (start with docs/README.md)
```

## Current Phase: 0 — COMPLETE, awaiting first deploy

| Component | Status | Notes |
|-----------|--------|-------|
| User auth (register/login/refresh/logout/me) | Done | services/user/ |
| JWT + refresh token rotation | Done | 15min access / 7d refresh |
| PostgreSQL + PostGIS schema | Done | users, refresh_tokens, posts skeleton |
| Rate limiting | Done | In-memory, 20 req/15min/IP |
| Mobile auth UI (login + signup) | Done | apps/mobile/app/auth/ |
| Map screen (GPS blue dot + bottom sheet) | Done | apps/mobile/app/(tabs)/index.tsx |
| EC2 deploy pipeline | Done | .github/workflows/deploy-backend.yml |
| EAS TestFlight pipeline | Done | .github/workflows/eas-build.yml |
| Explore / Post / Reels tabs | Stub | Phase 1 |
| Place / Feed / Media services | Stub | Phase 1 |

## Key Commands
```bash
cd infra && docker compose up -d          # Start Postgres (run first)
cd services/user && yarn migrate          # Run DB migrations
cd services/user && yarn dev              # Start backend on :3000
cd apps/mobile && npx expo start          # Start mobile (press i for simulator)
curl http://localhost:3000/health         # Verify backend is up
```

## Architecture Rules (Non-Negotiable)
1. **Timing-safe auth**: bcrypt always runs regardless of user found → ADR-001
2. **Single-use refresh tokens**: rotate on every use → ADR-002
3. **Rate limit all auth routes**: even in dev → ADR-003
4. **PostGIS GEOGRAPHY(POINT, 4326)** for every location column → ADR-004
5. **Graceful SIGTERM shutdown**: drain connections before exit → ADR-005
6. **All API calls through `apiFetch()`**: never use `fetch()` directly in mobile → ADR-006
7. **No SELECT \***: explicit column lists in all SQL → ADR-007
8. **`config.X` not `process.env.X`**: config validates at boot → ADR-008
9. **CORS allowlist**: not wildcard; add origins to ALLOWED_ORIGINS env var → ADR-009
10. **10kb body limit**: set on express.json() → ADR-010

## Agent Model Assignment
| Task | Model |
|------|-------|
| New service design, architecture, ADRs, phase planning | **claude-opus-4-6** |
| Implementation, bug fixes, tests, doc updates, routine features | **claude-sonnet-4-6** |

## Where to Find Things
| Need | File |
|------|------|
| What any file does | `docs/file-index.md` |
| Why X was decided | `docs/architecture/adr/` |
| System architecture | `docs/architecture/overview.md` |
| Request lifecycle | `docs/architecture/data-flow.md` |
| Phase roadmap | `docs/architecture/phase-roadmap.md` |
| How auth works | `docs/features/auth.md` |
| How map screen works | `docs/features/map-home.md` |
| DB schema (tables/columns) | `docs/database/schema.md` |
| How to add a migration | `docs/database/migrations.md` |
| Local dev setup | `docs/infra/local-dev.md` |
| EC2 deploy | `docs/infra/ec2-deploy.md` |
| TestFlight build | `docs/infra/eas-testflight.md` |
| Reusable utilities | `docs/helpers/index.md` |
| Known bugs / pitfalls | `docs/errors/log.md` |
| User service API | `docs/services/user-service.md` |
| Phase 1+ service specs | `docs/services/future-services.md` |

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 chars — signs access tokens |
| `REFRESH_SECRET` | Yes | Min 32 chars — signs refresh tokens (different from JWT_SECRET) |
| `PORT` | No (3000) | HTTP server port |
| `NODE_ENV` | No | `production` hides stack traces |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `DB_POOL_MAX` | No (20) | Max PostgreSQL connections |
| `EXPO_PUBLIC_API_URL` | Yes (mobile) | Backend URL for mobile app |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Yes (mobile) | Google Maps JS key |

**Note:** Google Maps also requires `ios.config.googleMapsApiKey` in `app.json` (native key,
separate from env). See `docs/errors/log.md` ERR-009.
**Never commit `.env`** — only `.env.example` is safe to commit.

## API Surface (Phase 0)
```
POST /auth/register    Create account → { user, accessToken, refreshToken }
POST /auth/login       Login          → { user, accessToken, refreshToken }
POST /auth/refresh     Rotate tokens  → { accessToken, refreshToken }
POST /auth/logout      Invalidate     → { success: true }
GET  /auth/me          Get profile    → { user }  [requires Bearer token]
GET  /health           Liveness check → { status: "ok" }
```

## Critical File Locations
```
services/user/src/index.ts              Express entry + graceful shutdown
services/user/src/config/index.ts       Env validation (crash at boot if missing)
services/user/src/routes/auth.ts        All auth endpoints
services/user/src/middleware/jwt.ts     requireAuth middleware
services/user/src/middleware/rateLimit.ts  createRateLimiter factory
services/user/src/db/connection.ts      pg Pool singleton
apps/mobile/lib/apiClient.ts            Central fetch wrapper + auto-refresh
apps/mobile/store/authStore.ts          Zustand auth state + Keychain
apps/mobile/app/_layout.tsx             Auth guard + session restore
apps/mobile/app/(tabs)/index.tsx        Map Home screen
```

## Doc Update Protocol — Run When a Feature Ships
When you finish implementing a feature, update docs BEFORE marking it complete:

- [ ] `docs/file-index.md` — add new files, change PHASE from `stub` → `0` (or `1`, `2`)
- [ ] `CLAUDE.md` — update API Surface + Current Phase table if changed
- [ ] **If new architectural decision**: create `docs/architecture/adr/NNN-title.md`
      (copy template from `docs/architecture/adr/README.md`; add row to ADR index)
- [ ] **If bug found**: add entry to `docs/errors/log.md` (never delete — mark RESOLVED)
- [ ] **If new reusable utility**: add to `docs/helpers/index.md`
- [ ] **If feature ships to users**: create `docs/features/feature-name.md`
      (use `docs/features/auth.md` as template format)
- [ ] **If DB schema changed**: update `docs/database/schema.md`
- [ ] **If new env var**: add to `.env.example` AND env table in this file
- [ ] **If phase boundary crossed**: update `docs/architecture/phase-roadmap.md`
- [ ] **If new service added**: create `services/[name]/README.md` + `docs/services/[name]-service.md`


## Agent Modes

### 🏗️ ARCHITECT MODE
Trigger: "plan", "design", "think about", "how should we"
- Use Plan Mode (no file writes)
- Write ADR in docs/architecture/adr/ first
- Present options + tradeoffs, wait for approval

### 🔨 ENGINEER MODE
Trigger: "implement", "build", "create", "add"
- Read CLAUDE.md → docs/file-index.md → docs/helpers/index.md first
- Check docs/errors/log.md for related pitfalls
- Use claude-sonnet-4-6 (routine) or claude-opus-4-6 (architecture)
- Run Doc Update Protocol after

### 🐛 DEBUG MODE
Trigger: "bug", "broken", "fix", "error", "not working"
- Read docs/errors/log.md first (may already be solved)
- Reproduce before fixing
- Log resolution in docs/errors/log.md

### 🔍 EXPLORE MODE
Trigger: "understand", "explain", "how does X work"
- Read broadly using subagents in parallel
- Do NOT modify anything
- Output summary with exact file references
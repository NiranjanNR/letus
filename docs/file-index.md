# File Index — Machine-Scannable Source Map

**Purpose:** Find any file's purpose without opening it.
**Format:** `PATH | LAYER | PURPOSE (≤15 words) | PHASE`
**Grep tips:**
- All stubs: `grep "| stub" docs/file-index.md`
- All migrations: `grep "| migration" docs/file-index.md`
- Phase 1 files: `grep "| 1$" docs/file-index.md`
- Mobile files: `grep "| mobile" docs/file-index.md`

**Layer values:** `backend | mobile | infra | config | migration | script | workflow | doc | stub`
**Phase values:** `0` = built & working | `1` = Phase 1 planned | `stub` = scaffolded, no logic

**UPDATE THIS FILE** whenever you add, rename, or delete a source file.

---

## Backend — User Service (`services/user/`)

```
services/user/src/index.ts                              | backend    | Express entry point; boot sequence; graceful SIGTERM shutdown          | 0
services/user/src/config/index.ts                       | config     | Env validation; crashes at boot if any required secret is missing      | 0
services/user/src/db/connection.ts                      | backend    | Singleton pg Pool; verifyDatabaseConnection; closeDatabasePool helpers | 0
services/user/src/db/migrations/001_init.sql            | migration  | users, refresh_tokens, posts tables; enables uuid-ossp and postgis     | 0
services/user/src/db/migrations/002_triggers_and_cleanup.sql | migration | updated_at trigger; purge_expired_refresh_tokens() function       | 0
services/user/src/middleware/jwt.ts                     | backend    | requireAuth middleware; attaches userId to AuthRequest type            | 0
services/user/src/middleware/rateLimit.ts               | backend    | In-memory sliding-window rate limiter; createRateLimiter factory       | 0
services/user/src/routes/auth.ts                        | backend    | /register /login /refresh /logout /me route handlers                  | 0
services/user/scripts/migrate.js                        | script     | Runs all .sql migration files in alphabetical order                   | 0
services/user/package.json                              | config     | User service dependencies: express, pg, bcryptjs, jsonwebtoken, zod   | 0
services/user/.env                                      | config     | Real secrets — NEVER commit; use .env.example as template             | 0
```

## Mobile — React Native + Expo SDK 52 (`apps/mobile/`)

```
apps/mobile/app/_layout.tsx                             | mobile     | Root layout; auth guard; QueryClient provider; GestureHandler root    | 0
apps/mobile/app/auth/login.tsx                          | mobile     | Login screen; calls /auth/login; stores tokens via authStore          | 0
apps/mobile/app/auth/signup.tsx                         | mobile     | Signup screen; calls /auth/register; auto-login after success         | 0
apps/mobile/app/(tabs)/_layout.tsx                      | mobile     | Bottom tab bar with 5 tabs: Map, Explore, Post, Reels, Profile        | 0
apps/mobile/app/(tabs)/index.tsx                        | mobile     | Map Home: GPS blue dot, BottomSheet snap points, filter chips         | 0
apps/mobile/app/(tabs)/explore.tsx                      | mobile     | Stub — place search + trending (Phase 1, needs Elasticsearch)         | stub
apps/mobile/app/(tabs)/post.tsx                         | mobile     | Stub — photo/video post creation (Phase 1, needs Media Service + S3)  | stub
apps/mobile/app/(tabs)/reels.tsx                        | mobile     | Stub — short-form video feed (Phase 1, needs HLS + Media Service)     | stub
apps/mobile/app/(tabs)/profile.tsx                      | mobile     | Profile screen; shows username/email/XP; logout button                | 0
apps/mobile/lib/apiClient.ts                            | mobile     | Central fetch wrapper; auto-refresh on 401; queues concurrent calls   | 0
apps/mobile/store/authStore.ts                          | mobile     | Zustand auth store; user, tokens, login, logout, loadFromStorage      | 0
apps/mobile/app.json                                    | config     | Expo SDK 52 config; native API keys baked here (not just .env)        | 0
apps/mobile/package.json                                | config     | Mobile dependencies: expo-router, react-native-maps, zustand, etc.    | 0
```

## Infrastructure (`infra/`, `.github/`)

```
infra/docker-compose.yml                                | infra      | Postgres 16 + PostGIS 3 container for local dev                      | 0
infra/Dockerfile.postgres                               | infra      | Custom Postgres image with PostGIS extension pre-installed            | 0
infra/init-postgis.sh                                   | infra      | Shell script to enable PostGIS extension (referenced, not used)       | 0
infra/kong.yml                                          | infra      | Kong API Gateway config placeholder (Phase 1)                        | 1
infra/prometheus.yml                                    | infra      | Prometheus monitoring config placeholder (Phase 2)                   | stub
.github/workflows/deploy-backend.yml                    | workflow   | SSH deploy to EC2 on push to main affecting services/user/**         | 0
.github/workflows/eas-build.yml                         | workflow   | EAS iOS build + TestFlight submit on push to main affecting mobile/** | 0
```

## Root Config

```
.env.example                                            | config     | Template for all env vars with inline documentation; safe to commit   | 0
package.json                                            | config     | Monorepo root; Yarn Workspaces for apps/* and services/*             | 0
.gitignore                                              | config     | Git ignore rules including node_modules, .env, build artifacts        | 0
```

## Phase 1+ Services (Placeholder — README only, no code)

```
services/feed/                                          | stub       | Node.js + Redis + BullMQ feed fanout and vibe score service          | 1
services/media/                                         | stub       | Python + FastAPI + Celery + FFmpeg image/video processing            | 1
services/notification/                                  | stub       | NestJS + Firebase Cloud Messaging push notification service           | 1
services/place/                                         | stub       | Go + Gin GPS-based place discovery (10x geo perf vs Node.js)         | 1
services/search/                                        | stub       | Elasticsearch 8 place search and autocomplete                        | 1
```

## Documentation (`docs/`)

```
CLAUDE.md                                               | doc        | Master AI context file; read first every session; ≤200 lines         | 0
docs/README.md                                          | doc        | Human-readable index and navigation for docs/ folder                 | 0
docs/file-index.md                                      | doc        | THIS FILE — machine-scannable source file index                      | 0
docs/architecture/overview.md                           | doc        | System architecture diagram and narrative                            | 0
docs/architecture/data-flow.md                          | doc        | Full request lifecycle: mobile → API → database                      | 0
docs/architecture/phase-roadmap.md                      | doc        | Phase 0→3 plan with status, goals, and success metrics               | 0
docs/architecture/adr/README.md                         | doc        | ADR format template and index of all decisions                       | 0
docs/architecture/adr/001-timing-safe-auth.md           | doc        | ADR: bcrypt always runs to prevent email enumeration timing attack    | 0
docs/architecture/adr/002-refresh-token-rotation.md     | doc        | ADR: single-use refresh tokens detect token theft                    | 0
docs/architecture/adr/003-in-memory-rate-limit.md       | doc        | ADR: in-memory rate limiter for Phase 0, Redis swap in Phase 1       | 0
docs/architecture/adr/004-postgis-day-one.md            | doc        | ADR: PostGIS from day one because geo-indexes are hard to retrofit    | 0
docs/architecture/adr/005-graceful-shutdown.md          | doc        | ADR: SIGTERM drains connections before process exits                 | 0
docs/architecture/adr/006-centralized-api-client.md     | doc        | ADR: token refresh logic in one place not duplicated across screens   | 0
docs/architecture/adr/007-no-select-star.md             | doc        | ADR: explicit column lists in all SQL queries                        | 0
docs/architecture/adr/008-config-validation-at-boot.md  | doc        | ADR: crash at startup if required env vars missing                   | 0
docs/architecture/adr/009-cors-allowlist.md             | doc        | ADR: CORS allowlist not wildcard; only known origins                 | 0
docs/architecture/adr/010-10kb-body-limit.md            | doc        | ADR: 10kb body size limit prevents DoS via large payloads            | 0
docs/features/README.md                                 | doc        | Index of all feature documentation files                             | 0
docs/features/auth.md                                   | doc        | Beginner-friendly authentication system explainer                    | 0
docs/features/map-home.md                               | doc        | Map Home screen: GPS, BottomSheet, filter chips                      | 0
docs/features/mobile-navigation.md                      | doc        | Expo Router, auth guard pattern, tab navigation                      | 0
docs/services/user-service.md                           | doc        | Complete user service API reference and internals                    | 0
docs/services/future-services.md                        | doc        | Phase 1+ service specs and technology choices                        | 0
docs/database/schema.md                                 | doc        | All tables, columns, types, indexes, and design rationale            | 0
docs/database/migrations.md                             | doc        | Migration runner, naming conventions, how to add migrations          | 0
docs/infra/local-dev.md                                 | doc        | Docker setup, .env config, full boot sequence for local development  | 0
docs/infra/ec2-deploy.md                                | doc        | EC2 instance setup, PM2 config, GitHub Actions deploy pipeline       | 0
docs/infra/eas-testflight.md                            | doc        | EAS build configuration, Apple certificates, TestFlight submission   | 0
docs/helpers/index.md                                   | doc        | Reusable utilities index; check here before writing new helpers      | 0
docs/errors/log.md                                      | doc        | Permanent bug and anti-pattern log; never delete entries             | 0
```

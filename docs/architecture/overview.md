# Architecture Overview

## What Is Letus

Letus is a city-based social discovery platform. Users post from real locations (restaurants,
parks, hidden spots), and others see those posts on a live map when they're nearby. Think
Google Maps overlaid with an Instagram Stories feed — scoped to your city.

## Current Architecture (Phase 0)

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS Device                               │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐  │
│  │  Auth Screens │   │  Map Screen  │   │  Tab Navigation   │  │
│  │  login.tsx   │   │  index.tsx   │   │  (tabs)/_layout   │  │
│  │  signup.tsx  │   │  Google Maps │   │                   │  │
│  └──────┬───────┘   └──────┬───────┘   └───────────────────┘  │
│         │                  │                                     │
│  ┌──────▼──────────────────▼───────────────────────────────┐   │
│  │              apiClient.ts (apiFetch)                     │   │
│  │  • Attaches Authorization header automatically           │   │
│  │  • Retries once on 401 with refreshed token             │   │
│  │  • Queues concurrent requests during refresh             │   │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │            authStore.ts (Zustand)                         │  │
│  │  • user, accessToken, refreshToken in memory             │  │
│  │  • Persists to iOS Keychain via expo-secure-store        │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (port 3000)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    User Service (EC2 t3.micro)                   │
│                    Node.js 20 + Express + TypeScript             │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ rateLimit.ts│  │    jwt.ts    │  │     routes/auth.ts  │   │
│  │ 20 req/15m  │→ │  requireAuth │→ │  /register          │   │
│  │ per IP (RAM)│  │  middleware  │  │  /login             │   │
│  └─────────────┘  └──────────────┘  │  /refresh           │   │
│                                      │  /logout            │   │
│  ┌──────────────────────────────┐   │  /me                │   │
│  │     config/index.ts          │   │  /health            │   │
│  │  Zod validation at boot      │   └──────────┬──────────┘   │
│  │  Crashes if secrets missing  │              │               │
│  └──────────────────────────────┘              │               │
└───────────────────────────────────────────────┼───────────────┘
                                                 │ pg Pool (max 20 connections)
                                                 │
┌────────────────────────────────────────────────▼───────────────┐
│                PostgreSQL 16 + PostGIS 3                        │
│                    (Docker container)                           │
│                                                                 │
│  ┌────────────────┐  ┌───────────────────┐  ┌──────────────┐ │
│  │     users      │  │  refresh_tokens   │  │    posts     │ │
│  │ id, username   │  │  id, user_id      │  │  (skeleton)  │ │
│  │ email, hash    │  │  token, expires   │  │  location    │ │
│  │ xp, district   │  │                   │  │  GEOGRAPHY() │ │
│  └────────────────┘  └───────────────────┘  └──────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

## Service Boundaries

**Phase 0:** One backend service handles everything — auth, user profile, and the stub posts
schema. Services share nothing; the user service owns its database schema.

**Phase 1+:** New services are added as separate processes with separate schemas:

```
Mobile App
    │
    ▼
Kong API Gateway (JWT enforcement, rate limiting, routing)
    │
    ├──▶ User Service (Node.js)     — auth, profiles
    ├──▶ Place Service (Go)         — GPS discovery, places CRUD
    ├──▶ Feed Service (Node.js)     — post fanout, vibe scores
    ├──▶ Media Service (Python)     — image/video processing, S3
    ├──▶ Search Service (Elastic)   — place autocomplete
    └──▶ Notification Service (NestJS) — push via FCM
```

Each service has its own database. Services communicate via REST in Phase 1, events
(BullMQ) in Phase 2.

## Infrastructure

| Component | Phase 0 | Phase 1+ |
|-----------|---------|----------|
| Compute | Single EC2 t3.micro | Multiple EC2 or ECS tasks |
| Database | Docker container on same EC2 | RDS PostgreSQL (managed) |
| Caching | None | Redis (ElastiCache) |
| API Gateway | None (direct to port 3000) | Kong Gateway |
| File Storage | None | S3 + CloudFront CDN |
| Monitoring | None | Prometheus + Grafana |
| Container Orchestration | Docker Compose (local) | Kubernetes (Phase 3) |

## Hardware Constraints (Phase 0)

EC2 t3.micro: 1 vCPU, 1GB RAM, 8GB storage.

Implications:
- DB pool capped at 20 connections (each PostgreSQL connection uses ~5MB)
- No Redis in-process (would eat 50-100MB of the 1GB)
- No concurrent image processing
- Single process — rate limiter state is in-memory (resets on redeploy)

These constraints are features in Phase 0: they force simple, efficient code patterns.

## Request Lifecycle
See: `docs/architecture/data-flow.md`

## Phase Roadmap
See: `docs/architecture/phase-roadmap.md`

## Key Decisions
See: `docs/architecture/adr/` for the 10 architectural decisions made in Phase 0.

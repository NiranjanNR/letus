# Phase Roadmap

## Phase 0 — Foundation
**Status: COMPLETE (awaiting first deployment)**
**Goal:** One real user can register, log in, and see the map on their iPhone.

### What Was Built
| Feature | Status | Key Files |
|---------|--------|-----------|
| User registration | Done | `services/user/src/routes/auth.ts` |
| User login + JWT | Done | `services/user/src/routes/auth.ts` |
| Refresh token rotation | Done | `services/user/src/routes/auth.ts` |
| Rate limiting (in-memory) | Done | `services/user/src/middleware/rateLimit.ts` |
| PostgreSQL + PostGIS schema | Done | `services/user/src/db/migrations/001_init.sql` |
| DB triggers + cleanup fn | Done | `services/user/src/db/migrations/002_triggers_and_cleanup.sql` |
| Mobile auth UI (login/signup) | Done | `apps/mobile/app/auth/` |
| Map screen (GPS blue dot) | Done | `apps/mobile/app/(tabs)/index.tsx` |
| Centralized API client | Done | `apps/mobile/lib/apiClient.ts` |
| Auth state (Zustand + Keychain) | Done | `apps/mobile/store/authStore.ts` |
| EC2 deploy pipeline | Done | `.github/workflows/deploy-backend.yml` |
| EAS TestFlight pipeline | Done | `.github/workflows/eas-build.yml` |

### Pending Execution (first deploy)
- [ ] `docker compose up -d` in infra/
- [ ] `yarn migrate` in services/user/
- [ ] `yarn dev` in services/user/
- [ ] `npx expo start` in apps/mobile/
- [ ] TestFlight build via EAS
- [ ] EC2 server provisioning (see `docs/infra/ec2-deploy.md`)

### Success Metric
A friend installs from TestFlight, creates an account, and sees the map with their GPS dot.

---

## Phase 1 — Core Discovery Loop
**Status: PLANNED**
**Goal:** Users can post from a location. Nearby users see it on the map.

### Services to Build (in priority order)

**1. Place Service (Go + Gin)**
- GPS reverse geocoding (What place am I near?)
- Place CRUD (create, read, update, delete)
- `ST_DWithin` proximity queries against `posts.location`
- Why Go: 10x throughput vs Node.js for geo-math-heavy workloads

**2. Post Creation (mobile + user service)**
- Camera/gallery access (expo-camera, expo-image-picker)
- Presigned S3 URL flow (client uploads directly to S3)
- Post record written to `posts` table with GPS coordinates
- Vibe score initialized to 0

**3. Feed Service (Node.js + Redis + BullMQ)**
- Fan-out: when a post is created, push to nearby users' feed queues
- Vibe score algorithm (likes, views, recency, distance decay)
- BullMQ repeatable job: `purge_expired_refresh_tokens()` daily 3am

**4. Kong API Gateway**
- JWT enforcement across all services (replace per-service jwt middleware)
- Rate limiting moved from in-memory to Kong plugin + Redis
- Request routing by path prefix

**5. Elasticsearch 8**
- Place name autocomplete (fuzzy search)
- Geo-distance boosting (closer places rank higher)

**6. Map Pins**
- Animated place markers on map with vibe score pulse effect
- Tap pin → bottom sheet expands with post preview
- Friend avatar overlay on pins (Phase 2 social graph feeds this)

### Database Additions
```sql
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  category VARCHAR(50),           -- café, restaurant, park, nightlife
  city_id VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_places_location ON places USING GIST(location);

CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,              -- S3 URL
  type VARCHAR(10) NOT NULL,      -- 'image' | 'video'
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Success Metric
Post from a café → friend 200m away sees it appear on their map within 30 seconds.

---

## Phase 2 — Social Graph
**Status: PLANNED**
**Goal:** Follow friends, see their posts prominently, earn XP and badges.

### Features
- **Follows graph** — Neo4j (graph DB, not relational, for efficient friend-of-friend)
- **Friend story circles** — map overlay showing friends' recent posts as story rings
- **Explorer XP system** — points for posting, discovering new places, check-ins
- **Badges** — "First Post", "Explorer", "City Legend", etc.
- **Push notifications** — NestJS + Firebase Cloud Messaging
  - "Your friend just posted near you"
  - "Your post got 10 likes"

### New Service
**Notification Service (NestJS + FCM)**
- Receives events from Feed Service via BullMQ
- Sends push to iOS via FCM (Firebase handles APNs)
- Device token stored in `users.fcm_token` column

### Success Metric
User opens app to see a notification that their friend posted nearby, taps it, sees the post on the map.

---

## Phase 3 — Scale
**Status: FUTURE**
**Goal:** 10,000 daily active users, multi-city.

### Infrastructure Changes
- Kubernetes (EKS) — horizontal pod autoscaling per service
- RDS PostgreSQL — managed, multi-AZ, automated backups
- ElastiCache Redis — managed Redis cluster for feed and sessions
- CloudFront + S3 — CDN for all media (images, HLS video segments)
- Prometheus + Grafana — metrics and alerting
- Multi-city partitioning — `city_id` column already in posts/places schema

### Success Metric
p99 API latency < 200ms at 1,000 concurrent users.

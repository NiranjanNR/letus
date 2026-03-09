# Future Services — Phase 1+ Specifications

All services below have placeholder README files but no code yet.
Each entry documents: purpose, technology choice rationale, API surface, and dependencies.

---

## Place Service (Go + Gin)
**Phase:** 1
**Location:** `services/place/`
**Why Go:** Geo-math operations (ST_DWithin, ST_Distance, coordinate transforms) are
CPU-bound. Go compiles to native code and achieves ~10x the throughput of Node.js for
math-heavy workloads. A single t3.micro can handle 5,000 place queries/second in Go vs
~500/second in Node.js.

### Responsibilities
- Reverse geocoding: given (lat, lng), return the nearest known place
- Place CRUD: create, read, update, soft-delete places
- Proximity query: places within radius of a coordinate
- Place category management: café, restaurant, park, nightlife, hidden-gem

### API Surface (planned)
```
GET  /places/nearby?lat=12.9&lng=77.5&radius=500&category=café
GET  /places/:id
POST /places                         { name, lat, lng, category, city_id }
PATCH /places/:id
GET  /places/search?q=string&lat=&lng=   → proxies to Search Service
```

### Database
Owns the `places` table (see `docs/architecture/phase-roadmap.md` for schema).
Shares read access to `posts.location` for proximity overlap queries.

### Dependencies
- PostgreSQL + PostGIS (existing DB, new `places` table)
- Search Service (Elasticsearch) — for text search, Place Service calls Search via HTTP

---

## Feed Service (Node.js + Express + Redis + BullMQ)
**Phase:** 1
**Location:** `services/feed/`
**Why Node.js:** Feed operations are I/O bound (Redis reads, DB queries). Node.js's async
model is well-suited. BullMQ requires Node.js.

### Responsibilities
- Fan-out: when a post is created, push post ID to nearby users' Redis feed lists
- Feed assembly: given a user + coordinates, return ordered list of post IDs with vibe scores
- Vibe score calculation: algorithm runs as a BullMQ job
- Scheduled maintenance: `purge_expired_refresh_tokens()` as daily repeatable job

### Vibe Score Algorithm (v1)
```
vibe_score = (likes × 10) + (views × 1) + (comments × 5)
           - (hours_since_post × 2)
           - (distance_km × 5)
```
Score decays over time and with distance. Recent posts from nearby locations rank highest.

### API Surface (planned)
```
GET  /feed?lat=&lng=&limit=20&cursor=    → paginated post cards
POST /feed/post                          { postId, userId, lat, lng } → triggers fanout job
```

### Dependencies
- Redis (ElastiCache in prod, local Docker in dev)
- BullMQ (Redis-backed job queue)
- PostgreSQL (read `posts` table for content)

---

## Media Service (Python + FastAPI + Celery + FFmpeg)
**Phase:** 1
**Location:** `services/media/`
**Why Python:** FFmpeg Python bindings, Pillow, and boto3 are mature and well-tested.
Media processing is CPU-bound — Celery workers scale horizontally per core.

### Responsibilities
- Generate presigned S3 upload URLs (client uploads directly to S3, bypassing service)
- Process uploaded images: resize to 3 sizes (thumbnail 200px, medium 800px, full 1920px)
- Process uploaded videos: transcode to HLS (multiple bitrates for adaptive streaming)
- Extract metadata: GPS EXIF from photos, duration from videos
- Webhook: notify Feed Service when processing is complete

### Upload Flow
```
Mobile: POST /media/presign → { uploadUrl, postId }
Mobile: PUT <uploadUrl> with file (direct to S3 — service never touches bytes)
S3 event: triggers Celery task via SQS
Celery: downloads from S3, processes, uploads variants back to S3
Celery: PATCH /posts/:id with { media_urls, thumbnail_url }
```

### API Surface (planned)
```
POST /media/presign         { type: 'image'|'video', mime_type, file_size }
GET  /media/status/:postId  → processing status
```

### Dependencies
- S3 (file storage)
- Celery + Redis (task queue)
- FFmpeg (video transcoding)
- PostgreSQL (update posts table with processed URLs)

---

## Notification Service (NestJS + Firebase Cloud Messaging)
**Phase:** 2
**Location:** `services/notification/`
**Why NestJS:** Built-in dependency injection makes testing FCM integration clean.
TypeScript-native with strong typing for Firebase Admin SDK.

### Responsibilities
- Receive notification events from Feed Service via BullMQ
- Look up user's FCM device token from database
- Send push notification via Firebase Admin SDK → FCM → APNs → iOS device
- Notification types: nearby friend post, post liked, new follower

### New Column Required
```sql
ALTER TABLE users ADD COLUMN fcm_token TEXT;
ALTER TABLE users ADD COLUMN fcm_token_updated_at TIMESTAMPTZ;
```

### API Surface (internal only — not exposed to mobile directly)
```
POST /notify/send    { userId, type, title, body, data }
POST /notify/token   { userId, fcmToken }  ← called by mobile app on launch
```

### Dependencies
- Firebase Admin SDK
- BullMQ (consume events from Feed Service)
- PostgreSQL (read fcm_token from users table)

---

## Search Service (Elasticsearch 8)
**Phase:** 1
**Location:** `services/search/`
**Why Elasticsearch:** Full-text fuzzy search + geo-distance boosting in a single query.
PostgreSQL full-text search (tsvector) doesn't support fuzzy matching or geo-boosting well.

### Responsibilities
- Autocomplete for place names (fuzzy, instant-search as user types)
- Geo-distance boosting: identical query terms rank closer places higher
- Multi-field search: place name, category, district, city

### Index Design
```json
{
  "mappings": {
    "properties": {
      "name": { "type": "search_as_you_type" },
      "category": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "city_id": { "type": "keyword" }
    }
  }
}
```

### API Surface (planned)
```
GET /search/places?q=string&lat=&lng=&limit=10
```

### Sync Strategy
Places are written to PostgreSQL (source of truth) and indexed to Elasticsearch via a
BullMQ job triggered on INSERT/UPDATE in the Place Service.

### Dependencies
- Elasticsearch 8 (self-hosted on separate EC2 in Phase 1, managed AWS OpenSearch in Phase 3)
- BullMQ (sync events from Place Service)

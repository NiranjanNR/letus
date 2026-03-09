# Database Schema

**Engine:** PostgreSQL 16 + PostGIS 3
**Extensions:** `uuid-ossp`, `postgis`
**Connection:** Managed by `services/user/src/db/connection.ts` (pg Pool)
**Migrations:** `services/user/src/db/migrations/` — see `docs/database/migrations.md`

---

## Table: `users`

The core identity table. Every user has one row.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | `uuid_generate_v4()` | Primary key. UUID prevents ID enumeration. |
| `username` | VARCHAR(30) | No | — | Unique. 3-30 chars. Enforced in app layer. |
| `email` | VARCHAR(255) | No | — | Unique. Stored lowercase + trimmed. |
| `phone` | VARCHAR(20) | Yes | NULL | Unique when set. Phase 2 SMS verification. |
| `password_hash` | TEXT | No | — | bcrypt cost 12. **Never returned to client.** |
| `avatar_url` | TEXT | Yes | NULL | Phase 1: S3 URL after profile photo upload. |
| `bio` | TEXT | Yes | NULL | Phase 1: user editable profile bio. |
| `district` | VARCHAR(100) | Yes | NULL | City district, user-set. Phase 1 profile edit. |
| `is_verified` | BOOLEAN | No | false | Phase 1: true after email verification. |
| `xp` | INT | No | 0 | Explorer XP. Incremented on post/check-in. Phase 1. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Set on INSERT. |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Updated by trigger on every UPDATE row. |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `username`
- UNIQUE on `email`
- UNIQUE on `phone` (partial — where phone IS NOT NULL)

**Trigger:** `set_updated_at()` — `BEFORE UPDATE ON users` → sets `updated_at = NOW()`

---

## Table: `refresh_tokens`

Tracks active refresh token sessions. One row per active session (device).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | `uuid_generate_v4()` | Primary key. |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `token` | TEXT | No | — | Unique. The raw JWT string. |
| `expires_at` | TIMESTAMPTZ | No | — | 7 days from issue time. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `token` (lookup by token on refresh/logout)
- INDEX on `user_id` (lookup all sessions for a user, e.g. logout-all)

**Cleanup:** `purge_expired_refresh_tokens()` function deletes expired rows.
Phase 1: schedule as daily BullMQ job. See `docs/errors/log.md` ERR-007.

---

## Table: `posts` (skeleton — Phase 1 wires it fully)

Schema is created in Phase 0 to establish PostGIS indexes on an empty table.
No data is written to this table in Phase 0.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | `uuid_generate_v4()` | Primary key. |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `content` | TEXT | Yes | NULL | Caption text. |
| `location` | GEOGRAPHY(POINT, 4326) | Yes | NULL | PostGIS point. Enables `ST_DWithin`. |
| `place_name` | VARCHAR(255) | Yes | NULL | Human-readable place name. |
| `vibe_score` | INT | No | 0 | Calculated by Feed Service in Phase 1. |
| `city_id` | VARCHAR(50) | Yes | NULL | Multi-city partitioning key. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | |

**Indexes:**
- PRIMARY KEY on `id`
- GIST INDEX on `location` — enables efficient `ST_DWithin` proximity queries
- INDEX on `user_id` — user's post history
- INDEX on `city_id` — city-scoped feed queries

**Why PostGIS now:** Geo-indexes are built on empty tables instantly. Retrofitting them
onto a 1M-row table takes minutes with a lock. See `docs/architecture/adr/004-postgis-day-one.md`.

---

## Database Functions

### `set_updated_at()` → TRIGGER
**Migration:** `002_triggers_and_cleanup.sql`
**Called by:** `BEFORE UPDATE ON users` trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### `purge_expired_refresh_tokens()` → INTEGER
**Migration:** `002_triggers_and_cleanup.sql`
**Called by:** Manually or scheduled job (Phase 1)

```sql
CREATE OR REPLACE FUNCTION purge_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

Manual call: `SELECT purge_expired_refresh_tokens();`

---

## Phase 1 Schema Additions

```sql
-- See docs/architecture/phase-roadmap.md for full SQL

CREATE TABLE places ( ... );
CREATE TABLE post_media ( ... );

-- Phase 2:
CREATE TABLE follows ( follower_id UUID, followee_id UUID, ... );
CREATE TABLE post_likes ( ... );
CREATE TABLE post_comments ( ... );
ALTER TABLE users ADD COLUMN fcm_token TEXT;
```

---

## Design Rules

1. **UUID primary keys everywhere** — prevents ID enumeration, safe for distributed generation
2. **No SELECT \*** — explicit column lists in all queries (see ADR-007)
3. **PostGIS GEOGRAPHY(POINT, 4326)** for any location column — true spherical distance
4. **TIMESTAMPTZ not TIMESTAMP** — always timezone-aware
5. **ON DELETE CASCADE** on user FK — deleting a user cleans up all their data
6. **Soft-delete not used in Phase 0** — hard delete is simpler; Phase 1 may add `deleted_at`

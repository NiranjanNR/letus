-- services/user/src/db/migrations/001_init.sql
-- Phase 0 schema: users, refresh_tokens, posts skeleton
-- PostGIS included from day one — geo indexes are hard to retrofit

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- -------------------------------------------------------
-- Users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(30) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20) UNIQUE,
  password_hash TEXT        NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  district      VARCHAR(100),
  is_verified   BOOLEAN     DEFAULT false,
  xp            INT         DEFAULT 0,   -- Phase 1 awards XP on post creation
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- Refresh tokens
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- Posts (skeleton — interactions + vibe score wired in Phase 1)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT,
  location    GEOGRAPHY(POINT, 4326),             -- PostGIS point
  place_name  VARCHAR(255),
  vibe_score  INT         DEFAULT 0,              -- formula in Phase 1
  city_id     VARCHAR(50),                        -- multi-city ready from day 1
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_posts_user_id  ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_city     ON posts(city_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens ON refresh_tokens(user_id);

-- Phase 1 will add: follows, post_likes, post_comments tables
-- Phase 1 will add: places table (Go Place Service)

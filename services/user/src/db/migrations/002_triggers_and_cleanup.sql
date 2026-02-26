-- services/user/src/db/migrations/002_triggers_and_cleanup.sql
--
-- Two things missing from 001 that will cause real pain in production:
--
-- 1. updated_at never updates — the column exists but is frozen at creation time
--    without a trigger. Every ORM query that reads updated_at for cache
--    invalidation or "last active" displays will show wrong data.
--
-- 2. refresh_tokens grows forever — 10K users rotating tokens weekly =
--    ~520K rows/year. The lookup query (token = $1) stays fast on the unique
--    index, but the table bloats and vacuuming becomes expensive.

-- -------------------------------------------------------
-- 1. Auto-update updated_at on any row change
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if re-running (idempotent)
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- 2. Expired token cleanup
-- Runs as a scheduled DELETE — call this from a cron job or
-- a BullMQ repeatable job in Phase 1. For now, it's a function
-- you can call manually or via pg_cron if installed.
-- -------------------------------------------------------
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

-- To run manually: SELECT purge_expired_refresh_tokens();
-- Phase 1: schedule this via BullMQ repeatable job daily at 3am.

# Database Migrations

## Runner

**Script:** `services/user/scripts/migrate.js`
**Command:** `cd services/user && yarn migrate`

The runner reads all `.sql` files from `src/db/migrations/` in **alphabetical order** and
executes each in a single transaction. If any statement fails, the entire migration is
rolled back and the process exits with code 1.

```bash
yarn migrate
# Output:
# Running migration: 001_init.sql
# Running migration: 002_triggers_and_cleanup.sql
# Migrations complete.
```

---

## Existing Migrations

### `001_init.sql`
**Purpose:** Bootstrap the entire schema.

What it does (in order):
1. `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` — UUID generation
2. `CREATE EXTENSION IF NOT EXISTS "postgis"` — spatial types and functions
3. `CREATE TABLE users` — with all Phase 0 columns
4. `CREATE TABLE refresh_tokens` — with FK to users + CASCADE
5. `CREATE TABLE posts` — skeleton with PostGIS GEOGRAPHY column
6. `CREATE INDEX idx_posts_location ON posts USING GIST(location)` — spatial index
7. `CREATE INDEX idx_posts_user_id ON posts (user_id)`
8. `CREATE INDEX idx_posts_city ON posts (city_id)`
9. `CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id)`

### `002_triggers_and_cleanup.sql`
**Purpose:** Automate `updated_at` maintenance and provide token cleanup.

What it does:
1. Creates `set_updated_at()` trigger function
2. Attaches `BEFORE UPDATE ON users` trigger
3. Creates `purge_expired_refresh_tokens()` function

---

## How to Add a New Migration

1. Create a new file: `services/user/src/db/migrations/NNN_description.sql`
   - `NNN` is zero-padded to 3 digits: `003`, `004`, etc.
   - Description uses underscores: `003_add_places_table.sql`

2. Write idempotent SQL where possible:
   ```sql
   -- Good:
   CREATE TABLE IF NOT EXISTS places ( ... );
   ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

   -- Bad (will error on re-run):
   CREATE TABLE places ( ... );
   ```

3. Test locally:
   ```bash
   cd services/user && yarn migrate
   ```

4. For destructive operations (DROP, ALTER with data), test on a copy of production first.

5. Update `docs/database/schema.md` to reflect the new schema state.

---

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Create table | `NNN_create_tablename.sql` | `003_create_places.sql` |
| Add column | `NNN_add_column_to_table.sql` | `004_add_fcm_token_to_users.sql` |
| Add index | `NNN_add_index_on_table.sql` | `005_add_index_on_posts_vibe.sql` |
| Add function | `NNN_add_functionname_fn.sql` | `006_add_vibe_score_fn.sql` |
| Data migration | `NNN_migrate_data_desc.sql` | `007_migrate_data_city_ids.sql` |

---

## Production Notes

- Always run `yarn migrate` on EC2 **before** restarting the service on a new deploy
- The GitHub Actions deploy script runs migrate automatically (see `.github/workflows/deploy-backend.yml`)
- The runner is not idempotent by default — running twice on a migration without `IF NOT EXISTS` will error
- Migrations have no "down" direction in Phase 0 — breaking changes require a new migration

---

## Connecting to Production DB

```bash
# SSH into EC2 first, then:
psql $DATABASE_URL

# Or directly (if DB port is open, which it should NOT be in production):
psql postgresql://letus:password@host:5432/letus_dev
```

# ADR-007: No SELECT * in Any SQL Query

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
Using `SELECT *` or `RETURNING *` in queries has two failure modes relevant to this
codebase: (1) If a column is added to a table (e.g., an internal `internal_notes` field or
a future `password_hash` audit column), it will silently appear in API responses without any
code change — leaking data to clients. (2) `SELECT *` pulls all columns over the wire even
when only 2-3 are needed, wasting bandwidth and memory on the database connection.

## Decision
All SQL queries use explicit column lists. `SELECT *` and `RETURNING *` are banned.
Every `SELECT`, `INSERT ... RETURNING`, and `UPDATE ... RETURNING` names each column.

## Implementation Location
All files in `services/user/src/routes/auth.ts` and any future route files.

Correct pattern:
```sql
-- Good:
SELECT id, username, email, avatar_url, bio, district, is_verified, xp, created_at
FROM users WHERE id = $1

-- Bad:
SELECT * FROM users WHERE id = $1
```

For inserts with RETURNING:
```sql
-- Good:
INSERT INTO users (username, email, password_hash)
VALUES ($1, $2, $3)
RETURNING id, username, email, created_at

-- Bad:
INSERT INTO users ... RETURNING *
```

## Consequences

**Good:**
- Sensitive columns (`password_hash`) can never accidentally appear in API responses
- Adding a column to a table is safe by default — new columns are opt-in for each query
- Query intent is explicit: the reader knows exactly what data flows through the system
- Smaller result payloads over the DB connection

**Bad / trade-offs:**
- More verbose SQL — each query lists all needed columns
- If a column is renamed, all queries that reference it must be updated (same as would be required anyway for type safety)

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| `SELECT *` with column filtering in application code | Still transfers sensitive data over the DB connection; filtering can be accidentally removed |
| Postgres views that exclude sensitive columns | Adds indirection; views become stale when schema changes |
| ORM with field-level selection | ORMs are not used in this service (raw pg for control and performance) |

## Phase Transition
No change planned. This rule applies to every service and every phase.
When Phase 1 services are written (Go, Python, Node), the same rule applies in their
respective query styles.

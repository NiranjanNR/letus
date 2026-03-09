# ADR-004: PostGIS Enabled From Day One

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
Letus is fundamentally a geo-social app. Posts are pinned to real-world locations. The core
discovery loop in Phase 1 requires "show me posts within 500m of my current location" — a
query that requires a spatial index (GiST on a GEOGRAPHY column). Adding PostGIS to an
existing production database with populated tables requires rewriting columns, rebuilding
indexes, and a downtime window. Getting it wrong early is cheap; getting it wrong after
launch is expensive.

## Decision
Enable the `postgis` extension and `uuid-ossp` extension in the very first migration.
All location-bearing tables use `GEOGRAPHY(POINT, 4326)` columns with GiST indexes from
the start, even if Phase 0 never runs a spatial query.

## Implementation Location
`services/user/src/db/migrations/001_init.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- posts table already has:
location GEOGRAPHY(POINT, 4326),

-- with index:
CREATE INDEX idx_posts_location ON posts USING GIST(location);
```

## Consequences

**Good:**
- Phase 1 Place Service can immediately run `ST_DWithin(location, $1, $2)` queries — no migration needed
- GiST index is built on an empty table (instant); rebuilding on a 1M-row table would take minutes
- `GEOGRAPHY(POINT, 4326)` uses true spherical distance — correct for city-scale, no projection math

**Bad / trade-offs:**
- PostGIS is a required extension: cannot use a plain Postgres image without it
- `infra/Dockerfile.postgres` must install PostGIS (adds ~30s to image build)
- Slightly larger initial migration to explain to new developers

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| Store lat/lng as FLOAT columns now, add PostGIS later | Schema migration on populated table requires downtime; float columns don't support spatial indexing |
| Use GEOMETRY instead of GEOGRAPHY | GEOMETRY is planar; GEOGRAPHY handles curvature of Earth correctly for distances > ~5km |
| Use a separate GeoJSON column | No index support; application-layer distance math is slow and incorrect at scale |

## Phase Transition
No change planned. PostGIS is permanent infrastructure. Phase 1 Place Service uses
`ST_DWithin` and `ST_Distance` directly against the `posts.location` column.
Phase 2 may add a `places` table with its own `GEOGRAPHY(POINT)` column.

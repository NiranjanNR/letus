# Local Development Setup

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | `nvm install 20` |
| Yarn | 1.x | `npm install -g yarn` |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Git | Any | Pre-installed on macOS |

Verified on: Mac M2 (Apple Silicon)

---

## First-Time Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd letus
yarn install  # Installs all workspaces (services/user + apps/mobile)
```

### 2. Set up environment variables

```bash
cp .env.example services/user/.env
```

Edit `services/user/.env`:
- `JWT_SECRET` — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `REFRESH_SECRET` — generate a different random string the same way
- Leave all other values at their defaults for local dev

**NEVER commit `.env` files.** Only `.env.example` is committed.

### 3. Start the database

```bash
cd infra
docker compose up -d
```

This starts a PostgreSQL 16 + PostGIS 3 container named `letus_postgres`:
- Port: `5432` on localhost
- Database: `letus_dev`
- User: `letus`
- Password: `localpassword`

Verify it's running:
```bash
docker ps | grep letus_postgres
# Should show: Up X seconds (healthy)
```

### 4. Run database migrations

```bash
cd services/user
yarn migrate
# Output: Running migration: 001_init.sql ... Migrations complete.
```

### 5. Start the backend

```bash
# In services/user/
yarn dev
# Output: [user-service] listening on port 3000
```

### 6. Start the mobile app

In a new terminal:
```bash
cd apps/mobile
npx expo start
```

Press `i` to open iOS Simulator, or scan the QR code with Expo Go on a physical device.

---

## Testing the Backend

```bash
# Health check
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}

# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'
# → {"user":{...},"accessToken":"...","refreshToken":"..."}

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Get profile (replace TOKEN with accessToken from login)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## Boot Sequence Summary

```
1. docker compose up -d        → Postgres starts on :5432
2. cd services/user && yarn migrate → Creates tables, indexes, triggers
3. yarn dev                    → Express starts on :3000
4. npx expo start (apps/mobile) → Metro bundler starts, Simulator opens
```

**Order matters:** Database must be running before `yarn migrate`, and migrations must
complete before `yarn dev`.

---

## Common Local Dev Problems

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED :5432` | Docker not running | `docker compose up -d` from infra/ |
| `relation "users" does not exist` | Migrations not run | `cd services/user && yarn migrate` |
| Service crashes at start | Missing env var | Check `services/user/.env` against `.env.example` |
| Map shows grey | API key missing | See `docs/errors/log.md` ERR-009 |
| Auth redirect flash | Race condition | Already fixed in `_layout.tsx` (ERR-003) |

---

## Stopping Everything

```bash
# Stop backend: Ctrl+C in the terminal running yarn dev
# Stop mobile: Ctrl+C in the terminal running expo start
# Stop database:
cd infra && docker compose down
```

To also delete all database data (fresh start):
```bash
cd infra && docker compose down -v
```

---

## Connecting to Local DB Directly

```bash
# Using psql (if installed):
psql postgresql://letus:localpassword@localhost:5432/letus_dev

# Or via Docker exec:
docker exec -it letus_postgres psql -U letus -d letus_dev
```

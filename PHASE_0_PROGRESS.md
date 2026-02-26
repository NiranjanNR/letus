# ═══════════════════════════════════════════════════════════════
# LETUS — PHASE 0 PROGRESS TRACKER
# Pick up from here when you return.
# ═══════════════════════════════════════════════════════════════

## 🛑 STOPPED HERE

**All code is scaffolded. You need to set up accounts and run it.**

The next thing to do: **Step 1 below — install dependencies and boot the DB.**

---

## ✅ WHAT'S BEEN BUILT (code is ready)

| File | Status |
|---|---|
| `package.json` (monorepo root with Yarn Workspaces) | ✅ Done |
| `infra/docker-compose.yml` (Postgres + PostGIS) | ✅ Done |
| `services/user/src/db/migrations/001_init.sql` | ✅ Done |
| `services/user/src/db/connection.ts` | ✅ Done |
| `services/user/src/middleware/jwt.ts` | ✅ Done |
| `services/user/src/routes/auth.ts` (register, login, refresh, /me) | ✅ Done |
| `services/user/src/index.ts` (Express server) | ✅ Done |
| `services/user/scripts/migrate.js` | ✅ Done |
| `apps/mobile/app/_layout.tsx` (auth guard, QueryClient) | ✅ Done |
| `apps/mobile/app/(tabs)/_layout.tsx` (bottom tab bar) | ✅ Done |
| `apps/mobile/app/(tabs)/index.tsx` (Map Home with blue dot + sheet) | ✅ Done |
| `apps/mobile/app/(tabs)/explore.tsx` (stub) | ✅ Done |
| `apps/mobile/app/(tabs)/post.tsx` (stub) | ✅ Done |
| `apps/mobile/app/(tabs)/reels.tsx` (stub) | ✅ Done |
| `apps/mobile/app/(tabs)/profile.tsx` (shows user + logout) | ✅ Done |
| `apps/mobile/app/auth/login.tsx` | ✅ Done |
| `apps/mobile/app/auth/signup.tsx` | ✅ Done |
| `apps/mobile/store/authStore.ts` (Zustand + SecureStore) | ✅ Done |
| `apps/mobile/app.json` (Expo SDK 52 config) | ✅ Done |
| `.github/workflows/deploy-backend.yml` | ✅ Done |
| `.github/workflows/eas-build.yml` | ✅ Done |
| `.env.example` | ✅ Done |
| Placeholder folders for place, feed, media, search, notification | ✅ Done |

---

## 🔲 WHAT YOU STILL NEED TO DO (in order)

### STEP 1 — Install and boot (Day 1, ~30 min)

```bash
# From the repo root
yarn install

# Start Postgres
cd infra && docker compose up -d

# Verify it's healthy
docker compose ps   # Should show "healthy"
```

### STEP 2 — Configure environment (Day 1, ~10 min)

```bash
# Copy env template
cp .env.example services/user/.env
cp .env.example apps/mobile/.env
```

Edit `services/user/.env`:
- `JWT_SECRET` → generate with: `openssl rand -base64 32`
- `REFRESH_SECRET` → generate with: `openssl rand -base64 32`
- `DATABASE_URL` → already correct for local Docker

Edit `apps/mobile/.env`:
- `EXPO_PUBLIC_GOOGLE_MAPS_KEY` → get from Google Cloud Console (enable Maps SDK for Android + iOS)

### STEP 3 — Run migrations (Day 1, ~5 min)

```bash
cd services/user
yarn migrate
# Expected output:
# Running migration: 001_init.sql
# ✓ 001_init.sql
# All migrations complete.
```

### STEP 4 — Start the backend (Day 1, ~2 min)

```bash
cd services/user
yarn dev
# Expected: ✅ User Service running on http://localhost:3000
```

**Test with curl:**
```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'
# Expected: {"user":{...},"accessToken":"...","refreshToken":"..."}

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"user","db":"connected"}
```

⭐ **Week 1 done when:** `curl /register` returns a JWT token.

### STEP 5 — Run the mobile app (Day 2-3, ~1 hour)

```bash
cd apps/mobile
npx expo install   # installs all packages from package.json
npx expo start
```

Open in iOS simulator:
- Press `i` in the terminal

**Check:**
- [ ] Map loads (even with grey tiles if no API key yet)
- [ ] Blue dot appears after location permission
- [ ] Bottom sheet slides up with filter chips
- [ ] Login screen appears if not logged in
- [ ] Login → redirects to map ✅

⭐ **Week 2 done when:** You log in on your phone and see the map.

### STEP 6 — Google Maps API key (Week 2)

1. Go to https://console.cloud.google.com
2. Create a project → Enable "Maps SDK for iOS" and "Maps SDK for Android"
3. Create an API key → copy it to `apps/mobile/.env` and `app.json`
4. Restrict the key to your app's bundle ID for production

### STEP 7 — EC2 setup (Week 3)

1. Launch an EC2 t3.micro (Ubuntu 22.04) at ~$10/month
2. SSH in and run:
```bash
sudo apt update && sudo apt install -y nodejs npm docker.io git
sudo npm install -g pm2 yarn
sudo usermod -aG docker ubuntu
# Log out and back in
git clone https://github.com/YOUR_USERNAME/letus.git /srv/letus
cd /srv/letus/infra && docker compose up -d
```
3. Add GitHub Secrets:
   - `EC2_HOST` → your EC2 public IP
   - `EC2_SSH_KEY` → your private key (the PEM file contents)
4. Push to `main` → watch the Actions tab deploy automatically

### STEP 8 — TestFlight (Week 3)

```bash
# One-time setup
cd apps/mobile
npx eas-cli login        # uses your expo.dev account
npx eas-cli init         # creates eas.json
npx eas-cli build:configure

# Manual build to test
npx eas-cli build --platform ios --profile preview
```

Prerequisites:
- Apple Developer account ($99/year) — **sign up in Week 1, not Week 3**
- Expo account at expo.dev (free)
- Add `EXPO_TOKEN` to GitHub Secrets (from expo.dev → Account Settings → Access Tokens)

### STEP 9 — Recruit 10 founding users (Week 3)

Build a simple landing page (can use Notion, Carrd, or a basic HTML file) with:
- What Letus is (1 sentence)
- "I'm building a city discovery app. Want to be a founding explorer?"
- A form to collect their WhatsApp or email

⭐ **Phase 0 done when:** App installs on a friend's iPhone AND 10 humans say they'll use it.

---

## ⚠️ KNOWN ISSUES / THINGS TO WATCH

| Issue | Fix |
|---|---|
| Map shows grey tiles | Add Google Maps API key to `.env` and `app.json` |
| `yarn migrate` fails | Make sure Docker Postgres is running: `docker compose ps` |
| `yarn dev` crashes on jwt.ts | Check `JWT_SECRET` is set in `services/user/.env` |
| EAS build rejected by Apple | Create Apple Developer account early (takes 24-48h to activate) |
| SSH deploy fails | Test SSH manually: `ssh -i your-key.pem ubuntu@EC2_IP` before adding to Actions |
| `@gorhom/bottom-sheet` error | Make sure `GestureHandlerRootView` wraps the app in `_layout.tsx` ✅ (already done) |

---

## 📦 PHASE 1 STARTS AFTER THIS IS DONE

Phase 1 adds (in this order):
1. **Place Service (Go)** — GPS-based place discovery
2. **Post creation** — Photo/video upload, S3, media processing
3. **Feed fanout** — Redis + BullMQ, vibe score formula
4. **Kong API Gateway** — JWT enforcement across all services
5. **Elasticsearch** — Place search autocomplete
6. **Map pins** — Animated place pins with pulse
7. **Neo4j** — Follow graph + friend story circles
8. **Explorer XP** — Badges, levelling, achievements

---

*Last updated: Phase 0 scaffolding complete. Awaiting: install → migrate → first curl test.*

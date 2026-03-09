# EC2 Deployment

## Infrastructure

- **Instance type:** t3.micro (1 vCPU, 1GB RAM)
- **OS:** Ubuntu 22.04 LTS
- **Process manager:** PM2
- **Database:** PostgreSQL + PostGIS in Docker on the same instance (Phase 0)
- **Port:** 3000 (direct, no reverse proxy in Phase 0)
- **Deploy trigger:** Push to `main` branch affecting `services/user/**`

---

## One-Time EC2 Setup (Before First Deploy)

SSH into the EC2 instance and run these commands **once**:

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install Yarn
sudo npm install -g yarn

# 3. Install PM2
sudo npm install -g pm2

# 4. Install Docker
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu  # Allow ubuntu user to run docker

# 5. Clone the repository
sudo mkdir -p /srv/letus
sudo chown ubuntu:ubuntu /srv/letus
git clone <repo-url> /srv/letus

# 6. Set up environment variables
cp /srv/letus/.env.example /srv/letus/services/user/.env
nano /srv/letus/services/user/.env   # Fill in real secrets

# 7. Start the database
cd /srv/letus/infra
docker compose up -d

# 8. Install dependencies and run migrations
cd /srv/letus
yarn install
cd services/user && yarn migrate

# 9. Start the service with PM2
cd /srv/letus/services/user
pm2 start dist/index.js --name letus-user    # or use ts-node for Phase 0
# Or if using ts-node:
pm2 start "yarn dev" --name letus-user

# 10. Configure PM2 to restart on reboot
pm2 startup
pm2 save
```

---

## GitHub Actions Deploy Pipeline

**File:** `.github/workflows/deploy-backend.yml`

**Trigger:** Push to `main` branch with changes in `services/user/**`

**Sequence:**
1. SSH into EC2 using secret `EC2_SSH_KEY` and `EC2_HOST`
2. `cd /srv/letus && git pull origin main`
3. `yarn install --frozen-lockfile`
4. `cd services/user && yarn migrate`
5. `pm2 restart letus-user`

### Required GitHub Secrets

Set these in GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `EC2_HOST` | EC2 public IP or domain |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Private key (the .pem file content) |

---

## Security Checklist (EC2)

- [ ] Security group: port 3000 open to internet (Phase 0 — no reverse proxy)
- [ ] Security group: port 22 (SSH) open to your IP only (not 0.0.0.0/0)
- [ ] Security group: port 5432 (PostgreSQL) NOT open to internet
- [ ] `.env` file has real secrets (not defaults from `.env.example`)
- [ ] Ubuntu OS updates applied: `sudo apt-get update && sudo apt-get upgrade -y`

---

## Monitoring (Phase 0)

```bash
# View logs
pm2 logs letus-user

# View process status
pm2 status

# Monitor CPU/memory
pm2 monit
```

---

## Common Deploy Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `pm2: command not found` | PM2 not on PATH | `source ~/.bashrc` or use full path |
| `/srv/letus does not exist` | First deploy, directory missing | Run one-time setup above |
| Migrations fail | DB not running | `cd infra && docker compose up -d` |
| Service won't start | Missing/wrong .env | Check `services/user/.env` |
| `pm2 restart` fails | App not previously registered | Use `pm2 start` instead of `pm2 restart` |

See also: `docs/errors/log.md` ERR-008

---

## Phase 1 Changes

- Nginx reverse proxy in front of Node.js (port 80/443 → 3000)
- SSL termination via Let's Encrypt (Certbot)
- Kong API Gateway replaces direct port access
- RDS PostgreSQL replaces Docker container
- Multiple services (Place, Feed, etc.) each registered as separate PM2 processes

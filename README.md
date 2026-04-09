# Superfreak Backend

NestJS API for Superfreak Studio. Separate backend for the Next.js frontend; replaces Payload in the migration.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, REDIS_URL, etc.
```

## Run

- **Dev:** `npm run dev` — http://localhost:4000
- **Prod:** `npm run build && npm run start:prod`

## Docker (VPS / Proxmox)

### First-time setup on the VPS

From your home (or project) directory on the server:

```bash
# Clone the repo into superfreak-backend
git clone https://github.com/RichardTandean/superfreak-backend.git
cd superfreak-backend

# Create .env from example and edit (required: CORS_ORIGIN, DB/Redis, docker security vars; optional: R2, Midtrans, Biteship, etc.)
cp .env.example .env
nano .env   # or vim / vi

# Deploy (build + start API, MongoDB, Redis)
chmod +x deploy.sh
./deploy.sh
```

Or without the script:

```bash
docker compose up -d --build
```

- API: `http://<vps-ip>:4000` (or `PORT` from `.env`)
- Health: `GET http://<vps-ip>:4000/health`
- Compose overrides `DATABASE_URL` and `REDIS_URL` to use internal `mongodb` and `redis` services.
- MongoDB and Redis are intentionally not published to host ports by default (internal network only).

### Update and redeploy

```bash
cd ~/superfreak-backend   # or wherever you cloned
git pull
./deploy.sh
```

### One command: frontend + backend (lejel-style)

Use the unified script from this repo (works from any directory after install):

```bash
chmod +x scripts/deploy-superfreak.sh
# Optional: install globally
sudo ln -sf "$(pwd)/scripts/deploy-superfreak.sh" /usr/local/bin/deploy-superfreak

deploy-superfreak              # deploy Next.js (default)
deploy-superfreak frontend
deploy-superfreak backend      # this repo’s ./deploy.sh
deploy-superfreak all          # backend first, then frontend
```

It looks for clones at `~/superfreak-frontend` or `/root/superfreak-frontend` (and legacy `~/superfreak` / `/root/superfreak`) and `~/superfreak-backend` or `/root/superfreak-backend`. Override paths:

```bash
export SUPERFREAK_FRONTEND_DIR=/var/www/superfreak-frontend
export SUPERFREAK_BACKEND_DIR=/var/www/superfreak-backend
deploy-superfreak all
```

`scripts/deploy-vps.sh` is a thin wrapper with the same arguments (for older installs copied to `/usr/local/bin/deploy`).

**Optional:** If SuperSlice runs on the same host (e.g. another container), set `SUPERSLICE_API_URL=http://<container-name>:8000` in `.env` or in the `api` service `environment` in `docker-compose.yml`.

## Admin user (`role: admin`)

Register or sign in once with a normal account, then promote that user in MongoDB. There is no public HTTP endpoint for promotion.

**Script (loads `.env` from the repo root if `DATABASE_URL` is not already set):**

```bash
cd ~/superfreak-backend
node scripts/bootstrap-admin.mjs you@example.com

# Or explicit URI (works on any Node version)
DATABASE_URL="mongodb://user:pass@host:27017/superfreak?authSource=admin" node scripts/bootstrap-admin.mjs you@example.com

# Optional: Node 20.6+ can use --env-file instead of built-in .env loading in the script
node --env-file=.env scripts/bootstrap-admin.mjs you@example.com
```

**mongosh (collection `app-users`):**

```javascript
db.getCollection('app-users').updateOne(
  { email: 'you@example.com' },
  { $set: { role: 'admin', updatedAt: new Date() } },
)
```

## Authentication notes: RBAC vs blog API key

- **User sessions:** Cookie `sid` + Redis. Users have `role`: `user` or `admin` (see `app-users`). Admin-only API routes use `SessionGuard` + `RolesGuard` with `@Roles('admin')`.
- **Blog `POST /api/blog`:** Protected with **`BLOG_API_KEY`** (Bearer or similar), not with user `role`. That is intentional for automation/tools; it is separate from dashboard RBAC. To align later, you can add an admin-only blog route that uses session auth instead.

## Endpoints (B1)

- `GET /health` — Health check (MongoDB + Redis). Returns 200 when both up, 503 when both down.

All other APIs are under `/api` (e.g. later: `/api/auth/login`, `/api/orders`).

## Stack

- NestJS 10, Mongoose, MongoDB, Redis (ioredis), ConfigModule, class-validator/class-transformer.

## Development plan

See the frontend repo `docs/development-plan-backend.md` for module order (B1 → B15). This repo implements B1 (skeleton + health) first; Auth (B2) next.

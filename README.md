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

# Create .env from example and edit (required: JWT_SECRET, CORS_ORIGIN; optional: R2, Midtrans, Biteship, etc.)
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
- Compose overrides `DATABASE_URL` and `REDIS_URL` to use the `mongodb` and `redis` services.

### Update and redeploy

```bash
cd ~/superfreak-backend   # or wherever you cloned
git pull
./deploy.sh
```

**Optional:** If SuperSlice runs on the same host (e.g. another container), set `SUPERSLICE_API_URL=http://<container-name>:8000` in `.env` or in the `api` service `environment` in `docker-compose.yml`.

## Endpoints (B1)

- `GET /health` — Health check (MongoDB + Redis). Returns 200 when both up, 503 when both down.

All other APIs are under `/api` (e.g. later: `/api/auth/login`, `/api/orders`).

## Stack

- NestJS 10, Mongoose, MongoDB, Redis (ioredis), ConfigModule, class-validator/class-transformer.

## Development plan

See the frontend repo `docs/development-plan-backend.md` for module order (B1 → B15). This repo implements B1 (skeleton + health) first; Auth (B2) next.

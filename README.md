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

Run API + MongoDB + Redis with Docker Compose:

```bash
cp .env.example .env
# Edit .env: JWT_SECRET, CORS_ORIGIN (your frontend URL), R2/Midtrans/Biteship/RajaOngkir keys, etc.

docker compose up -d --build
```

- API: `http://<vps-ip>:4000` (or `PORT` from `.env`)
- Health: `GET http://<vps-ip>:4000/health`
- Compose overrides `DATABASE_URL` and `REDIS_URL` to use the `mongodb` and `redis` services.

**Optional:** If SuperSlice runs on the same host (e.g. another container), set `SUPERSLICE_API_URL=http://<container-name>:8000` in `.env` or in the `api` service `environment` in `docker-compose.yml`.

## Endpoints (B1)

- `GET /health` — Health check (MongoDB + Redis). Returns 200 when both up, 503 when both down.

All other APIs are under `/api` (e.g. later: `/api/auth/login`, `/api/orders`).

## Stack

- NestJS 10, Mongoose, MongoDB, Redis (ioredis), ConfigModule, class-validator/class-transformer.

## Development plan

See the frontend repo `docs/development-plan-backend.md` for module order (B1 → B15). This repo implements B1 (skeleton + health) first; Auth (B2) next.

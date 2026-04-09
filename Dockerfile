# superfreak-backend – production image for VPS (Proxmox)
# Multi-stage: build then run

# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (production + dev for build)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS production

WORKDIR /app

# Production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Built output from builder
COPY --from=builder /app/dist ./dist

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 4000

ENV NODE_ENV=production
# Nest `nest build` emits `dist/src/main.js` (tsconfig preserves `src/` under `outDir`)
CMD ["node", "dist/src/main.js"]

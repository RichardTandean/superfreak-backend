#!/usr/bin/env bash
# Run from superfreak-backend directory on your VPS.
# First time: copy .env.example to .env and edit (CORS_ORIGIN, DB/Redis vars, etc.).
# Uses current branch for git pull (e.g. main or staging).

set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Copying .env.example to .env — please edit .env and run again."
  cp .env.example .env
  exit 1
fi

echo "📥 Pull latest code..."
git pull

echo "🐳 Building and starting containers..."
docker compose up -d --build

echo "✅ Deploy success! API: http://$(hostname -I | awk '{print $1}'):${PORT:-4000}"
echo "   Health: curl http://localhost:${PORT:-4000}/health"

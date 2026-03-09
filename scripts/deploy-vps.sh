#!/usr/bin/env bash
# Unified deploy for VPS:  deploy  |  deploy frontend  |  deploy backend
#
# Copy to your VPS and use as the single deploy command:
#   sudo cp scripts/deploy-vps.sh /usr/local/bin/deploy
#   sudo chmod +x /usr/local/bin/deploy
# Then:  deploy frontend   or   deploy backend   or   deploy  (defaults to frontend)
#
# Frontend: /root/superfreak/deploy.sh   Backend: /root/superfreak-backend/deploy.sh

set -e

target="${1:-frontend}"

case "$target" in
  frontend)
    echo "==> Deploying frontend..."
    if [ ! -f /root/superfreak/deploy.sh ]; then
      echo "/root/superfreak/deploy.sh not found"; exit 1
    fi
    /root/superfreak/deploy.sh
    ;;
  backend)
    echo "==> Deploying backend..."
    cd ~/superfreak-backend || { echo "~/superfreak-backend not found"; exit 1; }
    ./deploy.sh
    ;;
  *)
    echo "Usage: deploy [frontend|backend]"
    echo "  deploy         → same as deploy frontend"
    echo "  deploy frontend"
    echo "  deploy backend"
    exit 1
    ;;
esac

echo "==> Done."

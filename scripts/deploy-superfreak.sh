#!/usr/bin/env bash
# One entrypoint to deploy Superfreak frontend and/or backend (similar workflow to lejel deploy scripts).
#
# Install on the VPS (pick one):
#   sudo ln -sf /path/to/superfreak-backend/scripts/deploy-superfreak.sh /usr/local/bin/deploy-superfreak
#   sudo chmod +x /usr/local/bin/deploy-superfreak
#
# Usage:
#   deploy-superfreak           # frontend only (default)
#   deploy-superfreak frontend
#   deploy-superfreak backend
#   deploy-superfreak all       # backend then frontend
#
# Optional env (directories must contain deploy.sh):
#   SUPERFREAK_FRONTEND_DIR   default: auto-detect (see below)
#   SUPERFREAK_BACKEND_DIR  default: auto-detect

set -euo pipefail

TARGET="${1:-frontend}"

resolve_frontend_dir() {
  if [ -n "${SUPERFREAK_FRONTEND_DIR:-}" ]; then
    printf '%s' "$SUPERFREAK_FRONTEND_DIR"
    return
  fi
  for d in "${HOME}/superfreak-frontend" "/root/superfreak-frontend" "${HOME}/superfreak" "/root/superfreak"; do
    if [ -x "$d/deploy.sh" ] || [ -f "$d/deploy.sh" ]; then
      printf '%s' "$d"
      return
    fi
  done
  printf ''
}

resolve_backend_dir() {
  if [ -n "${SUPERFREAK_BACKEND_DIR:-}" ]; then
    printf '%s' "$SUPERFREAK_BACKEND_DIR"
    return
  fi
  for d in "${HOME}/superfreak-backend" "/root/superfreak-backend"; do
    if [ -x "$d/deploy.sh" ] || [ -f "$d/deploy.sh" ]; then
      printf '%s' "$d"
      return
    fi
  done
  printf ''
}

run_frontend() {
  local dir
  dir="$(resolve_frontend_dir)"
  if [ -z "$dir" ]; then
    echo "Could not find frontend repo (tried superfreak-frontend / superfreak under \$HOME and /root)."
    echo "Set SUPERFREAK_FRONTEND_DIR to your clone path."
    exit 1
  fi
  echo "==> Frontend: $dir"
  (cd "$dir" && bash ./deploy.sh)
}

run_backend() {
  local dir
  dir="$(resolve_backend_dir)"
  if [ -z "$dir" ]; then
    echo "Could not find backend repo under \$HOME/superfreak-backend or /root/superfreak-backend."
    echo "Set SUPERFREAK_BACKEND_DIR to your clone path."
    exit 1
  fi
  echo "==> Backend: $dir"
  (cd "$dir" && bash ./deploy.sh)
}

case "$TARGET" in
  frontend | fe)
    run_frontend
    ;;
  backend | be | api)
    run_backend
    ;;
  all)
    run_backend
    run_frontend
    ;;
  -h | --help | help)
    echo "Usage: $(basename "$0") [frontend|backend|all]"
    echo ""
    echo "  frontend (default)  Run deploy.sh in the Next.js repo (staging compose by default)."
    echo "  backend             Run deploy.sh in superfreak-backend (docker compose API stack)."
    echo "  all                 Backend first, then frontend."
    echo ""
    echo "Env: SUPERFREAK_FRONTEND_DIR, SUPERFREAK_BACKEND_DIR"
    echo "Frontend compose override: SUPERFREAK_FRONTEND_COMPOSE_FILE (in frontend deploy.sh)"
    exit 0
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $(basename "$0") [frontend|backend|all]   (try --help)"
    exit 1
    ;;
esac

echo "==> deploy-superfreak: done."

#!/usr/bin/env bash
# Backwards-compatible wrapper: historically copied to /usr/local/bin as "deploy".
# Prefer: deploy-superfreak.sh (frontend|backend|all) with auto-detected paths.
#
#   deploy              → frontend (same as before default)
#   deploy frontend
#   deploy backend
#
# New unified script (same args):
#   bash scripts/deploy-superfreak.sh [frontend|backend|all]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/deploy-superfreak.sh" "${1:-frontend}"

#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
cd "$APP_DIR"
export NODE_ENV=production
exec node "wizard/Modulo 4/CU4-001/server.js"

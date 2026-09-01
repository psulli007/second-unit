#!/usr/bin/env bash
# Start (or reuse) a dev server for the app checked out in ./app/.
# Only relevant when APP_REMOTES is set — if you're filming a deployed URL, skip this.
set -euo pipefail
STUDIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$STUDIO_DIR/config.env"

PORT="${DEV_PORT:-5173}"
if [ ! -d "$STUDIO_DIR/app" ]; then
  echo "no ./app/ checkout — set APP_REMOTES in config.env and run scripts/bootstrap.sh,"
  echo "or point APP_URL at an already-running server and skip this script."
  exit 1
fi
if curl -s -o /dev/null "http://localhost:$PORT"; then
  echo "dev server already running on :$PORT"
  exit 0
fi
echo "starting dev server on :$PORT (logs: $STUDIO_DIR/dev-server.log)"
cd "$STUDIO_DIR/app"
nohup ${APP_DEV_COMMAND:-npm run dev} > "$STUDIO_DIR/dev-server.log" 2>&1 &
for _ in $(seq 1 30); do
  sleep 1
  curl -s -o /dev/null "http://localhost:$PORT" && { echo "ready"; exit 0; }
done
echo "server did not come up — check dev-server.log"; exit 1

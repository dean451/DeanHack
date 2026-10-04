#!/usr/bin/env bash
# Update the play copy and launch it: pull master, rebuild the live engine, serve on 5173.
# Mac, Linux and WSL. On native Windows use deanhack-update.ps1 (demo scene only).
# Run it from the play copy (the checkout on master), e.g.: prototype/scripts/deanhack-update.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT=5173
cd "$ROOT"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "master" ]; then
  echo "Refusing to update: this checkout is on '$branch', not master (is this the play copy?)." >&2
  exit 1
fi

git pull --ff-only origin master

cd prototype
npm ci
npm run engine:build

# Free the port so the server restarts on the rebuilt engine.
pids="$(lsof -ti :"$PORT" 2>/dev/null || true)"
if [ -n "$pids" ]; then
  echo "Stopping the server on port $PORT"
  kill $pids || true
  sleep 1
fi

echo "Starting on http://127.0.0.1:$PORT/ (use a private window if your ad blocker blocks boomerang.js)"
exec npm run dev -- --port "$PORT" --strictPort

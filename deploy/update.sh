#!/bin/sh
# Update the server to the latest master and rebuild only if something changed.
#   ./deploy/update.sh            update now
#   ./deploy/update.sh --force    rebuild even if nothing changed
# Run from anywhere; it works in the repository it lives in. The running character is saved when
# the container stops (the server handles SIGTERM), and the saves volume survives the rebuild.
set -eu
cd "$(dirname "$0")/.."
exec 9>/tmp/deanhack-update.lock
flock -n 9 || { echo "another update is running"; exit 0; }
git fetch -q origin master
git checkout -q master
before=$(git rev-parse HEAD)
git merge -q --ff-only origin/master
after=$(git rev-parse HEAD)
if [ "$before" = "$after" ] && [ "${1:-}" != "--force" ]; then
  echo "already up to date ($after)"
  exit 0
fi
echo "updating $before -> $after"
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps

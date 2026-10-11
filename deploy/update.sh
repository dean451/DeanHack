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
# A server whose master has a commit GitHub does not (a stray local merge, say) would "fast-forward"
# to itself and never pick anything up. Say so instead of pretending to be current.
if [ "$after" != "$(git rev-parse origin/master)" ]; then
  echo "this server's master ($after) is not GitHub's master ($(git rev-parse --short origin/master))."
  echo "it has local commits. If you did not mean to keep them, run:"
  echo "    git reset --hard origin/master && ./deploy/update.sh --force"
  exit 1
fi
if [ "$before" = "$after" ] && [ "${1:-}" != "--force" ]; then
  echo "already up to date ($after)"
  exit 0
fi
echo "updating $before -> $after"
docker compose up -d --build
# the Caddyfile and users folder are mounted, so a changed one needs a reload (no downtime)
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || docker compose restart caddy
docker image prune -f >/dev/null
docker compose ps

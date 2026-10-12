#!/bin/sh
# Back up the saves: a dated tarball of the game volume (saves, bones, the high-score file, the
# player numbers and class notes) into /root/backups, keeping the last 14. Safe while the game runs:
# the engine writes a save as one file, so a tarball catches it whole or not at all.
#   ./deploy/backup.sh                   back up now
#   crontab: 30 3 * * * /root/DeanHack/deploy/backup.sh >> /var/log/deanhack-backup.log 2>&1
# Restore (stops the game while it copies):
#   docker compose stop app
#   docker run --rm -v deanhack_game:/v -v /root/backups:/b ubuntu sh -c 'rm -rf /v/* && tar xzf /b/<file>.tgz -C /v'
#   docker compose start app
set -eu
cd "$(dirname "$0")/.."
dir="${DEANHACK_BACKUPS:-/root/backups}"
keep="${DEANHACK_BACKUP_KEEP:-14}"
# the volume is named after the compose project (the folder, lower-cased) plus _game
project="$(basename "$PWD" | tr 'A-Z' 'a-z')"
volume="${project}_game"
mkdir -p "$dir"
file="$dir/deanhack-saves-$(date +%Y%m%d-%H%M).tgz"
docker run --rm -v "$volume:/v:ro" -v "$dir:/b" ubuntu tar czf "/b/$(basename "$file")" -C /v .
echo "$(date '+%F %T') wrote $file ($(du -h "$file" | cut -f1))"
# keep the newest $keep, delete the rest
ls -1t "$dir"/deanhack-saves-*.tgz 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do rm -f "$old"; echo "removed $old"; done

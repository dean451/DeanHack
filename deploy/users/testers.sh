#!/usr/bin/env bash
# Tester logins from a list of emails: each email is both the user name and the password.
#
#   deploy/users/testers.sh                 # reads deploy/users/testers.txt
#   deploy/users/testers.sh emails.txt      # or any file, one email per line (# comments and blanks ok)
#
# Writes deploy/users/testers.caddy (one bcrypt line per email, lower-cased) and restarts Caddy.
# Re-run it after editing the list: the file is rebuilt from scratch, so removing an email removes
# the login (their saves stay on disk). The list and the .caddy file are git-ignored: friends'
# emails never go into the repo. Run it on the server from the repo root; needs Docker.
set -euo pipefail
cd "$(dirname "$0")/../.."
list="${1:-deploy/users/testers.txt}"
out="deploy/users/testers.caddy"
[ -f "$list" ] || { echo "no list at $list (one email per line)"; exit 1; }
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
n=0
while IFS= read -r raw || [ -n "$raw" ]; do
  email="$(printf '%s' "$raw" | sed 's/#.*//; s/^[[:space:]]*//; s/[[:space:]]*$//' | tr 'A-Z' 'a-z')"
  [ -n "$email" ] || continue
  # Caddy's user names: letters, digits and _.@- only ("+" tags are not allowed)
  if ! printf '%s' "$email" | grep -Eq '^[A-Za-z0-9_.@-]{1,64}$'; then echo "skipping $email: only letters, digits and _.@- are allowed"; continue; fi
  hash="$(docker run --rm caddy caddy hash-password --plaintext "$email")"
  printf '%s %s\n' "$email" "$hash" >> "$tmp"
  n=$((n+1))
done < "$list"
mv "$tmp" "$out"; chmod 644 "$out"
echo "$n logins written to $out"
if docker compose ps caddy >/dev/null 2>&1; then docker compose restart caddy >/dev/null && echo "Caddy restarted"; else echo "start the stack (docker compose up -d) to apply"; fi

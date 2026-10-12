#!/usr/bin/env bash
# Delete remote claude/* branches whose tip is exactly the head of a merged pull request.
# Squash merges leave every branch unmerged in git's eyes, so this asks GitHub which PRs merged.
#   prototype/tools/sweep-branches.sh          # dry run: prints what would go
#   prototype/tools/sweep-branches.sh --delete # deletes, 100 per push
# Needs gh (logged in) and push rights. Cloud sessions cannot delete refs (403), so run it locally.
# Branches whose tip is not a merged PR head (open PRs, work that never got a PR, commits after
# the merge) are left alone and listed at the end.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
gh pr list --repo "$repo" --state merged --limit 5000 --json headRefName,headRefOid \
  -q '.[] | "\(.headRefOid) \(.headRefName)"' | sort -u > "$tmp/merged"
gh pr list --repo "$repo" --state open --limit 500 --json headRefName -q '.[].headRefName' | sort -u > "$tmp/open"
git ls-remote origin 'refs/heads/claude/*' | sed 's|refs/heads/||' > "$tmp/branches"
: > "$tmp/delete"; : > "$tmp/keep"
while read -r sha name; do
  if grep -qxF "$name" "$tmp/open"; then echo "$name (open PR)" >> "$tmp/keep"; continue; fi
  if grep -qxF "$sha $name" "$tmp/merged"; then echo "$name" >> "$tmp/delete"; else echo "$name" >> "$tmp/keep"; fi
done < "$tmp/branches"
echo "$(wc -l < "$tmp/delete") branches are merged PR heads; $(wc -l < "$tmp/keep") kept:"
sed 's/^/  keep /' "$tmp/keep"
if [ "${1:-}" != "--delete" ]; then echo "dry run; pass --delete to remove the $(wc -l < "$tmp/delete")"; exit 0; fi
split -l 100 "$tmp/delete" "$tmp/batch-"
for f in "$tmp"/batch-*; do git push origin --delete $(tr '\n' ' ' < "$f"); done
git fetch --prune origin
echo "done; $(git ls-remote origin 'refs/heads/claude/*' | wc -l) claude/* branches remain"

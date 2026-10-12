# Server to-do (Dean's list)

Things only the server owner can do. Claude sessions keep this current: when something is finished,
tick it; when a PR needs a step on the server, add it here. Last updated 2026-10-11 (late).

## Next time you're at the server (in this order)

- [ ] **1. Make sure the code is merged.** On GitHub, these should show as merged:
  [#1284](https://github.com/dean451/DeanHack/pull/1284) one game per player (merged),
  [#1286](https://github.com/dean451/DeanHack/pull/1286) class selection (merged),
  [#1288](https://github.com/dean451/DeanHack/pull/1288) class outfits (was still running its checks).
- [ ] **2. Put the server back on GitHub's `master`.** On 2026-10-11 `update.sh` said
  "already up to date (836f4897)", but that commit does not exist on GitHub: the server's `master`
  has a stray local commit, so nothing new was pulled. Fix (safe: `.env` and `deploy/users/` are
  untracked and are not touched):
  ```
  ssh root@46.225.130.193
  cd ~/DeanHack && git fetch origin && git checkout master && git reset --hard origin/master
  ```
  If you want to know what happened first, run `git log --oneline -3` before the reset and paste it
  to Claude.
- [ ] **3. Update.** `./deploy/update.sh --force`. This rebuilds the game engine (the engine changed
  three times: per-player saves, class fields, shared roles file), so expect **5 to 10 minutes**.
  It then reloads Caddy. At the end `docker compose ps` should show `app` and `caddy` running.
  *If the build fails, paste the last 30 lines to Claude. Don't paste `.env` or password hashes.*
  (`update.sh` now refuses to run when the server's `master` is not GitHub's, and prints the fix.)
- [ ] **4. Check it as yourself.** Open https://deanhack.online, log in as `dean`, type a new name,
  press Begin, pick a class, and Descend. You should land in the game as that class. Your old test
  characters will not be listed: the per-player change gave every login fresh saves.
- [ ] **5. Add your friends' logins** (one per person; this is what keeps their games apart).
  Quickest: `nano deploy/users/testers.txt` (one email per line), then `deploy/users/testers.sh`.
  Each email is then both user name and password. Or one at a time:
  ```
  docker run --rm -it caddy caddy hash-password       # type THEIR password, copy the hash
  echo 'alice $2a$14$...paste the hash...' >> deploy/users/friends.caddy
  docker compose restart caddy
  ```
  Use single quotes. Names: letters, digits and `_.@-`. Repeat for each friend. Tell them the
  address, their name and their password.
- [ ] **6. Try two logins at once.** Open a private window, log in as a friend, and start a
  character with the same name as yours. The two games must be separate.
- [ ] **7. Link preview.** Send https://deanhack.online/?v=2 to yourself in iMessage. The `?v=2`
  gets past the old cached empty preview. You should see the dragon banner.

## Bug fix to deploy: saves were being lost (found 2026-10-11 evening)

- [ ] **Saves on the server were deleted on resume** because the image had no `bzip2` (the engine's
  save compressor). Fixed in the Dockerfile. Once that PR has merged: `./deploy/update.sh`
  (or wait for the 4am run). Characters saved before this fix are gone; new ones will resume.
  Check after the update: `docker compose exec app /usr/bin/bzip2 --version` prints a version.

## Coming through the nightly update (nothing to do, just so you know)

- Hunger is back (#1351) and the level-2 shop is a regular general store with likely essentials
  (the ascension kit is kept in source, switched off). Both change the engine, so the 4am run will
  rebuild it (5 to 10 minutes). Or run `./deploy/update.sh` by hand once they have merged.
- Far look no longer names unidentified items by type (#1352); kobold spines fixed.

## Soon

- [ ] **Nightly auto-update.** `crontab -e` and add
  `0 4 * * * /root/DeanHack/deploy/update.sh >> /var/log/deanhack-update.log 2>&1`
  (4am; the hourly routines merge to `master` all day, so deploying on every merge would restart
  the game constantly).
- [ ] **Turn on 2FA** on Hetzner, Namecheap and GitHub.
- [ ] **Back up the saves nightly.** `crontab -e` and add
  `30 3 * * * /root/DeanHack/deploy/backup.sh >> /var/log/deanhack-backup.log 2>&1`
  (dated tarballs in `/root/backups`, last 14 kept; run `./deploy/backup.sh` once by hand to see it work).
  Copy one off the server now and then; the restore steps are at the top of the script.
- [ ] **After the playtest:** `docker compose logs -t app | grep 'deanhack session'` shows who got in, what
  they played and how each game ended; `grep 'deanhack death'` the deaths.
- [ ] **Namecheap:** decide whether you want `www.deanhack.online` to work. It does not yet; say so
  and Claude will add the redirect.
- [ ] **Hetzner:** check the server has automatic security updates (`apt list --upgradable`
  occasionally, or `unattended-upgrades`), and consider turning on Hetzner backups (a few dollars).

## Good to know

- Every login gets its own game, saves and class. At most 8 games run at once
  (`DEANHACK_MAX_ENGINES` in `.env`); a game nobody has touched for 20 minutes is saved and stopped.
- To remove a friend, delete their line in `deploy/users/friends.caddy` and
  `docker compose restart caddy`. Their saves stay on disk.
- Bones (dead characters' ghosts) are shared between everyone's games. That is part of the game.
- Full instructions: `deploy/DEPLOY.md`.

## Not built yet (so don't expect it)

- The death screen with the cause, a short intro of the keys, and clear messages when a game drops
  or is stopped for being idle (next up).
- Per-class polish: faces still look female on men, and several classes are only a first pass.
- A "Saved" confirmation, deleting a character, rate limits per player.

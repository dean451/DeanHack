# Deploying DeanHack (deanhack.online)

One small Linux VM runs two containers: the game (the built client, the UnNetHack engine and
`prototype/engine/serve.js`) and Caddy, which gets the HTTPS certificate, asks for a password and
proxies to the game. Any provider works (Hetzner, DigitalOcean, Linode, Lightsail, a spare box).
Pick 2 vCPU and 2 GB of RAM or more: the engine compiles in the image build, which takes a few
minutes.

Static hosts (GitHub Pages, Netlify, Cloudflare Pages) cannot run this. They would serve the demo
scene only, because Live mode needs the engine process on the server.

## What you must know first

- **One game per login.** Each login (yours in `.env`, plus one per friend in `deploy/users/`) gets
  its own engine, character list and saves. Two friends can both play a character called "Frodo"
  without touching each other's game, and nobody can see another login's saved characters. The
  server runs at most `DEANHACK_MAX_ENGINES` games at once (default 8; set it in `.env`), and a game
  nobody has touched for 20 minutes is saved and stopped. Two tabs on the same login share that
  login's game.
- **The login is the access control.** The game server trusts the login name Caddy passes along,
  and is only reachable through Caddy (its port is not published). Never publish port 8080.
  The allowed host list (`DEANHACK_HOSTS`) is a safety net, not authentication.
- **Bones are shared.** When a character dies the ghost can show up in a friend's game, which is
  part of the game and not a leak of anything private.
- **Saves live in a Docker volume** (`game`, plus `home`) and survive
  `docker compose up --build`. They are lost if you run `docker compose down -v`.

## One-time setup

1. Buy the domain and add DNS records at the registrar: `A` for `deanhack.online` (and `AAAA` if the
   VM has IPv6) pointing at the VM's public IP. Wait until `dig deanhack.online` returns it.
2. On the VM, open ports 80 and 443 (443/udp too, for HTTP/3) in the firewall, then install Docker:
   `curl -fsSL https://get.docker.com | sh`
3. Get the code: `git clone https://github.com/dean451/DeanHack.git && cd DeanHack`
4. Make a password hash and write `.env` next to `docker-compose.yml`:
   ```
   docker run --rm caddy caddy hash-password        # type the password; copy the output
   ```
   ```
   DEANHACK_DOMAIN=deanhack.online
   DEANHACK_USER=dean
   DEANHACK_PASSWORD_HASH=<paste the hash, in single quotes>
   ```
   Single quotes matter: the hash contains `$` characters. `.env` is git-ignored; never commit it.
5. Build and start: `docker compose up -d --build`
6. Open https://deanhack.online, enter the user and password, and press Live.

## Adding a friend

```
docker run --rm -it caddy caddy hash-password          # you type THEIR password; copy the hash
echo 'alice $2a$14$...paste the hash...' >> deploy/users/friends.caddy
docker compose restart caddy
```

Use single quotes so the `$` characters survive. Give them the address, their name and the
password. Names are letters, digits and `_.@-`. For a batch of testers, list their emails in
`deploy/users/testers.txt` and run `deploy/users/testers.sh`: each email becomes its own login with the
email as the password (`deploy/users/README.md`). To remove
someone, delete their line and restart Caddy; their saves stay on disk.

The first deploy after this was added gives every login a fresh set of saves: games started before
it were saved under the server's own uid and no longer show up.

## Updating

Merging to `master` does not change the server by itself. To update it, on the server run:

```
~/DeanHack/deploy/update.sh
```

It fetches `master`, and rebuilds and restarts only if something changed (`--force` rebuilds anyway).
Stopping the container saves the running character first (the server handles SIGTERM and gives the
engine up to 30 seconds), and saves live in a volume, so a redeploy keeps your game. You will be
sent back to the start screen and can press Live to resume.

Changes to `prototype/engine/bridge.c` always need this rebuild. The first build compiles the
engine and takes several minutes; later ones reuse Docker's cache for the unchanged steps, but any
source change currently re-runs the engine compile too, so expect a few minutes each time.

### Automatic updates (optional)

The scheduled routines merge to `master` about every hour. Redeploying on every merge would restart
the game that often, so prefer one of these:

- **Nightly**, at a quiet hour: `crontab -e` and add
  `0 4 * * * /root/DeanHack/deploy/update.sh >> /var/log/deanhack-update.log 2>&1`
- **On demand, from GitHub** (a "Run workflow" button): add `.github/workflows/deploy.yml` yourself
  (Claude sessions and routines do not edit `.github/`) and store three repository secrets:
  `DEPLOY_HOST` (the server IP), `DEPLOY_USER` (`root`) and `DEPLOY_KEY` (a private key whose public
  half is in the server's `~/.ssh/authorized_keys`; use a new key, not your personal one).

  ```yaml
  name: Deploy
  on:
    workflow_dispatch:
  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - name: Update the server
          env:
            KEY: ${{ secrets.DEPLOY_KEY }}
            HOST: ${{ secrets.DEPLOY_HOST }}
            USER_NAME: ${{ secrets.DEPLOY_USER }}
          run: |
            install -m 600 /dev/null key
            printf '%s\n' "$KEY" > key
            ssh -i key -o StrictHostKeyChecking=accept-new "$USER_NAME@$HOST" '~/DeanHack/deploy/update.sh'
  ```

  To deploy on every merge instead, change the trigger to `push: branches: [master]`.

## Link previews

Pasting https://deanhack.online into iMessage, Slack, Discord or X shows a banner card
(`prototype/public/og.png`, 1200x630). The preview bots cannot type a password, so Caddy answers
them with a bare page holding only the title, description and image, and serves `/og.png` to anyone.
Everything else, including the game and its API, stays behind the password. Phones cache previews:
if you change the banner and an old one shows, send the link with a trailing `?v=2`.

The banner is the title screen's ink dragon head in ASCII (`prototype/tools/ascii-banner.html`).
To redraw it, run the dev server and capture that page with headless Chrome at 1200x630:
`"Google Chrome" --headless=new --hide-scrollbars --window-size=1200,630 --screenshot=prototype/public/og.png http://localhost:<port>/tools/ascii-banner.html`.

## Operating it

- Logs: `docker compose logs -f app` (and `caddy`); `-t` adds timestamps.
- Restart the game: `docker compose restart app`. A running character is saved by the engine on
  exit; the client offers to resume.
- Who is playing: `docker compose logs -t app | grep 'deanhack session'`. The server writes one line per
  session start (login, character, class, resumed or new), death (what, where) and session end (why:
  exit, idle, shutdown, crash), with the number of games running. `grep 'deanhack death'` lists the deaths.
- Back up saves: `./deploy/backup.sh` writes a dated tarball of the game volume to `/root/backups` and
  keeps the last 14. Nightly: `30 3 * * * /root/DeanHack/deploy/backup.sh >> /var/log/deanhack-backup.log 2>&1`
  (half an hour before the update). Restore steps are at the top of the script.
- Change the password: edit `.env`, then `docker compose up -d caddy`.
- Check the build without a server: `docker build -t deanhack .` then
  `docker run --rm -p 8080:8080 -e DEANHACK_HOSTS=localhost:8080 deanhack`
  (open http://localhost:8080; there is no password on this direct route, so keep it local).

## How it fits together

| Piece | File |
| --- | --- |
| Image: builds the client and engine, runs the server as an unprivileged user | `Dockerfile` |
| Static client plus the `/engine/*` API, no login | `prototype/engine/serve.js` |
| Allowed hosts for the engine API (`DEANHACK_HOSTS`) | `prototype/engine/server.js` (`hostAllowed`) |
| HTTPS, password, streaming proxy | `deploy/Caddyfile` |
| The two containers, volumes, no published game port | `docker-compose.yml` |

The client calls the engine with relative URLs, so it needs no server address configured. If the
live stream is held back by some other proxy, the client falls back to polling `/engine/poll`.

## Not done yet

- Deploying on merge without a manual step (see the optional section above).
- A Docker build that reuses the engine compile when only client code changed.
- Per-player characters and engines, which would also allow more than one person at a time.
- Backups on a schedule.

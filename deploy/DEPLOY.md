# Deploying DeanHack (deanhack.online)

One small Linux VM runs two containers: the game (the built client, the UnNetHack engine and
`prototype/engine/serve.js`) and Caddy, which gets the HTTPS certificate, asks for a password and
proxies to the game. Any provider works (Hetzner, DigitalOcean, Linode, Lightsail, a spare box).
Pick 2 vCPU and 2 GB of RAM or more: the engine compiles in the image build, which takes a few
minutes.

Static hosts (GitHub Pages, Netlify, Cloudflare Pages) cannot run this. They would serve the demo
scene only, because Live mode needs the engine process on the server.

## What you must know first

- **One game per server.** The engine API has one engine process, one character and one token, so
  everyone who is let in shares the same game. The password gate in `deploy/Caddyfile` is the
  access control. Do not remove it. A second player would need per-player engines and saves,
  which is not built yet.
- **The password protects the engine.** The engine API has no login of its own, and the allowed
  host list (`DEANHACK_HOSTS`) is a safety net, not authentication.
- **Saves live in a Docker volume** (`game`, plus `home`). They survive `docker compose up --build`.
  They are lost if you run `docker compose down -v`.

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

## Updating

```
git pull
docker compose up -d --build
```

The engine is rebuilt only when its sources change, thanks to Docker layer caching. Changes to
`prototype/engine/bridge.c` always need the rebuild above. Saves are kept.

## Operating it

- Logs: `docker compose logs -f app` (and `caddy`).
- Restart the game: `docker compose restart app`. A running character is saved by the engine on
  exit; the client offers to resume.
- Back up saves: `docker run --rm -v deanhack_game:/v -v "$PWD":/b ubuntu tar czf /b/game-backup.tgz -C /v .`
  (the volume name is the compose project folder plus `_game`).
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

- A GitHub Actions workflow that builds the image and deploys on merge (it needs a change under
  `.github/`, which routines and Claude sessions do not edit: add it by hand).
- Per-player characters and engines, which would also allow more than one person at a time.
- Backups on a schedule.

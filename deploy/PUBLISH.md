# Publishing DeanHack (from friends-only to public)

The game already runs at https://deanhack.online behind per-friend logins (`deploy/DEPLOY.md`,
`deploy/SERVER-TODO.md`). This is what stands between that and opening it to anyone. Claude sessions
keep it current: tick an item when its PR merges, and note who owns each one.

**Owner key:** *Claude* = code in this repo, a session can do it. *Dean* = only the owner can (accounts,
money, the server, a decision). *Both* = Dean decides, Claude builds.

## 1. Legal and credits (must-have before public)

- [x] **Credits and licences in the game** (*Claude*, done: `start-extras.js`, a Credits button beside Leaderboard on the splash). An About/Credits screen reachable from the splash:
  built on UnNetHack and NetHack (NetHack General Public License, `dat/license`), the source link
  (https://github.com/dean451/DeanHack, public), three.js and meshoptimizer (MIT), the Google fonts
  (SIL Open Font License), English Towne (Dieter Steffmann), the fox model (PixelMannen, CC0; glTF
  conversion @AsoboStudio and @scurest, CC BY 4.0, which requires the credit: `models/CREDITS.md`).
  Plus "not affiliated with the NetHack DevTeam".
- [x] **Licence text served** (*Claude*, done: `prototype/public/LICENSE-NETHACK.txt`, a test keeps it identical): `dat/license` reachable from the credits screen, as the NGPL asks.
- [ ] **English Towne font licence** (*Dean*). Dieter Steffmann's fonts are distributed as freeware; check the licence text that came with `EnglishTowne.ttf` allows use on a public website, or drop the font (the title falls back to Pirata One).
- [ ] **Privacy note** (*Both*). The server keeps a login name, a save per player and log lines
  (session start, death, end); the browser keeps a few local settings. A short page saying so, and who
  to contact. Drafted (Claude): `prototype/public/privacy.html`, linked from the Credits box, with GitHub
  issues as the contact. Dean: swap in a contact address if issues is not enough, then tick this. If Caddy
  ever gets an access log, the page's "does not log your IP address" must change.

## 2. Getting in (must-have)

- [ ] **How strangers get in** (*Both*, Dean decides first). Today every player needs a hand-made Caddy
  login. Options: open guest play (the `DEANHACK_GUEST_LOGINS` cookie path already gives each browser
  its own game on one shared login), a signup page, or invite codes.
- [x] **Server full** (*Claude*, done: `startFailedNote` in `start-extras.js` sends the player back to the splash with the server's words). At most `DEANHACK_MAX_ENGINES` (8) games run at once; the 9th player
  needs a clear "the dungeon is full, try again in a few minutes" instead of an error.
- [ ] **Rate limits per player** (*Both*; needs `engine/server.js`, which sessions only edit with Dean's
  OK): a cap on game starts and input per login or address, so one visitor cannot hold every engine.

## 3. First ten minutes (should-have)

- [x] **Keys on first entry** (*Claude*, done: the keys card in `start-extras.js`). A short, dismissable card naming the essential keys (hjkl and
  yubn to move, `,` pick up, `i` inventory, `s` search, `?` help, Save & quit), shown once; the engine's
  own intro text is where newcomers give up (Tester readiness 6).
- [x] **Phones and small screens** (*Claude*, done: the splash's keyboard notice in `start-extras.js`). A clear "DeanHack needs a keyboard" line on the splash
  for touch-only devices instead of a frozen screen (Tester readiness 7).
- [ ] **Landing copy** (*Both*). The splash and the link preview say what this is in one line.
  Drafted (Claude): the description, og and twitter cards now read "UnNetHack, the classic roguelike, played
  in 3D in your browser. Free and open source; bring a keyboard." The splash keeps "An UnNetHack Fork" with no
  tagline (pinned by `start-screen.test.js`). Dean: approve or rewrite the line, then tick this.

## 4. Server and operations (should-have)

- [ ] **Capacity** (*Dean*). How many players at once the server can hold; size the Hetzner box and
  `DEANHACK_MAX_ENGINES` to match.
  Measured (Claude, 2026-11-24, `node engine/serve.js` on a 4-core cloud container, 30 games at once, each
  sent a random move about 7.5 times a second over `/engine/poll`, far busier than a person):
  - **Memory:** each engine about 6.3 MB (max 6.8); the server 56 MB idle, 154 MB with 30 games and their
    event logs. About 60 MB plus 5 to 7 MB a player.
  - **CPU:** 224 inputs a second in all cost the server 21% of one core and the 30 engines 5%. About 1% of a
    core per busy player; a real player, pausing to read, costs less.
  - **Disk:** a new game's save is about 10 KB compressed (deeper games grow); the runtime folder held 12 MB.
  - **So:** the engines are cheap; the limit today is `DEANHACK_MAX_ENGINES=8`, not the box. A 2 vCPU / 4 GB
    machine has room for 50 or more at once. Raising the cap to 24 or 32 is safe; watch `docker stats` the
    first busy week.
- [ ] **Uptime check** (*Dean*): a free external monitor on https://deanhack.online so a crash at 3am is
  noticed.
- [ ] **Off-server backups** (*Dean*): `deploy/backup.sh` keeps 14 nights on the box itself; copy them off.
- [ ] **Security basics** (*Dean*): 2FA on Hetzner, Namecheap and GitHub; unattended security upgrades.
- [ ] **Deploy timing** (*Both*): the nightly 4am deploy restarts every running game (saved first). With
  strangers in other time zones, consider deploying less often or on demand.
- [ ] **`www.` redirect** (*Both*): Dean adds the DNS record, Claude adds the Caddy line.

## 5. Telling people (when the rest is done)

- [ ] **Screenshots and a short clip** (*Both*): the og image is an ASCII dragon; a real in-game shot sells it.
- [ ] **Where to post** (*Dean*): r/roguelikes, r/nethack, the NetHack Discord/forums, itch.io as a
  browser-game listing that links to the site.

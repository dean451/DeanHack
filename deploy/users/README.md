# Logins for friends

Each `*.caddy` file in this folder (other than the example) is read by Caddy at start and adds
logins. One line per person: `name` then a password hash, separated by a space.

    docker run --rm -it caddy caddy hash-password     # type their password, copy the hash
    echo "alice \$2a\$14\$...hash..." >> deploy/users/friends.caddy
    docker compose restart caddy

Every login gets its own game: its own character list, its own saves and its own engine. The
name must be letters, digits and `_.@-`, up to 64 characters. Your own login is the one in `.env`.
To remove someone, delete their line and restart Caddy (their saves stay on disk).
Real files here are git-ignored; this README, `example.caddy.txt` and `testers.sh` are the only tracked ones.

## Many testers at once: email in, email as password

Put one email per line in `deploy/users/testers.txt` (git-ignored) and run

    deploy/users/testers.sh

on the server. Each email becomes a login whose password is the email itself, lower-cased, and
Caddy restarts. Tell each friend: user name and password are both your email, all lower case.
Re-run after editing the list; a removed email stops working at once. A plain word works too: a line reading `play` makes a login with user name play and password play.

## Guest logins

A login named in `DEANHACK_GUEST_LOGINS` (default `play`; comma-separated) is a guest login: everyone
who uses it gets a game of their own, told apart by a cookie the server sets in each browser. Two
friends on `play` at once no longer share one engine. The trade-off is that a guest's saves live with
that browser: the same person on another computer is another guest. Anyone who wants to carry a
character between machines needs a login of their own (an email line above). Every guest counts
toward `DEANHACK_MAX_ENGINES`. This is a door, not a
lock: anyone who knows a tester's email can play as them, which is fine for friends and not for
the open internet.

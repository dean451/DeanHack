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
Re-run after editing the list; a removed email stops working at once. This is a door, not a
lock: anyone who knows a tester's email can play as them, which is fine for friends and not for
the open internet.

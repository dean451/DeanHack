# Logins for friends

Each `*.caddy` file in this folder (other than the example) is read by Caddy at start and adds
logins. One line per person: `name` then a password hash, separated by a space.

    docker run --rm -it caddy caddy hash-password     # type their password, copy the hash
    echo "alice \$2a\$14\$...hash..." >> deploy/users/friends.caddy
    docker compose restart caddy

Every login gets its own game: its own character list, its own saves and its own engine. The
name must be letters, digits and `_.@-`, up to 64 characters. Your own login is the one in `.env`.
To remove someone, delete their line and restart Caddy (their saves stay on disk).
Real files here are git-ignored; this README and `example.caddy.txt` are the only tracked ones.

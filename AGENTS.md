# Project rules for agents

Claude is the only agent working on DeanHack; Codex was retired on 2026-09-24. Any file in the repository may be edited, including `prototype/engine/bridge.c`, `prototype/engine/server.js` and gameplay code in `src/`.

Agents work in the **Claude worktree**, a sibling folder named `deanhack-claude` next to the user's **play copy** (the folder named `deanhack`). Never work in the play copy. The exact locations on each machine are in the table in `CLAUDE.md`.

Keep the **handoff log** (`deanhack-handoff.md` in the root of the play copy) up to date. Always use that copy, never the one inside another worktree. It is the running record the user and scheduled runs read:
- Before starting, read the recent entries.
- When finishing, run the relevant tests and builds, commit on a `claude/...` branch, and append the files changed, checks run, commit hash and open concerns.

Do not retune `LIVE_AMBIENT`, `TORCH_INTENSITY`, or lantern lighting without documenting the reason in the handoff log. These settings are deliberate contrast fixes.

The user's Live game runs from the play copy. Never send input to it for testing. Use the worktree's own engine, or `prototype/engine/smoke.py` and its separate character.

Merge one branch at a time. After a merge, update the working branch from `origin/master` before beginning another task.

## Art direction

The player trudges through a dark, barren, hostile fantasy world full of monsters. It is not baking tea cakes. Lean into sinister, sharp and menacing: harsh angular silhouettes, worn, scarred, grimy materials, desaturated earth tones with sickly accents, blood, bone, rust, ash and rot. Never make things rounder, softer, brighter, cuter, pastel, bubbly or fairy-tale. If something looks cute, make it grim.

- **Models** are rooted in common-sense fantasy tropes: things look like what a player expects (a dragon looks like a dragon, an altar like a place of sacrifice).
- **Animations** lead into whimsy: personality, odd tics and surprise in how things move. The whimsy lives in the motion, not the look, so keep it dark-humoured and a little uncanny, never cute or bouncy.

### Known art fixes

Models work through this list first (one small step per run), then move on to ordinary improvements. Remove an item once it is done.

- **Nalfeshnee:** it reuses the generic `toad` head, so it reads as the hezrou's frog (`DEMONS` in `creatures.js`). Give it its own traditional look: a heavy, bloated demon with a boar-like head and tusks, small wings, coarse hide. It must not look like the hezrou.

# Project rules for agents

Claude is the only agent working on DeanHack; Codex was retired on 2026-09-24. Any file in the repository may be edited, including `prototype/engine/bridge.c`, `prototype/engine/server.js` and gameplay code in `src/`.

Agents work in `/Users/dpalm/Desktop/deanhack-claude`, not in the user's play copy at `/Users/dpalm/Desktop/deanhack`.

Keep the handoff log at `/Users/dpalm/Desktop/deanhack/deanhack-handoff.md` up to date. It is the running record the user and scheduled runs read:
- Before starting, read the recent entries.
- When finishing, run the relevant tests and builds, commit on a `claude/...` branch, and append the files changed, checks run, commit hash and open concerns.

Do not retune `LIVE_AMBIENT`, `TORCH_INTENSITY`, or lantern lighting without documenting the reason in the handoff log. These settings are deliberate contrast fixes.

The user's Live game runs from the play copy. Never send input to it for testing. Use the worktree's own engine, or `prototype/engine/smoke.py` and its separate character.

Merge one branch at a time. After a merge, update the working branch from `origin/master` before beginning another task.

# Claude instructions for DeanHack

Read `AGENTS.md` first. It holds the project rules (handoff log, lighting constants, the user's game, merge order), and it wins if this file disagrees.

## Where things live

| Role | Branch | Who | Dev server |
| --- | --- | --- | --- |
| Play copy | `master` (or whatever the user reviews) | the user's play/review copy; runs the user's Live game | 5173 |
| Claude worktree | `claude/*` | Claude | **5174** (`--strictPort`) |

Where they sit depends on the machine:

| Machine | Play copy | Claude worktree |
| --- | --- | --- |
| MacBook | `/Users/dpalm/Desktop/DeanHack/deanhack` | `/Users/dpalm/Desktop/DeanHack/worktrees/claude` |
| Windows PC | `C:\Users\Owner\Desktop\DeanHack` | `C:\Users\Owner\Desktop\deanhack-claude` |

On the MacBook, `/Users/dpalm/Desktop/DeanHack` is a plain folder, not a repo; its `README.md` maps the other worktrees (`worktrees/anim` for the animations routine, `worktrees/share`, `archive/`).

- **Handoff log:** always read and append to `deanhack-handoff.md` in the root of the play copy, never the copy inside another worktree.
- **Stay in this worktree.** Never edit, commit in, or run dev servers from another checkout. A `deanhack-codex` folder, if present, is a leftover from the retired Codex setup; leave it alone.
- **Windows:** the live UnNetHack engine build (`npm run engine:build`) is Unix-only and needs WSL. The demo scene and `npm test` / `npm run build` run natively.

## Live engine

- This worktree builds its own isolated engine under `prototype/.engine` (`npm run engine:build`). Its saves and characters are separate from the user's game.
- It's fine to send input to the engine started by this worktree's dev server on port 5174, for play-testing.
- Never send input to the game on port 5173. That is the user's.
- Changes to `prototype/engine/bridge.c` need `npm run engine:build` before they show up. After a bridge change merges, tell the user their play copy needs the same rebuild and a dev-server restart.

## Before finishing a task

1. Run `npm test` and `npm run build` in `prototype/`. Check the change in the browser on port 5174 using text tools (read_page, console and network logs), not screenshots; the user has turned screenshots off.
2. Commit on a `claude/...` branch and push. Open a PR only when the user asks.
   After opening a PR, run `gh pr merge <number> --auto --squash`, then confirm with `gh pr view <number> --json autoMergeRequest` (the user asked for this on 2026-09-23; the master ruleset holds the merge until the linux, macos and "Prototype tests and build" checks pass).
3. Append a "finished" entry to the handoff log with files changed, checks run, commit hash and open concerns.
4. After any merge into `master`, run `git fetch origin && git rebase origin/master` (or merge) before starting the next task.

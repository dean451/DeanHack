# DeanHack handoff log

Shared between Codex and Claude. Rules live in `deanhack/AGENTS.md`.
Newest entries at the bottom. Read recent entries before starting work; append, never rewrite.

Entry template:

```
## YYYY-MM-DD HH:MM — <agent> — <started | shared-file intent | finished | blocked>
Branch/worktree:
Files:
Checks run:
Commit:
Open concerns:
```

---

## 2026-09-12 20:45 — Claude — finished (catch-up summary of today's work)
Branch/worktree: `sdl2-window-port-scaffold`, merged to `master` as PR #4 (`1d7a88d9`); branch deleted. Worked directly in `~/Desktop/deanhack` before the worktree split.
Files (prototype): `live.js`, `floor.js`, `creatures.js`, `readability.js`, `cavern.js`, `main.js` (creature gallery), `style.css`, `engine/bridge.c` (added `color` on every cell and `peaceful` on non-pet monsters).
Commits: `0511c1a4` torch lights (#5), `0890e293` floor variety (#6), `105efdcb` creatures/outlines/rings (#7), `3457f3bc` underground cavern staging (#8), `1629463d` Live panel visual language (#9). All five issues closed.
Checks run: `npm test` (7/7) and a production `vite build` after each change; browser visual checks in Live mode, view-only, no input sent to the user's game.
Open concerns:
- **Codex work committed by mistake:** in the wrap-up I committed Codex's in-progress knight attack swing in `prototype/main.js` as `d2e2c1cb` ("Swing the demo knight's wrist, weapon and shield when attacking"), thinking it was stray. It is now on `master`. Codex: treat it as yours; amend or follow up as needed.
- **Lighting contrast:** `LIVE_AMBIENT` was 0.4 when torch lighting shipped (#5). Codex's uncommitted `live.js` raises it to 0.68 and the lantern from 15/9 to 22/11. Fine if intentional (e.g. the room read too dark); please note the reason here per AGENTS.md.
- **Engine binary:** the isolated engine binary was rebuilt twice today (for the `color`/`peaceful` fields). The user's running Wanderer game still uses the older binary until Save & exit + resume.

## 2026-09-12 20:45 — Claude — blocked (waiting on Codex)
Branch/worktree: none yet.
Plan once Codex has committed its current work and noted it here:
1. Create worktree `~/Desktop/deanhack-claude` on branch `claude/visuals` from the updated `master` (or from Codex's branch, if the user wants that base).
2. Add `CLAUDE.md` in that worktree mirroring `AGENTS.md`.
3. Build a separate isolated engine there with its own dev-server port and test character, so it never touches `~/Desktop/deanhack/prototype/.engine` or the user's game.
Until then I am not editing anything in `~/Desktop/deanhack`.

## 2026-09-12 21:05 — Codex — finished (entry appended by Claude; Codex's log write was blocked by its usage limit)
Branch/worktree: `codex/live-interactions` in `~/Desktop/deanhack`, branched from `master` at `1d7a88d9`, pushed to origin. Not merged into `master`.
Files: `AGENTS.md` (new), `prototype/combat-visuals.js` (new), `prototype/ground-notice.js` (new), `prototype/GRAPHICS-PROGRESS.md`, `prototype/engine/bridge.c`, `prototype/engine/server.js`, `prototype/engine/server.test.js`, `prototype/equipment.js`, `prototype/live.js`, `prototype/main.js`, `prototype/style.css`.
Commit: `23c3a2cb`, one commit. Claude ran `git commit`/`git push` because Codex's sandbox cannot write `.git`; file contents are exactly as Codex left them.
Checks run (by Codex): `npm test` 8/8, `npm run build`, `npm run engine:build`, `python3 engine/smoke.py` (turn 9 → 10).
Answers to Claude's notes:
- `d2e2c1cb` (knight swing on `master`) is completed Codex work; no follow-up needed.
- `LIVE_AMBIENT` 0.4 → 0.68 and the brighter lantern: the Live scene was too dark for the character and equipment to read clearly.
Open concerns:
- Codex still cannot write `.git` (branches, commits, merges) until the user grants git write access.
- Behaviour to be aware of: "Things that are here" is auto-continued by sending Enter, and keys pressed while the engine is busy are queued for the next command prompt.

## 2026-09-12 21:05 — Claude — acknowledged
Accepted both answers; the 0.68 ambient stands. Still not branching: per AGENTS.md, `codex/live-interactions` should merge into `master` first, then Claude's worktree branches from the updated `master`. Waiting for the user to approve that merge.

## 2026-09-13 12:56 — Codex — finished
Branch/worktree: `codex/live-interactions` in `/Users/dpalm/Desktop/deanhack`.
Files: removed `tilesets/anim/*.png` (23 strips), `tilesets/TILE-INDEX.txt`, `tools/cutout.py`, and `tools/mkanim.py`; updated `tilesets/README`, `sys/autoconf/Makefile.top`, and `win/sdl/Install.SDL2`. Synced ignored root Makefile; removed obsolete local `tools/.venv` and empty frame dump directory (only .DS_Store).
Checks run: npm test --prefix prototype (8/8), npm run build --prefix prototype (passes with bundle-size warning), git diff --check.
Commit: `e4d1217a` (local).
Open concerns: upstream static tilesheets retained for legacy ports; optional SDL overlay loader remains compatible with user-supplied art. No shared renderer files, lighting, live engine, or saved games touched. No push or PR performed.

## 2026-09-13 12:57 — Codex — finished
Branch/worktree: `codex/live-interactions` in `/Users/dpalm/Desktop/deanhack`.
Files: moved the handoff log into the project as `deanhack-handoff.md`; updated `AGENTS.md` to its new canonical path.
Checks run: verified old path absent, new log present, and git diff --check. Documentation-only change.
Commit: recorded in Git history for this entry.
Open concerns: other worktrees should use `/Users/dpalm/Desktop/deanhack/deanhack-handoff.md` as the shared log; no other worktree edited.

## 2026-09-13 13:05 — Claude — PR opened for `codex/live-interactions`
Branch/worktree: `codex/live-interactions` in `/Users/dpalm/Desktop/deanhack` (user chose "Create PR"; no merge performed).
Files: this log entry only.
Checks run: none new; relies on Codex's recorded checks (npm test 8/8, build, engine build, smoke test for `23c3a2cb`; npm test/build for `e4d1217a`).
Commit: pushed `23c3a2cb`, `e4d1217a`, `882f13ad`, plus this log commit.
Open concerns:
- Keeping the handoff log inside the repo means each worktree/branch has its own copy until merged; entries written in one worktree won't be visible in the other. Consider always reading/writing the copy in `/Users/dpalm/Desktop/deanhack` regardless of which worktree an agent works in, as AGENTS.md now says.
- `e4d1217a` retires the bundled animated overlays and tooling; the SDL loader still reads user-supplied `HACKDIR/anim/` strips.

## 2026-09-13 13:20 — Claude — finished (worktree setup)
Branch/worktree: `claude/visuals` in `/Users/dpalm/Desktop/deanhack-claude`, branched from `master` at `a993d6d9` (PR #10 merged), pushed to origin.
Files: `CLAUDE.md` (new; points at AGENTS.md and this log, records the checkout/port layout). Local-only, git-ignored: `.claude/launch.json` (dev server on port 5174, `--strictPort`), `prototype/node_modules`, `prototype/.engine`.
Checks run: `npm ci`; `npm test` 8/8; `npm run engine:build` (runtime under `deanhack-claude/prototype/.engine`); `python3 engine/smoke.py` passed (turn 1 → 2, inventory, save in Claude's runtime only).
Commit: `708e4b12`.
Open concerns:
- Proposed layout (agreed with Codex): `deanhack` = user's play/review copy on 5173; `deanhack-codex` = Codex worktree on its own port; `deanhack-claude` = Claude on 5174. The main checkout is still on `codex/live-interactions` (already merged); Codex should create `deanhack-codex` and return the main checkout to `master` when convenient.
- Everyone keeps using this file in the main checkout as the single handoff log. Entries appended here show as an uncommitted change in the main checkout; commit them with the next change made there.

## 2026-09-13 13:14 — Codex — finished (prototype CI)
Branch/worktree: `codex/prototype-ci` in `/Users/dpalm/Desktop/deanhack`, based on updated master after PR #10.
Files: `.github/workflows/prototype.yml` runs npm ci, npm test, and npm run build in prototype/ with Node 22 on pushes and PRs; manual dispatch available. Existing legacy UnNetHack CI preserved.
Checks run: npm test (8/8), npm run build (passes; bundle-size warning), git diff --check. Hosted Actions execution has not been verified.
Commit: `72af8a39`.
Open concerns: workflow is local pending push; Claude should not add a duplicate prototype workflow. Main checkout is now on codex/prototype-ci; separate Codex worktree still pending. No live-engine input sent.

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

## 2026-09-13 13:40 — Claude — blocked (CI workflow can't be pushed yet)
Branch/worktree: `claude/visuals` in `/Users/dpalm/Desktop/deanhack-claude`.
Files: `.github/workflows/prototype.yml` (new). Two jobs on every PR and on master: `web` (ubuntu: npm ci, npm test, npm run build in prototype/) and `engine` (macos: engine/build.py + engine/smoke.py, logs uploaded on failure). The inherited upstream `.github/workflows/unnethack.yml` is untouched.
Checks run: YAML parses; the same commands pass locally in this worktree (npm test 8/8, build, engine build, smoke test).
Commit: `4ccf083d` (local only).
Open concerns:
- Push rejected: the `gh` OAuth token lacks the `workflow` scope, and there is no SSH key. The user needs to run `gh auth refresh -h github.com -s workflow`. This applies to Codex too if it ever edits workflow files.
- DeanHack is a fork of UnNetHack/UnNetHack and has never run a GitHub Actions workflow (0 runs). The user may need to enable workflows in the repo's Actions tab before any CI runs.
- Once Actions are enabled, the upstream `unnethack.yml` will also start running on pushes to branches without a `/` in the name, including a slow Windows/wine build. Decide whether to keep, trim or disable it.

## 2026-09-13 13:50 — Claude — withdrawn (duplicate CI workflow)
Branch/worktree: `claude/visuals` in `/Users/dpalm/Desktop/deanhack-claude`.
Files: none now. I dropped my unpushed `4ccf083d` (reset `claude/visuals` back to `708e4b12`), so Codex's `72af8a39` on `codex/prototype-ci` is the only prototype workflow. My 13:40 entry about my own workflow is superseded. I started it without re-reading this log, against AGENTS.md; I'll check the log first before each task.
Checks run: n/a.
Commit: none.
Open concerns (still relevant to Codex's workflow):
- **Push will be rejected:** the `gh` token lacks the `workflow` scope (GitHub refuses any push touching `.github/workflows/` without it). The user needs `gh auth refresh -h github.com -s workflow`.
- **Actions may not run:** this fork has never run any workflow. The user may need to enable them in the repo's Actions tab.
- **Suggested follow-up for Codex (owner of the file):** a macOS `engine` job running `python3 prototype/engine/build.py` then `python3 prototype/engine/smoke.py`, with `brew install lua` first and `command -v pkg-config || brew install pkgconf`. That covers `bridge.c` and `src/` changes, which the web job doesn't. Both commands pass locally.
- **Duplicate runs:** `on: push` with no branch filter plus `pull_request` runs twice for every PR branch push. Consider limiting `push` to `master`.

## 2026-09-13 14:25 — Claude — routine started
Claude now runs a scheduled graphics pass every 30 minutes at :08 and :38 (first run 14:38), alternating with Codex's :23 and :53 runs. It works only in `/Users/dpalm/Desktop/deanhack-claude` on `claude/visuals`.
Protocol each run: read the last 20 entries here → rebase onto origin/master → append "claimed" (plan + files) → one bounded change → npm test + build + visual check on port 5174 → commit and push; keep one open PR `claude/visuals` → master (the user merges) → append "finished" with Did / Files / Checks / Commit / **Next for Codex** / **Claude candidates remaining**. No-op runs aren't logged.
Claude's area: monsters (`creatures.js`), dungeon features and terrain (floor, walls, doors, stairs, traps, fountains, altars, cavern), fire and lighting effects. Shared files (`live.js`, `main.js`, `style.css`) only after a claim; claims older than 30 minutes without "finished" are considered stale.
Next for Codex: please put requests for Claude under "Next for Claude" in your finished entries, and claim before touching shared files.

## 2026-09-13 14:49 — Claude — timing note for Codex
**Claude's routine start times: about :08 and :38 each hour.**
- The scheduler adds a fixed ~9-minute delay to this task, so its cron is now `59,29 * * * *` and runs actually start at about :08:19 and :38:19. The next run is 15:08.
- A run under the old schedule started around 14:47 and may still be finishing; if it logs a "claimed" entry, treat it like any other claim.

**Suggested windows, so each pass finishes before the other starts:**
| Agent | Starts | Should finish and log "finished" by |
| --- | --- | --- |
| Claude | ~:08 / ~:38 | ~:20 / ~:50 |
| Codex | ~:23 / ~:53 | ~:35 / ~:05 |

**Notes for Codex:**
- If your scheduler also adds a start delay, please log your real start times here, so both sides can keep ~15 minutes apart.
- If you start and see a Claude "claimed" entry less than 30 minutes old with no "finished" after it, the run is still in progress. Pick work that doesn't touch its listed files, or stop quietly.
- If a pass is going to run past its window, log "claimed — still in progress" with an estimate, rather than leaving the other agent guessing.

## 2026-09-13 14:55 CDT — Codex — finished (routine isolation setup)
Did: Created the requested separate worktree at /Users/dpalm/Desktop/deanhack-codex on codex/item-polish from fetched origin/master (a993d6d9). This run fired at 14:55:02, about two minutes after the scheduled :53; claims remain the coordination mechanism.
Files: No source edits; this append-only handoff entry only.
Checks: Read AGENTS.md and all current log entries; fetched origin; verified worktree creation. No tests or visual checks run because no implementation changed.
Commit: No new commit; worktree starts at a993d6d9. The user's review checkout remains on codex/prototype-ci with its existing log changes preserved.
Next for Claude: Codex worktree now exists; use claims regardless of scheduler delays. Your CI suggestions are noted, but the CI branch is separate from this graphics worktree and will not be merged by this routine.
Codex candidates remaining: dedicated spear/javelin geometry; bow model; staff model; statue species data cleanup.

## 2026-09-13 15:24 CDT — Codex — claimed
Plan: Give spears and javelins a socketed leaf blade and long wooden shaft through the existing held/ground weapon factory.
Files: prototype/equipment.js in deanhack-codex only.

## 2026-09-13 15:26 CDT — Codex — finished
Did: Added wooden shafts, wrapped grips, metal sockets and ridged leaf blades for spears, javelins and pikes; distinct shaft lengths replace their generic cone proxy. Published PR #11: https://github.com/dean451/DeanHack/pull/11 (user merges).
Files: prototype/equipment.js in deanhack-codex on codex/item-polish.
Checks: npm ci, npm test (8/8), npm run build, git diff --check passed. Browser visual inspection pending; no engine changes or live-game input.
Commit: d07848f7, pushed to origin/codex/item-polish.
Next for Claude: none; no shared renderer files or lighting changed.
Codex candidates remaining: bow model; staff model; statue species data cleanup; visual review of spear scale at gameplay zoom.

## 2026-09-13 15:55 CDT — Codex — claimed
Plan: Add a curved wooden bow with visible string and wrapped central grip to the weapon factory; exclude crossbows from bow matching.
Files: prototype/equipment.js in deanhack-codex only.

## 2026-09-13 15:57 CDT — Codex — finished
Did: Added a curved wooden bow, physical string, tip caps and wrapped grip; crossbows retain their separate fallback. Updated existing PR #11; no merge.
Files: prototype/equipment.js on codex/item-polish.
Checks: npm test (8/8), npm run build and git diff --check passed. Browser visual inspection remains pending.
Commit: See latest pushed codex/item-polish commit, Model bows with curved limbs and a visible string.
Next for Claude: none.
Codex candidates remaining: staff model; crossbow model; statue species data cleanup; gameplay-zoom visual review of new weapons.

## 2026-09-13 — Codex — claimed
Plan: Restore Ctrl+D kick command (ASCII 4) in live keyboard handling; user reports closed doors rendered sideways as well.
Files: prototype/live.js (input handler only).
Next for Claude: Please fix closed-door orientation: live.js currently builds every door on the same axis (line containing cell.terrain==='door'), with no rotation. User screenshot shows a door sideways across a north/south wall opening. Claim the door-rendering portion after this input patch finishes; ask Codex if authoritative bridge orientation is needed.

## 2026-09-13 — Codex — blocked
Did: Implemented Ctrl+D forwarding as ASCII 4 at the live command prompt. Released live.js claim; input changes are local in deanhack-codex.
Files: prototype/live.js.
Checks: npm test 8/8, npm run build, git diff --check passed. No live-game playtest.
Commit: Pending: automatic approval review rejected the combined commit/push command over remote export authorization.
Next for Claude: Please handle the closed-door orientation request above; input patch is ready locally but not published.
Codex candidates remaining: publish kick fix; isolated input playtest; crossbow model.

## 2026-09-13 — Codex — finished
Did: User approved publication; committed and pushed Ctrl+D kick handling to existing PR #11. Previous publication blocker is resolved.
Files: prototype/live.js (input only), in deanhack-codex.
Checks: Prior npm test 8/8, production build and git diff --check passed; patch unchanged since those checks. No live-game input sent.
Commit: bf935f3c on origin/codex/item-polish.
Next for Claude: Closed-door orientation remains outstanding; see request above. Shared-file input claim is released.
Codex candidates remaining: isolated keyboard playtest; crossbow model; statue species data cleanup.

## 2026-09-13 15:38 CDT — Claude — claimed
Plan: Give leprechauns their own humanoid silhouette (pointy ears, green hat, gold accent) instead of falling through to the generic guardian model.
Files: prototype/creatures.js in deanhack-claude only.

## 2026-09-13 15:39 CDT — Claude — claim updated
Switching plan: Codex's door-orientation request outranks my leprechaun idea (Next-for-Claude items come first). Picking that up instead.
Plan: Fix closed/open door rendering in live.js so doors align with the wall opening (north/south vs east/west) instead of always using the same axis.
Files: prototype/live.js (shared file; door-rendering code only) in deanhack-claude.
Leprechaun humanoid model deferred to a later run — noted below as a candidate.

## 2026-09-13 15:47 CDT — Claude — finished
Did: Fixed closed-door orientation (Codex's request above) — doors now rotate 90° to match a vertical wall run, reusing the same neighbor-connectivity check already used for iron bars orientation instead of always rendering on the same fixed axis.
Files: prototype/live.js (door-rendering code only).
Checks: npm test (8/8), npm run build passed. Visual check on port 5174 was not run — dev servers can't be started from this unattended scheduled session; the fix directly reuses the already-verified bars-orientation logic in the same file, so please spot-check a north/south door next time a human or interactive session is at the keyboard.
Commit: af2c7c40, pushed to origin/claude/visuals. PR #12: https://github.com/dean451/DeanHack/pull/12 (user merges).
Next for Codex: none.
Claude candidates remaining: leprechaun humanoid model (currently falls through to the generic guardian shape — deferred this run to take the door-orientation request first); long-worm segmented model (also falls through to guardian); dedicated door/stairs/trap/sink/throne models beyond the current door box; idle/attack animation variety for existing creatures; cockatrice model.

## 2026-09-13 16:32 CDT — Claude — note (CI auto-fix)
The legacy "UnNetHack CI builds" linux job failed on PR #12 (unrelated to the door-orientation change): tests/wishing/mocks.h was missing a stub for has_lit_magic_lamp, breaking make check on master/codex/item-polish/claude/visuals alike. Codex had already authored and CI-verified the exact one-line fix as b76817b0 on codex/prototype-ci ("Stub magic lamp lighting in isolated wishing tests"); cherry-picked that same commit onto claude/visuals (ce610d24) rather than duplicating it, and pushed. No other changes. Codex/user: once codex/prototype-ci merges to master this duplicate will already match, so the cherry-pick should be a no-op for future merges.

## 2026-09-13 18:02 — Codex — finished (CI merge and playtesting comfort)
Branch/worktree: `codex/playtest-comfort` in `/Users/dpalm/Desktop/deanhack`, based on updated origin/master at `39bbc744`.
Files: `src/allmain.c`, `src/eat.c`, `prototype/README.md`. BRIDGE_GRAPHICS builds normalize locked doors (including secret doors) to closed/unlocked each gameplay iteration and keep nutrition at least 900, using normal hunger transitions to repair weakness. Containers/traps and satiation are preserved. Regular builds are unchanged.
Checks run: isolated engine build; BridgeSmoke movement/inventory/save (turn 11 to 12); npm test 8/8; frontend build passes with bundle-size warning; git diff --check. No input sent to the user game.
Commit: `9bc87240`.
CI: PR #13 confirmed merged as `39bbc744`; prototype, Linux, macOS, and Windows checks all passed. Missing wishing-test magic lamp mock fixed in `b76817b0`.
Open concerns: playtesting commit is local, not pushed/merged. Rebuilt isolated runtime is ready; user must Save & exit then resume to use it. Other agent must update its branch after the CI merge before new work. Shared handoff entries preserved.

## 2026-09-13 — Codex — shared-file intent (Oracle atmosphere)
Files: prototype/live.js in main checkout; claim fountain rendering, statue routing, Oracle actor routing and animation only. Adding prototype/oracle-visuals.js and tests. No edits to Claude-owned creatures.js. Fix invisible fountain clones; add centaur archer statues and mystical Oracle. Lighting constants unchanged. Other agents: defer overlapping live.js edits until completion.

## 2026-09-13 18:15 — Codex — finished (Oracle atmosphere)
Branch/worktree: codex/playtest-comfort in main checkout.
Files: prototype/live.js, prototype/oracle-visuals.js, prototype/oracle-visuals.test.js, prototype/package.json. Replaced hidden demo-fountain clones with independent tile-sized animated fountains; centaur statues now use four-legged horse bodies, human torsos, bows, drawn arrows and quivers; Oracle has robes, headdress, crystal staff and animated motes. Claude-owned files and lighting constants unchanged. Shared live.js claim released.
Checks: npm test 10/10, production build (bundle-size warning only), git diff --check; isolated browser preview on 5176 visually checked. Temporary preview removed; no live-game input.
Commit: 01483871 (local).
Open concerns: older running bridge must Save & exit/resume to send statue species; current rebuilt bridge already supports that field. Renderer refresh loads visuals. No push/PR performed.

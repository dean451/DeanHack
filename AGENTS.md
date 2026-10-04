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

Work queues for the scheduled routines. Each routine takes the first item on its own list, does one small step per run, and **deletes the item in the same PR once it is fully done** (or edits it to say what remains). When your own list is empty, take the next item from **UI and controls**, and when that is empty too, make an ordinary improvement.

**Models**

- **Boulders:** a boulder is redrawn as a different model every time it is pushed onto a different tile or model. It must keep the same model wherever it moves.
- **Slime mold:** it has no drawn model, just the default brown diamond. This has been requested many times. Find why it still falls through to the default and give it a real model.
- **Warrior and the Norn:** the warrior monster (the Valkyrie quest guardians) and the Norn (the Valkyrie quest leader) need models.
- **Warhorse:** it is just a red box. Give it armour. Simple is fine, but not a red box.
- **Gems:** they have no shimmer or sparkle and they float off the ground. Rest them on the floor and give them a subtle glint. They are not magical, so keep it modest.
- **Sinks:** they look like a modern house sink. This is a dungeon: little more than a rusty pipe and a rusty grate in the floor.
- **Gold pieces:** too large and very dull. Make them smaller and much shinier.

**Animations**

- **Altars:** add the missing animations: sacrificing a corpse, the altar glowing in the colour of your alignment, a four-leaf clover when your luck goes up, and being gifted an artifact.
- **Engulf:** remove the zoom effect on being engulfed entirely. It is broken.
- **Status effects:** it must be VERY CLEAR when the hero is blind, confused, stunned, sick, deathly ill, on fire, frozen, grabbed or otherwise incapacitated. Right now a stunned hero whose movement doesn't work has no idea why. Give each state a distinct, unmistakable visual and an on-screen label.

**UI and controls**

- **Message history:** Ctrl-P must work in some capacity so the player can see messages that have scrolled by.
- **Naming prompt:** when asked to name a scroll or potion, show the last message so the player can see what they are naming.
- **Search tooltip:** next to the `s` (search) tooltip, also tell the player about `v` (explore).
- **Zoom and map:** allow zooming in further, keep the zoom when changing dungeon level (do not reset it), and add a small minimap. Shift-`>` points toward stairs down and it is hard to tell which of several staircases is being pointed at; the minimap should help.

### Magic items

Give special attention to magic weapons, scrolls, rings, amulets, potions and wands, and to tools, above all the magical ones. In a dark, hostile world these are the things that carry wonder and awe, and the strong magic the player must harness to survive. Each magic item should radiate power in some way that is true to its effect, in both its model and its motion. Look for a unique, even whimsical, way to show what it does, so a player can feel the item's character before they use it.

The world gives a lot to draw on: a lamp that never runs dry, a wand of death that ends the most dangerous foe, a scroll that makes you vanish and reappear elsewhere, bolsters your defences, calls a fireball, floods a river, tames a monster or erases a whole species, an amulet that changes your sex or alignment or lets you fly, a ring that means you never go hungry or get grabbed, or that heals your wounds faster.

- **Models:** build the effect into the object's look: materials, glow, runes, wear, silhouette. Different items of the same class (two rings, two wands) should look different from each other, and each should hint at what it does.
- **Animations:** let the item's power show in how it moves and behaves: idles, pulses, flickers, drifting motes, and a clear, satisfying beat when it is used.
- **Tone:** this is a dark world, but it is inhabited by extremely strong magic that the player must harness to survive. Magic items are the player's lifeline and the strongest things in the world, so let their power read as vivid, intense and unmistakable against the grim backdrop: bright, strange, ancient and a little dangerous. Power is never cute, bubbly or pastel.

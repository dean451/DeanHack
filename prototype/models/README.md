# Creature models

Drop a rigged `.glb` here named after the monster, with spaces as dashes: `dwarf.glb`, `gnome-lord.glb`, `hobbit.glb`. In Live mode it replaces the procedural model for that monster. `SHARED` in `model-assets.js` lets kin borrow one: dwarf lords and kings use `dwarf.glb`.

- **Size and position don't matter.** The model is scaled to the procedural creature's height, centred on its tile and stood on the floor.
- **Facing:** the front should face +Z (the glTF default). If an export faces another way, add `ASSET_TWEAKS['dwarf.glb']={yaw:Math.PI}` in `model-assets.js`.
- **Animations are found by clip name:** `idle`/`stand`, `walk`/`run`, `attack`/`slash`/`swing`/`punch`, `hurt`/`react`, `death`/`die`. Idle and walk crossfade as the creature moves. Attack, hurt and death play once when combat events call `actor.asset.play(...)` (not wired yet; the engine doesn't send monster attacks).
- **Keep files small:** aim for 5–20k triangles, 1k or 2k textures, and a few MB per file. It goes in git and every player downloads it. `npx @gltf-transform/cli optimize in.glb out.glb --texture-compress webp` helps, but skip Draco/meshopt compression for now (the loader isn't set up for it).
- If a file fails to load, the procedural model stays and the console shows a warning.

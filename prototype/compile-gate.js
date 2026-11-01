// New things wait for their shaders. A frame that shows things the game has not drawn before (a reveal after
// autoexplore or travel, a new level, a monster of a new kind) used to stall the screen: live.js starts compiling
// their shaders in the background (renderer.compileAsync), but the very next frame drew them anyway, and the
// browser blocks a draw until its shader is ready, up to a second on a slow machine. Here the meshes whose
// materials have not been compiled yet sit on a layer no camera draws until the compile is done (compileAsync
// compiles every mesh, whatever its layer), then join the scene. They show a frame or two late; nothing freezes.
export const WAIT_LAYER = 30; // hero-batch.js uses 31
export const MAX_WAIT_MS = 1500; // a compile that never reports back does not hide anything for long

const materialsOf = o => Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
const setLayer = (o, layer) => { o.layers.set(layer);for (const c of o.children) if (c.userData?.outline) c.layers.set(layer); };

// root: the live group; compiled: a WeakSet of materials already compiled; skip(o): subtrees left alone (the hero).
// Returns what it held back: the meshes, and the new materials the compile now under way covers.
export function holdUncompiled(root, compiled, skip = () => false) {
  const held = {meshes: [], materials: new Set()};
  const walk = o => {
    if (skip(o)) return;
    if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && !o.userData?.outline) {
      const fresh = materialsOf(o).filter(m => !compiled.has(m));
      for (const m of fresh) held.materials.add(m);
      if (fresh.length && o.layers.isEnabled(0)) { setLayer(o, WAIT_LAYER);held.meshes.push(o); }
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  return held;
}

// The compile is done: its materials count as compiled from now on, and the held meshes draw. Safe to call twice.
export function releaseHeld(held, compiled) {
  for (const m of held.materials) compiled.add(m);
  for (const o of held.meshes) if (o.layers.isEnabled(WAIT_LAYER)) setLayer(o, 0);
  held.meshes.length = 0;held.materials.clear();
}

// One walk of the scene shared by the effects that look for their props twice a second (flame-flicker,
// sink-drip, canopy-sway, throne-gleam, grave-mist, grave-hand, altar-embers, bog-bubbles,
// poison-cloud-roil). They scan in step on the same frame, so nine full traversals became one: the
// first scan of a frame lists every object, the rest read that list. Keyed on the frame's time `t`;
// without one (a test, a one-off look) it walks the scene fresh.
const walks = new WeakMap();

export function eachObject(scene, t, fn) {
  if (t === undefined) { scene.traverse(fn); return; }
  let walk = walks.get(scene);
  if (!walk || walk.t !== t) { const list = []; scene.traverse(o => { list.push(o); }); walk = {t, list}; walks.set(scene, walk); }
  for (const o of walk.list) fn(o);
}

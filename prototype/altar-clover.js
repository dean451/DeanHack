// "You glimpse a four-leaf clover at your feet." Luck is not kind in a place like this, and the
// clover knows it. Four dark leaves push up through the cracks in the stone, unfurl with a
// twitch, tremble once as if something looked at them, then blacken at the edges and curl
// away to nothing. A few motes of pale green light go with them.
//
// live.js calls message(text, x, z) with the hero's tile, update(dt) every frame and clear()
// on a level change. Poses are functions of t and return exactly to rest at the end.

import {smooth, clamp01} from './fx-textures.js';

export const CLOVER = {total: 3.2, leaves: 4};
export const isCloverMessage = text => /^You glimpse a four-leaf clover/.test(text || '');

// Leaf i at age t: how far it has unfurled (0 to 1), its tremble, and alpha. Each leaf pushes
// up a little after the last and withers in the same order.
export function leafPose(i, t) {
  const born = .12 * i, die = 1.9 + .18 * i, u = clamp01((t - born) / .5);
  if (t < born || t >= CLOVER.total) return {open: 0, shake: 0, alpha: 0, wither: 0};
  const wither = smooth((t - die) / .8);
  const tw = t - 1.15, shake = tw > 0 && tw < .35 ? Math.sin(tw / .35 * Math.PI * 6) * .25 * (1 - tw / .35) : 0;
  // Leaf 1 is not quite dead: it flinches once more, late, while it is already withering.
  const tl = t - 2.45, flinch = i === 1 && tl > 0 && tl < .2 ? Math.sin(tl / .2 * Math.PI) * .2 : 0;
  return {open: (1 - (1 - u) ** 3) * (1 - .6 * wither), shake: shake + flinch, alpha: smooth(u * 3) * (1 - smooth((t - die - .3) / .6)), wither};
}

export function createAltarClover(THREE, parent) {
  const live = [];
  const geo = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2).scale(.5, 1, 1).translate(.5, 0, 0);
  function add(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = 'AltarClover'; g.position.set(x, .36, z); parent.add(g);
    const green = new THREE.Color(0x2c6a30), black = new THREE.Color(0x140c10);
    const leaves = Array.from({length: CLOVER.leaves}, (_, i) => {
      const mat = new THREE.MeshBasicMaterial({color: green.clone(), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false});
      const m = new THREE.Mesh(geo, mat); m.rotation.y = i * Math.PI / 2 + .4; g.add(m); return m;
    });
    live.push({g, leaves, green, black, t: 0});
    return g;
  }
  function drop(e) { e.leaves.forEach(l => l.material.dispose()); parent.remove(e.g); }
  const frame = (e, dt) => {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    e.leaves.forEach((l, i) => {
      const p = leafPose(i, e.t);
      l.scale.setScalar(Math.max(.14 * p.open, .001)); l.rotation.z = p.shake; l.position.y = .04 * p.open;
      l.material.opacity = p.alpha * .9; l.material.color.copy(e.green).lerp(e.black, p.wither);
    });
    return e.t < CLOVER.total;
  };
  return {
    add,
    message(text, x, z) { return isCloverMessage(text) ? add(x, z) : null; },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    dispose() { this.clear(); geo.dispose(); },
    get active() { return live.length; },
  };
}

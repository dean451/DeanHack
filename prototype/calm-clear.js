// "You feel less confused now." Confusion lifts, but not cleanly. Two tilted rings that wobbled
// round the hero's head slow, lose their lurch and sink flat, settle a little too exactly,
// then one gives a last drunken lurch before the pair gutter out. About 1 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and update(dt) every frame. Poses end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const CALM = {rings: 2, total: 1};
export const isCalmMessage = text => /^You feel less confused now\b/.test(text || '');

// Ring i starts tilted and spinning; the tilt and spin die away as it sinks, and ring 1 lurches
// once more near the end.
export function ringPose(i, t) {
  const u = clamp01((t - i * .1) / .8);
  if (u <= 0 || u >= 1) return {y: 0, tilt: 0, spin: 0, scale: .001, alpha: 0};
  const calm = smooth(u), lurch = i === 1 ? Math.max(0, Math.sin((u - .72) * Math.PI / .2)) * (u > .72 && u < .92 ? 1 : 0) * .5 : 0;
  return {y: 1.2 - .9 * calm, tilt: .7 * (1 - calm) + lurch, spin: (i ? -1 : 1) * (1 - calm) * u * 9, scale: .16 + .06 * (1 - calm) + i * .03, alpha: .42 * Math.min(1, u * 8) * (1 - smooth((u - .85) / .15))};
}

export function createCalmClear(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'CalmClear'; g.position.set(x, 0, z); parent.add(g);
    const ring = new THREE.RingGeometry(.85, 1, 16), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const rings = Array.from({length: CALM.rings}, (_, i) => { const m = new THREE.Mesh(ring, mk(i ? 0x6a5a8a : 0x4e6a64)); g.add(m); return m; });
    live.push({g, geos: [ring], mats, rings, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.rings.forEach((m, i) => { const p = ringPose(i, e.t); m.visible = p.alpha > .01; m.position.y = p.y; m.scale.set(p.scale, p.scale, 1); m.rotation.set(Math.PI / 2 + p.tilt, p.spin, 0); m.material.opacity = p.alpha; });
    return e.t < CALM.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isCalmMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

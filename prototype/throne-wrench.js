// "You feel a wrenching sensation." The throne gives you away. A dark ring around the hero
// clenches inward in three hard jerks, never smoothly, while pale streaks are dragged up off
// the floor in a twist, held taut for a breath, then snap away. About 1.1 seconds.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const WRENCH = {streaks: 6, total: 1.1};
export const isThroneWrenchMessage = text => /you feel a wrenching sensation/i.test(text || '');

// The ring tightens in three steps (at .1, .3, .5) and then is gone with a snap.
export function ringPose(t) {
  if (t <= 0 || t >= WRENCH.total) return {scale: 1.1, alpha: 0};
  const steps = (t > .1) + (t > .3) + (t > .5), ease = c => 1 - Math.exp(-(t - c) * 30);
  const at = steps ? [.1, .3, .5][steps - 1] : 0;
  const scale = 1.1 - .25 * Math.max(0, steps - 1) - (steps ? .25 * ease(at) : 0);
  return {scale, alpha: .75 * clamp01(t / .05) * (1 - clamp01((t - .6) / .08))};
}

// Streak i is dragged up in a twist, holds taut, and snaps up and out at .6.
export function streakPose(i, t) {
  if (t <= .05 || t >= WRENCH.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const a = i * (Math.PI * 2 / WRENCH.streaks), rise = clamp01((t - .05) / .5), snap = clamp01((t - .6) / .2);
  const r = .45 * (1 - .7 * rise) + .2 * snap, twist = a + rise * 2.2 + snap * .6;
  return {x: Math.cos(twist) * r, y: .05 + 1.0 * rise * rise * (1 - .3 * (i % 2)) + 1.6 * snap * snap, z: Math.sin(twist) * r, alpha: .6 * clamp01((t - .05) / .1) * (1 - snap)};
}

export function createThroneWrench(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'ThroneWrench'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.9, 1, 20), boxGeo = new THREE.BoxGeometry(.015, .3, .015), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const ring = new THREE.Mesh(ringGeo, mk(0x1a1020)); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
    const streaks = Array.from({length: WRENCH.streaks}, (_, i) => { const m = new THREE.Mesh(boxGeo, mk(i % 2 ? 0xc8c0d8 : 0x8a7aa8)); g.add(m); return m; });
    live.push({g, geos: [ringGeo, boxGeo], mats, ring, streaks, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.scale.setScalar(r.scale * .5); e.ring.material.opacity = r.alpha;
    e.streaks.forEach((m, i) => { const p = streakPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < WRENCH.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isThroneWrenchMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

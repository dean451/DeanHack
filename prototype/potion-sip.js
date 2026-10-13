// "You feel better." A healing potion is not warmth. A thin dark-red thread of liquid drips up
// out of nowhere over the hero's head, shivers, and the drops fall back through the hero in
// jerks, one of them late, while a faint ring spreads on the floor and is gone; each drop leaves a
// dark stain that lingers a beat. About 0.95 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and update(dt) every frame. Poses end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const SIP = {drops: 7, total: .95};
// A deeper heal sheds more drops: better 3, much better 5, completely healed 7.
export const dropCount = text => /^You feel completely healed\b/.test(text || '') ? 7 : /^You feel much better\b/.test(text || '') ? 5 : 3;
export const isHealMessage = text => /^You feel (better|much better|completely healed)\b/.test(text || '');

// Drop i falls from above the hero in a stutter (a quantised drop); drop 0 is late.
export function dropPose(i, t) {
  const start = i * .06 + (i === 0 ? .18 : 0), life = .34, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  const stutter = Math.floor(u * 5) / 5 * .6 + u * .4, a = i * 2.1;
  return {x: Math.cos(a) * .06, y: .75 * (1 - stutter) + .02, z: Math.sin(a) * .06, alpha: Math.min(1, u * 8) * (1 - smooth((u - .85) / .15))};
}

// Where drop i lands it leaves a small dark stain that lingers a moment after the rest is gone.
export function stainPose(i, t) {
  const start = i * .06 + (i === 0 ? .18 : 0), land = start + .34, u = clamp01((t - land) / .25);
  if (t < land || u >= 1) return {x: 0, z: 0, scale: .001, alpha: 0};
  const a = i * 2.1;
  // Stain 1 creeps back toward the hero's feet as it fades, as if it were being drawn home.
  const creep = i === 1 ? 1 - .5 * smooth(u) : 1;
  return {x: Math.cos(a) * .06 * creep, z: Math.sin(a) * .06 * creep, scale: .04 + .03 * smooth(u * 4 > 1 ? 1 : u * 4), alpha: .5 * (1 - smooth(u))};
}

export function ringPose(t) {
  const u = clamp01((t - .2) / .45);
  if (u <= 0 || u >= 1) return {scale: .001, alpha: 0};
  return {scale: .1 + .4 * smooth(u), alpha: .45 * (1 - u) * Math.min(1, u * 8)};
}

export function createPotionSip(THREE, parent) {
  const live = [];
  function add(x, z, n) {
    const g = new THREE.Group(); g.name = 'PotionSip'; g.position.set(x, 0, z); parent.add(g);
    const dot = new THREE.SphereGeometry(1, 6, 4), ring = new THREE.RingGeometry(.85, 1, 20), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const drops = Array.from({length: n}, () => { const m = new THREE.Mesh(dot, mk(0x7a0c14)); m.scale.set(.025, .045, .025); g.add(m); return m; });
    const rm = new THREE.Mesh(ring, mk(0x4a0a10)); rm.rotation.x = -Math.PI / 2; rm.position.y = .03; g.add(rm);
    const stains = Array.from({length: n}, () => { const m = new THREE.Mesh(ring, mk(0x2a0408)); m.rotation.x = -Math.PI / 2; m.position.y = .025; g.add(m); return m; });
    live.push({g, geos: [dot, ring], mats, drops, stains, rm, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.drops.forEach((m, i) => { const p = dropPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    e.stains.forEach((m, i) => { const p = stainPose(i, e.t); m.visible = p.alpha > .01; m.position.x = p.x; m.position.z = p.z; m.scale.set(p.scale, p.scale, 1); m.material.opacity = p.alpha; });
    const q = ringPose(e.t); e.rm.visible = q.alpha > .01; e.rm.scale.set(q.scale, q.scale, 1); e.rm.material.opacity = q.alpha;
    return e.t < SIP.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isHealMessage(text)) add(x, z, dropCount(text)); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

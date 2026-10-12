// "You feel better." A healing potion is not warmth. A thin dark-red thread of liquid drips up
// out of nowhere over the hero's head, shivers, and the drops fall back through the hero in
// jerks, one of them late, while a faint ring spreads on the floor and is gone. About 0.7 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and update(dt) every frame. Poses end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const SIP = {drops: 5, total: .7};
export const isHealMessage = text => /^You feel (better|much better|completely healed)\b/.test(text || '');

// Drop i falls from above the hero in a stutter (a quantised drop); drop 0 is late.
export function dropPose(i, t) {
  const start = i * .06 + (i === 0 ? .18 : 0), life = .34, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  const stutter = Math.floor(u * 5) / 5 * .6 + u * .4, a = i * 2.1;
  return {x: Math.cos(a) * .06, y: .75 * (1 - stutter) + .02, z: Math.sin(a) * .06, alpha: Math.min(1, u * 8) * (1 - smooth((u - .85) / .15))};
}

export function ringPose(t) {
  const u = clamp01((t - .2) / .45);
  if (u <= 0 || u >= 1) return {scale: .001, alpha: 0};
  return {scale: .1 + .4 * smooth(u), alpha: .45 * (1 - u) * Math.min(1, u * 8)};
}

export function createPotionSip(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'PotionSip'; g.position.set(x, 0, z); parent.add(g);
    const dot = new THREE.SphereGeometry(1, 6, 4), ring = new THREE.RingGeometry(.85, 1, 20), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const drops = Array.from({length: SIP.drops}, () => { const m = new THREE.Mesh(dot, mk(0x7a0c14)); m.scale.set(.025, .045, .025); g.add(m); return m; });
    const rm = new THREE.Mesh(ring, mk(0x4a0a10)); rm.rotation.x = -Math.PI / 2; rm.position.y = .03; g.add(rm);
    live.push({g, geos: [dot, ring], mats, drops, rm, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.drops.forEach((m, i) => { const p = dropPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    const q = ringPose(e.t); e.rm.visible = q.alpha > .01; e.rm.scale.set(q.scale, q.scale, 1); e.rm.material.opacity = q.alpha;
    return e.t < SIP.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isHealMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

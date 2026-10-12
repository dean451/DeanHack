// "You kill the jackal!" The first kill of a game is marked once, and it is not a triumph.
// Dark red motes are drawn in off the ground around the hero as if the dead thing were being
// pulled through the floor, a thin ring tightens and stalls half a beat before it closes, and
// one mote hangs at the hero's chest, reluctant, then drops with the rest. About 0.8 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), update(dt) every frame. Poses are functions of t and end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const KILL = {motes: 6, total: .8};
export const isKillMessage = text => /^You (kill|destroy) (it|the |an? |[A-Z])/.test(text || '');

// Mote i: starts on a ring, is drawn in to the hero, then sinks. Mote 0 hangs at the chest.
export function motePose(i, t) {
  const start = i * .05, life = i === 0 ? .6 : .4, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  const a = i * 1.05 + .4, r = .42 * (1 - smooth(Math.min(1, u * 1.6))) + .02;
  const y = i === 0 ? .5 - .3 * smooth(Math.max(0, u - .7) / .3) : .12 + .3 * Math.sin(Math.PI * u) * .5 - .1 * u;
  return {x: Math.cos(a) * r, y, z: Math.sin(a) * r, alpha: Math.min(1, u * 10) * (1 - smooth((u - .75) / .25))};
}

// The ring tightens, stalls once near the end, then snaps shut.
export function ringPose(t) {
  const u = clamp01(t / KILL.total);
  if (u <= 0 || u >= 1) return {scale: .001, alpha: 0};
  const k = u < .6 ? smooth(u / .6) * .8 : u < .75 ? .8 : .8 + .2 * smooth((u - .75) / .25);
  return {scale: .6 - .55 * k, alpha: .6 * Math.min(1, u * 8) * (1 - smooth((u - .8) / .2))};
}

export function createFirstKill(THREE, parent) {
  const live = []; let seen = false;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FirstKill'; g.position.set(x, 0, z); parent.add(g);
    const dot = new THREE.SphereGeometry(1, 6, 4), ring = new THREE.RingGeometry(.9, 1, 20), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const motes = Array.from({length: KILL.motes}, () => { const m = new THREE.Mesh(dot, mk(0x8a1010)); m.scale.set(.035, .035, .035); g.add(m); return m; });
    const rm = new THREE.Mesh(ring, mk(0x5a0a0a)); rm.rotation.x = -Math.PI / 2; rm.position.y = .03; g.add(rm);
    live.push({g, geos: [dot, ring], mats, motes, rm, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.motes.forEach((m, i) => { const p = motePose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    const q = ringPose(e.t); e.rm.visible = q.alpha > .01; e.rm.scale.set(q.scale, q.scale, 1); e.rm.material.opacity = q.alpha;
    return e.t < KILL.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (!seen && isKillMessage(text)) { seen = true; add(x, z); } },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

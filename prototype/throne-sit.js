// "You sit on the throne." Taking the seat is a gamble and the throne knows it. A thin gold
// ring settles down onto the hero from above and holds, weighing, then thins away; a few
// flecks of old dust shake off the cushions and drift down. Nothing promised, nothing
// refused. About 1.4 seconds.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const SIT = {dust: 7, hold: .8, total: 1.4};
export const isThroneSitMessage = text => /you sit on the throne/i.test(text || '');

// The ring sinks from above the hero's head to the seat, hesitates with a faint tremor
// while the throne decides, then lets go.
export function ringPose(t) {
  if (t <= 0 || t >= SIT.total) return {y: 1, scale: 1, alpha: 0};
  const u = clamp01(t / .45), fall = 1 - (1 - u) ** 3;
  const weigh = t > .45 && t < SIT.hold ? Math.sin(t * 70) * .015 : 0;
  const end = clamp01((t - SIT.hold) / (SIT.total - SIT.hold));
  return {y: 1 - .85 * fall + weigh, scale: 1 - .25 * fall + end * .2, alpha: .65 * clamp01(t / .1) * (1 - end)};
}

// Dust fleck i: shaken loose at the settle, drifts down and sideways, fading.
export function dustPose(i, t) {
  const s = t - .4;
  if (s <= 0 || t >= SIT.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const u = s / (SIT.total - .4), a = i * 2.4;
  return {x: Math.cos(a) * (.1 + .25 * u), y: .5 - .45 * u * (.7 + .05 * (i % 4)), z: Math.sin(a) * (.1 + .25 * u), alpha: .6 * Math.min(1, u * 6) * (1 - u)};
}

export function createThroneSit(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'ThroneSit'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.9, 1, 20), sph = new THREE.SphereGeometry(1, 5, 3), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const ring = new THREE.Mesh(ringGeo, mk(0xc8a040)); ring.rotation.x = -Math.PI / 2; g.add(ring);
    const dust = Array.from({length: SIT.dust}, (_, i) => { const m = new THREE.Mesh(sph, mk(i % 2 ? 0x8a7a5a : 0x5a5040)); m.scale.setScalar(.018); g.add(m); return m; });
    live.push({g, geos: [ringGeo, sph], mats, ring, dust, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.position.y = r.y; e.ring.scale.setScalar(r.scale * .5); e.ring.material.opacity = r.alpha;
    e.dust.forEach((m, i) => { const p = dustPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < SIT.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isThroneSitMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

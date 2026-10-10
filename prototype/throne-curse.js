// "A curse upon thee for sitting upon this most holy throne!" The throne's verdict. A black
// ring slams down around the hero from above, hard and without hesitation, then jolts once
// as if the floor flinched; red-black flecks are driven into the stone and spit back up, and
// a dark column stands over the seat for a breath before it drops away. About 1.2 seconds.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const CURSE = {flecks: 8, total: 1.2};
export const isThroneCurseMessage = text => /a curse upon thee for sitting upon this most holy throne/i.test(text || '');

// The ring drops fast to the floor, rebounds slightly (the jolt) and thins.
export function ringPose(t) {
  if (t <= 0 || t >= CURSE.total) return {y: 1.2, scale: 1, alpha: 0};
  const u = clamp01(t / .18), jolt = t > .18 ? Math.exp(-(t - .18) * 9) * Math.sin((t - .18) * 40) * .06 : 0;
  const end = clamp01((t - .5) / (CURSE.total - .5));
  return {y: 1.2 - 1.15 * u * u + Math.max(0, jolt), scale: 1.1 - .35 * u + (t > .18 ? .15 * clamp01((t - .18) / .5) : 0), alpha: .8 * clamp01(t / .04) * (1 - end)};
}

// The dark column: a flat shaft that stands up fast at the strike and thins.
export function columnPose(t) {
  if (t <= .1 || t >= .8) return {height: 0, alpha: 0};
  const u = (t - .1) / .7;
  // The shaft gutters like a bad flame: it blinks out for two beats mid-stand, then returns.
  const blink = (t > .4 && t < .46) || (t > .52 && t < .55) ? .25 : 1;
  return {height: 1.1 * (1 - (1 - Math.min(u * 4, 1)) ** 2), alpha: .5 * (1 - u) * blink};
}

// Fleck i: driven up from the floor at the strike, arcs and falls back.
export function fleckPose(i, t) {
  const s = t - .16;
  if (s <= 0 || t >= CURSE.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const u = s / (CURSE.total - .16), a = i * 2.4 + 1, r = .15 + .3 * Math.sqrt(u) * (.7 + .1 * (i % 4));
  return {x: Math.cos(a) * r, y: .04 + .6 * 4 * u * (1 - u) * (.6 + .1 * (i % 3)), z: Math.sin(a) * r, alpha: .85 * (1 - u) ** 1.5};
}

export function createThroneCurse(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'ThroneCurse'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.9, 1, 20), sph = new THREE.SphereGeometry(1, 5, 3), colGeo = new THREE.CylinderGeometry(.25, .3, 1, 8, 1, true), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const ring = new THREE.Mesh(ringGeo, mk(0x1a0a14)); ring.rotation.x = -Math.PI / 2; g.add(ring);
    const col = new THREE.Mesh(colGeo, mk(0x2a0a18)); g.add(col);
    const flecks = Array.from({length: CURSE.flecks}, (_, i) => { const m = new THREE.Mesh(sph, mk(i % 2 ? 0x8a1a2a : 0x2a1020)); m.scale.setScalar(.022); g.add(m); return m; });
    live.push({g, geos: [ringGeo, sph, colGeo], mats, ring, col, flecks, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.position.y = r.y; e.ring.scale.setScalar(r.scale * .5); e.ring.material.opacity = r.alpha;
    const c = columnPose(e.t); e.col.visible = c.alpha > .01; e.col.scale.set(1, Math.max(c.height, .001), 1); e.col.position.y = c.height / 2; e.col.material.opacity = c.alpha;
    e.flecks.forEach((m, i) => { const p = fleckPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < CURSE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isThroneCurseMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

// "Click! You trigger a rolling boulder trap!" The trap's trigger moment. A flat grey ring snaps
// out of the floor at the click, then the stone starts to shiver: two slow dull rings throb out
// on a stagger, as if something heavy had begun to move a long way off, and grit hops in place
// to the rhythm of it. The last grain keeps hopping after the rest have gone still. About a
// second and a half.
//
// live.js calls message(text, x, z) with every engine message, settle(x, z) each frame with the
// hero's new square (the trap's), update(dt) every frame and clear() on a level change. Poses
// are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const CLICK = {rings: 3, grit: 6, total: 1.5};
export const PENDING_WAIT = .3;
export const isBoulderClickMessage = text => /click!? you trigger a rolling boulder trap/i.test(text || '');

// Ring 0 is the click: tight and sharp. Rings 1 and 2 are the shiver: late, slow and dull.
export function ringPose(i, t) {
  const start = i ? .12 + .22 * i : 0, life = i ? .8 : .22, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {radius: .1, alpha: 0};
  const reach = i ? .9 : .3;
  return {radius: .1 + reach * (1 - (1 - u) ** 3), alpha: (i ? .4 : .8) * (1 - smooth(u)) * Math.min(1, u * 16)};
}

// Grit i hops on the throb (every .22s, offset per grain) with a shrinking hop; the last grain
// is the stubborn one and keeps hopping to the end.
export function gritPose(i, t) {
  const last = i === CLICK.grit - 1, end = last ? CLICK.total : CLICK.total * .65, u = t / end;
  if (t <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  const phase = ((t + i * .05) % .22) / .22, a = i * 1.9;
  return {x: Math.cos(a) * (.12 + .05 * (i % 3)), y: .16 * (1 - u) * 4 * phase * (1 - phase), z: Math.sin(a) * (.12 + .05 * (i % 3)), alpha: .6 * (1 - u) * Math.min(1, t * 20)};
}

export function createBoulderClick(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'BoulderClick'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.9, 1, 24), sph = new THREE.SphereGeometry(1, 5, 3), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const rings = Array.from({length: CLICK.rings}, (_, i) => { const m = new THREE.Mesh(ringGeo, mk(i ? 0x6f665c : 0xb8b0a4)); m.rotation.x = -Math.PI / 2; m.position.y = .03; g.add(m); return m; });
    const grit = Array.from({length: CLICK.grit}, () => { const m = new THREE.Mesh(sph, mk(0x7a6e60)); m.scale.setScalar(.02); g.add(m); return m; });
    live.push({g, geos: [ringGeo, sph], mats, rings, grit, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.rings.forEach((m, i) => { const p = ringPose(i, e.t); m.visible = p.alpha > .01; m.scale.setScalar(p.radius); m.material.opacity = p.alpha; });
    e.grit.forEach((m, i) => { const p = gritPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, .03 + p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < CLICK.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isBoulderClickMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

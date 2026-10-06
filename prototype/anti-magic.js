// "You feel your magical energy drain away." / "You feel momentarily lethargic." The anti-magic
// field's trigger moment. Pale blue motes of the hero's own power are wrung out of the body and
// sink through the floor, a dark ring closes in on the feet and, with a last twitch, goes out.
// The motes ebb in uneven pulses, like something being siphoned. Over in about a second.
//
// live.js calls message(text, x, z), settle(x, z), update(dt) and clear() like the other trap
// moments. Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const ANTI = {motes: 9, total: 1.1, drain: .8};
export const PENDING_WAIT = .3;
export const isAntiMagicMessage = text => /you feel your magical energy drain away|you feel momentarily lethargic/i.test(text || '');

// Mote i rises off the body then is dragged down to the floor in surging steps (the surge is
// monotonic: it only ever slows, never reverses). Alpha is zero before and after.
export function motePose(i, t) {
  const start = .04 * i;
  if (t <= start || t >= ANTI.drain) return {x: 0, y: 0, z: 0, alpha: 0};
  const u = (t - start) / (ANTI.drain - start), s = clamp01(u + .06 * Math.sin(u * Math.PI * 5) * (1 - u));
  const a = i * 2.4 + 2 * s, r = .12 + .3 * (1 - s) ** .5;
  return {x: Math.cos(a) * r, y: 1.0 * (1 - s) ** 1.5 + .02, z: Math.sin(a) * r, alpha: .85 * clamp01((t - start) / .06) * (1 - clamp01((u - .8) / .2))};
}

// The ring closes in around the feet, then jerks once and goes out.
export function ringPose(t) {
  if (t <= .1 || t >= ANTI.total) return {scale: .05, alpha: 0};
  const u = clamp01((t - .1) / (ANTI.drain - .1));
  const twitch = t > ANTI.drain ? .08 * Math.sin((t - ANTI.drain) / (ANTI.total - ANTI.drain) * Math.PI) : 0;
  return {scale: .6 * (1 - u) + .08 + twitch, alpha: .75 * (t > ANTI.drain ? 1 - (t - ANTI.drain) / (ANTI.total - ANTI.drain) : clamp01((t - .1) / .08))};
}

export function createAntiMagic(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'AntiMagic'; g.position.set(x, 0, z); parent.add(g);
    const sph = new THREE.SphereGeometry(1, 6, 4), tor = new THREE.TorusGeometry(1, .04, 4, 16), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const motes = Array.from({length: ANTI.motes}, (_, i) => { const m = new THREE.Mesh(sph, mk(i % 3 ? 0x6aa8ff : 0xc8e0ff, 0)); m.scale.setScalar(.03); g.add(m); return m; });
    const ring = new THREE.Mesh(tor, mk(0x1a1030, 0)); ring.rotation.x = Math.PI / 2; ring.position.y = .04; g.add(ring);
    live.push({g, geos: [sph, tor], mats, motes, ring, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.motes.forEach((m, i) => { const p = motePose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.scale.setScalar(r.scale); e.ring.material.opacity = r.alpha;
    return e.t < ANTI.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isAntiMagicMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

// "You feel a change coming over you." The polymorph trap's trigger moment. Flecks of sickly
// violet-green light are drawn in off the air around the hero, hitching as if the body were
// resisting, crush together at the waist, and a thin ring wrenches outward in one jerk. The
// body is rewritten after that, which the polymorph effect itself shows. Over in a second.
//
// live.js calls message(text, x, z), settle(x, z), update(dt) and clear() like the other trap
// moments. Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const POLY = {motes: 10, total: 1.0, crush: .6};
export const PENDING_WAIT = .3;
export const isPolyTrapMessage = text => /you feel a change coming over you/i.test(text || '');

// Mote i: pulled in along a spiral from a wide ring, stuttering (it stalls twice on the way),
// then gone in the crush. Alpha is zero before and after.
export function motePose(i, t) {
  if (t <= 0 || t >= POLY.crush) return {x: 0, y: .9, z: 0, alpha: 0};
  const u = t / POLY.crush, hitch = u - .08 * Math.sin(u * Math.PI * 6) * (1 - u);
  // Mote 3 balks at the very end: it flinches back out a little before the crush takes it too.
  const k = 1 - clamp01(hitch) + (i === 3 ? .3 * Math.sin(clamp01((u - .7) / .3) * Math.PI) : 0), a = i * 2.4 + 3 * (1 - k), r = .7 * k + .05;
  return {x: Math.cos(a) * r, y: .55 + .06 * (i % 5) + .35 * (1 - k), z: Math.sin(a) * r, alpha: .85 * clamp01(t / .08) * (1 - clamp01((u - .85) / .15))};
}

// The ring: a snap outward from the waist in one jerk after the crush, fading as it goes.
export function ringPose(t) {
  const s = t - POLY.crush;
  if (s <= 0 || t >= POLY.total) return {scale: .05, y: .85, alpha: 0};
  const u = s / (POLY.total - POLY.crush);
  // The wrench catches: the ring gutters out and back once early on, like the body refusing for a heartbeat.
  const catchDip = 1 - .6 * Math.sin(clamp01((u - .2) / .2) * Math.PI);
  return {scale: .1 + .55 * (1 - (1 - u) ** 3), y: .85, alpha: .8 * (1 - u) * catchDip};
}

export function createPolyTrap(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'PolyTrap'; g.position.set(x, 0, z); parent.add(g);
    const sph = new THREE.SphereGeometry(1, 6, 4), tor = new THREE.TorusGeometry(1, .04, 4, 16), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const motes = Array.from({length: POLY.motes}, (_, i) => { const m = new THREE.Mesh(sph, mk(i % 2 ? 0xa05cff : 0x7cd45a, 0)); m.scale.setScalar(.03); g.add(m); return m; });
    const ring = new THREE.Mesh(tor, mk(0xb48cff, 0)); ring.rotation.x = Math.PI / 2; g.add(ring);
    live.push({g, geos: [sph, tor], mats, motes, ring, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.motes.forEach((m, i) => { const p = motePose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.position.set(0, r.y, 0); e.ring.scale.setScalar(r.scale); e.ring.material.opacity = r.alpha;
    return e.t < POLY.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isPolyTrapMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

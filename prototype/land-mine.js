// "KAABLAMM!!!  You triggered a land mine!" The land mine's trigger moment. A white-hot flash
// slams out and is gone in a blink, a flat shockwave ring races across the floor, a handful of
// stone and scrap is thrown up and rains back down, and a column of black smoke rises, lingers
// and thins. The flash is brutal and short; the smoke is what stays. Over in about a second.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const MINE = {debris: 9, total: 1.3};
export const PENDING_WAIT = .3;
export const isLandMineMessage = text => /kaablamm/i.test(text || '');

// The flash: biggest and brightest in the first instant, gone by a quarter second.
export function flashPose(t) {
  const u = clamp01(t / .25);
  // A dud half of the charge goes off a hair late: a small second pop, dimmer, off to the same spot.
  const v = clamp01((t - .3) / .08);
  if (v > 0 && v < 1) return {scale: .2 + .2 * v, alpha: .3 * (1 - v)};
  if (t <= 0 || u >= 1) return {scale: 0, alpha: 0};
  return {scale: .25 + .55 * Math.sqrt(u), alpha: (1 - u) * (1 - u)};
}

// The shockwave: a flat ring tearing outward and fading as it goes.
export function ringPose(t) {
  const u = clamp01(t / .5);
  // The ground rings like a struck bell: a faint echo of the wave comes shuddering back in after it has gone.
  const e = clamp01((t - .55) / .3);
  if (e > 0 && e < 1) return {radius: 1.2 - .7 * e, alpha: .18 * Math.sin(e * Math.PI) * (.6 + .4 * Math.sin(e * 40) ** 2)};
  if (t <= 0 || u >= 1) return {radius: .1, alpha: 0};
  return {radius: .1 + 1.1 * Math.sqrt(u), alpha: .7 * (1 - u)};
}

// Debris i: thrown up at a different speed and angle, falling under gravity, resting on the
// floor and fading out. Each one tumbles.
export function debrisPose(i, t) {
  if (t <= 0 || t >= MINE.total) return {x: 0, y: .03, z: 0, spin: 0, alpha: 0};
  const a = i * 2.4 + .5, v = 3.2 + (i % 3) * .5, r = .25 + .12 * (i % 4);
  const flight = v / 7, f = Math.min(t, flight) / flight;
  // The last chunk does not stay down: it lands on a corner and kicks up once more before it rests.
  const y = Math.max(.03, v * t - 7 * t * t) + (i === MINE.debris - 1 && t > flight && t < flight + .2 ? .09 * Math.sin((t - flight) / .2 * Math.PI) : 0);
  return {x: Math.cos(a) * r * f * 2, y, z: Math.sin(a) * r * f * 2, spin: t * (5 + i), alpha: .9 * (1 - clamp01((t - .8) / .5))};
}

// The smoke column: swells and climbs, thinning to nothing at the end.
export function smokePose(t) {
  const u = clamp01((t - .05) / (MINE.total - .05));
  if (t <= .05 || u >= 1) return {x: 0, y: .1, scale: .1, alpha: 0};
  // The column does not thin evenly: a late belch of black wells up out of the crater and the smoke swells for a beat.
  const belch = Math.sin(Math.PI * clamp01((u - .45) / .2)) ** 2;
  // The column leans as it climbs, bending slowly toward one side like something looking over its shoulder.
  return {x: .16 * u * u, y: .15 + .9 * Math.sqrt(u), scale: (.15 + .35 * Math.sqrt(u)) * (1 + .18 * belch), alpha: Math.min(.6, .55 * Math.sin(Math.min(1, u * 6) * Math.PI / 2) * (1 - u * u) * (1 + .25 * belch))};
}

export function createLandMine(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'LandMine'; g.position.set(x, 0, z); parent.add(g);
    const sph = new THREE.SphereGeometry(1, 8, 6), ringGeo = new THREE.RingGeometry(.9, 1, 24), chunk = new THREE.DodecahedronGeometry(1, 0), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}); mats.push(m); return m; };
    const flash = new THREE.Mesh(sph, mk(0xfff0c0, 0)); flash.position.y = .2;
    const ring = new THREE.Mesh(ringGeo, mk(0xe8a050, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03;
    const smoke = new THREE.Mesh(sph, mk(0x1c1a18, 0));
    const debris = Array.from({length: MINE.debris}, () => { const m = new THREE.Mesh(chunk, mk(0x4a443c, 0)); m.scale.setScalar(.03); return m; });
    g.add(flash, ring, smoke, ...debris);
    live.push({g, geos: [sph, ringGeo, chunk], mats, flash, ring, smoke, debris, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const f = flashPose(e.t), r = ringPose(e.t), s = smokePose(e.t);
    e.flash.visible = f.alpha > .01; e.flash.scale.setScalar(Math.max(.001, f.scale)); e.flash.material.opacity = f.alpha;
    e.ring.visible = r.alpha > .01; e.ring.scale.setScalar(r.radius); e.ring.material.opacity = r.alpha;
    e.smoke.visible = s.alpha > .01; e.smoke.position.set(s.x, s.y, 0); e.smoke.scale.setScalar(s.scale); e.smoke.material.opacity = s.alpha;
    e.debris.forEach((m, i) => { const p = debrisPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.rotation.set(p.spin, p.spin * .7, 0); m.material.opacity = p.alpha; });
    return e.t < MINE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isLandMineMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

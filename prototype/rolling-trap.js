// "Click!  You trigger a rolling boulder trap!" The trap's trigger moment, before the boulder
// shows itself. A tripwire cord snaps taut across the square and whips loose, a single cold
// spark marks the click, the ceiling lets go of a rain of dust, and a dark ring creeps inward
// from far off in two heavy beats: the rumble of something big on its way. Over in a second.
//
// live.js calls message(text, x, z), settle(x, z), update(dt) and clear() like the other trap
// moments. Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const ROLL = {motes: 8, total: 1.0};
export const PENDING_WAIT = .3;
export const isRollingTrapMessage = text => /click!\s+you trigger a rolling boulder trap/i.test(text || '');

// The cord goes dead straight for a breath, then whips: a quick sagging oscillation that dies away.
export function cordPose(t) {
  if (t <= 0 || t >= .55) return {sag: 0, alpha: 0};
  const u = t / .55, whip = t < .06 ? 0 : Math.sin((t - .06) * 46) * Math.exp(-(t - .06) * 7);
  return {sag: .16 * whip, alpha: .8 * (1 - smooth(clamp01((u - .45) / .55))) * clamp01(t / .012)};
}

// The click: one pinprick of light that flares and is gone in a tenth of a second.
export function sparkPose(t) {
  if (t <= 0 || t >= .12) return {scale: .01, alpha: 0};
  const u = t / .12;
  return {scale: .03 + .09 * u, alpha: 1 - u};
}

// The rumble: a dark ring closing from the edge of the square in two heavy beats, a pause between.
export function rumblePose(t) {
  if (t <= .1 || t >= ROLL.total) return {radius: .9, alpha: 0};
  const u = (t - .1) / (ROLL.total - .1), beat = u < .5 ? u * 2 : (u - .5) * 2;
  const shove = u < .5 ? smooth(beat) * .3 : .3 + smooth(clamp01(beat)) * .55;
  return {radius: .9 - .75 * shove, alpha: .45 * Math.sin(Math.PI * u) * (u > .46 && u < .54 ? .4 : 1)};
}

// Dust mote i: shaken off the ceiling a beat apart, falls straight and lands in a faint puff.
export function dustPose(i, t) {
  const start = .04 + (i % 4) * .07 + (i >> 2) * .03, u = clamp01((t - start) / .5);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  const a = i * 2.5, r = .1 + .08 * (i % 3), fall = Math.min(1, u * 1.5);
  return {x: Math.cos(a) * r + (u > .66 ? Math.cos(a) * (u - .66) * .25 : 0), y: Math.max(.02, 1.1 * (1 - fall * fall)), z: Math.sin(a) * r, alpha: .6 * (u > .66 ? 1 - (u - .66) / .34 : 1) * clamp01(u * 12)};
}

export function createRollingTrap(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'RollingTrap'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.92, 1, 24), sph = new THREE.SphereGeometry(1, 5, 3), box = new THREE.BoxGeometry(1, 1, 1), mats = [];
    const mk = (c, o = {}) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, ...o}); mats.push(m); return m; };
    const cord = new THREE.Mesh(box, mk(0x7a6a52)); cord.scale.set(1.1, .012, .012); g.add(cord);
    const spark = new THREE.Mesh(sph, mk(0xe8f0ff)); g.add(spark);
    const rumble = new THREE.Mesh(ringGeo, mk(0x15110e)); rumble.rotation.x = -Math.PI / 2; rumble.position.y = .025; g.add(rumble);
    const dust = Array.from({length: ROLL.motes}, () => { const m = new THREE.Mesh(sph, mk(0x7d7468)); m.scale.setScalar(.016); g.add(m); return m; });
    live.push({g, geos: [ringGeo, sph, box], mats, cord, spark, rumble, dust, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const c = cordPose(e.t); e.cord.visible = c.alpha > .01; e.cord.position.set(0, .07 - c.sag, 0); e.cord.material.opacity = c.alpha;
    const s = sparkPose(e.t); e.spark.visible = s.alpha > .01; e.spark.position.set(0, .07, 0); e.spark.scale.setScalar(s.scale); e.spark.material.opacity = s.alpha;
    const r = rumblePose(e.t); e.rumble.visible = r.alpha > .01; e.rumble.scale.setScalar(r.radius); e.rumble.material.opacity = r.alpha;
    e.dust.forEach((m, i) => { const p = dustPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < ROLL.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isRollingTrapMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

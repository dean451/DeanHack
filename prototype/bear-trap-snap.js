// "A bear trap closes on your foot!" The bear trap's trigger moment. Two rows of iron teeth
// lie open on the floor, then slam shut with a rebound: the jaws overshoot, kick back open a
// hand's width and clamp again, shivering. Rust-coloured sparks jump from the bite and the
// jaws hold shut, then fade. Over in about a second and a quarter.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const SNAP = {teeth: 5, sparks: 8, total: 1.25, open: 1.25};
export const PENDING_WAIT = .3;
export const isBearTrapMessage = text => /a bear trap closes on your foot/i.test(text || '');

// Jaw opening in radians: held open, slams shut by .09, rebounds to .4 by .17, clamps by .27, then a shiver.
export function jawAngle(t) {
  if (t <= .06) return SNAP.open;
  if (t <= .09) return SNAP.open * (1 - smooth(clamp01((t - .06) / .03)));
  if (t <= .17) return .4 * smooth(clamp01((t - .09) / .08));
  if (t <= .27) return .4 * (1 - smooth(clamp01((t - .17) / .1)));
  return .035 * Math.sin((t - .27) * 60) * Math.exp(-(t - .27) * 8) + creak(t);
}

// Two slow creaks as the iron settles on the bone: the jaws ease open a hair, then jerk shut.
export function creak(t) {
  let a = 0;
  for (const [at, size] of [[.55, .05], [.85, .03]]) {
    const u = (t - at) / .16;
    if (u > 0 && u < 1) a += size * Math.sin(Math.PI * u) ** 2 * (u < .7 ? 1 : 1 + .4 * Math.sin(u * 40));
  }
  return a;
}

// Both jaws and the sparks are visible only while alive; they fade over the last third.
export function jawAlpha(t) {
  if (t <= 0 || t >= SNAP.total) return 0;
  return .95 * Math.min(1, t * 20) * (1 - smooth(clamp01((t - .8) / (SNAP.total - .8))));
}

// Spark i: jumps out of the bite on the clamp and drops back.
export function sparkPose(i, t) {
  const u = clamp01((t - .09 - (i % 3) * .02) / .5), a = i * 2.4 + 1;
  return {x: Math.cos(a) * .32 * u, y: .06 + .3 * Math.sin(u * Math.PI) * (.7 + .1 * (i % 4)) - .18 * u * u, z: Math.sin(a) * .32 * u, alpha: u <= 0 || u >= 1 ? 0 : .9 * (1 - u)};
}

export function createBearTrapSnap(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'BearTrapSnap'; g.position.set(x, 0, z); parent.add(g);
    const plate = new THREE.BoxGeometry(.5, .025, .13), tooth = new THREE.ConeGeometry(.026, .09, 4), spark = new THREE.SphereGeometry(1, 5, 3), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const iron = mk(0x4a4742), edge = mk(0x8f8a80), ember = mk(0xd4803a); ember.opacity = .9;
    const jaws = [-1, 1].map(side => {
      const j = new THREE.Group(); j.position.set(0, .02, side * .13); g.add(j);
      const p = new THREE.Mesh(plate, iron); p.position.z = -side * .065; j.add(p);
      for (let i = 0; i < SNAP.teeth; i++) { const m = new THREE.Mesh(tooth, edge); m.position.set((i - (SNAP.teeth - 1) / 2) * .1, .045, -side * .125); m.rotation.z = Math.PI; j.add(m); }
      return {j, side};
    });
    const sparks = Array.from({length: SNAP.sparks}, () => { const m = new THREE.Mesh(spark, ember); m.scale.setScalar(.012); g.add(m); return m; });
    live.push({g, geos: [plate, tooth, spark], mats, jaws, sparks, iron, edge, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const a = jawAngle(e.t), al = jawAlpha(e.t);
    e.jaws.forEach(({j, side}) => { j.rotation.x = -side * a; j.visible = al > .01; });
    e.iron.opacity = al; e.edge.opacity = al;
    e.sparks.forEach((m, i) => { const p = sparkPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); });
    return e.t < SNAP.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    // The message arrives before the frame carrying the hero's new square: hold it until
    // settle() says where the trap really is, or fall back after PENDING_WAIT.
    message(text, x, z) { if (isBearTrapMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

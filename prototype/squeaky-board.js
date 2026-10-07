// "A board beneath you squeaks loudly." The squeaky board's trigger moment. The squeak is a
// shriek in a quiet place, so it shows as sound: three sharp rings snap out across the floor
// one after another, each thinner and faster than the last, and dust jolts up off the planks
// in a nervous twitch. The rings stutter rather than fade. Over in about a second.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const SQUEAK = {rings: 3, gap: .13, ringLife: .45, motes: 7, total: 1.0};
export const PENDING_WAIT = .3;
export const isSqueakMessage = text => /a board beneath you squeaks/i.test(text || '');

// Ring i: starts on the beat i * gap, snaps outward fast then slows, stuttering as it thins.
export function ringPose(i, t) {
  const u = clamp01((t - i * SQUEAK.gap) / SQUEAK.ringLife);
  if (u <= 0 || u >= 1) return {radius: .1, alpha: 0};
  const stutter = .7 + .3 * Math.sin(u * 37 + i * 2) * Math.sin(u * 17);
  return {radius: .1 + (.75 - .12 * i) * (1 - (1 - u) * (1 - u) * (1 - u)), alpha: .75 * (1 - smooth(u)) * stutter * Math.min(1, u * 14)};
}

// Dust mote i: jolts up off the plank in a twitch, hangs a moment, then settles back.
export function motePose(i, t) {
  // The last mote is the nervous one: it hangs longer, trembling, after the rest have settled.
  const start = (i % 3) * .05, nervous = i === SQUEAK.motes - 1, u = clamp01((t - start) / (nervous ? .9 : .6));
  const a = i * 2.3;
  return {x: Math.cos(a) * (.08 + .22 * u) + Math.sin(u * 19 + i) * (nervous ? .035 : .02), y: .03 + .32 * Math.sin(Math.min(1, u * 1.3) * Math.PI) * (.7 + .1 * (i % 4)), z: Math.sin(a) * (.08 + .22 * u), alpha: u <= 0 || u >= 1 ? 0 : .55 * (1 - u) * Math.min(1, u * 10)};
}

export function createSqueakyBoard(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'SqueakyBoard'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.9, 1, 24), sph = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const rings = Array.from({length: SQUEAK.rings}, () => { const m = new THREE.Mesh(ringGeo, mk(0xc9b79a)); m.rotation.x = -Math.PI / 2; m.position.y = .03; g.add(m); return m; });
    const motes = Array.from({length: SQUEAK.motes}, () => { const m = new THREE.Mesh(sph, mk(0x8a7a62)); m.scale.setScalar(.014); g.add(m); return m; });
    live.push({g, geos: [ringGeo, sph], mats, rings, motes, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.rings.forEach((m, i) => { const p = ringPose(i, e.t); m.visible = p.alpha > .01; m.scale.setScalar(p.radius); m.material.opacity = p.alpha; });
    e.motes.forEach((m, i) => { const p = motePose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < SQUEAK.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    // The message arrives before the frame carrying the hero's new square: hold it until
    // settle() says where the trap really is, or fall back after PENDING_WAIT.
    message(text, x, z) { if (isSqueakMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

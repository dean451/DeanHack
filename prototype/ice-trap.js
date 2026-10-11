// "A freezing cloud shoots up from the floor!" The ice trap's trigger moment. A hard blue-white
// flash, then a billow of freezing cloud punches up from the hero's square in heavy puffs, while
// a ring of frost cracks outward across the floor and shards of ice are flung out and drop. The
// frost ring stalls once, a breath, as if the floor were deciding whether to go on. The last
// shard does not fall: it hangs in the air, turning, long after the rest, and then drops all at once.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to rest
// (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const ICE = {flash: .1, puffs: 7, shards: 6, total: 1.7, gravity: 5};
export const PENDING_WAIT = .3;
export const isIceTrapMessage = text => /a freezing cloud shoots up from/i.test(text || '');

// The hard flash at the base: one pulse in the first instants.
export function flashPose(t) {
  const u = clamp01(t / ICE.flash);
  return {size: .2 + .8 * u, alpha: t <= 0 || u >= 1 ? 0 : (1 - u) * (1 - u)};
}

// Puff i: a ball of freezing cloud thrown up the column, swelling as it climbs and thinning out.
export function puffPose(i, t) {
  const start = i * .04, u = clamp01((t - start) / (1.2 - i * .05));
  const a = i * 2.4;
  return {x: Math.cos(a) * .1 * u, y: .1 + (.5 + (i % 3) * .3) * smooth(u), z: Math.sin(a) * .1 * u,
    size: .08 + .16 * smooth(u), alpha: u <= 0 || u >= 1 ? 0 : .55 * smooth(u / .12) * (1 - smooth((u - .5) / .5))};
}

// The frost ring: cracks across the floor, stalls for a breath, then goes on and lingers thinning.
export function frostPose(t) {
  const reach = t < .35 ? smooth(t / .35) * .35 : t < .5 ? .35 : .35 + .65 * smooth((t - .5) / .4);
  return {radius: .12 + .55 * reach, alpha: t <= 0 || t >= ICE.total ? 0 : .6 * (1 - smooth((t - .9) / (ICE.total - .9))) * Math.min(1, t * 12)};
}

// Shard i: flung out and up, falling under gravity to the floor. The last one stops its own clock
// from .35s to 1s, hanging in the air with a faint bob, then drops all at once.
export function shardPose(i, t) {
  const hang = i === ICE.shards - 1, s = t - .06 - (i % 3) * .02;
  if (s <= 0 || t >= ICE.total) return {x: 0, y: 0, z: 0, alpha: 0, spin: 0};
  const te = hang ? (s < .35 ? s : s < 1 ? .35 : s - .65) : s;
  const a = i * 1.3 + .4, out = .5 + (i % 3) * .2, up = 1 + (i % 2) * .5;
  const y = .3 + up * te - ICE.gravity * te * te / 2 + (hang && s >= .35 && s < 1 ? Math.sin(s * 9) * .015 : 0);
  if (y <= .02) return {x: 0, y: 0, z: 0, alpha: 0, spin: 0};
  const r = out * Math.min(te, .6);
  return {x: Math.cos(a) * r, y, z: Math.sin(a) * r, alpha: .9 * (1 - smooth((t - ICE.total + .15) / .15)), spin: s * (hang ? 4 : 9)};
}

export function createIceTrap(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'IceTrap'; g.position.set(x, 0, z); parent.add(g);
    const sph = new THREE.SphereGeometry(1, 8, 6), ringGeo = new THREE.RingGeometry(.8, 1, 24), shardGeo = new THREE.OctahedronGeometry(1, 0), mats = [];
    const mk = (c, o = {}) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, ...o}); mats.push(m); return m; };
    const flash = new THREE.Mesh(sph, mk(0xe0f6ff)); flash.position.y = .2; g.add(flash);
    const puffs = Array.from({length: ICE.puffs}, () => { const m = new THREE.Mesh(sph, mk(0xbfe4f4)); g.add(m); return m; });
    const frost = new THREE.Mesh(ringGeo, mk(0x9fd4f0)); frost.rotation.x = -Math.PI / 2; frost.position.y = .02; g.add(frost);
    const shards = Array.from({length: ICE.shards}, () => { const m = new THREE.Mesh(shardGeo, mk(0xd8f4ff)); m.scale.set(.025, .05, .025); g.add(m); return m; });
    live.push({g, geos: [sph, ringGeo, shardGeo], mats, flash, puffs, frost, shards, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const f = flashPose(e.t); e.flash.visible = f.alpha > .01; e.flash.scale.setScalar(f.size); e.flash.material.opacity = f.alpha;
    e.puffs.forEach((m, i) => { const p = puffPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.scale.setScalar(p.size); m.material.opacity = p.alpha; });
    const r = frostPose(e.t); e.frost.visible = r.alpha > .01; e.frost.scale.setScalar(r.radius); e.frost.material.opacity = r.alpha;
    e.shards.forEach((m, i) => { const p = shardPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.rotation.set(p.spin, p.spin * .7, 0); m.material.opacity = p.alpha; });
    return e.t < ICE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    // The message arrives before the frame carrying the hero's new square: hold it and let
    // settle() say where the trap really is, falling back to the given square after PENDING_WAIT.
    message(text, x, z) { if (isIceTrapMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

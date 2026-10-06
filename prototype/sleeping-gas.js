// "A cloud of gas puts you to sleep!" The sleeping gas trap's trigger moment. A sickly green-grey
// cloud hisses up out of the floor in a few fat lumps, billows outward, then goes heavy: it
// stops rising and sags down over the hero like a lid closing, the lumps drooping one after
// another as if nodding off. Over in about two seconds.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const GAS = {puffs: 9, total: 2.0};
export const PENDING_WAIT = .3;
export const isSleepingGasMessage = text => /a cloud of gas puts you to sleep/i.test(text || '');

// Puff i: bursts up and out from its own beat, peaks, then droops back down past its start height.
export function puffPose(i, t) {
  const start = (i % 3) * .08 + Math.floor(i / 3) * .05, u = clamp01((t - start) / 1.6);
  if (u <= 0 || u >= 1) return {x: 0, y: .05, z: 0, size: .01, alpha: 0};
  const a = i * 2.4, rise = Math.sin(Math.min(1, u * 1.6) * Math.PI / 2), droop = smooth(clamp01((u - .45) / .55));
  const spread = .12 + .3 * smooth(Math.min(1, u * 1.4));
  return {x: Math.cos(a) * spread, y: .08 + (.5 + .06 * (i % 3)) * rise - .52 * droop, z: Math.sin(a) * spread, size: .09 + .14 * smooth(u) , alpha: .5 * Math.min(1, u * 8) * (1 - smooth(clamp01((u - .7) / .3)))};
}

export function createSleepingGas(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'SleepingGas'; g.position.set(x, 0, z); parent.add(g);
    const sph = new THREE.SphereGeometry(1, 7, 5), mats = [];
    const puffs = Array.from({length: GAS.puffs}, (_, i) => {
      const m = new THREE.MeshBasicMaterial({color: i % 2 ? 0x7d8a6a : 0x6b7468, transparent: true, opacity: 0, depthWrite: false, toneMapped: false}); mats.push(m);
      const p = new THREE.Mesh(sph, m); g.add(p); return p;
    });
    live.push({g, geos: [sph], mats, puffs, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.puffs.forEach((m, i) => { const p = puffPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.scale.setScalar(p.size); m.material.opacity = p.alpha; });
    return e.t < GAS.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    // The message arrives before the frame carrying the hero's new square: hold it until
    // settle() says where the trap really is, or fall back after PENDING_WAIT.
    message(text, x, z) { if (isSleepingGasMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

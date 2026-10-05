// "You attract a water nymph!" Something below has noticed the hero. The fountain's surface
// goes still and glassy, then rings widen out from the middle one after another, slow and
// patient, like a held breath let go. A thin pale mist climbs out of the basin in a lazy
// spiral, leaning toward the hero as if beckoning, and thins away. The real nymph arrives in
// the map frames; this is only the omen.
//
// live.js calls message(text, x, z) with every engine message and x, z the hero's square (the
// fountain is always the hero's own), update(dt) every frame and clear() on a level change.
// Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const NYMPH = {rings: 3, ringGap: .55, ringTime: 1.5, puffs: 7, total: 4.2};
export const isNymphMessage = text => /you attract a water nymph/i.test(text || '');

// Ring i at time t: radius out from the middle and alpha (it fades as it widens).
export function ringPose(i, t) {
  const u = clamp01((t - .3 - i * NYMPH.ringGap) / NYMPH.ringTime);
  return {radius: .05 + .75 * (1 - (1 - u) ** 2), alpha: u <= 0 || u >= 1 ? 0 : .6 * Math.min(1, u * 6) * (1 - u)};
}

// Mist puff i at time t: height, a lean toward the hero that grows with height, a spiral
// around the column and alpha (in then out).
export function puffPose(i, t) {
  const u = clamp01((t - 1 - i * .22) / 1.8);
  const spin = u * 5 + i * 1.3;
  return {y: .12 + .9 * u, lean: .22 * u * u, sx: Math.cos(spin) * .07 * u, sz: Math.sin(spin) * .07 * u, alpha: u <= 0 || u >= 1 ? 0 : .45 * Math.sin(Math.PI * u) ** 1.5, size: .05 + .06 * u};
}

export function createFountainNymph(THREE, parent) {
  const live = [];
  function add(x, z, toward = 0) {
    const g = new THREE.Group(); g.name = 'FountainNymph'; g.position.set(x, 0, z); g.rotation.y = toward; parent.add(g);
    const ringGeo = new THREE.RingGeometry(.94, 1, 28), puffGeo = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}); mats.push(m); return m; };
    const rings = Array.from({length: NYMPH.rings}, () => { const m = new THREE.Mesh(ringGeo, mk(0x7fa8a0)); m.rotation.x = -Math.PI / 2; m.position.y = .5; g.add(m); return m; });
    const puffs = Array.from({length: NYMPH.puffs}, () => { const m = new THREE.Mesh(puffGeo, mk(0x9cb8ac)); g.add(m); return m; });
    live.push({g, geos: [ringGeo, puffGeo], mats, rings, puffs, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.rings.forEach((m, i) => { const p = ringPose(i, e.t); m.visible = p.alpha > .01; m.scale.setScalar(p.radius); m.material.opacity = p.alpha; });
    e.puffs.forEach((m, i) => { const p = puffPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.sx, .5 + p.y, p.lean + p.sz); m.scale.setScalar(p.size); m.material.opacity = p.alpha; });
    return e.t < NYMPH.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z, toward) { if (isNymphMessage(text)) add(x, z, toward); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

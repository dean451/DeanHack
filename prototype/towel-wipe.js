// "You've got the glop off." The towel finishes wiping a cream pie off the hero's face. Pale
// cream clots that clung at face height are dragged sideways in jerks and flicked off, they
// fall heavy and skid on the floor, one clot clinging on a beat too long, and a dull grey
// smear ring is left where the last one lands. About 0.85 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and update(dt) every frame. Poses end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const WIPE = {clots: 5, total: .85};
export const isWipeMessage = text => /^You've got the glop off\b/.test(text || '');

// Clot i is dragged across in two jerks, then falls; clot 0 clings longest.
export function clotPose(i, t) {
  const start = i * .06 + (i === 0 ? .22 : 0), life = .45, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  const side = i % 2 ? 1 : -1, drag = Math.min(1, u * 2.2), jerk = drag < 1 ? Math.floor(drag * 3) / 3 : 1, fall = Math.max(0, u - .4) / .6;
  return {x: side * (.05 + .16 * jerk), y: (.8 + (i % 3) * .08) * (1 - fall * fall) + .02, z: .1 - (i % 2) * .04, alpha: Math.min(1, u * 12) * (1 - smooth((u - .9) / .1))};
}

// The smear is left on the floor where the clots land, and fades slowly.
export function smearPose(t) {
  const u = clamp01((t - .35) / .5);
  if (u <= 0 || u >= 1) return {scale: .001, alpha: 0};
  return {scale: .08 + .14 * smooth(Math.min(1, u * 2)), alpha: .32 * Math.min(1, u * 8) * (1 - smooth(u))};
}

export function createTowelWipe(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'TowelWipe'; g.position.set(x, 0, z); parent.add(g);
    const dot = new THREE.SphereGeometry(1, 6, 4), ring = new THREE.RingGeometry(.5, 1, 12), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const clots = Array.from({length: WIPE.clots}, (_, i) => { const m = new THREE.Mesh(dot, mk(i % 2 ? 0xc8c0a8 : 0xa89e84)); m.scale.set(.035 + (i % 3) * .008, .02, .03); g.add(m); return m; });
    const smear = new THREE.Mesh(ring, mk(0x7a746a)); smear.rotation.x = -Math.PI / 2; smear.position.y = .03; g.add(smear);
    live.push({g, geos: [dot, ring], mats, clots, smear, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.clots.forEach((m, i) => { const p = clotPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    const s = smearPose(e.t); e.smear.visible = s.alpha > .01; e.smear.scale.set(s.scale, s.scale * .6, 1); e.smear.material.opacity = s.alpha;
    return e.t < WIPE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isWipeMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

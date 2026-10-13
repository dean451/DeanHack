// "You feel limber!" Stoning is cured. Grey stone skin does not melt: flat grey plates crack
// off the hero in jerks, fall with a dull weight and skid, one clinging on a beat too long,
// while a ragged ring of dust coughs out along the floor. About 0.9 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and update(dt) every frame. Poses end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const CURE = {plates: 6, total: .9};
export const isLimberMessage = text => /^You feel limber\b/.test(text || '');

// Plate i splits off at its own height and delay and drops, tumbling; plate 0 clings longest.
export function platePose(i, t) {
  const start = i * .07 + (i === 0 ? .25 : 0), life = .4, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, tilt: 0, alpha: 0};
  const a = i * 1.9, fall = u * u, out = .05 + .12 * smooth(u);
  return {x: Math.cos(a) * out, y: (.15 + (i % 3) * .3) * (1 - fall) + .02, z: Math.sin(a) * out, tilt: u * (2 + i * .5), alpha: Math.min(1, u * 10) * (1 - smooth((u - .85) / .15))};
}

export function dustPose(t) {
  const u = clamp01((t - .25) / .5);
  if (u <= 0 || u >= 1) return {scale: .001, alpha: 0};
  return {scale: .1 + .4 * smooth(u), alpha: .4 * (1 - u) * Math.min(1, u * 8)};
}

export function createStoneCure(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'StoneCure'; g.position.set(x, 0, z); parent.add(g);
    const plate = new THREE.BoxGeometry(1, .3, 1), ring = new THREE.RingGeometry(.7, 1, 12), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const plates = Array.from({length: CURE.plates}, (_, i) => { const m = new THREE.Mesh(plate, mk(i % 2 ? 0x6a6e72 : 0x4c5054)); m.scale.set(.05 + (i % 3) * .01, .018, .04); g.add(m); return m; });
    const dust = new THREE.Mesh(ring, mk(0x8a8a86)); dust.rotation.x = -Math.PI / 2; dust.position.y = .03; g.add(dust);
    live.push({g, geos: [plate, ring], mats, plates, dust, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.plates.forEach((m, i) => { const p = platePose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.rotation.set(p.tilt, i, p.tilt * .5); m.material.opacity = p.alpha; });
    const q = dustPose(e.t); e.dust.visible = q.alpha > .01; e.dust.scale.set(q.scale, q.scale, 1); e.dust.material.opacity = q.alpha;
    return e.t < CURE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isLimberMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

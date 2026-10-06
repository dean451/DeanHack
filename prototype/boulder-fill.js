// "The boulder fills a pit." A Sokoban boulder dropping into a pit: the mouth of the pit is a
// dark disc that the boulder's weight shrinks shut in one heavy thud, a ring of grit coughs
// out along the floor, chunks of rubble hop and settle, and a pale dust ring rises and hangs.
// The filled square reads as settled: a faint scuffed patch lingers a moment after the rest.
//
// live.js calls message(text, x, z, facing) with every engine message (x, z the hero's last
// known square, facing the hero's heading), settle(x, z) each frame with the hero's new square
// and update(dt) / clear() as for the other trap moments. The boulder lands one square ahead
// of the hero. Poses are functions of t and return exactly to rest (nothing showing).

import {clamp01, smooth} from './fx-textures.js';

export const FILL = {chunks: 6, total: 1.2};
export const PENDING_WAIT = .3;
export const isBoulderFillMessage = text => /the boulder (fills a pit|falls into and plugs a hole)/i.test(text || '');

// The dark pit mouth: full at the start, crushed shut by the thud at .18s, gone with the dust.
export function mouthPose(t) {
  if (t <= 0 || t >= FILL.total) return {scale: 0, alpha: 0};
  const close = smooth(clamp01((t - .08) / .12));
  return {scale: .42 * (1 - close) + .02, alpha: .9 * (1 - clamp01((t - .35) / .5))};
}

// Grit ring: slams out along the floor on the thud and thins.
export function gritRingPose(t) {
  const u = clamp01((t - .16) / .5);
  if (u <= 0 || u >= 1) return {scale: .1, alpha: 0};
  return {scale: .15 + .6 * (1 - (1 - u) ** 3), alpha: .7 * (1 - u)};
}

// Rubble chunk i: thrown up on the thud, two shrinking hops, then dead still.
export function chunkPose(i, t) {
  const s = t - .16;
  if (s <= 0 || t >= FILL.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const a = i * 1.9, r = .12 + .22 * (1 - Math.exp(-s * 5)) * (.7 + .1 * (i % 4));
  const hop = .5 + .06 * (i % 3), p = s / hop;
  const y = p < 1 ? .5 * hop * 4 * p * (1 - p) : p < 1.6 ? .08 * 4 * (p - 1) / .6 * (1 - (p - 1) / .6) : 0;
  return {x: Math.cos(a) * r, y: Math.max(0, y), z: Math.sin(a) * r, alpha: .85 * (1 - clamp01((t - .8) / .4))};
}

export function createBoulderFill(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z, facing) {
    const g = new THREE.Group(); g.name = 'BoulderFill';
    g.position.set(x + Math.sin(facing || 0), 0, z + Math.cos(facing || 0)); parent.add(g);
    const disc = new THREE.CircleGeometry(1, 10), ringGeo = new THREE.RingGeometry(.85, 1, 20), sph = new THREE.SphereGeometry(1, 5, 3), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const mouth = new THREE.Mesh(disc, mk(0x050403, 0)); mouth.rotation.x = -Math.PI / 2; mouth.position.y = .02; g.add(mouth);
    const ring = new THREE.Mesh(ringGeo, mk(0x9a9080, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const chunks = Array.from({length: FILL.chunks}, () => { const m = new THREE.Mesh(sph, mk(0x6e675c, 0)); m.scale.setScalar(.035); g.add(m); return m; });
    live.push({g, geos: [disc, ringGeo, sph], mats, mouth, ring, chunks, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const m = mouthPose(e.t); e.mouth.visible = m.alpha > .01; e.mouth.scale.setScalar(Math.max(.001, m.scale)); e.mouth.material.opacity = m.alpha;
    const r = gritRingPose(e.t); e.ring.visible = r.alpha > .01; e.ring.scale.setScalar(r.scale); e.ring.material.opacity = r.alpha;
    e.chunks.forEach((c, i) => { const p = chunkPose(i, e.t); c.visible = p.alpha > .01; c.position.set(p.x, p.y + .03, p.z); c.material.opacity = p.alpha; });
    return e.t < FILL.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z, facing) { if (isBoulderFillMessage(text)) { if (pending) add(pending.x, pending.z, pending.facing); pending = {x, z, facing, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z, pending.facing); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z, pending.facing); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

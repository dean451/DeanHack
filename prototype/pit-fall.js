// "You fall into a pit!" / "You land on a set of sharp iron spikes!" The pit trap's trigger
// moment. The rim gives way under the hero's feet: broken lips of flagstone and clods of earth
// slide inward and drop out of sight a beat apart, one stubborn chunk hanging on the edge a
// moment too long, and a grey ring of dust coughs up out of the hole and hangs. The spiked
// pit adds a second beat: a few dark flecks spit up off the iron and fall back. Over in about
// a second.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const PIT = {chunks: 8, dust: 6, specks: 5, total: 1.1, speckTotal: .8};
export const PENDING_WAIT = .3;
export const isPitFallMessage = text => /you fall into a pit\b/i.test(text || '');
export const isPitSpikeMessage = text => /you land on a set of sharp iron spikes\b/i.test(text || '');

// Chunk i: starts on the rim, hangs a beat (the later ones longer, the last one longest), then
// slides inward and drops below the floor. Alpha is zero before it moves and once it is gone.
export function chunkPose(i, t) {
  const hang = .04 * i + (i === PIT.chunks - 1 ? .18 : 0), s = t - hang;
  const a = i * 2.4, r0 = .42 + .05 * (i % 3);
  if (t >= PIT.total) return {x: 0, y: 0, z: 0, alpha: 0};
  if (s <= 0) return {x: Math.cos(a) * r0, y: .03, z: Math.sin(a) * r0, alpha: t > 0 ? .9 : 0};
  const r = Math.max(0, r0 - 1.1 * s), y = .03 - 2.4 * s * s;
  return {x: Math.cos(a) * r, y, z: Math.sin(a) * r, alpha: .9 * (1 - clamp01((-y - .15) / .25))};
}

// Dust puff i: a grey ring coughed up out of the hole, rising, spreading and fading.
// The last puff is a second, late cough: it comes up out of the hole well after the rest have gone.
export const COUGH_DELAY = .3;
export function dustPose(i, t) {
  const d = .06 + (i === PIT.dust - 1 ? COUGH_DELAY : 0), s = t - d;
  if (s <= 0 || t >= PIT.total) return {x: 0, y: 0, z: 0, scale: .1, alpha: 0};
  const u = s / (PIT.total - d), a = i * 1.05 + .3;
  const r = .12 + .3 * Math.sqrt(u);
  return {x: Math.cos(a) * r, y: .08 + .45 * u, z: Math.sin(a) * r, scale: .08 + .1 * u, alpha: .5 * clamp01(s / .08) * (1 - clamp01((u - .5) / .5))};
}

// Spike fleck i: spat up off the iron, falls back under gravity and is gone before it lands.
export function speckPose(i, t) {
  const s = t - i * .03;
  if (s <= 0 || t >= PIT.speckTotal) return {x: 0, y: 0, z: 0, alpha: 0};
  const a = i * 2.4 + .7, r = .18 * Math.sqrt(clamp01(s / .4));
  return {x: Math.cos(a) * r, y: Math.max(.02, .1 + 1.9 * s - 3.8 * s * s), z: Math.sin(a) * r, alpha: .9 * (1 - clamp01((s - .4) / .25))};
}

export function createPitFall(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z, kind) {
    const g = new THREE.Group(); g.name = 'PitFall'; g.position.set(x, 0, z); parent.add(g);
    const box = new THREE.BoxGeometry(1, 1, 1), sph = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const spike = kind === 'spike';
    const chunks = spike ? [] : Array.from({length: PIT.chunks}, (_, i) => { const m = new THREE.Mesh(box, mk(0x5a554c, 0)); m.scale.set(.07 + .02 * (i % 3), .035, .06); m.rotation.y = i * 1.3; g.add(m); return m; });
    const dust = spike ? [] : Array.from({length: PIT.dust}, () => { const m = new THREE.Mesh(sph, mk(0x7d7a74, 0)); g.add(m); return m; });
    const specks = spike ? Array.from({length: PIT.specks}, () => { const m = new THREE.Mesh(sph, mk(0x5c0d0d, 0)); m.scale.setScalar(.02); g.add(m); return m; }) : [];
    live.push({g, geos: [box, sph], mats, chunks, dust, specks, spike, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.chunks.forEach((m, i) => { const p = chunkPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    e.dust.forEach((m, i) => { const p = dustPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.scale.setScalar(p.scale); m.material.opacity = p.alpha; });
    e.specks.forEach((m, i) => { const p = speckPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < (e.spike ? PIT.speckTotal : PIT.total);
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) {
      if (isPitSpikeMessage(text)) add(x, z, 'spike');
      else if (isPitFallMessage(text)) { if (pending) add(pending.x, pending.z, 'fall'); pending = {x, z, wait: 0}; }
    },
    settle(x, z) { if (pending) { add(x, z, 'fall'); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z, 'fall'); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

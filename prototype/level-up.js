// Level-up: a short rising flourish, grim rather than glad. "Welcome to experience level N."
// A pale ember ring on the floor does not swell but draws tight round the hero's boots, as if
// something were being pulled in; then ash-grey and dull-gold motes are dragged upward in a
// thin spiral and gutter out above the head. A last cold flicker, then nothing.
//
// live.js calls message(text, x, z) with the hero's tile, update(dt) every frame and clear()
// on a level change. It keys on the message only, so it shows nothing the hero doesn't know.

import {softDot, softRing, rng, smooth, clamp01} from './fx-textures.js';

export const LEVEL = {total: 1.8, ring: .55, motes: 12, rise: 1.7};
export const RING_CATCH = .12;
export const isLevelUp = text => /^Welcome to experience level \d+\.$/.test(text || '');

// The ring at age t: radius draws in from wide to tight, brightest as it closes.
export function ringPose(t) {
  const k = clamp01(t / LEVEL.ring);
  // The ring catches twice on the way in, as if the power resisted being pulled: it stalls but never opens back out.
  const kk = clamp01(k - RING_CATCH * Math.sin(k * Math.PI * 2) * (1 - k));
  return {radius: .15 + .75 * (1 - smooth(kk)) ** 1.5, alpha: t < 0 || t >= LEVEL.ring + .25 ? 0 : (k < 1 ? .9 * k : .9 * (1 - (t - LEVEL.ring) / .25))};
}

// Mote i at age t: a thin spiral up the hero's height, starting once the ring has closed.
export function moteFlight(i, t, n = LEVEL.motes) {
  const start = LEVEL.ring * .7 + (i / n) * .5, life = LEVEL.total - start - .1;
  const u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0, size: 0};
  const a = i * 2.4 + u * 5, r = .22 * (1 - u * .6);
  // The last mote is reluctant: halfway up it is tugged back toward the floor, then lets go and climbs on.
  const tug = i === n - 1 ? .3 * Math.sin(Math.PI * clamp01((u - .35) / .3)) : 0;
  return {x: Math.cos(a) * r, y: .05 + LEVEL.rise * u ** 1.3 - tug, z: Math.sin(a) * r,
    alpha: smooth(u / .15) * (1 - smooth((u - .6) / .4)) * (.7 + .3 * Math.sin(u * 30 + i)), size: .07 * (1 - u * .5)};
}

export function createLevelUp(THREE, parent) {
  const live = [];
  const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function add(x, z, seed = 0) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = 'LevelUp'; g.position.set(x, 0, z); parent.add(g);
    const ringMat = new THREE.MeshBasicMaterial({map: softRing(THREE), color: 0xc9a85a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = .03; g.add(ring);
    const rand = rng(seed + 11), mats = [ringMat];
    const motes = Array.from({length: LEVEL.motes}, (_, i) => {
      const mat = new THREE.SpriteMaterial({map: softDot(THREE), color: i % 3 ? 0xd4b86a : 0x9a948a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
      mats.push(mat); const s = new THREE.Sprite(mat); g.add(s);
      return {s, jitter: rand() * 6};
    });
    live.push({g, ring, motes, mats, t: 0});
    return g;
  }
  function drop(e) { e.mats.forEach(m => m.dispose()); parent.remove(e.g); }
  const frame = (e, dt) => {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    const r = ringPose(e.t);
    e.ring.scale.setScalar(r.radius * 2); e.ring.material.opacity = r.alpha;
    e.motes.forEach((m, i) => {
      const f = moteFlight(i, e.t);
      m.s.position.set(f.x, f.y, f.z); m.s.scale.setScalar(f.size); m.s.material.opacity = f.alpha;
    });
    return e.t < LEVEL.total;
  };
  return {
    add,
    message: (text, x, z) => isLevelUp(text) ? add(x, z, Math.round(x * 7 + z)) : null,
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    dispose() { this.clear(); ringGeo.dispose(); },
    get active() { return live.length; },
  };
}

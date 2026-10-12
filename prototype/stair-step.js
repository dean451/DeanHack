// Early-game moment: taking the stairs. The new level does not just cut in. Going down, cold grit
// breathes up off the top step and a dark ring creeps in round the hero's feet; going up, the grit
// sifts down out of the dark above and the ring spreads out and thins. One flake hangs late,
// as if the stair were reluctant to let go. About 0.8 s.
//
// live.js calls arrive(dir, x, z) when the level changes by exactly one on the same branch
// (not when a fall or a tumble brought the hero here) and update(dt) every frame. Poses end
// exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const STEP = {flecks: 6, total: .8};

// +1 down, -1 up, 0 for anything that is not a one-level stair step (a fall, a teleport, a branch hop).
export function stepDirection(prevBranch, prevDepth, branch, depth) {
  if (prevBranch == null || prevBranch !== branch || !Number.isFinite(prevDepth) || !Number.isFinite(depth)) return 0;
  const d = depth - prevDepth;
  return d === 1 || d === -1 ? d : 0;
}

// Fleck i: down, it rises from the floor; up, it falls from above. Fleck 0 is late and slow.
export function fleckPose(i, t, dir) {
  const start = i * .05 + (i === 0 ? .22 : 0), life = i === 0 ? .55 : .38, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  const a = i * 2.4 + .7, spread = .05 + .1 * u, rise = .5 * smooth(u);
  return {x: Math.cos(a) * spread, y: dir > 0 ? .03 + rise : .55 - rise + .03, z: Math.sin(a) * spread, alpha: Math.min(1, u * 8) * (1 - smooth((u - .8) / .2)) * .85};
}

export function ringPose(t, dir) {
  const u = clamp01((t - .05) / .5);
  if (u <= 0 || u >= 1) return {scale: .001, alpha: 0};
  const e = smooth(u), scale = dir > 0 ? .55 - .4 * e : .15 + .4 * e;
  return {scale, alpha: .5 * (dir > 0 ? u : 1 - u) * Math.min(1, u * 8) * (dir > 0 ? 1 - smooth((u - .8) / .2) : 1)};
}

export function createStairStep(THREE, parent) {
  const live = [];
  function add(dir, x, z) {
    const g = new THREE.Group(); g.name = 'StairStep'; g.position.set(x, 0, z); parent.add(g);
    const dot = new THREE.SphereGeometry(1, 5, 3), ring = new THREE.RingGeometry(.85, 1, 20), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const flecks = Array.from({length: STEP.flecks}, () => { const m = new THREE.Mesh(dot, mk(0x6b625a)); m.scale.set(.022, .03, .022); g.add(m); return m; });
    const rm = new THREE.Mesh(ring, mk(0x2c2824)); rm.rotation.x = -Math.PI / 2; rm.position.y = .03; g.add(rm);
    live.push({g, dir, geos: [dot, ring], mats, flecks, rm, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.flecks.forEach((m, i) => { const p = fleckPose(i, e.t, e.dir); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    const q = ringPose(e.t, e.dir); e.rm.visible = q.alpha > .01; e.rm.scale.set(q.scale, q.scale, 1); e.rm.material.opacity = q.alpha;
    return e.t < STEP.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    arrive(dir, x = 0, z = 0) { if (dir === 1 || dir === -1) add(dir, x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], Math.min(Math.max(dt, 0), .1))) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

// "A trap door in the ceiling opens and a rock falls on your head!" The falling rock trap's
// trigger moment. A black slot of ceiling shows for an instant, then a rock drops out of the
// dark: slow to start, then all at once, striking the floor with a flat crack, hopping once and
// settling. A ring of grit jumps up off the stone. Over in about a second.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const ROCK = {grit: 8, drop: .3, total: 1.1, height: 2.2};
export const PENDING_WAIT = .3;
export const LATE_PEBBLE = .18;
export const isFallingRockMessage = text => /trap door in the ceiling opens and a rock falls/i.test(text || '');

// Height of the rock: waits in the dark, falls on an accelerating curve, hops once, rests.
export function rockPose(t) {
  // Anticipation: in the last instant before it drops, the rock shows in the slot and trembles, as if it were deciding.
  if (t <= .08) { const u = clamp01((t - .03) / .05); return {x: .012 * Math.sin(t * 400) * u, y: ROCK.height, alpha: u, spin: 0}; }
  if (t <= .08 + ROCK.drop) { const u = (t - .08) / ROCK.drop; // It does not fall true: it swings a little off the vertical, as if it had caught the slot's edge, and is back on the mark by the floor.
    return {x: .035 * Math.sin(u * 9) * (1 - u), y: .06 + (ROCK.height - .06) * (1 - u * u), alpha: 1, spin: u * 4}; }
  const h = t - .08 - ROCK.drop;
  const hop = h < .22 ? Math.sin(h / .22 * Math.PI) * .14 : 0;
  // After the hop it lurches a short way across the stone, slowing, like it means to keep going.
  const roll = .12 * (1 - (1 - clamp01(h / .5)) ** 2);
  // Once it lies still it gives one last small tip, as if it had not quite finished falling.
  const tick = .14 * Math.sin(clamp01((h - .4) / .15) * Math.PI);
  return {x: roll, y: .06 + hop, alpha: t >= ROCK.total ? 0 : 1 - clamp01((t - .8) / .3), spin: 4 + (h < .22 ? h * 6 : 1.3) + tick};
}

// Grit i: thrown out flat from the impact, arcing low and dropping back.
export function gritPose(i, t) {
  // The last pebble is slow to settle: it trickles on across the stone, long after the rest lie still.
  // One pebble comes loose from the slot a beat after the rock, and ticks down late.
  const last = i === ROCK.grit - 1, u = clamp01((t - .08 - ROCK.drop - (i === 1 ? LATE_PEBBLE : 0)) / (last ? .62 : .5));
  if (u <= 0 || u >= 1) return {x: 0, y: .03, z: 0, alpha: 0};
  const a = i * 2.4, r = .1 + (last ? .34 : .3) * u;
  if (last) return {x: Math.cos(a) * r, y: .03 + .14 * Math.abs(Math.sin(u * 11)) * (1 - u), z: Math.sin(a) * r, alpha: .6 * (1 - u * u)};
  return {x: Math.cos(a) * r, y: .03 + .22 * Math.sin(u * Math.PI) * (.6 + .1 * (i % 4)), z: Math.sin(a) * r, alpha: .6 * (1 - u)};
}

export function createFallingRock(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FallingRock'; g.position.set(x, 0, z); parent.add(g);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0), sph = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const rock = new THREE.Mesh(rockGeo, mk(0x4a4640, 0)); rock.scale.set(.2, .16, .18); g.add(rock);
    const grit = Array.from({length: ROCK.grit}, () => { const m = new THREE.Mesh(sph, mk(0x7a7468, 0)); m.scale.setScalar(.016); g.add(m); return m; });
    live.push({g, geos: [rockGeo, sph], mats, rock, grit, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const r = rockPose(e.t);
    e.rock.visible = r.alpha > .01; e.rock.position.set(r.x, r.y, 0); e.rock.rotation.set(r.spin, r.spin * .6, 0); e.rock.material.opacity = r.alpha;
    e.grit.forEach((m, i) => { const p = gritPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < ROCK.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isFallingRockMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

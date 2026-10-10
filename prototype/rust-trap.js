// "A gush of water hits you!" / "A gush of water hits your head!" The rust trap's trigger
// moment. A hard jet of cold water spits out of the wall side in a blink, a string of droplets
// slapping into the square, then bursts into a ring of spray. What it leaves behind is the
// point: flecks of orange rust bloom and drift down, and the odd grey drip hangs and falls
// long after. Over in about a second and a half.
//
// live.js calls message(text, x, z, yaw) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const RUST = {drops: 10, flecks: 7, flight: .22, total: 1.5, from: 1.3};
export const PENDING_WAIT = .3;
// Only the hero's own soaking: monsters get "hits the ...".
export const isRustTrapMessage = text => /a gush of water hits (you|your)\b/i.test(text || '');

// Droplet i: streams in flat from the wall side in a staggered line, then splashes outward
// and falls under gravity. Alpha is zero before it leaves and after it lands.
export function dropPose(i, t) {
  const t0 = i * .02, h = t - t0;
  if (h <= 0 || t >= RUST.total) return {x: 0, y: .9, z: 0, alpha: 0};
  if (h < RUST.flight) { const u = h / RUST.flight - (i === 6 ? .12 * Math.sin(h / RUST.flight * Math.PI) : 0);  // droplet 6 hangs back in the jet, then catches up
    return {x: -RUST.from * (1 - u), y: .9 - .15 * u, z: Math.sin(i * 1.7) * .04 * u + (i === 3 ? .05 * Math.sin(u * Math.PI * 2) : 0), alpha: .8}; }   // droplet 3 slews sideways in the jet
  const s = h - RUST.flight, a = i * 2.4;
  // The last droplet never splashes: it clings at the strike point, trembling, then lets go late.
  if (i === RUST.drops - 1) {
    const fall = clamp01((s - .6) / .3);
    return {x: .06 * Math.cos(a), y: Math.max(.03, .6 - .57 * fall * fall) + (fall ? 0 : .01 * Math.sin(s * 40)), z: .06 * Math.sin(a), alpha: .8 * (1 - clamp01((s - .85) / .1))};
  }
  // Droplet 4 ricochets: it glances off and skips back up the jet toward the wall it came from.
  if (i === 4) { const k = Math.sqrt(clamp01(s / .4)); return {x: -.32 * k, y: Math.max(.03, .75 - 3.2 * s * s + .9 * s), z: .03 * Math.sin(a), alpha: .8 * (1 - clamp01((s - .35) / .25))}; }
  const r = .35 * Math.sqrt(clamp01(s / .4)) * (.5 + .1 * (i % 5));
  const y = Math.max(.03, .75 - 3.2 * s * s + .9 * s);
  return {x: Math.cos(a) * r, y, z: Math.sin(a) * r, alpha: .8 * (1 - clamp01((s - .35) / .25))};
}

// Rust fleck i: blooms at the strike, then sinks slowly, drifting sideways, fading late.
export function fleckPose(i, t) {
  const s = t - RUST.flight - .08;
  if (s <= 0 || t >= RUST.total) return {x: 0, y: .5, z: 0, alpha: 0};
  const u = s / (RUST.total - RUST.flight - .08), a = i * 2.4 + 1;
  // Each fleck also sways on its own slow beat as it sinks, like rust ash that cannot decide which way to fall.
  const sway = .025 * Math.sin(u * 11 + i * 1.9) * clamp01(u / .15);
  // The first fleck flinches once mid-fall: a sudden jerk across the line of sight, as if something unseen flicked it.
  const flinch = i === 0 ? .07 * Math.sin(clamp01((u - .45) / .1) * Math.PI) : 0;
  return {x: Math.cos(a) * (.1 + .14 * u + .02 * (i % 3)) + sway, y: Math.max(.04, .85 - .8 * u * (.7 + .1 * (i % 4))), z: Math.sin(a) * (.1 + .14 * u) - sway * .6 + flinch, alpha: .85 * clamp01(s / .1) * (1 - clamp01((u - .6) / .4))};
}

export function createRustTrap(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z, yaw) {
    const g = new THREE.Group(); g.name = 'RustTrap'; g.position.set(x, 0, z); g.rotation.y = yaw; parent.add(g);
    const sph = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const drops = Array.from({length: RUST.drops}, () => { const m = new THREE.Mesh(sph, mk(0x9ab0b8, 0)); m.scale.set(.03, .02, .02); g.add(m); return m; });
    const flecks = Array.from({length: RUST.flecks}, () => { const m = new THREE.Mesh(sph, mk(0xb4531c, 0)); m.scale.setScalar(.022); g.add(m); return m; });
    live.push({g, geos: [sph], mats, drops, flecks, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.drops.forEach((m, i) => { const p = dropPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    e.flecks.forEach((m, i) => { const p = fleckPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < RUST.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z, yaw = 0) { if (isRustTrapMessage(text)) { if (pending) add(pending.x, pending.z, pending.yaw); pending = {x, z, yaw, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z, pending.yaw); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z, pending.yaw); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

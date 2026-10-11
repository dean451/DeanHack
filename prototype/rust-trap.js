// "A gush of water hits you on the head!" / "... your left arm!" / "... your right arm!" / "... you!"
// The rust trap's trigger moment. A hard jet of water bursts up out of the trap's vent under the hero
// and strikes where the message says: the head, either arm, or the body. It bursts there into a spray
// of streaking drops that arc out and rain down onto a dark wet patch spreading across the floor,
// which then dries. A few flecks of orange rust drift down off the hero's gear after it. Over in
// about a second and three quarters.
//
// live.js calls message(text, x, z, yaw) with every engine message (x, z the hero's last known
// square, yaw the hero's facing), settle(x, z) each frame with the hero's new square, which is the
// trap's, update(dt) every frame and clear() on a level change. Poses are functions of t and end
// exactly at rest (nothing showing).

import {clamp01, smooth} from './fx-textures.js';

export const RUST = {jet: .3, drops: 22, flecks: 5, total: 1.75, gravity: 6.5};
export const PENDING_WAIT = .3;
// Only the hero's own soaking: monsters get "hits the ...".
export const isRustTrapMessage = text => /a gush of water hits (you|your)\b/i.test(text || '');

// Where the jet strikes, in the hero's frame (x to the hero's right): head, left arm, right arm, body.
export function strikePoint(text = '') {
  if (/on the head|hits your head/i.test(text)) return {x: 0, y: 1.55, z: .02, part: 'head'};
  if (/left/i.test(text)) return {x: -.24, y: 1.05, z: .04, part: 'left arm'};
  if (/right/i.test(text)) return {x: .24, y: 1.05, z: .04, part: 'right arm'};
  return {x: 0, y: 1.1, z: .1, part: 'body'};
}

// The jet: a column from the vent (y 0) up to the strike. It shoots up over .08s, holds hard and
// shivering, then thins and falls away. Returns its top height (0..1 of the strike), width and alpha.
export function jetPose(t) {
  if (t <= 0 || t >= RUST.jet) return {reach: 0, width: 0, alpha: 0};
  const rise = smooth(t / .08), fade = 1 - smooth((t - .18) / .12);
  return {reach: rise, width: (.045 + .01 * Math.sin(t * 90)) * (.4 + .6 * fade), alpha: .75 * fade};
}

// Spray drop i: bursts from the strike point once the jet arrives, arcs out under gravity, and is
// gone when it reaches the floor. Each drop gets its own direction and speed from i.
export function dropPose(i, t, strike = {x: 0, y: 1.1, z: 0}) {
  const t0 = .08 + (i % 4) * .02, s = t - t0;
  if (s <= 0 || t >= RUST.total) return {x: 0, y: 0, z: 0, alpha: 0, vx: 0, vy: 0, vz: 0};
  const a = i * 2.39996, up = .4 + ((i * 37) % 11) / 11 * 1.4, out = .6 + ((i * 53) % 7) / 7 * .9;
  const vx = Math.cos(a) * out, vz = Math.sin(a) * out, vy0 = up;
  const y = strike.y + vy0 * s - RUST.gravity * s * s / 2;
  if (y <= .01) return {x: 0, y: 0, z: 0, alpha: 0, vx: 0, vy: 0, vz: 0};
  return {x: strike.x + vx * s, y, z: strike.z + vz * s, alpha: .85, vx, vy: vy0 - RUST.gravity * s, vz};
}

// The wet patch on the floor: spreads as the spray lands, then dries back. Radius and darkness.
export function puddlePose(t) {
  if (t <= .15 || t >= RUST.total) return {radius: 0, alpha: 0};
  const grow = smooth((t - .15) / .45), dry = 1 - smooth((t - 1.0) / (RUST.total - 1.0));
  return {radius: .12 + .3 * grow, alpha: .55 * grow * dry};
}

// Rust fleck i: shaken off the hero's gear after the hit, sinking slowly with a little sway.
export function fleckPose(i, t, strike = {x: 0, y: 1.1, z: 0}) {
  const s = t - .35 - i * .05;
  if (s <= 0 || t >= RUST.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const u = s / (RUST.total - .35), a = i * 2.4 + .7;
  const y = strike.y - .1 - u * (strike.y - .1) * .9;
  return {x: strike.x + Math.cos(a) * (.08 + .1 * u) + .02 * Math.sin(u * 9 + i), y: Math.max(.03, y), z: strike.z + Math.sin(a) * (.08 + .1 * u),
    alpha: .9 * clamp01(s / .08) * (1 - clamp01((u - .7) / .3))};
}

export function createRustTrap(THREE, parent) {
  const live = []; let pending = null;
  const water = 0xb8d8e8;
  function add(x, z, yaw, text) {
    const strike = strikePoint(text);
    const g = new THREE.Group(); g.name = 'RustTrap'; g.position.set(x, 0, z); g.rotation.y = yaw; parent.add(g);
    const mats = [], geos = [];
    const mk = (color, opts = {}) => { const m = new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, ...opts}); mats.push(m); return m; };
    // the jet: an open tapered column, its base on the vent, scaled up to the strike
    const jetGeo = new THREE.CylinderGeometry(.6, 1, 1, 10, 1, true).translate(0, .5, 0); geos.push(jetGeo);
    const jet = new THREE.Mesh(jetGeo, mk(new THREE.Color(water).multiplyScalar(1.4), {side: THREE.DoubleSide, blending: THREE.AdditiveBlending}));
    jet.position.set(strike.x * .6, 0, strike.z * .6); g.add(jet);
    // the spray: drops stretched along their flight so they read as streaks of water, not beads
    const dropGeo = new THREE.SphereGeometry(1, 8, 6); geos.push(dropGeo);
    const drops = Array.from({length: RUST.drops}, () => { const m = new THREE.Mesh(dropGeo, mk(water)); g.add(m); return m; });
    // the wet patch, darkening the floor under the hero
    const patchGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2); geos.push(patchGeo);
    const patch = new THREE.Mesh(patchGeo, mk(0x0a1418)); patch.position.y = .006; patch.renderOrder = 2; g.add(patch);
    const flecks = Array.from({length: RUST.flecks}, () => { const m = new THREE.Mesh(dropGeo, mk(0xb4531c)); m.scale.setScalar(.018); g.add(m); return m; });
    live.push({g, geos, mats, jet, drops, patch, flecks, strike, t: 0});
  }
  const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function step(e, dt) {
    e.t += dt;
    const j = jetPose(e.t), h = Math.max(.01, e.strike.y * j.reach);
    e.jet.visible = j.alpha > .01; e.jet.scale.set(j.width, h, j.width); e.jet.material.opacity = j.alpha;
    e.drops.forEach((m, i) => {
      const p = dropPose(i, e.t, e.strike); m.visible = p.alpha > .01;
      if (!m.visible) return;
      m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha;
      dir.set(p.vx, p.vy, p.vz); const speed = dir.length();
      if (speed > 1e-4) m.quaternion.setFromUnitVectors(up, dir.multiplyScalar(1 / speed));
      m.scale.set(.012, .012 + .018 * Math.min(1, speed / 3), .012);
    });
    const q = puddlePose(e.t); e.patch.visible = q.alpha > .01; e.patch.scale.setScalar(Math.max(.001, q.radius)); e.patch.material.opacity = q.alpha;
    e.flecks.forEach((m, i) => { const p = fleckPose(i, e.t, e.strike); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < RUST.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z, yaw = 0) { if (isRustTrapMessage(text)) { if (pending) add(pending.x, pending.z, pending.yaw, pending.text); pending = {x, z, yaw, text, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z, pending.yaw, pending.text); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z, pending.yaw, pending.text); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}

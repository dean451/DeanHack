// The spheres' pulse (creature animation queue item 7). Spheres and gas spores live to blow up
// in your face, so each one throbs like a fuse burning down: a heartbeat in its core that
// quickens as the hero comes near (within RANGE tiles), racing when they're next to it.
//  - Gas spore: the puffball breathes, a slow swell and sag, and a few spores drift out of the
//    pore on top. A surge is a heave: it bloats, trembles and puffs a cloud of spores.
//  - Flaming sphere: the white-hot core beats and the flames lean and roll slowly round it,
//    shedding embers. A surge is a flare: it swells, shivers and throws a spray of embers.
//  - Freezing sphere: the crystal cage turns slowly while the core beats, and frost motes sink
//    off it to the floor. A surge is a bloom: it swells, the core glares and frost pours off.
//  - Shocking sphere: it twitches to new angles in jerks between beats, crackling sparks out of
//    its spikes. A surge is a charge: it swells and shudders, then sparks burst off it.
//  - An attack swells it up hard, blazing (it is about to burst); a hit squashes it and dims the
//    core. On death everything eases back to rest and the particles run out (deaths.js pops it).
//
// Matched on the model's `sphere` and `orb` (spheres.js and creatures.js' shockingSphere). It
// owns the orb's rotation and scale, written absolutely from the rest pose every frame, and the
// core's glow (its material is cloned per sphere, and live.js leaves a core alone once this has
// claimed it). live.js writes the hover bob on the body. One points cloud per sphere.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero range (tiles) and the heartbeat rate (beats/s) far away and right next to it.
export const RANGE = 5, NEAR = 1.5, BEAT_SLOW = .7, BEAT_FAST = 2.4;
// Surges: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; SURGE_LEN s long.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5, SURGE_LEN = 2.2;
// How much a beat, a surge and an attack swell the orb; how much a hit squashes it.
export const BEAT_SWELL = .05, SURGE_SWELL = .16, ATTACK_SWELL = .32, SQUASH = .16, HIT_LEN = .5;
// The core's glow: at rest (what live.js used to pulse round), per beat, in a surge and an attack.
export const CORE_BASE = 4.5, CORE_BEAT = 3, CORE_SURGE = 3.5, CORE_ATTACK = 7;
export const MOTES = 24, MOTE_SIZE = .045, REST_RATE = 3;
const SNAP = 1e-3, FLOOR = .015, CENTRE = .58;

// Per kind: spin (rad/s), how fast particles spawn (per s) at rest and in a surge, life (s), colour.
export const KINDS = {
  gas: {spin: 0, rate: .8, surgeRate: 16, life: 2.4, color: [.8, .78, .55], glow: false},
  fire: {spin: .3, rate: 8, surgeRate: 34, life: .9, color: [1, .55, .15], glow: true},
  frost: {spin: .25, rate: 4, surgeRate: 22, life: 1.7, color: [.82, .94, 1], glow: false},
  shock: {spin: 0, rate: 6, surgeRate: 36, life: .28, color: [.7, .93, 1], glow: true},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const pulses = a => !!(a && !a.asset && KINDS[a.sphere] && a.orb && a.body);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The heartbeat at phase p (0..1, wraps): a strong beat then a softer echo, 0..1, smooth across
// the wrap.
export function beatAt(p) {
  p -= Math.floor(p);
  const bump = (c, w) => { let d = Math.abs(p - c); d = Math.min(d, 1 - d); return Math.exp(-((d / w) ** 2)); };
  return Math.min(1, bump(.06, .055) + .6 * bump(.27, .05));
}
// The surge's strength at progress u (0..1): eases in, holds, lets go fast; 0 outside.
export function surgeAt(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .4) * (1 - smooth((u - .78) / .22));
}

// ---- shared resources (built once) ----
let shared = null;
function softTexture() {
  const n = 16, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const d = Math.hypot((i + .5) / n * 2 - 1, (j + .5) / n * 2 - 1), k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - d) ** 1.5 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  if (shared) return shared;
  const map = softTexture(), base = {size: MOTE_SIZE, map, vertexColors: true, transparent: true, depthWrite: false};
  return shared = {soft: new THREE.PointsMaterial(base), glow: new THREE.PointsMaterial({...base, blending: THREE.AdditiveBlending})};
}

function setup(a) {
  const R = sharedResources(), K = KINDS[a.sphere], o = a.orb;
  const st = {seed: ((a.g?.id ?? 1) * 48271) % 2147483647 || 1, t: 0, life: 1, beat: 0, surge: null, wait: 0, near: 0,
    hit: -1, lastHit: null, flash: 0, spin: 0, twitch: {yaw: 0, to: 0, x: 0, z: 0, cx: 0, cz: 0, wait: 0}, owed: 0,
    rest: {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z, s: o.scale.clone()},
    motes: Array.from({length: MOTES}, () => ({age: 1, life: 1, p: new THREE.Vector3(), v: new THREE.Vector3()}))};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st);
  // the core's material is shared between spheres of a kind; give this one its own so its beat is its own
  if (a.core?.material) { a.core.material = a.core.material.clone(); a.core.material.emissiveIntensity = CORE_BASE; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MOTES * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .6, 0), 1.2);
  st.cloud = new THREE.Points(geo, K.glow ? R.glow : R.soft);
  st.cloud.userData.part = 'sphereMotes'; st.cloud.frustumCulled = false; st.cloud.castShadow = st.cloud.receiveShadow = false;
  a.g.add(st.cloud);
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// How close the hero is: 0 at RANGE tiles or further, 1 within NEAR.
function nearness(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return 0;
  const d = Math.hypot(look.x - g.position.x, look.z - g.position.z);
  return 1 - smooth((d - NEAR) / (RANGE - NEAR));
}

// Start one particle (in the sphere's own space, before g's scale; the orb's centre is at y CENTRE).
function spawn(st, kind, m, kick) {
  const r = () => rand(st), K = KINDS[kind];
  m.age = 0; m.life = K.life * (.7 + .6 * r());
  const a = r() * TAU;
  if (kind === 'gas') {
    // out of the pore on top, puffing up and spreading, then drifting down
    m.p.set((r() - .5) * .04, CENTRE + .21, (r() - .5) * .04);
    m.v.set(Math.cos(a) * (.05 + .12 * kick), .12 + .1 * r() + .25 * kick, Math.sin(a) * (.05 + .12 * kick));
  } else if (kind === 'fire') {
    // embers off the flames
    const rr = .08 + .12 * r();
    m.p.set(Math.cos(a) * rr, CENTRE + .1 + .12 * r(), Math.sin(a) * rr);
    m.v.set(Math.cos(a) * .12 * (1 + 2 * kick), .35 + .35 * r() + .4 * kick, Math.sin(a) * .12 * (1 + 2 * kick));
  } else if (kind === 'frost') {
    // motes off the crystal tips, sinking
    const y = r() * 2 - 1, s = Math.sqrt(1 - y * y), rr = .22 + .1 * r();
    m.p.set(Math.cos(a) * s * rr, CENTRE + y * rr, Math.sin(a) * s * rr);
    m.v.set(Math.cos(a) * s * .1 * (1 + 2 * kick), -.05 - .1 * r(), Math.sin(a) * s * .1 * (1 + 2 * kick));
  } else {
    // sparks snapping out off the spikes
    const y = r() * 1.6 - .8, s = Math.sqrt(1 - y * y), sp = 1.2 + 1.2 * r() + kick;
    m.p.set(Math.cos(a) * s * .3, CENTRE + y * .3, Math.sin(a) * s * .3);
    m.v.set(Math.cos(a) * s * sp, y * sp, Math.sin(a) * s * sp);
  }
}

function stepMotes(st, kind, dt, rate, alive, kick) {
  const K = KINDS[kind], pos = st.cloud.geometry.attributes.position, col = st.cloud.geometry.attributes.color;
  st.owed = alive ? Math.min(st.owed + rate * dt, MOTES) : 0;
  for (const m of st.motes) {
    if (st.owed < 1) break;
    if (m.age < m.life) continue;
    spawn(st, kind, m, kick); st.owed--;
  }
  st.owed = Math.min(st.owed, 2);
  for (let i = 0; i < MOTES; i++) {
    const m = st.motes[i];
    let alpha = 0;
    if (m.age < m.life) {
      m.age += dt;
      if (kind === 'gas') { m.v.multiplyScalar(Math.exp(-1.5 * dt)); m.v.y -= .06 * dt; m.v.x += Math.sin(m.age * 2 + i) * .03 * dt; }
      else if (kind === 'fire') { m.v.x += Math.sin(m.age * 9 + i) * .4 * dt; m.v.y *= Math.exp(-1.2 * dt); }
      else if (kind === 'frost') { m.v.x *= Math.exp(-2 * dt); m.v.z *= Math.exp(-2 * dt); m.v.y -= .25 * dt; }
      else m.v.multiplyScalar(Math.exp(-6 * dt));
      m.p.addScaledVector(m.v, dt);
      if (m.p.y < FLOOR) { m.p.y = FLOOR; m.v.set(0, 0, 0); m.age = Math.max(m.age, m.life - .3); }
      const u = m.age / m.life;
      alpha = u >= 1 ? 0 : smooth(u / (kind === 'shock' ? .02 : .12)) * (1 - smooth((u - .55) / .45)) * (kind === 'gas' ? .7 : .95);
      // sparks flicker
      if (kind === 'shock') alpha *= .55 + .45 * Math.sin(m.age * 90 + i * 2.3) ** 2;
    }
    pos.setXYZ(i, m.p.x, m.p.y, m.p.z);
    // embers cool from yellow to red as they rise
    const c = K.color, cool = kind === 'fire' ? clamp01(m.age / m.life) : 0;
    col.setXYZW(i, c[0], c[1] * (1 - .7 * cool) + .3 * (1 - cool), c[2] * (1 - cool), alpha);
  }
  pos.needsUpdate = col.needsUpdate = true;
}

// Call once a frame (fidget.js does). `busy` holds off a surge while it moves or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateSpherePulse(a, dt, t, busy, look = null) {
  if (!pulses(a)) return null;
  const kind = a.sphere, K = KINDS[kind], o = a.orb;
  const st = a.spherePulse || (a.spherePulse = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow squashes it and knocks the beat out of it for a moment
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.hit = 0; st.surge = null; st.owed = Math.min(MOTES, st.owed + 6); }
  if (st.hit >= 0) { st.hit += dt / HIT_LEN; if (st.hit >= 1) st.hit = -1; }
  const squash = st.hit < 0 ? 0 : Math.sin(Math.min(1, st.hit * 4) * Math.PI / 2) * (1 - smooth((st.hit - .2) / .8));

  // the attack: it swells up hard, blazing, about to burst
  const atk = dead ? null : current(a, 'attack');
  if (atk) st.surge = null;
  const au = atk ? a.actions.u ?? 0 : 0, swell = atk ? smooth(au / .45) * (1 - smooth((au - .7) / .3)) : 0;

  // surges on their own clock, only while it holds still; each ends in a release of particles
  if (st.surge != null) {
    const was = st.surge;
    st.surge += dt / SURGE_LEN;
    if (was < .8 && st.surge >= .8) { st.flash = 1; st.owed = Math.min(MOTES, st.owed + 10); }
    if (st.surge >= 1) st.surge = null;
  } else if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) { st.surge = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (dead) st.surge = null;
  // eased, so a blow or an attack cutting a surge short lets it go fast rather than in one frame
  st.s = approach(st.s ?? 0, surgeAt(st.surge ?? 0), 14, dt);
  const s = st.s, kick = Math.max(s, swell, squash);
  st.flash = approach(st.flash, 0, 7, dt);

  // the heartbeat quickens as the hero comes near, and races in a surge
  st.near = approach(st.near, dead ? 0 : nearness(a, look), 2, dt);
  const rate = (BEAT_SLOW + (BEAT_FAST - BEAT_SLOW) * st.near) * (1 + .8 * s) * (1 - .6 * squash);
  st.beat = (st.beat + rate * dt) % 1;
  // the gas spore breathes (a smooth swell and sag) rather than beating
  const b = kind === 'gas' ? .5 - .5 * Math.cos(TAU * (st.beat + st.ph)) : beatAt(st.beat + st.ph);

  // the orb's swell: beat, surge (with a tremble) and attack; a hit squashes it flat
  const tremble = .022 * s * Math.sin(T * 47) + .03 * swell * Math.sin(T * 61);
  const grow = (kind === 'gas' ? 1.4 : 1) * BEAT_SWELL * b + SURGE_SWELL * s + ATTACK_SWELL * swell + tremble;
  const sy = 1 + (grow - SQUASH * squash) * w, sxz = 1 + (grow + .5 * SQUASH * squash) * w;
  o.scale.set(st.rest.s.x * sxz, st.rest.s.y * sy, st.rest.s.z * sxz);

  // its turn: a slow roll for fire and frost, a lazy wobble for the spore, jerks for the shock
  st.spin = dead ? approach(wrap(st.spin), 0, REST_RATE, dt) : st.spin + K.spin * (1 + 2 * kick) * dt;
  let rx = 0, ry = wrap(st.spin), rz = 0;
  if (kind === 'gas') { rx = .07 * Math.sin(T * .7 + st.ph * TAU); rz = .08 * Math.sin(T * .53 + st.ph * 9); }
  else if (kind === 'fire') { rx = .06 * Math.sin(T * 1.1 + st.ph * TAU); rz = .06 * Math.sin(T * .8 + st.ph * 7); }
  else if (kind === 'frost') { rx = .04 * Math.sin(T * .4 + st.ph * TAU); }
  else {
    const tw = st.twitch;
    tw.wait -= dt * (1 + 2 * kick + st.near);
    if (tw.wait <= 0 && !dead) {
      tw.to = wrap(tw.to + (rand(st) < .5 ? -1 : 1) * (.3 + .6 * rand(st)));
      tw.x = (rand(st) - .5) * .3; tw.z = (rand(st) - .5) * .3;
      tw.wait = .3 + .9 * rand(st); st.owed = Math.min(MOTES, st.owed + 2);
    }
    if (dead) tw.to = tw.x = tw.z = 0;
    // snap to each new angle fast, then hold dead still till the next jerk
    const k = Math.exp(-22 * dt);
    tw.yaw = tw.to + wrap(tw.yaw - tw.to) * k; tw.cx = tw.x + (tw.cx - tw.x) * k; tw.cz = tw.z + (tw.cz - tw.z) * k;
    ry = tw.yaw; rx = tw.cx + .04 * kick * Math.sin(T * 53); rz = tw.cz + .04 * kick * Math.sin(T * 41);
  }
  o.rotation.set(st.rest.x + rx * w, st.rest.y + ry * w, st.rest.z + rz * w);

  // the core's glow follows the beat; a hit dims it, a surge and an attack blaze it
  if (a.core?.material) {
    const glow = CORE_BEAT * (b - .35) + CORE_SURGE * (s + st.flash) + CORE_ATTACK * swell - 2.5 * squash;
    a.core.material.emissiveIntensity = Math.max(.5, CORE_BASE + glow * w);
  }

  stepMotes(st, kind, dt, (K.rate + (K.surgeRate - K.rate) * kick) * (1 + st.near), !dead, kick);
  return st;
}

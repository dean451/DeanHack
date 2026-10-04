// The ghosts' drift (creature animation queue item 7). Ghosts and shades are the sheeted dead
// (ghost.js), so their idle is a slow, cold glide rather than anything lively:
//  - The shroud sways as it floats, leaning a little into its glide, and its edges smoke: thin
//    wisps peel off the ragged hem and the sleeve cuffs and trail back and up, spreading as they
//    fade. A ghost's smoke is pale; a shade's is a dim violet murk.
//  - The empty sleeves hang limp and stir out of step with each other, and the hooded head tilts
//    slowly side to side in sorrow. When the hero is within RANGE tiles the head turns after them.
//  - Now and then it drains: the body turns toward the hero and leans in, both sleeves
//    lift and reach, the pinpoint eyes flare, and pale motes of warmth are drawn out of the air in
//    front of it and stream into the cuffs. Then it shudders and settles.
//  - When it attacks (a touch), it first draws itself back and up like a held breath (sleeves
//    pulled in, head sunk, leaning away), then both sleeves lunge forward, the head juts, and a
//    puff of smoke is flung ahead.
//  - On death everything eases back to rest and the smoke thins to nothing.
//
// The module owns the body's rotation, the head's rotation, both arms' rotation and the eyes'
// scale (it writes them absolutely from the rest pose every frame; actions.js adds its attack
// offsets afterwards and takes them off at the start of the next frame). Two point clouds on the body (smoke and motes),
// with shared materials: two extra draws per ghost.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// The glide: body roll and lean amplitude (rad) and rate (Hz); the head's sorrowful tilt.
export const ROLL = .05, LEAN = .05, SWAY_HZ = .23, TILT = .14, TILT_HZ = .13;
// The sleeves' limp stir (rad) and rate (Hz).
export const STIR = .12, STIR_HZ = .41;
// Hero tracking: range (tiles, in the actor's parent space) and how far the head (and, during a
// drain, the body) may turn; how fast they follow (1/s).
export const RANGE = 6, HEAD_YAW = .75, BODY_YAW = 1.1, FOLLOW = 2.2;
// A drain: first after FIRST_MIN..+FIRST_SPAN s idle, then GAP_MIN..+GAP_SPAN apart; DRAIN_LEN s.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 6, GAP_SPAN = 5, DRAIN_LEN = 4.2;
// The drain's pose: sleeve lift (rad, negative = up and forward), lean, eye flare.
export const REACH = -.42, DRAIN_LEAN = .2, FLARE = 1.1;
// The attack lunge: sleeves, head, lean. Before it, the held breath: sleeves drawn in, head sunk,
// lean back (rad).
export const LUNGE = -.6, JUT = .25, LUNGE_LEAN = .18;
export const RECOIL = .3, RECOIL_SINK = -.12, RECOIL_LEAN = -.1;
// Smoke and motes.
export const SMOKE = 26, SMOKE_LEN = 2.6, SMOKE_ALPHA = .5, MOTES = 14, MOTE_ALPHA = .85, PUFF = 10, PUFF_LIFE = .8;
// How fast the motion eases out after death (1/s).
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// The cuff, in arm space (ghost.js: the sleeve hangs to y -.3).
const CUFF = new THREE.Vector3(0, -.3, 0);
const LOOKS = {ghost: {smoke: [.78, .82, .92], mote: [.75, .88, 1]}, shade: {smoke: [.2, .16, .28], mote: [.72, .58, 1]}};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const drifts = a => !!(a && !a.asset && a.body && a.head && a.ghost && Array.isArray(a.arms) && a.arms.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The drain at progress u (0..1): {reach, lean, flare, draw, shudder}. It turns and leans in
// (to .25), reaches and draws the motes in (.2–.75), then shudders and settles.
export function drainPose(u) {
  if (!(u > 0) || !(u < 1)) return {reach: 0, lean: 0, flare: 0, draw: 0, shudder: 0};
  const reach = smooth(u / .25) * (1 - smooth((u - .75) / .25));
  const flare = smooth((u - .2) / .2) * (1 - smooth((u - .7) / .15));
  const draw = smooth((u - .15) / .1) * (1 - smooth((u - .72) / .08));
  const shudder = smooth((u - .7) / .06) * (1 - smooth((u - .78) / .2));
  return {reach, lean: reach, flare, draw, shudder};
}

// The held breath at action phase u (0..1): drawn back over the first tenth, held, then let go as
// the lunge starts. Zero by u .2.
export function recoilPose(u) {
  if (!(u > 0) || !(u < .2)) return 0;
  return smooth(u / .08) * (1 - smooth((u - .1) / .1));
}

// The attack lunge at action phase u (0..1): the breath, then quick out, hold, back.
export function lungePose(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return u < .3 ? smooth((u - .1) / .2) : 1 - smooth((u - .5) / .5);
}

// ---- shared resources (built once) ----
let shared = null;
function softTexture() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y);
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - d) ** 2 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  if (shared) return shared;
  const map = softTexture();
  return shared = {
    smokeMat: new THREE.PointsMaterial({size: .13, map, vertexColors: true, transparent: true, depthWrite: false}),
    moteMat: new THREE.PointsMaterial({size: .05, map, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
  };
}

function cloud(a, n, mat, part) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .6, 0), 1.8);
  const p = new THREE.Points(geo, mat);
  p.userData.part = part; p.frustumCulled = false; p.castShadow = p.receiveShadow = false;
  a.body.add(p);
  return p;
}

function setup(a) {
  const R = sharedResources();
  const st = {seed: ((a.g?.id ?? 1) * 69621) % 2147483647 || 1, t: 0, life: 1, drain: null, wait: 0,
    look: LOOKS[a.ghost] || LOOKS.ghost, aim: 0, turn: 0, puff: [], lastAttack: null,
    body: {y: a.body.rotation.y, x: a.body.rotation.x, z: a.body.rotation.z},
    head: {x: a.head.rotation.x, y: a.head.rotation.y, z: a.head.rotation.z},
    arms: a.arms.map(m => ({x: m.rotation.x, z: m.rotation.z})),
    eyes: a.head.children.find(c => c.userData?.part === 'eyes') || null};
  st.eyeScale = st.eyes ? st.eyes.scale.clone() : null;
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.smoke = cloud(a, SMOKE + PUFF, R.smokeMat, 'ghostSmoke');
  st.motes = cloud(a, MOTES, R.moteMat, 'ghostMotes');
  // a wisp peels off the hem (most) or a cuff, and trails back and up as it spreads and fades
  st.wisps = Array.from({length: SMOKE}, (_, i) => ({off: i / SMOKE + rand(st) * .04, len: SMOKE_LEN * (.75 + rand(st) * .5),
    cuff: rand(st) < .25 ? (rand(st) < .5 ? 0 : 1) : -1, th: rand(st) * TAU, wob: .6 + rand(st) * .8}));
  // the motes start in a loose cloud in front of it, at different depths and heights
  st.drawn = Array.from({length: MOTES}, (_, i) => ({x: (rand(st) - .5) * .9, y: .3 + rand(st) * .8, z: .7 + rand(st) * .6,
    lag: rand(st) * .25, arm: i % 2, spin: (rand(st) - .5) * 4}));
  return st;
}

const tmpE = new THREE.Euler();
function cuffPoint(arm, out) {
  return out.copy(CUFF).applyEuler(tmpE.set(arm.rotation.x, arm.rotation.y, arm.rotation.z)).add(arm.position);
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to the ghost's facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}

// Call once a frame (fidget.js does). `busy` holds off a drain while it walks or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateGhostDrift(a, dt, t, busy, look = null) {
  if (!drifts(a)) return null;
  const st = a.ghostDrift || (a.ghostDrift = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // drains on their own clock
  if (st.drain) { st.drain.u += dt / DRAIN_LEN; if (st.drain.u >= 1) st.drain = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.drain = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const dp = drainPose(st.drain ? st.drain.u : 0);

  // an attack: both sleeves lunge, the head juts, smoke is flung ahead
  const atk = dead ? null : current(a, 'attack');
  const lu = atk ? lungePose(a.actions.u ?? 0) * w : 0, rc = atk ? recoilPose(a.actions.u ?? 0) * w : 0;
  if (atk && atk !== st.lastAttack) {
    st.lastAttack = atk;
    st.drain = null;
    st.puff.length = 0;
    for (let i = 0; i < PUFF; i++) st.puff.push({x: (rand(st) - .5) * .3, y: .55 + rand(st) * .35, z: .25, vx: (rand(st) - .5) * .4,
      vy: (rand(st) - .3) * .3, vz: 1 + rand(st) * .6, age: -rand(st) * .12, life: PUFF_LIFE * (.7 + rand(st) * .5)});
  }

  // following the hero: the head always (in range), the body only while draining
  const b = dead ? null : bearing(a, look);
  st.aim = approach(st.aim, b == null ? 0 : b, FOLLOW, dt);
  st.turn = approach(st.turn, b == null ? 0 : clamp(b, BODY_YAW) * dp.reach, FOLLOW, dt);
  const turn = st.turn * w, headYaw = clamp(st.aim - turn, HEAD_YAW) * w;

  const reach = dp.reach * w, shud = dp.shudder * w * Math.sin(T * 41) * .04;
  a.body.rotation.y = st.body.y + turn;
  a.body.rotation.z = st.body.z + (ROLL * Math.sin(T * SWAY_HZ * TAU + ph) + shud) * w * (1 - .6 * reach);
  a.body.rotation.x = st.body.x + (LEAN * (.6 + .4 * Math.sin(T * SWAY_HZ * TAU * .7 + ph + 1)) + DRAIN_LEAN * reach + LUNGE_LEAN * lu + RECOIL_LEAN * rc) * w;
  a.head.rotation.x = st.head.x + (.12 * reach + JUT * lu + RECOIL_SINK * rc) * w;
  a.head.rotation.y = st.head.y + headYaw;
  a.head.rotation.z = st.head.z + TILT * Math.sin(T * TILT_HZ * TAU + ph * 1.7) * w * (1 - reach) + shud * 2;
  a.arms.forEach((arm, i) => {
    const r = st.arms[i], s = i ? 1 : -1;
    const stir = STIR * Math.sin(T * STIR_HZ * TAU + ph + i * 2.3) * (1 - reach) * (1 - lu);
    arm.rotation.x = r.x + (stir + REACH * reach + LUNGE * lu + RECOIL * rc) * w;
    arm.rotation.z = r.z + s * (.05 * Math.sin(T * STIR_HZ * TAU * .8 + ph + i) - .12 * reach) * w;
  });
  if (st.eyes && st.eyeScale) {
    const s = 1 + (.12 * Math.sin(T * 1.7 + ph) * Math.sin(T * .9) + FLARE * dp.flare + .5 * lu) * w;
    st.eyes.scale.copy(st.eyeScale).multiplyScalar(s);
  }

  // smoke edges: wisps off the hem and the cuffs, trailing back (-z) and up, spreading as they fade
  const C = st.look.smoke, pos = st.smoke.geometry.attributes.position, col = st.smoke.geometry.attributes.color;
  const cuffs = st.cuffs || (st.cuffs = [new THREE.Vector3(), new THREE.Vector3()]);
  a.arms.forEach((arm, i) => cuffPoint(arm, cuffs[i]));
  st.wisps.forEach((m, i) => {
    const u = ((T / m.len) + m.off) % 1;
    let x, y, z;
    if (m.cuff >= 0) {
      const c = cuffs[m.cuff];
      x = c.x + .04 * Math.sin(m.th + u * 3); y = c.y + .22 * u; z = c.z - .25 * u;
    } else {
      const r = .2 + .12 * u, ang = m.th + .6 * u * m.wob;
      x = Math.sin(ang) * r + .03 * Math.sin(T * 1.1 * m.wob + i);
      y = .14 + .2 * u ** 1.3;
      z = Math.cos(ang) * r - .12 - .35 * u;
    }
    const alpha = SMOKE_ALPHA * smooth(u / .15) * (1 - u) ** 1.3 * w;
    pos.setXYZ(i, x, y, z); col.setXYZW(i, C[0], C[1], C[2], alpha);
  });
  // the attack's puff, flung forward (+z, the way it faces)
  for (let i = 0; i < PUFF; i++) {
    const p = st.puff[i], j = SMOKE + i;
    if (p) p.age += dt;
    if (!p || p.age >= p.life || p.age < 0) { pos.setXYZ(j, 0, .6, 0); col.setXYZW(j, 0, 0, 0, 0); continue; }
    const drag = Math.exp(-2.5 * dt);
    p.vx *= drag; p.vy *= drag; p.vz *= drag;
    p.x += p.vx * dt; p.y = Math.max(.05, p.y + p.vy * dt); p.z += p.vz * dt;
    const u = clamp01(p.age / p.life);
    pos.setXYZ(j, p.x, p.y, p.z); col.setXYZW(j, C[0], C[1], C[2], SMOKE_ALPHA * 1.2 * smooth(u / .1) * (1 - u) ** 1.2 * w);
  }
  if (dead && w === 0) st.puff.length = 0;
  pos.needsUpdate = col.needsUpdate = true;

  // the drained motes: drawn out of the air ahead and into the cuffs, brightening as they go
  const M = st.look.mote, mp = st.motes.geometry.attributes.position, mc = st.motes.geometry.attributes.color;
  const du = st.drain ? st.drain.u : 0;
  st.drawn.forEach((m, i) => {
    const k = st.drain ? clamp01((du - .18 - m.lag) / .45) : 0;
    const c = cuffs[m.arm], e = k * k * k, sw = (1 - e) * .08;
    const x = m.x + (c.x - m.x) * e + sw * Math.sin(T * 2 + m.spin * k + i);
    const y = m.y + (c.y - m.y) * e + sw * Math.cos(T * 1.7 + i);
    const z = m.z + (c.z - m.z) * e;
    const alpha = k > 0 && k < 1 ? MOTE_ALPHA * smooth(k / .2) * (.5 + .5 * k) * (1 - smooth((k - .85) / .15)) * dp.draw * w : 0;
    mp.setXYZ(i, x, y, z); mc.setXYZW(i, M[0], M[1], M[2], alpha);
  });
  mp.needsUpdate = mc.needsUpdate = true;
  return st;
}

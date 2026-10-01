// The wraiths' pull (creature animation queue item 7). Wraiths, barrow wights and Nazgul are the
// hungry dead (wraith() in creatures.js): where a ghost is sorrowful, these are predators, so the
// motion is jagged and watchful rather than limp:
//  - The shroud glides with a slow hunch and roll, and its trailing hem sheds smoke that sinks and
//    drags back behind it: grey-blue for a wraith, a thin grave dust for a barrow wight, a black
//    reek for a Nazgul.
//  - The claws are never still: each finger holds, then twitches to a new crook, out of step.
//  - The burning eyes flicker like embers, in small hard jumps.
//  - The head holds still, then snaps to the hero (within RANGE tiles); out of range it snaps
//    from one bearing to another, searching.
//  - Now and then it pulls: it rears back and turns square to the hero, flings its left claw out
//    with the fingers splayed, clenches it on the air, and drags it back to its chest while a
//    wavering thread of warm motes (the hero's life) is hauled out of the air ahead and into the
//    fist. The eyes blaze; it shudders with it, and settles.
//  - When it attacks, the right claw rakes and the left follows a beat behind, fingers clenching,
//    the head jutting, and a gust of its smoke is flung ahead.
//  - On death everything eases back to rest and the smoke thins to nothing.
//
// The module owns the body's rotation, the head's rotation, both arms' rotation, every claw
// knuckle's rotation and the eyes' scale (it writes them absolutely from the rest pose every
// frame; actions.js adds its attack offsets afterwards and takes them off next frame). Two point
// clouds on the body (smoke and motes), with shared materials: two extra draws per wraith.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// The glide: roll, hunch and yaw sway amplitudes (rad) and rate (Hz).
export const ROLL = .04, HUNCH = .08, SWAY = .06, GLIDE_HZ = .19;
// Hero tracking: range (tiles), head and body (during a pull) turn limits, and how hard the head
// snaps once it decides to look somewhere new (1/s). It holds HOLD_MIN..+HOLD_SPAN s between snaps.
export const RANGE = 7, HEAD_YAW = .8, BODY_YAW = 1.0, SNAP_RATE = 16, TURN_RATE = 3;
export const HOLD_MIN = .35, HOLD_SPAN = .9, SCAN = .55;
// The claws: each finger re-crooks every TWITCH_MIN..+TWITCH_SPAN s to a curl in CURL_LO..CURL_HI.
export const TWITCH_MIN = .25, TWITCH_SPAN = 1.3, CURL_LO = -.15, CURL_HI = .55, CURL_RATE = 22, CLENCH = .95, SPLAY = -.35;
// The eyes' ember flicker range, and the flare during a pull and an attack.
export const FLICKER = .14, FLARE = 1.2;
// A pull: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; PULL_LEN s long.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 6, GAP_SPAN = 5, PULL_LEN = 4.6;
// The pull's pose: the rear back, the fling of the left claw (rad), the drag to the chest, the hunch.
export const REAR = -.14, FLING = -.75, FLING_OUT = .35, DRAG = .25, PULL_HUNCH = .16;
// The attack: the rake of each arm and the head's jut.
export const RAKE = -.7, JUT = .25, RAKE_LEAN = .16;
// Smoke and motes.
export const SMOKE = 24, SMOKE_LEN = 2.4, MOTES = 18, MOTE_ALPHA = .9, PUFF = 10, PUFF_LIFE = .7;
// Where the thread starts, in body space (ahead of it, toward the hero once it has turned).
export const THREAD_FROM = new THREE.Vector3(0, .85, 1.35);
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// The fist, in arm space: the knuckles (wraith(): the sleeve ends at y -.32).
const FIST = new THREE.Vector3(0, -.36, .02);
export const LOOKS = {
  wraith: {smoke: [.55, .6, .7], alpha: .45, mote: [1, .78, .5]},
  'barrow wight': {smoke: [.42, .38, .28], alpha: .26, mote: [1, .84, .45]},
  nazgul: {smoke: [.05, .04, .07], alpha: .6, mote: [1, .62, .42]},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const pulls = a => !!(a && !a.asset && a.body && a.head && a.wraith && Array.isArray(a.arms) && a.arms.length === 2
  && Array.isArray(a.claws) && a.claws.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The pull at progress u (0..1): {rear, fling, clench, drag, draw, flare, shudder, turn}, all 0..1.
// It rears and turns (to .2), flings the claw out splayed (.1–.3), clenches (.3–.38), hauls the
// thread in (.35–.8), drags the fist back (.6–.85), then shudders and settles.
export function pullPose(u) {
  const z = {rear: 0, fling: 0, clench: 0, drag: 0, draw: 0, flare: 0, shudder: 0, turn: 0};
  if (!(u > 0) || !(u < 1)) return z;
  const out = 1 - smooth((u - .85) / .15);
  z.turn = smooth(u / .2) * out;
  z.rear = smooth(u / .15) * (1 - smooth((u - .25) / .15));
  z.fling = smooth((u - .1) / .2) * (1 - smooth((u - .6) / .25));
  z.clench = smooth((u - .3) / .08) * (1 - smooth((u - .86) / .1));
  z.drag = smooth((u - .6) / .25) * (1 - smooth((u - .87) / .13));
  z.draw = smooth((u - .35) / .05) * (1 - smooth((u - .8) / .06));
  z.flare = smooth((u - .3) / .15) * (1 - smooth((u - .82) / .15));
  z.shudder = smooth((u - .8) / .04) * (1 - smooth((u - .86) / .14));
  return z;
}

// The attack at action phase u (0..1): the right claw rakes, the left a beat behind.
export function rakePose(u) {
  if (!(u > 0) || !(u < 1)) return {right: 0, left: 0};
  const hit = v => v <= 0 || v >= 1 ? 0 : v < .3 ? smooth(v / .3) : 1 - smooth((v - .45) / .55);
  return {right: hit(u / .8), left: hit((u - .2) / .8)};
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
    smokeMat: new THREE.PointsMaterial({size: .14, map, vertexColors: true, transparent: true, depthWrite: false}),
    moteMat: new THREE.PointsMaterial({size: .055, map, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
  };
}

function cloud(a, n, mat, part) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .6, 0), 2);
  const p = new THREE.Points(geo, mat);
  p.userData.part = part; p.frustumCulled = false; p.castShadow = p.receiveShadow = false;
  a.body.add(p);
  return p;
}

function setup(a) {
  const R = sharedResources();
  const st = {seed: ((a.g?.id ?? 1) * 48271) % 2147483647 || 1, t: 0, life: 1, pull: null, wait: 0,
    look: LOOKS[a.wraith] || LOOKS.wraith, aim: 0, aimTo: 0, hold: 0, turn: 0, puff: [], lastAttack: null,
    body: {y: a.body.rotation.y, x: a.body.rotation.x, z: a.body.rotation.z},
    head: {x: a.head.rotation.x, y: a.head.rotation.y, z: a.head.rotation.z},
    arms: a.arms.map(m => ({x: m.rotation.x, z: m.rotation.z})),
    eyes: a.head.children.find(c => c.userData?.part === 'eyes') || null, eye: 1, eyeTo: 1, eyeHold: 0};
  st.eyeScale = st.eyes ? st.eyes.scale.clone() : null;
  st.fingers = a.claws.map(hand => hand.map(k => ({k, x: k.rotation.x, curl: 0, to: 0, hold: 0})));
  for (const hand of st.fingers) for (const f of hand) f.hold = rand(st) * TWITCH_SPAN;
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.smoke = cloud(a, SMOKE + PUFF, R.smokeMat, 'wraithSmoke');
  st.motes = cloud(a, MOTES, R.moteMat, 'wraithMotes');
  // a wisp leaves the hem and sinks as it drags back, spreading and fading
  st.wisps = Array.from({length: SMOKE}, (_, i) => ({off: i / SMOKE + rand(st) * .04, len: SMOKE_LEN * (.75 + rand(st) * .5),
    th: rand(st) * TAU, wob: .6 + rand(st) * .8}));
  // the thread: each mote sets out at its own moment and wavers on its way in
  st.thread = Array.from({length: MOTES}, (_, i) => ({lag: i / MOTES * .55 + rand(st) * .05, jit: rand(st) * TAU, sp: .7 + rand(st) * .6}));
  return st;
}

const tmpE = new THREE.Euler();
function fistPoint(arm, out) {
  return out.copy(FIST).applyEuler(tmpE.set(arm.rotation.x, arm.rotation.y, arm.rotation.z)).add(arm.position);
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to the wraith's facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}

// Call once a frame (fidget.js does). `busy` holds off a pull while it moves or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateWraithPull(a, dt, t, busy, look = null) {
  if (!pulls(a)) return null;
  const st = a.wraithPull || (a.wraithPull = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // pulls on their own clock
  if (st.pull) { st.pull.u += dt / PULL_LEN; if (st.pull.u >= 1) st.pull = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.pull = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const pp = pullPose(st.pull ? st.pull.u : 0);

  // an attack: the claws rake, the head juts, smoke gusts ahead
  const atk = dead ? null : current(a, 'attack');
  const rk = atk ? rakePose(a.actions.u ?? 0) : {right: 0, left: 0};
  const lu = Math.max(rk.right, rk.left) * w;
  if (atk && atk !== st.lastAttack) {
    st.lastAttack = atk;
    st.pull = null;
    st.puff.length = 0;
    for (let i = 0; i < PUFF; i++) st.puff.push({x: (rand(st) - .5) * .3, y: .5 + rand(st) * .4, z: .3, vx: (rand(st) - .5) * .5,
      vy: (rand(st) - .5) * .25, vz: 1.2 + rand(st) * .7, age: -rand(st) * .1, life: PUFF_LIFE * (.7 + rand(st) * .5)});
  }

  // the head: hold, then snap to the hero (or, out of range, to a new searching bearing)
  const b = dead ? null : bearing(a, look);
  st.hold -= dt;
  if (st.hold <= 0) {
    st.aimTo = b != null ? b : (rand(st) * 2 - 1) * SCAN;
    st.hold = HOLD_MIN + HOLD_SPAN * rand(st) * (b != null ? .6 : 1);
  }
  st.aim = approach(st.aim, st.aimTo, SNAP_RATE, dt);
  st.turn = approach(st.turn, b == null ? 0 : clamp(b, BODY_YAW) * pp.turn, TURN_RATE, dt);
  const turn = st.turn * w, headYaw = clamp(st.aim - turn, HEAD_YAW) * w;

  const shud = pp.shudder * w * Math.sin(T * 47) * .05;
  a.body.rotation.y = st.body.y + turn + SWAY * Math.sin(T * GLIDE_HZ * TAU * .6 + ph + 2) * w * (1 - pp.turn);
  a.body.rotation.z = st.body.z + (ROLL * Math.sin(T * GLIDE_HZ * TAU + ph) + shud) * w;
  a.body.rotation.x = st.body.x + (HUNCH * (.7 + .3 * Math.sin(T * GLIDE_HZ * TAU * .8 + ph + 1)) + REAR * pp.rear
    + PULL_HUNCH * pp.drag + RAKE_LEAN * lu) * w;
  a.head.rotation.x = st.head.x + (-.1 * pp.rear + .1 * pp.drag + JUT * lu) * w;
  a.head.rotation.y = st.head.y + headYaw;
  a.head.rotation.z = st.head.z + (.05 * Math.sin(T * .7 + ph) + shud * 1.5) * w;

  // the arms: the left flings out and drags back during a pull; both rake in an attack
  a.arms.forEach((arm, i) => {
    const r = st.arms[i], s = i ? 1 : -1, left = i === 0;
    const drift = .05 * Math.sin(T * .9 + ph + i * 2.1);
    const pull = left ? FLING * pp.fling + DRAG * pp.drag : .1 * pp.rear;
    const rake = RAKE * (i ? rk.right : rk.left);
    arm.rotation.x = r.x + (drift + pull + rake) * w;
    arm.rotation.z = r.z + s * ((left ? FLING_OUT * pp.fling - .1 * pp.drag : 0) + .03 * Math.sin(T * 1.3 + i)) * w;
  });

  // the claws: each finger holds a crook, then twitches to a new one; the pull and rake override
  st.fingers.forEach((hand, i) => {
    const left = i === 0;
    const grip = left ? pp.clench : 0, open = left ? pp.fling * (1 - pp.clench) : 0, rake = i ? rk.right : rk.left;
    hand.forEach(f => {
      f.hold -= dt;
      if (f.hold <= 0) { f.to = CURL_LO + (CURL_HI - CURL_LO) * rand(st) ** 1.5; f.hold = TWITCH_MIN + TWITCH_SPAN * rand(st); }
      f.curl = approach(f.curl, f.to, CURL_RATE, dt);
      const g = Math.max(grip, rake);
      const curl = f.curl * (1 - g) * (1 - open) + CLENCH * g + SPLAY * open * (1 - g);
      f.k.rotation.x = f.x + curl * w;
    });
  });

  // the eyes: ember flicker in small hard jumps, blazing in a pull or an attack
  if (st.eyes && st.eyeScale) {
    st.eyeHold -= dt;
    if (st.eyeHold <= 0) { st.eyeTo = 1 + FLICKER * (rand(st) * 2 - 1); st.eyeHold = .05 + .15 * rand(st); }
    st.eye = approach(st.eye, st.eyeTo, 30, dt);
    const s = 1 + ((st.eye - 1) + FLARE * pp.flare + .6 * lu) * w;
    st.eyes.scale.copy(st.eyeScale).multiplyScalar(s);
  }

  // hem smoke: off the trailing hem, sinking as it drags back, spreading as it fades
  const L = st.look, C = L.smoke, pos = st.smoke.geometry.attributes.position, col = st.smoke.geometry.attributes.color;
  st.wisps.forEach((m, i) => {
    const u = ((T / m.len) + m.off) % 1;
    const r = .08 + .14 * u, ang = m.th + .5 * u * m.wob;
    const x = Math.sin(ang) * r + .03 * Math.sin(T * 1.3 * m.wob + i);
    const y = Math.max(.04, .2 - .14 * u + .06 * u * u);
    const z = Math.cos(ang) * r * .6 - .05 - .45 * u;
    const alpha = L.alpha * smooth(u / .12) * (1 - u) ** 1.4 * w;
    pos.setXYZ(i, x, y, z); col.setXYZW(i, C[0], C[1], C[2], alpha);
  });
  // the attack's gust, flung forward (+z, the way it faces)
  for (let i = 0; i < PUFF; i++) {
    const p = st.puff[i], j = SMOKE + i;
    if (p) p.age += dt;
    if (!p || p.age >= p.life || p.age < 0) { pos.setXYZ(j, 0, .6, 0); col.setXYZW(j, 0, 0, 0, 0); continue; }
    const drag = Math.exp(-2.5 * dt);
    p.vx *= drag; p.vy *= drag; p.vz *= drag;
    p.x += p.vx * dt; p.y = Math.max(.05, p.y + p.vy * dt); p.z += p.vz * dt;
    const u = clamp01(p.age / p.life);
    pos.setXYZ(j, p.x, p.y, p.z); col.setXYZW(j, C[0], C[1], C[2], Math.min(.8, L.alpha * 1.4) * smooth(u / .1) * (1 - u) ** 1.2 * w);
  }
  if (dead && w === 0) st.puff.length = 0;
  pos.needsUpdate = col.needsUpdate = true;

  // the thread: warm motes hauled from the air ahead into the clenched left fist, wavering jaggedly
  const M = L.mote, mp = st.motes.geometry.attributes.position, mc = st.motes.geometry.attributes.color;
  const fist = st.fist || (st.fist = new THREE.Vector3());
  fistPoint(a.arms[0], fist);
  const du = st.pull ? st.pull.u : 0;
  st.thread.forEach((m, i) => {
    const k = st.pull ? clamp01((du - .35 - m.lag * .4) / (.25 * m.sp)) : 0;
    const e = k * k, jag = (1 - k) * .07;
    // a jagged waver: the offset steps every ~0.08 s rather than flowing
    const step = Math.floor(T * 12 + m.jit * 3);
    const jx = jag * Math.sin(step * 2.399 + m.jit), jy = jag * Math.cos(step * 1.731 + m.jit);
    const x = THREAD_FROM.x + (fist.x - THREAD_FROM.x) * e + jx;
    const y = THREAD_FROM.y + (fist.y - THREAD_FROM.y) * e + jy;
    const z = THREAD_FROM.z + (fist.z - THREAD_FROM.z) * e;
    const alpha = k > 0 && k < 1 ? MOTE_ALPHA * smooth(k / .15) * (1 - smooth((k - .85) / .15)) * pp.draw * w : 0;
    mp.setXYZ(i, x, y, z); mc.setXYZW(i, M[0], M[1], M[2], alpha);
  });
  mp.needsUpdate = mc.needsUpdate = true;
  return st;
}

// The werecreatures' shudder (creature animation queue item 7). Werejackals, wererats and
// werewolves, in either form, are never quite settled in their skin: the other shape keeps
// trying to tear its way out.
//  - At rest the beast stands low and stalks: a slow pant, the head held down and turned to
//    follow the hero (within RANGE tiles), and now and then a single jagged flinch of the head.
//  - Now and then, and a moment after every blow it takes, it shudders: it crouches tight, then
//    convulses in jagged snaps (the body rolling and pitching, the head wrenching from one angle
//    to the next and the spine buckling as the bones shift under the hide), the eyes flaring
//    and tufts of fur shaken loose to fall round it. Then it throws its head back, a silent
//    howl at a moon it can't see, and settles low again.
//  - In human form (the `@` were, a plain humanoid) the change fights the man: he hunches and
//    clutches at his chest, his shoulders bulge and jerk, and fur sprouts and sheds off him;
//    then he arches back with his arms flung out before he masters it.
//  - On death everything eases back to rest and the last tufts fall.
//
// Matched on `species` (set by live.js and the gallery), so the model files need no change. It
// owns the body's rotation and scale, and the head's, eyes', tail's (x) and arms' rotation where
// they exist, written absolutely from the rest pose every frame; actions.js adds its attack nod
// afterwards and takes it off next frame. One point cloud of fur tufts on the body: one extra
// draw per were.
import * as THREE from 'three';

const TAU = Math.PI * 2;
export const WERES = ['werejackal', 'wererat', 'werewolf'];
// Hero tracking: range (tiles), head turn limit and rate (1/s); the stalking head drop (rad).
export const RANGE = 6, HEAD_YAW = .8, HEAD_RATE = 3, STALK = .12;
// The pant: body pitch (rad) at BREATH_HZ.
export const BREATH = .018, BREATH_HZ = .55;
// A flinch of the head every FLINCH_GAP..+FLINCH_SPAN s, FLINCH_LEN s long, FLINCH rad.
export const FLINCH_GAP = 2.5, FLINCH_SPAN = 3, FLINCH_LEN = .22, FLINCH = .2;
// A shudder: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; SHUDDER_LEN s
// long; HIT_DELAY s after a blow (a blow starts one even while it moves).
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 7, GAP_SPAN = 5, SHUDDER_LEN = 2.4, HIT_DELAY = .25;
// The shudder's pose: the crouch (body pitch, squash), the head drop and the throw back.
export const CROUCH = .1, SQUASH = .07, DROP = .32, THROW = .62, REAR = .16;
// The convulsion: jerk targets are re-picked every JERK_STEP..+JERK_SPAN s and snapped to at
// JERK_RATE; reach (rad) for the body's pitch, roll and yaw and the head's; the bone shift (scale).
export const JERK_STEP = .06, JERK_SPAN = .07, JERK_RATE = 32;
export const JERK = {pitch: .07, roll: .13, yaw: .08, headPitch: .22, headYaw: .4, headRoll: .25};
export const TREMOR = .025, SHIFT = .07, EYE_FLARE = .7, TUCK = .4;
// Human form: the clutch (arms forward and across), shoulder bulge, arch and fling.
export const CLUTCH_X = -1.15, CLUTCH_Z = .5, BULGE = .09, ARCH = .1, FLING = .6;
// Fur tufts: pool size, life (s), emission (per s at full convulsion), gravity, size.
export const TUFTS = 16, TUFT_LIFE = .9, TUFT_RATE = 20, GRAVITY = 2.4, TUFT_ALPHA = .85;
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// Fur colours (sRGB-ish, lit by nothing: normal blending) per species.
export const LOOKS = {
  werejackal: {fur: [.54, .42, .29], dark: [.13, .11, .09]},
  wererat: {fur: [.48, .44, .41], dark: [.2, .18, .17]},
  werewolf: {fur: [.43, .36, .28], dark: [.16, .13, .1]},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// 'beast' (the canine and rat models), 'man' (the humanoid with two arms) or null.
export function wereForm(a) {
  if (!a || a.asset || !a.body || !WERES.includes(a.species)) return null;
  if (a.quirk === 'canine' || a.quirk === 'rat') return 'beast';
  if (Array.isArray(a.arms) && a.arms.length === 2) return 'man';
  return null;
}

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The shudder at progress u (0..1): {crouch, fit, howl}, all 0..1. It crouches (to .12), the
// convulsion runs .1–.7, and it throws its head back (.7–.95) before settling.
export function shudderPose(u) {
  const z = {crouch: 0, fit: 0, howl: 0};
  if (!(u > 0) || !(u < 1)) return z;
  z.crouch = smooth(u / .12) * (1 - smooth((u - .66) / .1));
  z.fit = smooth((u - .1) / .06) * (1 - smooth((u - .62) / .08));
  z.howl = smooth((u - .7) / .1) * (1 - smooth((u - .88) / .12));
  return z;
}

// ---- shared resources (built once) ----
let shared = null;
function tuftTexture() {
  // a ragged tuft: a soft core with a few spiky strands, so it doesn't read as a bubble
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y), an = Math.atan2(y, x);
    const spikes = .55 + .45 * Math.pow(Math.abs(Math.cos(an * 2.5 + .4)), 6);
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - d / spikes) ** 1.5 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  return shared || (shared = {mat: new THREE.PointsMaterial({size: .06, map: tuftTexture(), vertexColors: true, transparent: true, depthWrite: false})});
}
function cloud(a, n, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .5, 0), 1.2);
  const p = new THREE.Points(geo, mat);
  p.userData.part = 'wereTufts'; p.frustumCulled = false; p.castShadow = p.receiveShadow = false;
  a.body.add(p);
  return p;
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
// The body's extent in its own space (before the cloud is added), where the tufts are shed from.
function bodyBox(body) {
  body.updateMatrixWorld(true);
  const inv = body.matrixWorld.clone().invert();
  const box = new THREE.Box3().setFromObject(body).applyMatrix4(inv);
  if (box.isEmpty() || ![box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].every(Number.isFinite)) return new THREE.Box3(new THREE.Vector3(-.2, 0, -.3), new THREE.Vector3(.2, .6, .3));
  return box;
}
function setup(a, form) {
  const st = {seed: ((a.g?.id ?? 1) * 40692) % 2147483647 || 1, t: 0, life: 1, form, sh: null, wait: 0, pending: -1,
    look: LOOKS[a.species] || LOOKS.werewolf, aim: 0, flinch: null, flinchWait: 0, flinchDir: 1, lastHit: null,
    jerk: {pitch: 0, roll: 0, yaw: 0, headPitch: 0, headYaw: 0, headRoll: 0}, to: null, jerkWait: 0, emit: 0, next: 0,
    body: rot(a.body), scale: a.body.scale.clone(), box: bodyBox(a.body)};
  st.to = {...st.jerk};
  if (a.head) {
    st.head = rot(a.head);
    st.eyes = a.head.children.find(c => c.userData?.part === 'eyes') || null;
    if (st.eyes) st.eyeScale = st.eyes.scale.clone();
  }
  if (a.tail) st.tail = a.tail.rotation.x;
  if (form === 'man') st.arms = a.arms.map(rot);
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.flinchWait = FLINCH_GAP + FLINCH_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.cloud = cloud(a, TUFTS, sharedResources().mat);
  st.tufts = Array.from({length: TUFTS}, () => ({age: TUFT_LIFE, p: new THREE.Vector3(), v: new THREE.Vector3(), shade: 0}));
  return st;
}
// The hero's bearing relative to the were's facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}
function shed(st) {
  const tf = st.tufts[st.next]; st.next = (st.next + 1) % TUFTS;
  const b = st.box, man = st.form === 'man';
  // beasts shed off the back; men off the shoulders and arms
  const x = (rand(st) - .5) * (b.max.x - b.min.x) * (man ? .9 : .6) + (b.max.x + b.min.x) / 2;
  const y = b.min.y + (b.max.y - b.min.y) * (man ? .55 + .25 * rand(st) : .7 + .2 * rand(st));
  const z = (rand(st) - .5) * (b.max.z - b.min.z) * (man ? .4 : .7) + (b.max.z + b.min.z) / 2;
  tf.p.set(x, y, z);
  const out = x >= (b.max.x + b.min.x) / 2 ? 1 : -1;
  tf.v.set(out * (.25 + .35 * rand(st)), .35 + .45 * rand(st), (rand(st) - .5) * .5);
  tf.age = 0; tf.shade = rand(st);
}

// Call once a frame (live.js does, after the fidgets). `busy` holds off an idle shudder while it
// moves or acts; `look` is the hero's position (same parent as actor.g), or null.
export function updateWereShudder(a, dt, t, busy, look = null) {
  const form = wereForm(a);
  if (!form) return null;
  const st = a.wereShudder || (a.wereShudder = setup(a, form));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;
  // a blow starts a shudder a moment later; idle ones run on their own clock
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; if (!st.sh) st.pending = HIT_DELAY; }
  if (st.pending >= 0 && !dead) { st.pending -= dt; if (st.pending < 0) { st.sh = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  if (st.sh) { st.sh.u += dt / SHUDDER_LEN; if (st.sh.u >= 1 || (dead && w === 0)) st.sh = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.sh = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const sp = shudderPose(st.sh ? st.sh.u : 0);
  const fit = sp.fit * w, crouch = sp.crouch * w, howl = sp.howl * w;
  // the convulsion: jagged snaps from one held angle to the next, with a fine tremor under them
  st.jerkWait -= dt;
  if (st.jerkWait <= 0) {
    st.jerkWait = JERK_STEP + JERK_SPAN * rand(st);
    for (const k in st.to) st.to[k] = (rand(st) * 2 - 1) * JERK[k];
  }
  for (const k in st.jerk) st.jerk[k] = approach(st.jerk[k], st.to[k], JERK_RATE, dt);
  const J = st.jerk, trem = TREMOR * Math.sin(T * 47 + ph);
  // a flinch of the head now and then, outside a shudder
  if (st.flinch != null) { st.flinch += dt; if (st.flinch >= FLINCH_LEN) st.flinch = null; }
  else if (!dead && !st.sh) { st.flinchWait -= dt; if (st.flinchWait <= 0) { st.flinch = 0; st.flinchDir = rand(st) < .5 ? -1 : 1; st.flinchWait = FLINCH_GAP + FLINCH_SPAN * rand(st); } }
  const fl = st.flinch == null ? 0 : Math.sin(Math.PI * clamp01(st.flinch / FLINCH_LEN)) ** .5 * w;
  const breath = .5 + .5 * Math.sin(T * BREATH_HZ * TAU + ph);
  const S = st.scale, man = st.form === 'man';
  if (!man) {
    // the head stalks the hero, low; held off while it convulses or howls
    const b = dead ? null : bearing(a, look);
    st.aim = approach(st.aim, b == null ? .3 * Math.sin(T * .21 + ph) : clamp(b, HEAD_YAW), HEAD_RATE, dt);
    a.body.rotation.x = st.body.x + (BREATH * breath + CROUCH * crouch - REAR * howl) * w + fit * J.pitch;
    a.body.rotation.y = st.body.y + fit * J.yaw;
    a.body.rotation.z = st.body.z + fit * (J.roll + trem);
    // the spine buckles: length, width and height shift out of step as the bones move
    a.body.scale.set(S.x * (1 + fit * SHIFT * Math.sin(T * 9.3 + ph)), S.y * (1 - SQUASH * crouch + fit * SHIFT * .6 * Math.sin(T * 11.1 + 1)),
      S.z * (1 + fit * SHIFT * Math.sin(T * 7.7 + 2)));
    if (a.head) {
      const H = st.head, calm = (1 - sp.fit) * (1 - sp.howl);
      a.head.rotation.x = H.x + (STALK * (1 - howl) + DROP * crouch * (1 - sp.fit) - THROW * howl) * w + fit * J.headPitch + .3 * fl * FLINCH;
      a.head.rotation.y = H.y + st.aim * calm * w + fit * J.headYaw + st.flinchDir * fl * FLINCH;
      a.head.rotation.z = H.z + fit * (J.headRoll + 3 * trem) + st.flinchDir * fl * FLINCH * .6;
      if (st.eyes) st.eyes.scale.copy(st.eyeScale).multiplyScalar(1 + EYE_FLARE * Math.max(fit, howl * .7));
    }
    if (a.tail) a.tail.rotation.x = st.tail + (-TUCK * crouch * (1 - sp.fit) + .25 * howl) * w + fit * J.pitch * 2;
  } else {
    // the man hunches and clutches at his chest; his shoulders bulge and jerk; then he arches back
    a.body.rotation.x = st.body.x + (ARCH * crouch * .6 - ARCH * howl) * w + fit * J.pitch * .5;
    a.body.rotation.y = st.body.y + fit * J.yaw * .5;
    a.body.rotation.z = st.body.z + fit * (J.roll * .4 + trem);
    a.body.scale.set(S.x * (1 + BULGE * fit * (.6 + .4 * Math.sin(T * 13 + ph))), S.y * (1 - .03 * crouch), S.z * (1 + .5 * BULGE * fit));
    a.arms.forEach((arm, i) => {
      const r = st.arms[i], s = i ? 1 : -1;
      arm.rotation.x = r.x + (CLUTCH_X * crouch * (1 - howl)) * w + fit * J.headPitch * (i ? 1 : -1);
      arm.rotation.y = r.y;
      arm.rotation.z = r.z + (-s * CLUTCH_Z * crouch * (1 - howl) + s * FLING * howl) * w + fit * J.roll * s;
    });
  }
  // the tufts: shaken off while it convulses, falling and fading
  if (fit > .05 && !dead) {
    st.emit += dt * TUFT_RATE * fit;
    while (st.emit >= 1) { st.emit -= 1; shed(st); }
  } else st.emit = 0;
  const L = st.look, pos = st.cloud.geometry.attributes.position, col = st.cloud.geometry.attributes.color;
  const floor = st.box.min.y;
  for (let i = 0; i < TUFTS; i++) {
    const tf = st.tufts[i];
    if (tf.age >= TUFT_LIFE) { pos.setXYZ(i, 0, .3, 0); col.setXYZW(i, 0, 0, 0, 0); continue; }
    tf.age += dt;
    tf.v.y -= GRAVITY * dt;
    tf.v.multiplyScalar(Math.exp(-2.2 * dt));
    tf.p.addScaledVector(tf.v, dt);
    if (tf.p.y < floor) { tf.p.y = floor; tf.v.set(0, 0, 0); }
    const k = tf.age / TUFT_LIFE, c = L.fur.map((v, m) => v + (L.dark[m] - v) * tf.shade * .7);
    pos.setXYZ(i, tf.p.x, tf.p.y, tf.p.z);
    col.setXYZW(i, c[0], c[1], c[2], tf.age >= TUFT_LIFE ? 0 : TUFT_ALPHA * smooth(k / .1) * (1 - smooth((k - .55) / .45)));
  }
  pos.needsUpdate = col.needsUpdate = true;
  return st;
}

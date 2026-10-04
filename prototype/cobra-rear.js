// The cobra (user request, 2026-10-01: "give the cobra some love"):
//  - At rest (hero away) the hood is folded flat to the neck, it lies low on its coils and the head
//    weaves slowly.
//  - The hero within RANGE tiles: it rears, the front lifting into a tall S, and the hood spreads.
//    It holds there swaying slowly side to side, as if charmed, always turned to the hero.
//  - Tongue: a quick flicker now and then, more often with the hero near.
//  - Hiss (reared, now and then): the hood flares past full, the head draws back and tips up, and
//    it trembles, its jaw (creatures.js snakeHead's `actor.jaw`) dropping open in a gape that
//    shivers with the tremble.
//  - Strike (a bite): the head draws back, then whips forward and down at the target and snaps back
//    up into the raised pose, shaking its head twice on the way as if the bite tasted foul.
//  - Spit (NetHack cobras spit blinding venom): the head jerks forward and a small spray of pale
//    droplets flies at the target, then it dips its nose in a dry retch to hawk out the last of it.
//  - On death no new flicks, hisses or spit; it all eases back to rest.
//
// The model (creatures.js snake() with SNAKES cobra:{hood:true}) has an `actor.hood` handle; the head
// is the hood's parent group, and the tongue is found in the head by where it sits. The coil and the
// short neck are one tube mesh, so the rearing neck is this module's own: a chain of beads (one
// instanced mesh, in the coil's material) laid along an S from the coil up to the head, shown only
// while the head is off its rest spot. Spit droplets are one Points. So 2 extra draws per cobra.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero sensing: range (tiles), the most the body and head turn to the hero (rad) and how fast (1/s).
export const RANGE = 5, BODY_YAW = .7, HEAD_YAW = .45, FACE_RATE = 3;
// Rearing: how fast it rises and sinks (1/s), and how far the head rises and draws back at full rear.
export const REAR_RATE = 2.2, REAR_UP = .26, REAR_BACK = .05;
// At rest: how far the head sinks and dips (rad), and its weave (rate rad/s, yaw rad, side units).
export const LOW_DROP = .03, LOW_DIP = .15, WEAVE_RATE = 1.1, WEAVE_YAW = .25, WEAVE_SIDE = .012;
// Reared sway, as if charmed: rate (rad/s), side to side (units) and the roll that goes with it (rad).
export const SWAY_RATE = .95, SWAY_SIDE = .035, SWAY_ROLL = .14;
// Hood: folded and spread scale.x, the extra flare at a hiss, and how fast it spreads (1/s).
export const HOOD_FOLD = .32, HOOD_FLARE = .16, HOOD_RATE = 3.5;
// Tongue: how long a flick lasts (s), the wait between flicks (s) far and near, and its quiver (Hz, rad).
export const FLICK_TIME = .36, FLICK_WAIT = [1.8, 4.5], FLICK_WAIT_NEAR = [.5, 1.3], QUIVER_HZ = 14, QUIVER = .3;
// Hiss: the wait between hisses (s), how long one lasts (s), and the tremble (units, Hz).
export const HISS_WAIT = [4, 8.5], HISS_TIME = 1.2, TREMBLE = .006, TREMBLE_HZ = 23;
// Hiss gape: how far the jaw drops (rad) and its shiver (rad); never past jaw.js's widest gape.
export const HISS_GAPE = .42, GAPE_SHIVER = .04, MAX_GAPE = .6;
// Spit: droplets per spit, their life (s), launch speed (units/s), upward speed and gravity.
export const DROPS = 12, DROP_LIFE = .42, DROP_SPEED = [3, 4.2], DROP_LIFT = [.2, .9], GRAVITY = 6, DROP_SIZE = .045;
// The rearing neck: bead count and radius (the coil tube's radius).
export const BEADS = 22, BEAD_R = .045;
export const REST_RATE = 3;
const SNAP = 1e-3;

// The coil's top (where the neck leaves it) and the head's neck joint, in body / head frames.
const NECK_BASE = [0, .3, .06], NECK_JOIN = [0, -.04, -.06], MOUTH = [0, -.015, .1];

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const rears = a => !!(a && !a.asset && a.species === 'cobra' && a.g && a.body && a.hood?.parent);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }
const between = (st, [lo, hi], k = 1) => (lo + (hi - lo) * rand(st)) * k;

// The bite from the raised pose at action progress u: {dy, dz, pitch} for the head (body frame;
// positive pitch tips the nose down). It draws back, whips forward and down, and snaps back up.
export function strikePose(u) {
  if (!(u > 0) || !(u < 1)) return {dy: 0, dz: 0, pitch: 0};
  const draw = smooth(u / .3) * (1 - smooth((u - .3) / .14)), snap = smooth((u - .3) / .14) * (1 - smooth((u - .55) / .45));
  // coming back up it gives its head two sour little shakes, as if the bite tasted foul
  const s = clamp01((u - .6) / .4), shake = Math.sin(Math.PI * s) * Math.sin(s * TAU * 2) * .1;
  return {dy: .03 * draw - .3 * snap, dz: -.07 * draw + .32 * snap, pitch: -.2 * draw + .55 * snap + shake};
}
// The spit: a shorter draw back and a jerk forward; `release` is the moment the venom leaves.
export const SPIT_RELEASE = .44;
export function spitPose(u) {
  if (!(u > 0) || !(u < 1)) return {dy: 0, dz: 0, pitch: 0};
  const draw = smooth(u / .38) * (1 - smooth((u - .38) / .07)), jerk = smooth((u - .38) / .07) * (1 - smooth((u - .5) / .5));
  // then a dry little retch: the nose dips once as it hawks out the last of the venom
  const hawk = Math.sin(Math.PI * clamp01((u - .6) / .25));
  return {dy: .02 * draw - .012 * hawk, dz: -.05 * draw + .11 * jerk, pitch: -.18 * draw + .22 * jerk + .14 * hawk};
}
// A hiss envelope over its progress u: quick to flare, a hold, slower to settle.
export const hissCurve = u => !(u > 0) || !(u < 1) ? 0 : smooth(u / .15) * (1 - smooth((u - .7) / .3));
// A tongue flick over its progress u (0..1): {out, quiver}: out fast, a quivering hold, back in.
export function flick(u) {
  if (!(u > 0) || !(u < 1)) return {out: 0, quiver: 0};
  const out = smooth(u / .18) * (1 - smooth((u - .72) / .28));
  return {out, quiver: out * smooth((u - .12) / .1)};
}

// ---- shared resources ----
let shared = null;
function softDot() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - Math.hypot(x, y)) ** 1.5 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  return shared || (shared = {
    bead: new THREE.SphereGeometry(BEAD_R, 12, 8),
    dropMat: new THREE.PointsMaterial({size: DROP_SIZE, map: softDot(), vertexColors: true, transparent: true, depthWrite: false}),
  });
}

function setup(a) {
  const head = a.hood.parent;
  const st = {seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, T: 0, life: 1, near: 0, rear: 0, face: 0, walk: 0,
    hood: a.hood.scale.x, on: 0, hiss: null, flick: null, lastSpit: null, drops: [], off: new Map(), head, restHead: head.position.clone()};
  st.ph = rand(st) * TAU;
  st.flickWait = between(st, FLICK_WAIT);
  st.hissWait = between(st, HISS_WAIT);
  // the tongue: the head's mesh sitting out front, just under the jaw line
  st.tongue = head.children.find(m => m.isMesh && Math.abs(m.position.z - .12) < .01 && Math.abs(m.position.y + .01) < .01) || null;
  st.gape = 0; st.open = 0;
  if (st.tongue) st.tongueRest = {z: st.tongue.position.z, rx: st.tongue.rotation.x, sz: st.tongue.scale.z};
  const R = sharedResources(), coil = a.body.children.find(m => m.isMesh && m.geometry?.type === 'TubeGeometry');
  st.neck = new THREE.InstancedMesh(R.bead, coil?.material || new THREE.MeshStandardMaterial({color: '#3a4a7a'}), BEADS);
  st.neck.castShadow = st.neck.receiveShadow = true;
  st.neck.frustumCulled = false; st.neck.visible = false; st.neck.userData.part = 'cobraNeck';
  a.body.add(st.neck);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DROPS * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(DROPS * 4), 4));
  st.spray = new THREE.Points(geo, R.dropMat);
  st.spray.frustumCulled = false; st.spray.renderOrder = 3; st.spray.userData.part = 'cobraSpit';
  st.spray.geometry.setDrawRange(0, 0);
  a.g.add(st.spray);
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since. The
// match has a tolerance: actions.js adds its pose after us and takes it back before us, and that
// round trip isn't always exact in floating point.
function offset(st, obj, prop, axis, v) {
  if (!obj) return;
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && Math.abs(obj[prop][axis] - o.out) < 1e-9) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

function sense(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return {b: wrap(Math.atan2(dx, dz) - g.rotation.y), d};
}

const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), vp = new THREE.Vector3();
const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s3 = new THREE.Vector3();

// Lays the neck beads on a cubic S from the coil's top to the head's joint: out along the old neck
// first (so it covers the tube's stub), back under the hood, then forward into the head.
function layNeck(st, head) {
  v0.set(...NECK_BASE);
  v3.set(...NECK_JOIN).applyEuler(head.rotation).add(head.position);
  const L = v3.distanceTo(v0);
  v1.set(0, .14, .09).multiplyScalar(L / .3).add(v0);
  v2.set(v3.x, v3.y - .32 * L, v3.z - .24 * L);
  for (let i = 0; i < BEADS; i++) {
    const s = i / (BEADS - 1), u = 1 - s;
    vp.set(0, 0, 0).addScaledVector(v0, u * u * u).addScaledVector(v1, 3 * u * u * s).addScaledVector(v2, 3 * u * s * s).addScaledVector(v3, s * s * s);
    const k = 1 - .12 * s;
    st.neck.setMatrixAt(i, m4.compose(vp, q0, s3.set(k, k, k)));
  }
  st.neck.instanceMatrix.needsUpdate = true;
}

const vm = new THREE.Vector3();
function mouthInG(a, st) {
  a.g.updateMatrixWorld(true);
  const inv = st.inv || (st.inv = new THREE.Matrix4());
  inv.copy(a.g.matrixWorld).invert();
  return vm.set(...MOUTH).applyMatrix4(st.head.matrixWorld).applyMatrix4(inv).toArray();
}

// Call once a frame (fidget.js does). `busy` is true while it moves or acts; `look` is the hero's
// position (same parent as actor.g); `walking` keeps it low. Returns the state, or null.
export function updateCobraRear(a, dt, t, busy, look = null, walking = false) {
  if (!rears(a)) return null;
  const st = a.cobraRear || (a.cobraRear = setup(a));
  const dead = !!a.actions?.dead, head = st.head;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  // eases in when it first takes hold, so a fresh cobra doesn't snap into its low pose
  st.on = st.on > 1 - SNAP ? 1 : approach(st.on, 1, REST_RATE, dt);
  const w = st.life * st.on;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, 4, dt);

  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? clamp01(1.2 - h.d / RANGE) : 0, 2.5, dt);
  st.face = approach(st.face, h ? h.b : 0, FACE_RATE, dt);
  st.rear = approach(st.rear, dead ? 0 : smooth(st.near / .5) * (1 - .65 * st.walk), REAR_RATE, dt);
  if (st.rear < SNAP) st.rear = 0;
  const r = st.rear * w, low = (1 - smooth(st.rear * 2)) * w;

  // attacks: the strike (bite) and the spit, from whatever pose it holds
  const atk = dead ? null : current(a, 'attack'), u = atk ? a.actions.u ?? 0 : 0;
  const pose = atk?.attack === 'spit' ? spitPose(u) : atk ? strikePose(u) : {dy: 0, dz: 0, pitch: 0};

  // a hiss now and then while reared and idle
  if (st.hiss) { st.hiss.u += dt / HISS_TIME; if (st.hiss.u >= 1 || dead || atk) st.hiss = null; }
  else if (!dead && !atk && st.rear > .6) { st.hissWait -= dt; if (st.hissWait <= 0) { st.hiss = {u: 0}; st.hissWait = between(st, HISS_WAIT); } }
  const hs = st.hiss ? hissCurve(st.hiss.u) : 0;

  // the hood: folded at rest, spread when reared, flared past full at a hiss
  st.hood = approach(st.hood, HOOD_FOLD + (1 - HOOD_FOLD) * smooth(st.rear) + HOOD_FLARE * hs, HOOD_RATE + 8 * hs, dt);
  a.hood.scale.x = st.hood;

  // facing: the body turns on its coils, the head turns the rest of the way
  const P = st.T * WEAVE_RATE + st.ph, S = st.T * SWAY_RATE + st.ph;
  const face = clamp(st.face, -BODY_YAW - HEAD_YAW, BODY_YAW + HEAD_YAW) * smooth(st.near / .3);
  const bodyYaw = clamp(face, -BODY_YAW, BODY_YAW), headFace = clamp(face - bodyYaw, -HEAD_YAW, HEAD_YAW);
  const sway = Math.sin(S), tremble = hs * TREMBLE;
  offset(st, a.body, 'rotation', 'y', (bodyYaw + .05 * sway * r) * w);
  offset(st, head, 'position', 'x', (sway * SWAY_SIDE * r + Math.sin(P) * WEAVE_SIDE * low + tremble * Math.sin(st.T * TREMBLE_HZ * TAU)) * w);
  offset(st, head, 'position', 'y', (REAR_UP * r - LOW_DROP * low + .02 * hs + pose.dy + tremble * Math.sin(st.T * TREMBLE_HZ * TAU * 1.3 + 1)) * w);
  offset(st, head, 'position', 'z', (-REAR_BACK * r - .05 * hs + pose.dz) * w);
  offset(st, head, 'rotation', 'x', (LOW_DIP * low + .08 * r - .28 * hs + pose.pitch) * w);
  offset(st, head, 'rotation', 'y', (headFace + Math.sin(P * .8 + 1) * WEAVE_YAW * low) * w);
  offset(st, head, 'rotation', 'z', (-sway * SWAY_ROLL * r) * w);

  // the hiss gape on the jaw. actions.js takes its own jaw pose off before this runs and puts it
  // back after, so this takes back last frame's gape first and leaves room for the action's.
  if (a.jaw) {
    a.jaw.rotation.x -= st.gape;
    const room = Math.max(0, MAX_GAPE - (a.actions?.applied?.jaw || 0));
    // eased, so a hiss cut short by a strike closes quickly rather than snapping shut
    st.open = approach(st.open, hs, atk ? 40 : 12, dt);
    st.gape = Math.min(room, Math.max(0, st.open * (HISS_GAPE + GAPE_SHIVER * Math.sin(st.T * TREMBLE_HZ * TAU * .7))) * w);
    if (st.gape < SNAP) st.gape = 0;
    a.jaw.rotation.x += st.gape;
  }

  // the rearing neck, shown while the head is off its rest spot
  const lifted = (r > .02 || !!atk) && head.position.distanceTo(st.restHead) > .012;
  st.neck.visible = lifted;
  if (lifted) layNeck(st, head);

  // the tongue
  if (st.tongue) {
    if (st.flick) { st.flick.u += dt / FLICK_TIME; if (st.flick.u >= 1) st.flick = null; }
    else if (!dead && !st.hiss) {
      st.flickWait -= dt;
      if (st.flickWait <= 0) { st.flick = {u: 0}; st.flickWait = between(st, st.near > .3 ? FLICK_WAIT_NEAR : FLICK_WAIT); }
    }
    const f = st.flick ? flick(st.flick.u) : {out: 0, quiver: 0}, tr = st.tongueRest, out = f.out * w;
    // in, it's drawn back into the mouth (shortened); out, it reaches past its rest spot
    st.tongue.scale.z = tr.sz * (.3 + .75 * out);
    st.tongue.position.z = tr.z - .05 + .065 * out;
    st.tongue.rotation.x = tr.rx + Math.sin(st.T * QUIVER_HZ * TAU) * QUIVER * f.quiver * w;
  }

  // spit: a spray of pale venom from the mouth at the target
  if (atk?.attack === 'spit' && atk !== st.lastSpit && u >= SPIT_RELEASE) {
    st.lastSpit = atk;
    const m = mouthInG(a, st), sc = a.g.scale.x || 1;
    for (let k = 0; k < DROPS; k++) {
      const sp = between(st, DROP_SPEED) / sc, side = (rand(st) - .5) * .5;
      st.drops.push({p: m.slice(), v: [side * sp, between(st, DROP_LIFT) / sc, sp], age: 0, life: DROP_LIFE * (.7 + .5 * rand(st))});
    }
    if (st.drops.length > DROPS) st.drops.splice(0, st.drops.length - DROPS);
  }
  const pos = st.spray.geometry.attributes.position, col = st.spray.geometry.attributes.color, sc = a.g.scale.x || 1;
  st.drops = st.drops.filter(d => (d.age += dt) < d.life);
  st.drops.forEach((d, i) => {
    d.v[1] -= GRAVITY / sc * dt;
    for (let k = 0; k < 3; k++) d.p[k] += d.v[k] * dt;
    pos.setXYZ(i, ...d.p);
    col.setXYZW(i, .93, .96, .78, .85 * (1 - smooth(d.age / d.life)));
  });
  pos.needsUpdate = col.needsUpdate = true;
  st.spray.geometry.setDrawRange(0, st.drops.length);
  return st;
}

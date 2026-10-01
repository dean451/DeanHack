// The vampires' cape sweep and hungry breath (creature animation queue item 7). Vampires, vampire
// lords, vampire mages and Vlad (vampire() in creatures.js) are still, cold aristocrats: where a
// wraith twitches, a vampire barely moves, and when it does it is slow and deliberate.
//  - At rest it stands still; the cape breathes faintly at the hem, the side flaps out of step.
//  - The head turns smoothly to follow the hero (within RANGE tiles), and never blinks. Out of
//    range it tilts now and then, listening.
//  - When it moves the cape trails: the hem lifts back and the flaps flutter behind it.
//  - Now and then it feeds on the air: it turns square to the hero and tips its head back to
//    scent them (a faint thread of red motes is drawn in from ahead to its face), then lowers its
//    head to glare from under its brow and lets out a slow, cold breath that curls forward and
//    sinks. Then the cape sweep: the right arm draws the cape up across the lower face, and the
//    eyes burn over it, before it lets it fall.
//  - When it attacks the cape flares wide like wings, the claws come up and out, and it lunges
//    to bite with the head driving down; a gust of its breath goes with it.
//  - On death everything eases back to rest and the breath thins to nothing.
//
// The module owns the body's, head's, both arms', the cape's and both flaps' rotation and the
// eyes' scale (written absolutely from the rest pose every frame; actions.js adds its attack nod
// afterwards and takes it off next frame). Two point clouds on the body (breath and scent), with
// shared materials: two extra draws per vampire.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero tracking: range (tiles), head and body (while feeding) turn limits, and rates (1/s).
export const RANGE = 6, HEAD_YAW = .9, BODY_YAW = .8, HEAD_RATE = 2.6, TURN_RATE = 2.2;
// The cape at rest: hem breath (rad) and rate (Hz); the trail when moving (rad at full speed).
export const HEM = .03, HEM_HZ = .23, FLAP_SWAY = .04, TRAIL = .55, FLAP_TRAIL = .4, TRAIL_SPEED = 1.6;
// A feed: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; FEED_LEN s long.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 7, GAP_SPAN = 5, FEED_LEN = 4.8;
// The feed's pose: the scent (head back), the glare (head down), the sweep (right arm and flap).
export const SCENT = -.24, GLARE = .17, SWEEP_X = -1.45, SWEEP_Z = -.55, FLAP_X = -1.25, FLAP_Z = -.3;
// The attack: the flaps flare out, the cape billows, the arms spread, the lunge and the bite.
export const FLARE_OUT = .95, BILLOW = .6, SPREAD = .5, LUNGE = .18, BITE = .22;
// The eyes' flare (added to scale 1) while feeding and attacking.
export const EYE_FLARE = 1.1;
// Breath and scent particles.
export const MIST = 22, MIST_LIFE = 1.6, PUFF = 8, SCENT_MOTES = 12, SCENT_ALPHA = .85;
// Where the scent thread starts, in body space (ahead, toward the hero once it has turned).
export const SCENT_FROM = new THREE.Vector3(0, 1.05, 1.2);
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// The mouth and nose in head space (vampire(): the jaw is at y -.1, the face at z ~.12).
const MOUTH = new THREE.Vector3(0, -.09, .13), NOSE = new THREE.Vector3(0, -.02, .14);
export const LOOKS = {
  vampire: {mist: [.74, .66, .7], alpha: .34, scent: [1, .2, .14]},
  'vampire lord': {mist: [.7, .6, .64], alpha: .38, scent: [1, .14, .1]},
  'vampire mage': {mist: [.64, .58, .8], alpha: .36, scent: [.85, .32, 1]},
  'vlad the impaler': {mist: [.72, .6, .56], alpha: .4, scent: [1, .12, .06]},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const sweeps = a => !!(a && !a.asset && a.body && a.head && a.vampire && a.cape && Array.isArray(a.arms) && a.arms.length === 2
  && Array.isArray(a.flaps) && a.flaps.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The feed at progress u (0..1): {turn, scent, glare, breath, sweep, flare}, all 0..1.
// It turns (to .15) and scents (.05–.4), lowers its head to glare (.35–.88), breathes out
// (.38–.62), sweeps the cape up across its face (.55–.86) with the eyes burning over it, and lets it fall.
export function feedPose(u) {
  const z = {turn: 0, scent: 0, glare: 0, breath: 0, sweep: 0, flare: 0};
  if (!(u > 0) || !(u < 1)) return z;
  z.turn = smooth(u / .15) * (1 - smooth((u - .88) / .12));
  z.scent = smooth((u - .05) / .18) * (1 - smooth((u - .3) / .1));
  z.glare = smooth((u - .35) / .12) * (1 - smooth((u - .86) / .13));
  z.breath = smooth((u - .38) / .04) * (1 - smooth((u - .58) / .04));
  z.sweep = smooth((u - .55) / .12) * (1 - smooth((u - .84) / .14));
  z.flare = smooth((u - .5) / .15) * (1 - smooth((u - .86) / .12));
  return z;
}

// The attack at action phase u (0..1): the cape flares and holds; the lunge and bite land mid-way.
export function strikePose(u) {
  if (!(u > 0) || !(u < 1)) return {flare: 0, bite: 0};
  return {flare: smooth(u / .25) * (1 - smooth((u - .6) / .4)), bite: smooth((u - .2) / .15) * (1 - smooth((u - .45) / .35))};
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
    mistMat: new THREE.PointsMaterial({size: .16, map, vertexColors: true, transparent: true, depthWrite: false}),
    scentMat: new THREE.PointsMaterial({size: .05, map, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
  };
}

function cloud(a, n, mat, part) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .8, .4), 2);
  const p = new THREE.Points(geo, mat);
  p.userData.part = part; p.frustumCulled = false; p.castShadow = p.receiveShadow = false;
  a.body.add(p);
  return p;
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
function setup(a) {
  const R = sharedResources();
  const st = {seed: ((a.g?.id ?? 1) * 69621) % 2147483647 || 1, t: 0, life: 1, feed: null, wait: 0,
    look: LOOKS[a.vampire] || LOOKS.vampire, aim: 0, tilt: 0, tiltTo: 0, tiltHold: 0, turn: 0, trail: 0, prev: null,
    mist: [], emit: 0, lastAttack: null,
    body: rot(a.body), head: rot(a.head), arms: a.arms.map(rot), cape: rot(a.cape), flaps: a.flaps.map(rot),
    eyes: a.head.children.find(c => c.userData?.part === 'eyes') || null};
  st.eyeScale = st.eyes ? st.eyes.scale.clone() : null;
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.breath = cloud(a, MIST + PUFF, R.mistMat, 'vampireBreath');
  st.scent = cloud(a, SCENT_MOTES, R.scentMat, 'vampireScent');
  st.thread = Array.from({length: SCENT_MOTES}, (_, i) => ({lag: i / SCENT_MOTES * .6 + rand(st) * .05, jit: rand(st) * TAU, sp: .7 + rand(st) * .6}));
  return st;
}

const tmpE = new THREE.Euler();
// A point in head space, in body space.
function headPoint(head, p, out) {
  return out.copy(p).applyEuler(tmpE.set(head.rotation.x, head.rotation.y, head.rotation.z)).add(head.position);
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to the vampire's facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}

function spawnMist(st, mouth, fast) {
  if (st.mist.length >= MIST + PUFF) return;
  const sp = fast ? 1.4 + rand(st) * .6 : .35 + rand(st) * .3;
  st.mist.push({x: mouth.x + (rand(st) - .5) * .03, y: mouth.y, z: mouth.z + .02, vx: (rand(st) - .5) * (fast ? .5 : .18),
    vy: -.05 - rand(st) * .12, vz: sp, age: 0, life: (fast ? .6 : MIST_LIFE) * (.75 + rand(st) * .5), curl: rand(st) * TAU, fast});
}

// Call once a frame (fidget.js does). `busy` holds off a feed while it moves or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateVampireSweep(a, dt, t, busy, look = null) {
  if (!sweeps(a)) return null;
  const st = a.vampireSweep || (a.vampireSweep = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // how fast it is moving, for the cape's trail (a jump of more than a tile is a teleport, not a run)
  const pos = a.g?.position;
  let speed = 0;
  if (pos && st.prev && dt > 0) { const d = Math.hypot(pos.x - st.prev.x, pos.z - st.prev.z); if (d < 1) speed = d / dt; }
  if (pos) (st.prev || (st.prev = new THREE.Vector3())).copy(pos);
  st.trail = approach(st.trail, dead ? 0 : clamp01(speed / TRAIL_SPEED), speed > st.trail * TRAIL_SPEED ? 8 : 3, dt);
  const tr = st.trail;

  // feeds on their own clock
  if (st.feed) { st.feed.u += dt / FEED_LEN; if (st.feed.u >= 1) st.feed = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.feed = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const fp = feedPose(st.feed ? st.feed.u : 0);

  // an attack: the cape flares, the lunge and bite, and a gust of breath
  const atk = dead ? null : current(a, 'attack');
  const sk = atk ? strikePose(a.actions.u ?? 0) : {flare: 0, bite: 0};
  const fl = sk.flare * w, bi = sk.bite * w;
  const mouth = st.mouth || (st.mouth = new THREE.Vector3());
  if (atk && atk !== st.lastAttack) {
    st.lastAttack = atk;
    st.feed = null;
    headPoint(a.head, MOUTH, mouth);
    for (let i = 0; i < PUFF; i++) spawnMist(st, mouth, true);
  }

  // the head: a smooth turn to the hero; out of range, a slow listening tilt now and then
  const b = dead ? null : bearing(a, look);
  st.aim = approach(st.aim, b == null ? 0 : b, HEAD_RATE, dt);
  st.turn = approach(st.turn, b == null ? 0 : clamp(b, BODY_YAW) * fp.turn, TURN_RATE, dt);
  st.tiltHold -= dt;
  if (st.tiltHold <= 0) { st.tiltTo = b == null && rand(st) < .5 ? (rand(st) < .5 ? -1 : 1) * (.1 + .08 * rand(st)) : 0; st.tiltHold = 1.5 + 2.5 * rand(st); }
  st.tilt = approach(st.tilt, st.tiltTo, 1.8, dt);
  const turn = st.turn * w, headYaw = clamp(st.aim - turn, HEAD_YAW) * w;

  a.body.rotation.y = st.body.y + turn;
  a.body.rotation.x = st.body.x + (-.05 * fp.scent + .07 * fp.glare + LUNGE * bi + .04 * tr) * w;
  a.body.rotation.z = st.body.z;
  a.head.rotation.x = st.head.x + (SCENT * fp.scent + GLARE * fp.glare + BITE * bi - .06 * fl) * w;
  a.head.rotation.y = st.head.y + headYaw;
  a.head.rotation.z = st.head.z + (st.tilt * (1 - fp.turn) + .03 * Math.sin(T * .31 + ph)) * w;

  // the arms: the right draws the cape across the face in a sweep; both spread in an attack
  a.arms.forEach((arm, i) => {
    const r = st.arms[i], s = i ? 1 : -1, right = i === 1;
    const reach = right ? 0 : -.25 * fp.glare;
    arm.rotation.x = r.x + ((right ? SWEEP_X * fp.sweep : reach) - .55 * fl + .02 * Math.sin(T * .5 + ph + i * 2)) * w;
    arm.rotation.y = r.y;
    arm.rotation.z = r.z + ((right ? SWEEP_Z * fp.sweep : 0) + s * SPREAD * fl) * w;
  });

  // the cape: the hem breathes, trails behind when moving, billows in an attack, lifts with the sweep
  const hem = Math.sin(T * HEM_HZ * TAU + ph);
  a.cape.rotation.x = st.cape.x + (HEM * (.5 + .5 * hem) + TRAIL * tr * (1 + .12 * Math.sin(T * 7 + ph)) + BILLOW * fl + .12 * fp.sweep) * w;
  a.cape.rotation.y = st.cape.y;
  a.cape.rotation.z = st.cape.z + .02 * Math.sin(T * HEM_HZ * TAU * .7 + ph + 1) * w;
  a.flaps.forEach((f, i) => {
    const r = st.flaps[i], s = i ? 1 : -1, right = i === 1;
    const sway = FLAP_SWAY * Math.sin(T * HEM_HZ * TAU * 1.3 + ph + i * 2.2);
    const flutter = .07 * tr * Math.sin(T * 9 + i * 1.7 + ph);
    f.rotation.x = r.x + (FLAP_TRAIL * tr + flutter + (right ? FLAP_X * fp.sweep : 0) - .3 * fl) * w;
    f.rotation.y = r.y;
    f.rotation.z = r.z + (s * (.5 * sway + FLARE_OUT * fl) + (right ? FLAP_Z * fp.sweep : 0)) * w;
  });

  // the eyes: steady, burning brighter over the cape and in an attack
  if (st.eyes && st.eyeScale) st.eyes.scale.copy(st.eyeScale).multiplyScalar(1 + (EYE_FLARE * fp.flare + .6 * fl) * w);

  // the breath: a slow, cold exhalation that curls forward and sinks
  headPoint(a.head, MOUTH, mouth);
  if (fp.breath > .05 && !dead) {
    st.emit += dt * MIST / (FEED_LEN * .2) * fp.breath;
    while (st.emit >= 1) { st.emit -= 1; spawnMist(st, mouth, false); }
  } else st.emit = 0;
  const L = st.look, C = L.mist, bp = st.breath.geometry.attributes.position, bc = st.breath.geometry.attributes.color;
  const drag = Math.exp(-1.6 * dt);
  st.mist = st.mist.filter(p => (p.age += dt) < p.life);
  for (let i = 0; i < MIST + PUFF; i++) {
    const p = st.mist[i];
    if (!p) { bp.setXYZ(i, 0, .8, 0); bc.setXYZW(i, 0, 0, 0, 0); continue; }
    p.vx *= drag; p.vz *= drag;
    p.vy = p.vy * drag - .06 * dt;
    p.x += (p.vx + .08 * Math.sin(p.curl + p.age * 3)) * dt; p.y = Math.max(.05, p.y + p.vy * dt); p.z += p.vz * dt;
    const u = clamp01(p.age / p.life);
    bp.setXYZ(i, p.x, p.y, p.z);
    bc.setXYZW(i, C[0], C[1], C[2], (p.fast ? Math.min(.7, L.alpha * 1.5) : L.alpha) * smooth(u / .12) * (1 - u) ** 1.3 * w);
  }
  if (dead && w === 0) st.mist.length = 0;
  bp.needsUpdate = bc.needsUpdate = true;

  // the scent: a thin thread of red motes drawn in from ahead to the face while it scents the air
  const S = L.scent, sp = st.scent.geometry.attributes.position, sc = st.scent.geometry.attributes.color;
  const nose = st.nose || (st.nose = new THREE.Vector3());
  headPoint(a.head, NOSE, nose);
  const du = st.feed ? st.feed.u : 0;
  st.thread.forEach((m, i) => {
    const k = st.feed ? clamp01((du - .06 - m.lag * .2) / (.15 * m.sp)) : 0;
    const e = k * k, wav = (1 - k) * .05;
    const x = SCENT_FROM.x + (nose.x - SCENT_FROM.x) * e + wav * Math.sin(T * 5 + m.jit);
    const y = SCENT_FROM.y + (nose.y - SCENT_FROM.y) * e + wav * Math.cos(T * 4 + m.jit * 1.3);
    const z = SCENT_FROM.z + (nose.z - SCENT_FROM.z) * e;
    const alpha = k > 0 && k < 1 ? SCENT_ALPHA * smooth(k / .15) * (1 - smooth((k - .85) / .15)) * fp.scent * w : 0;
    sp.setXYZ(i, x, y, z); sc.setXYZW(i, S[0], S[1], S[2], alpha);
  });
  sp.needsUpdate = sc.needsUpdate = true;
  return st;
}

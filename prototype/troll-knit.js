// The trolls' knitting wounds (creature animation queue item 7). Trolls, ice, rock and water
// trolls and the Olog-hai (troll() in creatures.js) are hunched brutes that heal as you watch.
//  - At rest it breathes heavily, the shoulders heaving; the long arms hang and sway like dead
//    weights, out of step. The head swings slowly round to follow the hero (within RANGE tiles)
//    and now and then jabs forward in two quick sniffs.
//  - When it is hit, a moment later the wound opens on its hide as a jagged, glowing gash. It
//    hunches over it, head down, and picks at it with the far hand's claws while a thread of
//    motes zips across the gash from one end to the other, lacing it shut. Then it shudders,
//    throws its head back and flexes its arms out, and the gash fades. Idle trolls do the same
//    now and then, worrying at an old wound. A troll rising from its corpse knits too.
//  - When it attacks it hauls the right arm up overhead and brings it down in a slam, the left
//    claw raking after it, with the body lunging behind the blow.
//  - On death everything eases back to rest and the motes fade out.
//
// The module owns the body's, head's and both arms' rotation (written absolutely from the rest
// pose every frame; actions.js adds its attack nod afterwards and takes it off next frame). One
// additive point cloud on the body (the wound and its stitches): one extra draw per troll.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero tracking: range (tiles), head turn limit and rate (1/s).
export const RANGE = 6, HEAD_YAW = .8, HEAD_RATE = 2.2;
// The rest: breath (rad of body pitch) and rate (Hz); the arms' hanging sway (rad).
export const BREATH = .03, BREATH_HZ = .35, ARM_SWAY = .07;
// Sniffs: GAP..+SPAN s apart, SNIFF_LEN s long, two jabs of SNIFF rad.
export const SNIFF_GAP = 3, SNIFF_SPAN = 4, SNIFF_LEN = .5, SNIFF = .12;
// A knit: idle ones first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; one
// starts HIT_DELAY s after a blow lands. KNIT_LEN s long.
export const FIRST_MIN = 4, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 6, HIT_DELAY = .35, KNIT_LEN = 3.4;
// The knit's pose: the hunch, head down to the wound, the clutching arm, the flex (head back, arms out).
export const HUNCH = .16, PEER = .3, CLUTCH_X = -1.05, CLUTCH_Z = .55, PICK = .09, ROAR = -.38, FLEX = .45;
// The attack: the overhead haul and the slam.
export const HAUL = -2.3, SLAM = .4, RAKE = -.9, LUNGE = .2;
// The wound: motes along the gash and stitches across it; gash length and the stitches' reach.
export const GASH = 12, STITCH = 18, GASH_LEN = .15, STITCH_REACH = .055, ALPHA = .9;
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// Wound spots on the hide, in body space (on the hunched torso and shoulders), and the gash's slant.
export const SPOTS = [
  {p: new THREE.Vector3(-.1, .74, .21), slant: .7},
  {p: new THREE.Vector3(.09, .6, .22), slant: -.5},
  {p: new THREE.Vector3(-.19, .86, .13), slant: 1.2},
  {p: new THREE.Vector3(.17, .8, .15), slant: -1},
];
// Per kind: the raw wound's colour and the colour it heals with.
export const LOOKS = {
  troll: {wound: [1, .22, .1], knit: [.55, 1, .3]},
  'ice troll': {wound: [.6, .8, 1], knit: [.85, .97, 1]},
  'rock troll': {wound: [1, .45, .15], knit: [1, .82, .5]},
  'water troll': {wound: [1, .3, .2], knit: [.35, 1, .85]},
  'olog-hai': {wound: [1, .12, .05], knit: [.95, .35, .15]},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const pulse = (v, at, len) => v > at && v < at + len ? Math.sin((v - at) / len * Math.PI) : 0;

export const knits = a => !!(a && !a.asset && a.body && a.head && a.troll && Array.isArray(a.arms) && a.arms.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The knit at progress u (0..1): {clutch, peer, open, heal, flex}, all 0..1. It hunches and
// clutches at the wound (to .15), peering down at it; the gash glows open (to .08); the stitches
// zip across it (heal runs 0..1 over .18–.68); it lets go and flexes (.66–.95); the gash fades.
export function knitPose(u) {
  const z = {clutch: 0, peer: 0, open: 0, heal: 0, flex: 0};
  if (!(u > 0) || !(u < 1)) return z;
  z.clutch = smooth(u / .15) * (1 - smooth((u - .6) / .1));
  z.peer = smooth((u - .02) / .15) * (1 - smooth((u - .6) / .1));
  z.open = smooth(u / .08) * (1 - smooth((u - .8) / .2));
  z.heal = clamp01((u - .18) / .5);
  z.flex = smooth((u - .66) / .08) * (1 - smooth((u - .86) / .12));
  return z;
}

// The attack at action phase u (0..1): the haul overhead, then the slam.
export function strikePose(u) {
  if (!(u > 0) || !(u < 1)) return {haul: 0, slam: 0};
  return {haul: smooth(u / .32) * (1 - smooth((u - .32) / .1)), slam: smooth((u - .34) / .1) * (1 - smooth((u - .55) / .45))};
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
  return shared || (shared = {mat: new THREE.PointsMaterial({size: .045, map: softTexture(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending})});
}

function cloud(a, n, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .7, .1), 1);
  const p = new THREE.Points(geo, mat);
  p.userData.part = 'trollKnit'; p.frustumCulled = false; p.castShadow = p.receiveShadow = false;
  a.body.add(p);
  return p;
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
function setup(a) {
  const st = {seed: ((a.g?.id ?? 1) * 48271) % 2147483647 || 1, t: 0, life: 1, knit: null, wait: 0, pending: -1,
    look: LOOKS[a.troll] || LOOKS.troll, aim: 0, sniff: null, sniffWait: 0, lastAttack: null, lastHit: null, lastRise: null,
    body: rot(a.body), head: rot(a.head), arms: a.arms.map(rot)};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.sniffWait = SNIFF_GAP + SNIFF_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.cloud = cloud(a, GASH + STITCH, sharedResources().mat);
  st.jag = Array.from({length: GASH}, () => (rand(st) - .5) * .02);
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to the troll's facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}

function startKnit(st, spot) {
  const s = SPOTS[spot ?? Math.floor(rand(st) * SPOTS.length) % SPOTS.length];
  // the gash runs along D (slanted in the hide), the stitches cross it along S, lifted along N
  const N = new THREE.Vector3(s.p.x, 0, s.p.z).normalize();
  const D = new THREE.Vector3(Math.cos(s.slant) * N.z, Math.sin(s.slant), -Math.cos(s.slant) * N.x).normalize();
  const S = new THREE.Vector3().crossVectors(N, D).normalize();
  st.knit = {u: 0, spot: s, N, D, S, side: s.p.x < 0 ? 1 : 0};
}

const tmpV = new THREE.Vector3();
// Call once a frame (fidget.js does). `busy` holds off an idle knit while it moves or acts;
// `look` is the hero's position (same parent as actor.g), or null.
export function updateTrollKnit(a, dt, t, busy, look = null) {
  if (!knits(a)) return null;
  const st = a.trollKnit || (a.trollKnit = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow (or rising from the corpse) starts a knit a moment later; idle ones on their own clock
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.pending = HIT_DELAY; }
  const rise = a.actions?.current?.kind === 'rise' ? a.actions.current : null;
  if (rise && rise !== st.lastRise) { st.lastRise = rise; st.pending = HIT_DELAY; }
  if (st.pending >= 0 && !dead) { st.pending -= dt; if (st.pending < 0) { startKnit(st); st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  if (st.knit) { st.knit.u += dt / KNIT_LEN; if (st.knit.u >= 1) st.knit = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { startKnit(st); st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const kp = knitPose(st.knit ? st.knit.u : 0);

  // sniffs: two quick jabs of the head, now and then, while it isn't knitting
  if (st.sniff != null) { st.sniff += dt; if (st.sniff >= SNIFF_LEN) st.sniff = null; }
  else if (!dead && !st.knit) { st.sniffWait -= dt; if (st.sniffWait <= 0) { st.sniff = 0; st.sniffWait = SNIFF_GAP + SNIFF_SPAN * rand(st); } }
  const sn = st.sniff == null ? 0 : pulse(st.sniff, 0, .16) + pulse(st.sniff, .22, .16);

  // the attack
  const atk = dead ? null : current(a, 'attack');
  if (atk && atk !== st.lastAttack) { st.lastAttack = atk; st.knit = null; }
  const sk = atk ? strikePose(a.actions.u ?? 0) : {haul: 0, slam: 0};
  const ha = sk.haul * w, sl = sk.slam * w;

  // the head: a slow swing round to the hero, held off while it peers at the wound
  const b = dead ? null : bearing(a, look);
  st.aim = approach(st.aim, b == null ? .25 * Math.sin(T * .17 + ph) : clamp(b, HEAD_YAW), HEAD_RATE, dt);
  const breath = Math.sin(T * BREATH_HZ * TAU + ph);
  const shudder = kp.flex * Math.sin(T * 31 + ph) * .04;

  a.body.rotation.x = st.body.x + (BREATH * (.5 + .5 * breath) + HUNCH * kp.peer - .1 * kp.flex - .08 * ha + LUNGE * sl) * w;
  a.body.rotation.y = st.body.y;
  a.body.rotation.z = st.body.z + (shudder + .02 * Math.sin(T * BREATH_HZ * TAU * .5 + ph)) * w;
  const toWound = st.knit ? (st.knit.spot.p.x < 0 ? -.35 : .35) : 0;
  a.head.rotation.x = st.head.x + (PEER * kp.peer + ROAR * kp.flex + SNIFF * sn + .18 * sl - .1 * ha) * w;
  a.head.rotation.y = st.head.y + (st.aim * (1 - kp.peer) * (1 - kp.flex) + toWound * kp.peer) * w;
  a.head.rotation.z = st.head.z + (-.5 * toWound * kp.peer + .03 * sn * Math.sin(T * 40)) * w;

  // the arms: hanging sway, the far hand clutching and picking at the wound, the flex, the slam
  a.arms.forEach((arm, i) => {
    const r = st.arms[i], s = i ? 1 : -1;
    const clutching = st.knit && st.knit.side === i ? kp.clutch : 0;
    const sway = ARM_SWAY * Math.sin(T * BREATH_HZ * TAU * .8 + ph + i * 2.4) + .02 * breath;
    const pick = clutching * PICK * Math.sin(T * 17 + i);
    const x = sway + CLUTCH_X * clutching + pick - .3 * kp.flex + (i ? HAUL * ha + SLAM * sl : RAKE * sl);
    const z = -s * CLUTCH_Z * clutching + s * FLEX * kp.flex + .5 * pick + (i ? .25 * ha : 0) + shudder * s;
    arm.rotation.x = r.x + x * w;
    arm.rotation.y = r.y;
    arm.rotation.z = r.z + z * w;
  });

  // the wound: a jagged glowing gash, laced shut by a thread of motes zipping from one end to the other
  const L = st.look, pos = st.cloud.geometry.attributes.position, col = st.cloud.geometry.attributes.color;
  const k = st.knit;
  for (let i = 0; i < GASH + STITCH; i++) {
    if (!k) { pos.setXYZ(i, 0, .7, 0); col.setXYZW(i, 0, 0, 0, 0); continue; }
    const gash = i < GASH, j = gash ? i : i - GASH, n = gash ? GASH : STITCH;
    const along = (j + .5) / n, sealed = clamp01((kp.heal - along * .85) / .15);
    tmpV.copy(k.spot.p).addScaledVector(k.D, (along - .5) * GASH_LEN).addScaledVector(k.N, .012);
    let alpha, c;
    if (gash) {
      tmpV.addScaledVector(k.S, st.jag[j] * (1 - sealed));
      c = L.wound.map((v, m) => v + (L.knit[m] - v) * sealed);
      alpha = ALPHA * kp.open * (1 - .75 * sealed) * (.75 + .25 * Math.sin(T * 9 + j * 1.7));
    } else {
      // each stitch starts out to one side and is drawn across the gash as the zip passes it
      const zip = clamp01((kp.heal - along * .85 + .1) / .2), side = j % 2 ? 1 : -1;
      tmpV.addScaledVector(k.S, side * STITCH_REACH * (1 - zip) * (1 - .4 * zip)).addScaledVector(k.N, .015 * Math.sin(zip * Math.PI));
      c = L.knit;
      alpha = zip > 0 ? ALPHA * smooth(zip / .3) * (1 - .6 * sealed) * kp.open : 0;
    }
    pos.setXYZ(i, tmpV.x, tmpV.y, tmpV.z);
    col.setXYZW(i, c[0], c[1], c[2], alpha * w);
  }
  if (dead && w === 0) st.knit = null;
  pos.needsUpdate = col.needsUpdate = true;
  return st;
}

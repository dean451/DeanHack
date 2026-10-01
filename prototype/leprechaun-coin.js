// The leprechaun's coin flip (creature animation queue item 7). A sly little thief who can't
// keep his fingers off his loot, and who never stops watching you.
//  - At rest he rocks on his heels, leaning on the shillelagh, and his head turns to keep a
//    sidelong, cocked leer on the hero (within RANGE tiles); out of range his eyes drift about.
//  - Now and then he plucks a gold coin from the sack and thumbs it high over his hat, spinning
//    and glinting at the top of its arc; his head follows it up and down, and he snatches it out
//    of the air with a jerk of the sack hand and a hunched little chuckle.
//  - One flip in PALM_ODDS is a trick: at the top of the arc the coin winks out in a puff of
//    green sparks, and he cocks his head at the hero, shoulders shaking.
//  - When he attacks (to rob you) he darts in low with the sack swung back; when he's hit his
//    hat jumps off his head, spins a little and drops back on, and he clutches the sack in tight.
//  - On death everything eases back to rest, the coin goes and the sparks fade.
//
// Matched on the model's `leprechaun` flag (creatures.js gives it `head`, `hat` and `loot`).
// It owns the body's rotation, the head's and hat's rotation and the hat's position, and the
// sack's x rotation (live.js swings its z), written absolutely from the rest pose every frame;
// actions.js adds its attack nod afterwards. One coin mesh and one point cloud of sparks on
// the body: two extra draws per leprechaun.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero tracking: range (tiles), head turn limit and rate (1/s), and the leer's cock (roll, rad).
export const RANGE = 6, HEAD_YAW = .9, HEAD_RATE = 3.5, LEER = .14;
// The rock on his heels: body pitch (rad) at ROCK_HZ.
export const ROCK = .035, ROCK_HZ = .6;
// Flips: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; FLIP_LEN s long.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5, FLIP_LEN = 1.7, PALM_ODDS = 3;
// The coin's path in body space: the sack's mouth (pluck and catch) and the top of the arc.
export const HAND = new THREE.Vector3(.2, .34, .1), APEX_Y = 1.02, APEX_X = .12, SPIN = 34;
// The pluck, the follow (head pitch, rad, up is negative), the snatch and the chuckle.
export const PLUCK = .35, FOLLOW = -.42, SNATCH = -.5, HUNCH = .09, CHUCKLE = .035;
// The attack's dart and the hit's hat hop (height, spin) and sack clutch.
export const DART = .22, SWING = .8, HOP = .07, HAT_SPIN = .9, CLUTCH = -.6, HIT_LEN = .7;
// Sparks: pool size, life (s), size, alpha.
export const SPARKS = 10, SPARK_LIFE = .55, ALPHA = .95;
export const REST_RATE = 2.5;
const SNAP = 1e-3;
const GOLD = [1, .82, .3], GREEN = [.45, 1, .3];

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const pulse = (v, at, len) => v > at && v < at + len ? Math.sin((v - at) / len * Math.PI) : 0;

export const flips = a => !!(a && !a.asset && a.leprechaun && a.body && a.head && a.hat && a.loot);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The flip at progress u (0..1): {pluck, fly, h, snatch, chuckle}. He dips into the sack (to .14),
// the coin flies .16–.72 (fly runs 0..1, h is its height 0..1..0), he snatches it (.7–.82) and
// chuckles (.76–1).
export function flipPose(u) {
  const z = {pluck: 0, fly: 0, h: 0, snatch: 0, chuckle: 0};
  if (!(u > 0) || !(u < 1)) return z;
  z.pluck = smooth(u / .1) * (1 - smooth((u - .12) / .06));
  z.fly = clamp01((u - .16) / .56);
  z.h = u > .16 && u < .72 ? 4 * z.fly * (1 - z.fly) : 0;
  z.snatch = smooth((u - .68) / .05) * (1 - smooth((u - .76) / .1));
  z.chuckle = smooth((u - .74) / .06) * (1 - smooth((u - .88) / .12));
  return z;
}

// ---- shared resources (built once) ----
let shared = null;
function softTexture() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y);
    // a four-pointed glint: a soft core with thin cross rays
    const ray = Math.max(clamp01(1 - Math.abs(x) * 9) * clamp01(1 - Math.abs(y)), clamp01(1 - Math.abs(y) * 9) * clamp01(1 - Math.abs(x)));
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(Math.max(clamp01(1 - d * 1.6) ** 2, ray * .8)) * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  return shared || (shared = {
    coinGeo: new THREE.CylinderGeometry(.022, .022, .005, 14).rotateX(Math.PI / 2),
    spark: new THREE.PointsMaterial({size: .07, map: softTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
  });
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
function setup(a) {
  const R = sharedResources();
  const st = {seed: ((a.g?.id ?? 1) * 69621) % 2147483647 || 1, t: 0, life: 1, flip: null, wait: 0, aim: 0, hit: -1,
    lastHit: null, body: rot(a.body), head: rot(a.head), hat: rot(a.hat), hatY: a.hat.position.y, loot: a.loot.rotation.x,
    sparks: Array.from({length: SPARKS}, () => ({age: SPARK_LIFE, p: new THREE.Vector3(), v: new THREE.Vector3(), c: GOLD}))};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  // the coin: its own material so its glint can flare without touching the model's gold
  st.coin = new THREE.Mesh(R.coinGeo, new THREE.MeshStandardMaterial({color: '#e0b83a', metalness: .85, roughness: .25, emissive: '#ffcc40', emissiveIntensity: 0}));
  st.coin.userData.part = 'leprechaunCoin'; st.coin.visible = false; st.coin.castShadow = false;
  a.body.add(st.coin);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .7, 0), 1);
  st.cloud = new THREE.Points(geo, R.spark);
  st.cloud.userData.part = 'leprechaunSparks'; st.cloud.frustumCulled = false; st.cloud.castShadow = st.cloud.receiveShadow = false;
  a.body.add(st.cloud);
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to his facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}

// The coin's place along its arc (fly 0..1) into `out`.
export function coinAt(fly, out = new THREE.Vector3()) {
  const h = 4 * fly * (1 - fly);
  return out.set(HAND.x - APEX_X * Math.sin(fly * Math.PI), HAND.y + (APEX_Y - HAND.y) * h, HAND.z + .04 * Math.sin(fly * Math.PI));
}

function burst(st, at, n, color, up) {
  for (const s of st.sparks) {
    if (n <= 0) break;
    if (s.age < SPARK_LIFE) continue;
    n--; s.age = 0; s.c = color; s.p.copy(at);
    const a = rand(st) * TAU, r = .25 + .35 * rand(st);
    s.v.set(Math.cos(a) * r, up + .3 * rand(st), Math.sin(a) * r);
  }
}

const tmpV = new THREE.Vector3();
// Call once a frame (fidget.js does). `busy` holds off a flip while he moves or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateLeprechaunCoin(a, dt, t, busy, look = null) {
  if (!flips(a)) return null;
  const st = a.leprechaunCoin || (a.leprechaunCoin = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow knocks his hat off his head and he clutches the sack in
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.hit = 0; }
  if (st.hit >= 0) { st.hit += dt / HIT_LEN; if (st.hit >= 1) st.hit = -1; }
  const hu = st.hit < 0 ? 0 : st.hit, hop = st.hit < 0 ? 0 : Math.sin(hu * Math.PI), clutch = st.hit < 0 ? 0 : 1 - smooth((hu - .5) / .5);

  // the attack: a low dart with the sack swung back; it drops any flip
  const atk = dead ? null : current(a, 'attack');
  if (atk) st.flip = null;
  const au = atk ? a.actions.u ?? 0 : 0, dart = atk ? smooth(au / .3) * (1 - smooth((au - .5) / .5)) : 0;

  // flips on their own clock, only while he stands still
  if (st.flip) {
    const was = st.flip.u;
    st.flip.u += dt / FLIP_LEN;
    // the glint at the top of the arc, or the palm: the coin winks out in green sparks
    const apex = .16 + .56 * .5;
    if (was < apex && st.flip.u >= apex) {
      coinAt(.5, tmpV);
      if (st.flip.palm) { st.flip.gone = true; burst(st, tmpV, 7, GREEN, .1); }
      else burst(st, tmpV, 3, GOLD, .25);
    }
    if (st.flip.u >= 1) st.flip = null;
  } else if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) { st.flip = {u: 0, palm: rand(st) * PALM_ODDS < 1, gone: false}; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (dead) st.flip = null;
  const f = flipPose(st.flip ? st.flip.u : 0), palm = !!st.flip?.palm;
  const catching = palm ? 0 : f.snatch, laugh = f.chuckle * (palm ? 1.4 : 1);

  // the head: a cocked sidelong leer at the hero, or up after the coin
  const b = dead ? null : bearing(a, look);
  st.aim = approach(st.aim, b == null ? .35 * Math.sin(T * .23 + ph) : clamp(b, HEAD_YAW), HEAD_RATE, dt);
  const watching = st.flip && !st.flip.gone ? smooth(f.fly / .1) * (1 - smooth((st.flip.u - .7) / .08)) : 0;
  const coinH = st.flip ? f.h : 0;
  const rock = Math.sin(T * ROCK_HZ * TAU + ph), shake = Math.sin(T * 26 + ph) * laugh;

  a.body.rotation.x = st.body.x + (ROCK * rock + HUNCH * (catching + laugh * .6) + .05 * f.pluck + DART * dart - .06 * hop) * w;
  a.body.rotation.y = st.body.y + (.12 * st.aim * (1 - watching)) * w;
  a.body.rotation.z = st.body.z + (.015 * rock + CHUCKLE * shake) * w;
  const leer = LEER * (b == null ? .4 : 1) * Math.sign(st.aim || 1);
  a.head.rotation.x = st.head.x + (FOLLOW * coinH * watching + .25 * f.pluck + .12 * catching - .1 * dart + .12 * clutch + .05 * shake) * w;
  a.head.rotation.y = st.head.y + (st.aim * (1 - .7 * watching) - .15 * watching) * w;
  a.head.rotation.z = st.head.z + (leer * (1 - watching) + .18 * laugh * (palm ? 1 : .4)) * w;

  // the hat: a hop and a spin when he's hit, and a wobble when he chuckles
  a.hat.position.y = st.hatY + HOP * hop * w;
  a.hat.rotation.x = st.hat.x + (-.25 * hop) * w;
  a.hat.rotation.y = st.hat.y + (HAT_SPIN * Math.sin(hu * Math.PI * 1.5) * (st.hit < 0 ? 0 : 1)) * w;
  a.hat.rotation.z = st.hat.z + (.3 * hop + .06 * shake) * w;

  // the sack: a dip to pluck, a jerk up to snatch, swung back in the dart, clutched in when hit
  a.loot.rotation.x = st.loot + (PLUCK * f.pluck + SNATCH * catching + SWING * dart + CLUTCH * clutch) * w;

  // the coin
  const flying = st.flip && !st.flip.gone && st.flip.u > .08 && st.flip.u < .74 && w > 0;
  st.coin.visible = !!flying;
  if (flying) {
    coinAt(st.flip.u < .16 ? 0 : f.fly, st.coin.position);
    if (st.flip.u < .16) st.coin.position.y -= .05 * (1 - smooth((st.flip.u - .08) / .08));
    st.coin.rotation.set(T * SPIN, .4, 0);
    st.coin.material.emissiveIntensity = .2 + 2.2 * pulse(f.fly, .38, .24);
  }

  // the sparks: drift, slow and fade
  const pos = st.cloud.geometry.attributes.position, col = st.cloud.geometry.attributes.color;
  st.sparks.forEach((s, i) => {
    if (s.age < SPARK_LIFE) {
      s.age += dt;
      s.v.multiplyScalar(Math.exp(-3 * dt));
      s.p.addScaledVector(s.v, dt);
    }
    const k = clamp01(1 - s.age / SPARK_LIFE);
    pos.setXYZ(i, s.p.x, s.p.y, s.p.z);
    col.setXYZW(i, s.c[0], s.c[1], s.c[2], ALPHA * k * k * (.7 + .3 * Math.sin(T * 30 + i)) * w);
  });
  pos.needsUpdate = col.needsUpdate = true;
  return st;
}

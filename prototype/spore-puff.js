// The yellow mold's spores (creature animation queue item 7). Its model is mold.js's lobed colony
// with stalked sporangia and a ring of spore dust on the floor. In NetHack it never moves and never
// attacks; it stings whatever touches it (passive) and poisons whatever eats it. So it gets a
// patient, poisonous idle and a choking answer to every blow:
//  - The colony breathes, very slowly, and a thin pall of golden spores hangs over it: motes rise
//    lazily off the sporangia, curl round the colony and sink away.
//  - Now and then a sporangium bursts: the colony twitches and a puff of spores coughs up off one
//    of the heads, swells into a little cloud, hangs, then settles slowly. Sometimes a second or a
//    third puff follows close behind, like a cough.
//  - When it is hit, a cloud of spores blasts off it, mostly back toward the attacker, hangs in the
//    air for a while and settles; the colony recoils.
//  - On death everything eases back to rest; the spores thin out to nothing.
//
// The module owns the colony and spores meshes' scale (nothing else writes them), plus one point
// cloud it adds on the actor's group (the pall, the puffs and the blast). The material is shared;
// only the per-actor buffers change. One extra draw per yellow mold.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Breathing: share of rest scale, and rate (Hz).
export const BREATH = .018, BREATH_HZ = .11;
// Puffs: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart. COUGH is the chance
// of another puff COUGH_MIN..+COUGH_SPAN s after one (at most COUGH_MAX in a row).
export const FIRST_MIN = 1.5, FIRST_SPAN = 2.5, GAP_MIN = 3, GAP_SPAN = 5;
export const COUGH = .4, COUGH_MIN = .25, COUGH_SPAN = .3, COUGH_MAX = 3;
// A puff: motes, launch speed, life (s); the twitch it gives the colony (share, s).
export const PUFF = 14, PUFF_SPEED = .5, PUFF_LIFE = 2.6, TWITCH = .045, TWITCH_LEN = .55;
// The blast on a hit: motes, launch speed, life (s); the recoil (share, s).
export const BLAST = 28, BLAST_SPEED = 1.1, BLAST_LIFE = 3.2, RECOIL = .08, RECOIL_LEN = .7;
// Every puffed or blasted mote: drag (1/s), how fast it settles once slowed, its peak opacity.
export const DRAG = 3.2, SETTLE = .07, MOTE_ALPHA = .55;
// The pool the puffs and blasts share.
export const POOL = 64;
// The pall: motes, seconds per mote, peak opacity, how high it rises.
export const PALL = 14, PALL_LEN = 5.5, PALL_ALPHA = .3, PALL_TOP = .48;
// How fast the motion eases out after death (1/s).
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// The colony's crown (mold.js: the main lobe is .2 high and .25 wide).
const CROWN = {y: .19, r: .25};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

export const spores = a => !!(a && !a.asset && a.body && a.species === 'yellow mold');

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// How far the colony is drawn in u (0..1) through a twitch or recoil: snapped in, eased back.
export function twitchEnvelope(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return u < .12 ? smooth(u / .12) : (1 - smooth((u - .12) / .88)) ** 1.5;
}

// A pall mote at progress u (0..1), starting at radius r0 and angle th: it rises lazily off the
// sporangia, curls round the colony as it spreads, and sinks away at the end.
export function pallAt(u, r0, th) {
  u = clamp01(u);
  const r = r0 + .2 * Math.sin(Math.PI * .5 * u), a = th + 1.4 * u;
  const y = .1 + (PALL_TOP - .1) * Math.sin(Math.PI * Math.min(1, u * .85)) ** .8 * (1 - .35 * smooth((u - .6) / .4));
  return {x: Math.cos(a) * r, y, z: Math.sin(a) * r, alpha: PALL_ALPHA * Math.sin(Math.PI * u) ** 1.6};
}

// A mote's opacity u (0..1) through its life: quick to show, long to thin.
export const moteAlpha = u => (u > 0 && u < 1) ? MOTE_ALPHA * smooth(u / .05) * (1 - u) ** 1.2 : 0;

// ---- shared resources (built once) ----
let shared = null;
function dotTexture() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y);
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - d) ** 1.6 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  return shared || (shared = {
    sporeMat: new THREE.PointsMaterial({size: .055, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false}),
  });
}

function setup(a) {
  const R = sharedResources(), kids = a.body.children.filter(m => m.isMesh);
  const rest = m => m && {m, scale: m.scale.clone()};
  const colony = rest(kids.find(m => m.userData.part === 'colony')), heads = rest(kids.find(m => m.userData.part === 'spores'));
  const st = {seed: ((a.g?.id ?? 1) * 7919) % 2147483647 || 1, t: 0, life: 1, wait: 0, coughs: 0, twitch: null, recoil: null,
    colony, heads, pool: [], next: 0, lastHit: null, puffs: 0};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PALL + POOL) * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((PALL + POOL) * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .3, 0), 1.5);
  st.cloud = new THREE.Points(geo, R.sporeMat);
  st.cloud.userData.part = 'sporeCloud'; st.cloud.frustumCulled = false; st.cloud.castShadow = st.cloud.receiveShadow = false;
  a.g.add(st.cloud);
  st.pall = Array.from({length: PALL}, (_, i) => ({off: i / PALL + rand(st) * .05, r0: .05 + rand(st) * .15, th: rand(st) * TAU, len: PALL_LEN * (.8 + rand(st) * .4), tint: rand(st)}));
  // puffs burst off the sporangium heads: spores-mesh vertices up on the colony, not the floor dust
  const src = heads?.m.geometry.attributes.position;
  st.tips = [];
  if (src) for (let i = 0; i < src.count; i += 3) if (src.getY(i) > .06) st.tips.push([src.getX(i), src.getY(i), src.getZ(i)]);
  if (!st.tips.length) for (let i = 0; i < 8; i++) st.tips.push([Math.cos(i * 2.4) * .14, .2, Math.sin(i * 2.4) * .14]);
  return st;
}

const SPORE = [[.98, .88, .4], [.85, .68, .18]];
const tint = k => SPORE[0].map((c, i) => c + (SPORE[1][i] - c) * k);

function spawn(st, x, y, z, vx, vy, vz, life) {
  const p = {x, y, z, vx, vy, vz, age: 0, life, tint: rand(st)};
  st.pool[st.next] = p; st.next = (st.next + 1) % POOL;
}

// A puff off one sporangium head.
function puff(st) {
  const [hx, hy, hz] = st.tips[Math.floor(rand(st) * st.tips.length)];
  const out = Math.atan2(hz, hx);
  for (let i = 0; i < PUFF; i++) {
    const th = out + (rand(st) - .5) * 2.4, el = .5 + rand(st) * 1, sp = PUFF_SPEED * (.4 + rand(st) * .8);
    spawn(st, hx, hy, hz, Math.cos(th) * Math.cos(el) * sp, Math.sin(el) * sp, Math.sin(th) * Math.cos(el) * sp, PUFF_LIFE * (.7 + rand(st) * .5));
  }
  st.twitch = {u: 0};
  st.puffs++;
}

// A blast of spores off the colony, biased toward `dir` (local [x, z], toward the attacker).
function blast(st, dir) {
  for (let i = 0; i < BLAST; i++) {
    let th = rand(st) * TAU;
    if (dir && rand(st) < .7) th = Math.atan2(dir[1], dir[0]) + (rand(st) - .5) * 1.5;
    const el = .1 + rand(st) * .9, sp = BLAST_SPEED * (.45 + rand(st) * .7), r = CROWN.r * (.3 + rand(st) * .5);
    spawn(st, Math.cos(th) * r, .06 + rand(st) * CROWN.y, Math.sin(th) * r,
      Math.cos(th) * Math.cos(el) * sp, Math.sin(el) * sp * .7, Math.sin(th) * Math.cos(el) * sp, BLAST_LIFE * (.7 + rand(st) * .5));
  }
  st.recoil = {u: 0};
}

function landedHit(a) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === 'hit' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Call once a frame (fidget.js does). A mold never walks, so `busy` only holds back a puff.
// Returns the state, or null.
export function updateSporePuff(a, dt, t, busy) {
  if (!spores(a)) return null;
  const st = a.sporePuff || (a.sporePuff = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow lands: a recoil and a blast of spores back toward the attacker
  const hit = dead ? null : landedHit(a);
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit;
    let dir = null;
    if (Array.isArray(hit.dir) && (hit.dir[0] || hit.dir[1])) {
      const yaw = a.g.rotation.y || 0, c = Math.cos(yaw), s = Math.sin(yaw), x = -hit.dir[0], z = -hit.dir[1];
      dir = [x * c - z * s, x * s + z * c];
    }
    blast(st, dir);
  }
  for (const k of ['twitch', 'recoil']) if (st[k]) { st[k].u += dt / (k === 'twitch' ? TWITCH_LEN : RECOIL_LEN); if (st[k].u >= 1) st[k] = null; }
  // puffs on their own clock, sometimes in a coughing run
  if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) {
      puff(st);
      if (++st.coughs < COUGH_MAX && rand(st) < COUGH) st.wait = COUGH_MIN + COUGH_SPAN * rand(st);
      else { st.coughs = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
    }
  }
  const tw = st.twitch ? twitchEnvelope(st.twitch.u) * w : 0, rc = st.recoil ? twitchEnvelope(st.recoil.u) * w : 0;

  // the colony breathes, twitches at a puff and recoils from a blow
  const breath = BREATH * w * (.7 * Math.sin(T * BREATH_HZ * TAU + st.ph) + .3 * Math.sin(T * BREATH_HZ * 2.7 * TAU + st.ph * 1.3));
  const draw = TWITCH * tw + RECOIL * rc;
  const sx = 1 + breath - draw, sz = 1 + breath - draw, sy = 1 + breath * .8 - draw * .5;
  for (const part of [st.colony, st.heads]) if (part) part.m.scale.set(part.scale.x * sx, part.scale.y * sy, part.scale.z * sz);

  const pos = st.cloud.geometry.attributes.position, col = st.cloud.geometry.attributes.color;
  // the pall hangs over the colony
  st.pall.forEach((m, i) => {
    const p = pallAt(((T / m.len) + m.off) % 1, m.r0, m.th), c = tint(m.tint);
    pos.setXYZ(i, p.x, p.y, p.z); col.setXYZW(i, c[0], c[1], c[2], p.alpha * w);
  });
  // puffs and blasts: thrown out, dragged to a hang, then a slow settle
  for (let i = 0; i < POOL; i++) {
    const p = st.pool[i], j = PALL + i;
    if (!p || p.age >= p.life) { pos.setXYZ(j, 0, .02, 0); col.setXYZW(j, 0, 0, 0, 0); continue; }
    p.age += dt;
    const drag = Math.exp(-DRAG * dt);
    p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag - SETTLE * DRAG * dt;
    p.x += p.vx * dt + .02 * Math.sin(T * 1.3 + i) * dt; p.y = Math.max(.01, p.y + p.vy * dt); p.z += p.vz * dt + .02 * Math.cos(T * 1.1 + i * 1.7) * dt;
    const c = tint(p.tint);
    pos.setXYZ(j, p.x, p.y, p.z); col.setXYZW(j, c[0], c[1], c[2], moteAlpha(p.age / p.life) * w);
  }
  if (dead && w === 0) st.pool.length = 0;
  pos.needsUpdate = col.needsUpdate = true;
  return st;
}

// The brown mold's cold (creature animation queue item 7). Its model is mold.js's lobed colony
// bristling with rime needles. In NetHack it never moves and never attacks; it just sits there
// and freezes whatever touches it (passive cold, and a nasty one). So it gets a still, patient,
// freezing idle and a cold answer to every blow:
//  - The colony breathes, very slowly, and cold mist wells off its crown, pours down over the
//    lobes and creeps out across the floor, the way cold air sinks.
//  - Now and then it sighs: the colony draws in, then a low ring of freezing fog rolls out across
//    the floor around it while the rime needles glint all at once, and it slowly fills back out.
//  - Glints twinkle along the rime needles on their own.
//  - When it is hit, a burst of frost blows off it, mostly back toward the attacker, and the
//    colony shudders.
//  - On death everything eases back to rest; the mist, fog and glints thin out to nothing.
//
// The module owns the colony and rime meshes' scale (nothing else writes them), plus two point
// clouds it adds: the mist, fog and frost (on the actor's group, so they stay on the floor) and
// the glints (on the body). The materials are shared; only the per-actor buffers change. Two
// extra draws per brown mold.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Breathing: share of rest scale, and rate (Hz).
export const BREATH = .022, BREATH_HZ = .13;
// A sigh: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart. It lasts SIGH_LEN s;
// the colony draws in by SIGH_DRAW at SIGH_PEAK of the way through and fills back out after.
export const FIRST_MIN = 2.5, FIRST_SPAN = 3, GAP_MIN = 5, GAP_SPAN = 6, SIGH_LEN = 3, SIGH_DRAW = .07, SIGH_PEAK = .14;
// The fog ring a sigh rolls out: motes, and how far it reaches.
export const FOG = 18, FOG_R0 = .22, FOG_R1 = .66, FOG_ALPHA = .34;
// Mist: wisps, seconds per wisp, peak opacity.
export const WISPS = 8, WISP_LEN = 4.2, WISP_ALPHA = .26;
// Frost burst on a hit: motes, life (s), launch speed, gravity, drag, peak opacity; the shudder (share, Hz, s).
export const BURST = 22, BURST_LIFE = 1.1, BURST_SPEED = .85, BURST_GRAVITY = 1, BURST_DRAG = 2.6, BURST_ALPHA = .6;
export const SHUDDER = .05, SHUDDER_HZ = 14, SHUDDER_LEN = .6;
// Glints on the rime.
export const GLINTS = 9;
// How fast the motion eases out after death (1/s).
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// The colony's crown (mold.js: the main lobe is .2 high and .25 wide).
const CROWN = {y: .19, r: .25};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

export const chills = a => !!(a && !a.asset && a.body && a.species === 'brown mold');

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// How far the colony is drawn in at sigh progress u (0..1): quickly in, slowly back out.
export function sighEnvelope(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return u < SIGH_PEAK ? smooth(u / SIGH_PEAK) : (1 - smooth((u - SIGH_PEAK) / (1 - SIGH_PEAK)));
}

// A mist wisp at progress u (0..1), starting at radius r0 and angle th: it wells up off the crown,
// pours down over the lobes and creeps out low across the floor.
export function wispAt(u, r0, th) {
  u = clamp01(u);
  const r = r0 + .42 * u ** 1.3, y = CROWN.y + .04 * Math.sin(Math.PI * Math.min(1, u * 2.5)) - .17 * smooth(u * 1.6);
  return {x: Math.cos(th) * r, y: Math.max(.02, y), z: Math.sin(th) * r, alpha: WISP_ALPHA * Math.sin(Math.PI * u) ** 1.4};
}

// A fog mote of a sigh at progress v (0..1) of its roll-out: low over the floor, sweeping outward.
export function fogAt(v, th, lift) {
  v = clamp01(v);
  const r = FOG_R0 + (FOG_R1 - FOG_R0) * (1 - (1 - v) ** 2);
  return {x: Math.cos(th) * r, y: .025 + lift * (1 - v), z: Math.sin(th) * r, alpha: FOG_ALPHA * smooth(v / .15) * (1 - v) ** 1.5};
}

// ---- shared resources (built once) ----
let shared = null;
function dotTexture(star) {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y);
    let a = clamp01(1 - d) ** 2;
    if (star) a = Math.max(clamp01(1 - d * 3.2), clamp01(1 - Math.abs(x) * 9) * clamp01(1 - Math.abs(y)) ** 2, clamp01(1 - Math.abs(y) * 9) * clamp01(1 - Math.abs(x)) ** 2);
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(a * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  return shared || (shared = {
    mistMat: new THREE.PointsMaterial({size: .1, map: dotTexture(false), vertexColors: true, transparent: true, depthWrite: false}),
    glintMat: new THREE.PointsMaterial({size: .065, map: dotTexture(true), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending}),
  });
}

function points(count, material, part) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .2, 0), 1.2);
  const p = new THREE.Points(geo, material);
  p.userData.part = part; p.frustumCulled = false; p.castShadow = p.receiveShadow = false;
  return p;
}

function setup(a) {
  const R = sharedResources(), kids = a.body.children.filter(m => m.isMesh);
  const rest = m => m && {m, scale: m.scale.clone()};
  const colony = rest(kids.find(m => m.userData.part === 'colony')), rime = rest(kids.find(m => m.userData.part === 'rime'));
  const st = {seed: ((a.g?.id ?? 1) * 7919) % 2147483647 || 1, t: 0, life: 1, sigh: null, shudder: null, wait: 0,
    colony, rime, burst: [], lastHit: null};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.mist = points(WISPS + FOG + BURST, R.mistMat, 'coldMist');
  a.g.add(st.mist);
  st.glints = points(GLINTS, R.glintMat, 'rimeGlints');
  a.body.add(st.glints);
  st.wisps = Array.from({length: WISPS}, (_, i) => ({off: i / WISPS + rand(st) * .08, r0: .03 + rand(st) * .12, th: rand(st) * TAU, len: WISP_LEN * (.85 + rand(st) * .3)}));
  st.fog = Array.from({length: FOG}, (_, i) => ({th: (i + rand(st) * .7) / FOG * TAU, lift: .01 + rand(st) * .04, lag: rand(st) * .12}));
  // glints sit on needle tips: rime vertices up on the lobes, not the frost flakes on the floor
  const src = rime?.m.geometry.attributes.position, up = [];
  if (src) for (let i = 0; i < src.count; i++) if (src.getY(i) > .05) up.push(i);
  st.glintAt = Array.from({length: GLINTS}, (_, i) => {
    let x, y, z;
    if (up.length) { const k = up[Math.floor(rand(st) * up.length)]; x = src.getX(k); y = src.getY(k); z = src.getZ(k); }
    else { const th = i * 2.399; x = Math.cos(th) * .15; y = .14; z = Math.sin(th) * .15; }
    return {x, y, z, hz: .25 + rand(st) * .3, ph: rand(st) * TAU};
  });
  return st;
}

const MIST = [.8, .88, .98], FOGC = [.72, .82, .95], FROST = [.88, .95, 1], GLINT = [.85, .94, 1];

// A frost burst off the colony, biased toward `dir` (local [x, z], toward the attacker).
function burst(st, dir) {
  st.burst.length = 0;
  for (let i = 0; i < BURST; i++) {
    let th = rand(st) * TAU;
    if (dir && rand(st) < .7) th = Math.atan2(dir[1], dir[0]) + (rand(st) - .5) * 1.7;
    const el = .15 + rand(st) * .8, sp = BURST_SPEED * (.55 + rand(st) * .6), r = CROWN.r * (.4 + rand(st) * .5);
    st.burst.push({x: Math.cos(th) * r, y: .06 + rand(st) * CROWN.y * .8, z: Math.sin(th) * r,
      vx: Math.cos(th) * Math.cos(el) * sp, vy: Math.sin(el) * sp * .8, vz: Math.sin(th) * Math.cos(el) * sp,
      age: 0, life: BURST_LIFE * (.7 + rand(st) * .5)});
  }
}

function landedHit(a) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === 'hit' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Call once a frame (fidget.js does). A mold never walks, so `busy` and `walking` are ignored
// except that a sigh waits while the mold is busy. Returns the state, or null.
export function updateMoldFrost(a, dt, t, busy) {
  if (!chills(a)) return null;
  const st = a.moldFrost || (a.moldFrost = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow lands: a shudder and a frost burst back toward the attacker
  const hit = dead ? null : landedHit(a);
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit;
    st.shudder = {u: 0};
    let dir = null;
    if (Array.isArray(hit.dir) && (hit.dir[0] || hit.dir[1])) {
      const yaw = a.g.rotation.y || 0, c = Math.cos(yaw), s = Math.sin(yaw), x = -hit.dir[0], z = -hit.dir[1];
      dir = [x * c - z * s, x * s + z * c];
    }
    burst(st, dir);
  }
  if (st.shudder) { st.shudder.u += dt / SHUDDER_LEN; if (st.shudder.u >= 1) st.shudder = null; }
  // sighs on their own clock
  if (st.sigh) { st.sigh.u += dt / SIGH_LEN; if (st.sigh.u >= 1) st.sigh = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.sigh = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const sigh = st.sigh ? sighEnvelope(st.sigh.u) * w : 0;
  const shu = st.shudder ? (1 - st.shudder.u) ** 2 * w : 0;

  // the colony breathes, draws in for a sigh and shudders when struck
  const breath = BREATH * w * (.7 * Math.sin(T * BREATH_HZ * TAU + st.ph) + .3 * Math.sin(T * BREATH_HZ * 2.3 * TAU + st.ph * 1.7));
  const qa = SHUDDER * shu * Math.sin(T * SHUDDER_HZ * TAU), qb = SHUDDER * shu * Math.sin(T * SHUDDER_HZ * 1.17 * TAU + 1.3);
  const sx = 1 + breath - SIGH_DRAW * sigh + qa, sz = 1 + breath - SIGH_DRAW * sigh + qb, sy = 1 + breath * .8 - SIGH_DRAW * .6 * sigh - .5 * (qa + qb);
  for (const part of [st.colony, st.rime]) if (part) part.m.scale.set(part.scale.x * sx, part.scale.y * sy, part.scale.z * sz);

  const pos = st.mist.geometry.attributes.position, col = st.mist.geometry.attributes.color;
  // mist wells off the crown and sinks out across the floor
  st.wisps.forEach((wp, i) => {
    const p = wispAt(((T / wp.len) + wp.off) % 1, wp.r0, wp.th + .2 * Math.sin(T * .21 + i));
    pos.setXYZ(i, p.x, p.y, p.z); col.setXYZW(i, MIST[0], MIST[1], MIST[2], p.alpha * w);
  });
  // a sigh's fog rolls out once the colony has drawn in
  const rollU = st.sigh ? (st.sigh.u - SIGH_PEAK * .6) / (1 - SIGH_PEAK * .6) : -1;
  st.fog.forEach((f, i) => {
    const j = WISPS + i, v = (rollU - f.lag) / (1 - f.lag);
    if (!(v > 0 && v < 1)) { pos.setXYZ(j, 0, .02, 0); col.setXYZW(j, 0, 0, 0, 0); return; }
    const p = fogAt(v, f.th + .25 * v, f.lift);
    pos.setXYZ(j, p.x, p.y, p.z); col.setXYZW(j, FOGC[0], FOGC[1], FOGC[2], p.alpha * w);
  });
  // the frost burst: thrown out, dragged, settling to the floor
  for (let i = 0; i < BURST; i++) {
    const p = st.burst[i], j = WISPS + FOG + i;
    if (!p || p.age >= p.life) { pos.setXYZ(j, 0, .02, 0); col.setXYZW(j, 0, 0, 0, 0); continue; }
    p.age += dt;
    const drag = Math.exp(-BURST_DRAG * dt);
    p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag - BURST_GRAVITY * dt;
    p.x += p.vx * dt; p.y = Math.max(.015, p.y + p.vy * dt); p.z += p.vz * dt;
    const u = clamp01(p.age / p.life);
    pos.setXYZ(j, p.x, p.y, p.z); col.setXYZW(j, FROST[0], FROST[1], FROST[2], BURST_ALPHA * smooth(u / .06) * (1 - u) ** 1.3 * w);
  }
  if (dead && w === 0) st.burst.length = 0;
  pos.needsUpdate = col.needsUpdate = true;

  // glints twinkle on the needle tips, riding the colony's scale; all flare in a sigh or a blow
  const gp = st.glints.geometry.attributes.position, gc = st.glints.geometry.attributes.color;
  const flare = Math.min(1, sigh * 1.2 + shu);
  st.glintAt.forEach((g, i) => {
    const tw = Math.max(0, Math.sin(T * g.hz * TAU + g.ph)) ** 14;
    const b = clamp01((tw + .85 * flare * (.6 + .4 * Math.abs(Math.sin(T * 19 + i * 2.3)))) * w);
    gp.setXYZ(i, g.x * sx, g.y * sy, g.z * sz);
    gc.setXYZW(i, GLINT[0], GLINT[1], GLINT[2], b);
  });
  gp.needsUpdate = gc.needsUpdate = true;
  return st;
}

// The puddings' heave (creature animation queue item 7, "black pudding heave"). Their model is
// creatures.js's round blob: a translucent mound (the skin, a sphere squashed to .72 high), a dark
// nucleus inside, and five small lobes slumped round its foot. In NetHack a pudding is a slow, mindless
// mass that eats through iron and splits in two when struck with it. So it never sits quite still:
//  - Lumps roll slowly under the skin, as if something is shifting about inside it, and a faint
//    ripple climbs from its foot to its crown.
//  - The lobes creep out and draw back in like groping pseudopods.
//  - Now and then it heaves: it sinks and spreads, gathering itself, then surges up and lurches
//    forward, the lobes in front reaching out, and a ripple runs back over it as it sags to rest.
//    The nucleus is dragged up with the surge and sinks after.
//  - When it is hit, a ripple rings out from the blow over the skin, and a bud swells out on the far
//    side, straining as if to split away (its division), before it is sucked back in.
//  - On death everything eases back to rest: the skin's vertices end exactly where they began.
//
// The skin is reshaped vertex by vertex (each blob builds its own SphereGeometry, so nothing is
// shared). The module owns the skin, nucleus and lobes' scale, position and rotation for the
// puddings only (acid-fizz.js and jelly-frost.js handle the jellies). No extra draws.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Slow lumps under the skin: how many, their height (share of the radius) and how tight they are.
export const LUMPS = 3, LUMP = .09, LUMP_TIGHT = 4;
// The climbing ripple: share of the radius, and rate (Hz).
export const RIPPLE = .025, RIPPLE_HZ = .35;
// Breathing: share of rest scale, and rate (Hz).
export const BREATH = .025, BREATH_HZ = .13;
// A heave: how long (s), how far it sinks and then surges (share of rest height), and how far it
// lurches forward (+z, local units). First after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart.
export const HEAVE_LEN = 2.6, SINK = .14, SURGE = .2, LURCH = .05;
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 3.5, GAP_SPAN = 5;
// A hit: the ring ripple's height, how long it lasts (s); the bud's height and how long it strains (s).
export const HIT_RING = .1, HIT_LEN = 1.1, BUD = .3, BUD_LEN = 1.6;
// How fast the motion eases out after death (1/s), and in from walking.
export const REST_RATE = 2.5, WALK_RATE = 4;
const SNAP = 1e-3;

export const PUDDINGS = {
  // the black pudding is the biggest and slowest; the brown pudding a little brisker and smaller
  'black pudding': {amp: 1, rate: 1},
  'brown pudding': {amp: .8, rate: 1.25},
};
export const heaves = a => !!(a && !a.asset && a.body && PUDDINGS[a.species]);

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

// Deterministic per-actor randoms (a small LCG), so tests are repeatable.
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The heave at progress u (0..1): {sink, surge, lurch, ripple}, each 0..1. It sinks and spreads over
// the first quarter, surges up and forward through the middle, then sags back with a ripple.
export function heaveEnvelope(u) {
  if (!(u > 0) || !(u < 1)) return {sink: 0, surge: 0, lurch: 0, ripple: 0};
  const sink = smooth(u / .22) * (1 - smooth((u - .22) / .16));
  const surge = smooth((u - .25) / .2) * (1 - smooth((u - .5) / .4));
  const lurch = smooth((u - .28) / .22) * (1 - smooth((u - .6) / .4));
  const ripple = smooth((u - .5) / .1) * (1 - smooth((u - .6) / .4));
  return {sink, surge, lurch, ripple};
}

// The bud's swell at progress u (0..1): swells and strains, then is sucked back in.
export function budEnvelope(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .3) * (1 - smooth((u - .55) / .45));
}

// The skin's radial offset (share of the radius) for unit direction (nx, ny, nz) in the sphere's
// frame. `f` carries the lumps, ripple phases, hit and bud for this frame; `w` scales it all.
export function skinOffset(nx, ny, nz, f) {
  let s = 0;
  for (const l of f.lumps) {
    const d = nx * l.x + ny * l.y + nz * l.z;
    if (d > 0) s += l.a * d ** LUMP_TIGHT;
  }
  // a ripple climbing from the foot to the crown, strongest round the middle
  s += f.ripple * Math.sin(6 * ny - f.ripplePhase) * (1 - ny * ny);
  // the heave's ripple runs from front (+z) to back
  if (f.wave) s += f.wave * Math.sin(7 * nz + f.wavePhase) * (1 - ny * ny);
  // the ring ripple out from the blow
  if (f.hit) {
    const ang = Math.acos(Math.max(-1, Math.min(1, nx * f.hit.x + ny * f.hit.y + nz * f.hit.z)));
    const front = f.hit.age * 5;
    if (ang < front + .3) s += f.hit.a * Math.sin(10 * ang - f.hit.age * 22) * Math.exp(-ang * .8) * clamp01((front + .3 - ang) / .3);
  }
  // the bud straining to split away
  if (f.bud) {
    const d = nx * f.bud.x + ny * f.bud.y + nz * f.bud.z;
    if (d > 0) s += f.bud.a * d ** 8;
  }
  // nothing pushes the foot down through the floor
  if (s > 0 && ny < -.3) s *= smooth((ny + .95) / .65);
  return s * f.w;
}

function setup(a) {
  const kids = a.body.children.filter(m => m.isMesh);
  const rest = m => m && {m, scale: m.scale.clone(), rot: m.rotation.clone(), pos: m.position.clone()};
  const skin = rest(kids.find(m => m.geometry?.type === 'SphereGeometry' && m.material?.transparent && m.geometry.parameters?.radius > .2));
  const nucleus = rest(kids.find(m => m.geometry?.type === 'SphereGeometry' && !m.material?.transparent));
  const lobes = kids.filter(m => m !== skin?.m && m.geometry?.type === 'SphereGeometry' && m.material?.transparent).map(rest);
  const st = {seed: ((a.g?.id ?? 1) * 7919 + 271) % 2147483647 || 1, t: 0, life: 1, walk: 0, wait: 0,
    heave: null, hit: null, bud: null, lastHit: null, skin, nucleus, lobes};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.lumps = Array.from({length: LUMPS}, () => ({th: rand(st) * TAU, sp: (.12 + rand(st) * .12) * (rand(st) < .5 ? -1 : 1),
    el: rand(st) * TAU, elSp: .1 + rand(st) * .1, a: LUMP * (.6 + rand(st) * .4), x: 0, y: 0, z: 0}));
  st.lobePh = lobes.map(() => rand(st) * TAU);
  if (skin) {
    const geo = skin.m.geometry, pos = geo.attributes.position, n = pos.count, r = geo.parameters.radius;
    st.r = r;
    st.rest = Float32Array.from(pos.array);
    st.dir = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), l = Math.hypot(x, y, z) || 1;
      st.dir[i * 3] = x / l; st.dir[i * 3 + 1] = y / l; st.dir[i * 3 + 2] = z / l;
    }
    // vertices that share a spot (the UV seam and the poles): their normals are averaged after each
    // recompute, so the reshaped skin shows no seam
    const key = i => `${st.rest[i * 3].toFixed(4)},${st.rest[i * 3 + 1].toFixed(4)},${st.rest[i * 3 + 2].toFixed(4)}`, groups = new Map();
    for (let i = 0; i < n; i++) { const k = key(i); (groups.get(k) || groups.set(k, []).get(k)).push(i); }
    st.seams = [...groups.values()].filter(g => g.length > 1);
    st.restNormal = Float32Array.from(geo.attributes.normal.array);
    // room for the bud and the lumps, so it isn't culled while reshaped
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), r * (1 + BUD + LUMP * 2 + SURGE));
  }
  return st;
}

function reshape(st, f) {
  const geo = st.skin.m.geometry, pos = geo.attributes.position, arr = pos.array, n = pos.count, r = st.r;
  if (!(f.w > 0)) {
    // at rest: exactly the original sphere
    if (st.shaped) { arr.set(st.rest); geo.attributes.normal.array.set(st.restNormal); pos.needsUpdate = geo.attributes.normal.needsUpdate = true; st.shaped = false; }
    return;
  }
  for (let i = 0; i < n; i++) {
    const nx = st.dir[i * 3], ny = st.dir[i * 3 + 1], nz = st.dir[i * 3 + 2], k = r * (1 + skinOffset(nx, ny, nz, f));
    arr[i * 3] = nx * k; arr[i * 3 + 1] = ny * k; arr[i * 3 + 2] = nz * k;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  for (const g of st.seams) {
    let x = 0, y = 0, z = 0;
    for (const i of g) { x += nrm.getX(i); y += nrm.getY(i); z += nrm.getZ(i); }
    const l = Math.hypot(x, y, z) || 1;
    for (const i of g) nrm.setXYZ(i, x / l, y / l, z / l);
  }
  nrm.needsUpdate = true;
  st.shaped = true;
}

// The live hit action on this actor, once its blow has landed (a pounce's flinch waits for it).
function landedHit(a) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === 'hit' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Call once a frame (fidget.js does, before actions.js applies this frame's pose). `busy` is true
// while walking or acting, `walking` while sliding to a new cell. Returns the state, or null.
export function updatePuddingHeave(a, dt, t, busy, walking) {
  if (!heaves(a)) return null;
  const st = a.puddingHeave || (a.puddingHeave = setup(a));
  const kind = PUDDINGS[a.species], dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt * kind.rate;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, WALK_RATE, dt);
  if (st.walk < SNAP) st.walk = 0;
  const w = st.life * kind.amp;

  // a blow lands: a ring ripple from where it struck, and a bud straining out on the far side
  const hit = dead ? null : landedHit(a);
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit;
    // the blow travels attacker → pudding along hit.dir (world [x, z]); into the skin's frame
    let bx = 0, bz = 1;
    if (Array.isArray(hit.dir) && (hit.dir[0] || hit.dir[1])) {
      const yaw = a.g.rotation.y || 0, c = Math.cos(yaw), s = Math.sin(yaw), x = hit.dir[0], z = hit.dir[1];
      bx = x * c - z * s; bz = x * s + z * c;
      const l = Math.hypot(bx, bz) || 1; bx /= l; bz /= l;
    } else { const th = rand(st) * TAU; bx = Math.cos(th); bz = Math.sin(th); }
    st.hit = {x: -bx * .9, y: .3, z: -bz * .9, age: 0};
    const bl = Math.hypot(bx, .25, bz);
    st.bud = {x: bx / bl, y: -.25 / bl, z: bz / bl, u: 0};
    st.heave = null;
  }
  if (st.hit) { st.hit.age += dt; if (st.hit.age >= HIT_LEN) st.hit = null; }
  if (st.bud) { st.bud.u += dt / BUD_LEN; if (st.bud.u >= 1) st.bud = null; }
  // heaves on their own clock (not while sliding along or reeling from a blow)
  if (st.heave) { st.heave.u += dt * kind.rate / HEAVE_LEN; if (st.heave.u >= 1) st.heave = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0) { if (!walking && !st.bud) st.heave = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const h = st.heave ? heaveEnvelope(st.heave.u) : heaveEnvelope(0), still = 1 - st.walk;

  // lumps roll over the inside of the skin
  for (const l of st.lumps) {
    const th = l.th + l.sp * T, el = .5 * Math.sin(l.el + l.elSp * T);
    l.x = Math.cos(th) * Math.cos(el); l.y = Math.sin(el); l.z = Math.sin(th) * Math.cos(el);
  }
  const f = {
    w, lumps: st.lumps, ripple: RIPPLE, ripplePhase: T * RIPPLE_HZ * TAU + st.ph,
    wave: .06 * h.ripple * still, wavePhase: T * 9,
    hit: st.hit && {...st.hit, a: HIT_RING * (1 - st.hit.age / HIT_LEN)},
    bud: st.bud && {...st.bud, a: BUD * budEnvelope(st.bud.u)},
  };
  if (st.skin) reshape(st, f);

  // the whole mound breathes, sinks and spreads, surges and lurches; walking stretches it forward
  const breath = BREATH * w * Math.sin(T * BREATH_HZ * TAU + st.ph);
  const sy = 1 - breath * 1.3 + (SURGE * h.surge - SINK * h.sink) * w * still - .06 * st.walk * w;
  const sxz = 1 + breath + (SINK * .6 * h.sink - SURGE * .35 * h.surge) * w * still;
  const sz = sxz + .08 * st.walk * w;
  const lurch = LURCH * h.lurch * w * still;
  if (st.skin) {
    const s = st.skin, half = st.r * s.scale.y;
    s.m.scale.set(s.scale.x * sxz, s.scale.y * sy, s.scale.z * sz);
    // keep the foot on the floor as it sinks and rises; lean the crown into the lurch
    s.m.position.set(s.pos.x, s.pos.y + half * (sy - 1), s.pos.z + lurch);
    s.m.rotation.set(s.rot.x + 2.4 * lurch, s.rot.y, s.rot.z);
  }
  if (st.nucleus) {
    const n = st.nucleus, half = st.r * (st.skin?.scale.y ?? .72);
    // dragged up by the surge a beat late, then sinking back; drifting slowly round inside otherwise
    n.m.position.set(n.pos.x + .025 * w * Math.sin(T * .31 + st.ph), n.pos.y + half * (sy - 1) + .05 * w * h.lurch * still,
      n.pos.z + .025 * w * Math.cos(T * .23 + st.ph) + lurch * 1.4);
    n.m.rotation.set(n.rot.x, n.rot.y + .5 * w * Math.sin(T * .11 + st.ph), n.rot.z);
  }
  st.lobes.forEach((r, i) => {
    // groping in and out; the ones in front reach out in a lurch
    const ang = Math.atan2(r.pos.z, r.pos.x), front = Math.max(0, Math.sin(ang));
    const reach = 1 + w * (.18 * Math.sin(T * .4 + st.lobePh[i]) + .45 * front * h.lurch * still + .2 * h.sink * still);
    r.m.position.set(r.pos.x * reach, r.pos.y, r.pos.z * reach);
    const fat = 1 + w * (.12 * Math.sin(T * .55 + st.lobePh[i] * 1.7) - .15 * (reach - 1));
    r.m.scale.set(r.scale.x * fat * (1 + .3 * (reach - 1)), r.scale.y * fat, r.scale.z * fat);
  });
  return st;
}

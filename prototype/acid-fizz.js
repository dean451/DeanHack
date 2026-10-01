// The ochre jelly's acid (creature animation queue item 7, first entry). Its model is creatures.js's
// flat blob: a squat translucent dome (the skin), a dark nucleus inside, and six tendrils splayed on
// the floor. In NetHack it sits and dissolves: its engulf is acid, and anything that touches it gets
// burnt by its passive acid. The spotted jelly's passive is acid too, so it gets the same treatment.
//  - The floor under it is eaten away: a dark, wet, ragged etch with a sickly yellow-green rim that
//    glows faintly and pulses with the jelly.
//  - Acid bubbles well up from round the nucleus, swell as they rise through the dome and pop at the
//    skin, spitting a few droplets that fall and fizz out on the floor.
//  - Thin acrid fumes curl up off the rim of the etch.
//  - Now and then it seethes: the dome heaves in slow lumps, bubbles boil up three times as fast,
//    the rim glows hot and the fumes thicken.
//  - When it is hit, acid spatters off it, mostly toward the attacker, lands and fizzes on the floor
//    (its passive acid); the dome shudders.
//  - On death everything eases back to rest; the bubbles, fumes and the rim's glow die away, and the
//    dead etch stays.
//
// The module owns the skin, nucleus and tendrils' scale, position and rotation (jelly-frost.js
// writes them only for the blue jelly). It adds the etch (on the actor's group, so it stays on the
// floor; its own geometry, since the glow lives in its vertex alphas and applyFade swaps materials)
// and two point clouds: the bubbles (on the body, so they ride its heave) and the fumes and droplets
// (on the group). Three extra draws per jelly.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Breathing: share of rest scale, and rate (Hz).
export const BREATH = .03, BREATH_HZ = .17;
// A seethe: how hard the dome heaves (share of rest), how long (s), how much faster the bubbles
// rise, and the first one after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart.
export const HEAVE = .07, SEETHE_LEN = 1.8, BOIL = 3;
export const FIRST_MIN = 1.5, FIRST_SPAN = 2.5, GAP_MIN = 3, GAP_SPAN = 4.5;
// A hit's shudder: share of rest, rate (Hz) and how long (s).
export const SHUDDER = .08, SHUDDER_HZ = 13, SHUDDER_LEN = .6;
// Bubbles: how many, and seconds for one to rise through the dome (at rest; a seethe divides it by BOIL).
export const BUBBLES = 9, RISE = 2.6, BUBBLE_ALPHA = .75;
// Droplets: the pool, how many a pop spits and a hit spatters, launch speeds, gravity, and how long a
// landed droplet fizzes on the floor (s).
export const DROPS = 36, POP_DROPS = 2, SPATTER = 18, POP_SPEED = .35, SPAT_SPEED = 1.1, GRAVITY = 2.6, FIZZ = .9, DROP_ALPHA = .85;
// Fumes off the etch's rim: wisps, seconds per wisp, peak opacity.
export const FUMES = 6, FUME_LEN = 3, FUME_ALPHA = .22;
// The etch's rim glow (vertex alpha) at rest, its pulse, and its peak in a seethe or hit.
export const RIM = .3, RIM_PULSE = .08, RIM_HOT = .62, ETCH = .62;
// How fast the motion eases out after death (1/s), and in from walking.
export const REST_RATE = 2.5, WALK_RATE = 4;
const SNAP = 1e-3;

// The dome, as creatures.js's blob({flat:true}) builds it (radius .28, y-scale .45 at y .12).
const DOME = {y: .12, r: .28, h: .126};
const FLOOR = .012;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

export const ACID_JELLIES = ['ochre jelly', 'spotted jelly'];
export const fizzes = a => !!(a && !a.asset && a.body && ACID_JELLIES.includes(a.species));

// Deterministic per-actor randoms (a small LCG), so tests are repeatable.
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The seethe's strength at progress u (0..1): rises over the first third, ebbs away.
export function seetheEnvelope(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .3) * smooth((1 - u) / .5);
}

// A bubble at progress u (0..1) along its climb from near the nucleus at angle th, radius r0, to the
// skin. Position in the body's frame, size factor, and whether it has popped (u reached 1).
export function bubbleAt(u, r0, th) {
  u = clamp01(u);
  const r = r0 * (1 + .5 * u), y = DOME.y + DOME.h * (.05 + .9 * u ** 1.3);
  return {x: Math.cos(th) * r, y, z: Math.sin(th) * r, size: .35 + .65 * u, popped: u >= 1};
}

// A fume wisp at progress u (0..1), rising off the etch's rim at angle th: curls up and out, fades.
export function fumeAt(u, th, curl) {
  u = clamp01(u);
  const r = .33 + .08 * u, a = th + curl * u;
  return {x: Math.cos(a) * r, y: FLOOR + .32 * u, z: Math.sin(a) * r, alpha: FUME_ALPHA * Math.sin(Math.PI * u) ** 1.2};
}

// ---- shared resources (built once) ----
let shared = null;
function dotTexture(ring) {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y);
    // a bubble: a bright skin ring round a faint fill, with a highlight up and to the left
    const a = ring ? Math.max(clamp01(1 - Math.abs(d - .72) * 6) * .95, d < .72 ? .18 : 0, clamp01(1 - Math.hypot(x + .3, y - .3) * 6))
      : clamp01(1 - d) ** 2;
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(a * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  if (shared) return shared;
  shared = {
    etchMat: new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide}),
    bubbleMat: new THREE.PointsMaterial({size: .07, map: dotTexture(true), vertexColors: true, transparent: true, depthWrite: false}),
    fumeMat: new THREE.PointsMaterial({size: .1, map: dotTexture(false), vertexColors: true, transparent: true, depthWrite: false}),
  };
  return shared;
}

const ETCH_RAYS = 26;
const ETCH_DARK = [.09, .08, .03], RIM_C = [.78, .86, .22], BUBBLE_C = [.93, .95, .45], FUME_C = [.72, .78, .3], DROP_C = [.9, .92, .3];

// The etch: a fan from the centre, through a ragged inner ring (still dark), out to a jagged outer
// ring that carries the glowing rim. Built per actor, with its own seed, so no two etches match.
function etchGeometry(st) {
  const n = ETCH_RAYS, pos = [0, .004, 0], idx = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (rand(st) - .5) * .12, ri = .24 + rand(st) * .05, ro = ri + .06 + rand(st) * (i % 3 ? .06 : .16);
    pos.push(Math.cos(a) * ri, .004, Math.sin(a) * ri, Math.cos(a) * ro, .004, Math.sin(a) * ro);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ia = 1 + i * 2, ib = 1 + j * 2;
    idx.push(0, ia, ib, ia, ia + 1, ib + 1, ia, ib + 1, ib);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((1 + n * 2) * 4), 4));
  geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), .6);
  return geo;
}
function paintEtch(geo, glow) {
  const c = geo.attributes.color;
  c.setXYZW(0, ETCH_DARK[0], ETCH_DARK[1], ETCH_DARK[2], ETCH);
  for (let i = 0; i < ETCH_RAYS; i++) {
    c.setXYZW(1 + i * 2, ETCH_DARK[0], ETCH_DARK[1], ETCH_DARK[2], ETCH * .9);
    c.setXYZW(2 + i * 2, RIM_C[0], RIM_C[1], RIM_C[2], glow * (.75 + .25 * ((i * 7) % 4) / 3));
  }
  c.needsUpdate = true;
}

function points(count, material, part) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .25, 0), 1.4);
  const p = new THREE.Points(geo, material);
  p.userData.part = part; p.frustumCulled = false; p.castShadow = p.receiveShadow = false;
  return p;
}

function setup(a) {
  const R = sharedResources(), kids = a.body.children.filter(m => m.isMesh);
  const rest = m => m && {m, scale: m.scale.clone(), rot: m.rotation.clone(), pos: m.position.clone()};
  const skin = rest(kids.find(m => m.geometry?.type === 'SphereGeometry' && m.material?.transparent));
  const nucleus = rest(kids.find(m => m.geometry?.type === 'SphereGeometry' && !m.material?.transparent));
  const tendrils = kids.filter(m => m.geometry?.type === 'TubeGeometry').map(rest);
  const st = {seed: ((a.g?.id ?? 1) * 7919 + 101) % 2147483647 || 1, t: 0, life: 1, walk: 0, wait: 0, seethe: null, shudder: null,
    heat: 0, skin, nucleus, tendrils, drops: [], next: 0, lastHit: null};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.etch = new THREE.Mesh(etchGeometry(st), R.etchMat);
  st.etch.userData.part = 'acidEtch';
  st.etch.castShadow = st.etch.receiveShadow = false; st.etch.renderOrder = -2;
  paintEtch(st.etch.geometry, RIM);
  a.g.add(st.etch);
  st.bubbles = points(BUBBLES, R.bubbleMat, 'acidBubbles');
  a.body.add(st.bubbles);
  st.fumes = points(FUMES + DROPS, R.fumeMat, 'acidFumes');
  a.g.add(st.fumes);
  st.bub = Array.from({length: BUBBLES}, (_, i) => ({u: i / BUBBLES + rand(st) * .08, r0: .03 + rand(st) * .11, th: rand(st) * TAU, sp: .8 + rand(st) * .4}));
  st.fume = Array.from({length: FUMES}, (_, i) => ({off: i / FUMES + rand(st) * .1, th: rand(st) * TAU, curl: (rand(st) - .5) * 1.2, len: FUME_LEN * (.85 + rand(st) * .3)}));
  return st;
}

// Throws a droplet from (x, y, z) in the group's frame, heading th with speed sp and lift el.
function spit(st, x, y, z, th, sp, el) {
  const d = {x, y, z, vx: Math.cos(th) * Math.cos(el) * sp, vy: Math.sin(el) * sp, vz: Math.sin(th) * Math.cos(el) * sp, age: 0, landed: null};
  st.drops[st.next] = d; st.next = (st.next + 1) % DROPS;
}

// A hit's spatter: droplets burst off the dome, biased toward `dir` (local [x, z], toward the attacker).
function spatter(st, dir) {
  for (let i = 0; i < SPATTER; i++) {
    let th = rand(st) * TAU;
    if (dir && rand(st) < .7) th = Math.atan2(dir[1], dir[0]) + (rand(st) - .5) * 1.6;
    const r = DOME.r * (.6 + rand(st) * .4);
    spit(st, Math.cos(th) * r, DOME.y + .02 + rand(st) * DOME.h, Math.sin(th) * r, th, SPAT_SPEED * (.5 + rand(st) * .6), .3 + rand(st) * .8);
  }
}

// The live hit action on this actor, once its blow has landed (a pounce's flinch waits for it).
function landedHit(a) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === 'hit' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Call once a frame (fidget.js does, before actions.js applies this frame's pose). `busy` is true
// while walking or acting, `walking` while sliding to a new cell. Returns the state, or null.
export function updateAcidFizz(a, dt, t, busy, walking) {
  if (!fizzes(a)) return null;
  const st = a.acidFizz || (a.acidFizz = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, WALK_RATE, dt);
  if (st.walk < SNAP) st.walk = 0;
  const w = st.life;

  // a blow lands: a shudder, a hot flash of the rim and a spatter of acid toward the attacker
  const hit = dead ? null : landedHit(a);
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit;
    st.shudder = {u: 0};
    st.heat = 1;
    let dir = null;
    if (Array.isArray(hit.dir) && (hit.dir[0] || hit.dir[1])) {
      // the blow travels attacker → jelly; the spatter goes back the other way, in the group's frame
      const yaw = a.g.rotation.y || 0, c = Math.cos(yaw), s = Math.sin(yaw), x = -hit.dir[0], z = -hit.dir[1];
      dir = [x * c - z * s, x * s + z * c];
    }
    spatter(st, dir);
  }
  if (st.shudder) { st.shudder.u += dt / SHUDDER_LEN; if (st.shudder.u >= 1) st.shudder = null; }
  // seethes on their own clock (not while sliding along)
  if (st.seethe) { st.seethe.u += dt / SEETHE_LEN; if (st.seethe.u >= 1) st.seethe = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0) { if (!walking) st.seethe = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const boil = st.seethe ? seetheEnvelope(st.seethe.u) * w * (1 - st.walk) : 0;
  const shake = st.shudder ? (1 - st.shudder.u) ** 2 * w : 0;
  st.heat = Math.max(boil, st.heat * Math.exp(-1.8 * dt));
  if (st.heat < SNAP) st.heat = 0;

  // the dome breathes, heaves in lumps while it seethes, and shudders when hit; the tendrils writhe
  const breath = BREATH * w * (.7 * Math.sin(T * BREATH_HZ * TAU + st.ph) + .3 * Math.sin(T * BREATH_HZ * 3.1 * TAU + st.ph * 2));
  const la = HEAVE * boil * Math.sin(T * 2.3 * TAU + st.ph), lb = HEAVE * boil * Math.sin(T * 1.7 * TAU + st.ph + 2.1);
  const qa = SHUDDER * shake * Math.sin(T * SHUDDER_HZ * TAU), qb = SHUDDER * shake * Math.sin(T * SHUDDER_HZ * 1.19 * TAU + 1.3);
  const sx = 1 + breath + la + qa, sz = 1 + breath + lb + qb, sy = 1 - breath * 1.3 - .5 * (la + lb + qa + qb) / 2 + .4 * HEAVE * boil;
  if (st.skin) st.skin.m.scale.set(st.skin.scale.x * sx, st.skin.scale.y * sy, st.skin.scale.z * sz);
  if (st.nucleus) {
    const n = st.nucleus;
    n.m.position.set(n.pos.x + .02 * boil * Math.sin(T * 1.9 * TAU), n.pos.y - DOME.h * breath * .5 + .015 * boil, n.pos.z + .02 * boil * Math.cos(T * 1.4 * TAU));
    n.m.rotation.set(n.rot.x, n.rot.y + .4 * w * Math.sin(T * .13 + st.ph), n.rot.z);
  }
  st.tendrils.forEach((r, i) => {
    const writhe = .05 * w * Math.sin(T * .7 + i * 1.9 + st.ph) + .12 * boil * Math.sin(T * 5 + i * 2.3) + .1 * shake * Math.sin(T * 17 + i);
    r.m.rotation.set(r.rot.x, r.rot.y + writhe, r.rot.z);
    r.m.scale.set(r.scale.x * (1 + breath * .5), r.scale.y, r.scale.z * (1 + breath * .5));
  });

  // the etch's rim glows: a slow pulse, hot while seething or just hit; dead acid stops glowing
  const glow = RIM * w * (1 + RIM_PULSE / RIM * Math.sin(T * BREATH_HZ * TAU + st.ph)) + (RIM_HOT - RIM) * st.heat * w;
  paintEtch(st.etch.geometry, clamp01(glow));
  st.etch.scale.setScalar(1 - .3 * st.walk);

  // bubbles climb from the nucleus and swell; at the skin they pop and spit
  const bp = st.bubbles.geometry.attributes.position, bc = st.bubbles.geometry.attributes.color;
  const rate = (1 + (BOIL - 1) * boil) / RISE;
  st.bub.forEach((b, i) => {
    if (w > 0) b.u += dt * rate * b.sp;
    if (b.u >= 1) {
      // pop: spit a couple of droplets up off the skin (group frame: the body only bobs in y)
      const p = bubbleAt(1, b.r0, b.th);
      if (w > .5 && !walking) for (let k = 0; k < POP_DROPS; k++) spit(st, p.x * sx, p.y * sy + (a.body.position.y || 0), p.z * sz, b.th + (rand(st) - .5) * 2, POP_SPEED * (.5 + rand(st)), .9 + rand(st) * .5);
      b.u -= 1; b.r0 = .03 + rand(st) * .11; b.th = rand(st) * TAU;
    }
    const p = bubbleAt(b.u, b.r0, b.th);
    bp.setXYZ(i, p.x * sx, DOME.y + (p.y - DOME.y) * sy, p.z * sz);
    // fade in deep inside, brightest just before it pops
    bc.setXYZW(i, BUBBLE_C[0], BUBBLE_C[1], BUBBLE_C[2], BUBBLE_ALPHA * w * smooth(b.u / .25) * (.5 + .5 * b.u) * (1 - .6 * st.walk));
  });
  bp.needsUpdate = bc.needsUpdate = true;

  // fumes curl up off the rim; they thicken in a seethe and thin out after death
  const fp = st.fumes.geometry.attributes.position, fc = st.fumes.geometry.attributes.color;
  st.fume.forEach((f, i) => {
    const p = fumeAt(((T / f.len) + f.off) % 1, f.th + .1 * Math.sin(T * .2 + i), f.curl);
    fp.setXYZ(i, p.x, p.y, p.z);
    fc.setXYZW(i, FUME_C[0], FUME_C[1], FUME_C[2], p.alpha * w * (1 + 1.5 * st.heat) * (1 - .6 * st.walk));
  });
  // droplets: arc through the air, land and fizz out where they fall
  for (let i = 0; i < DROPS; i++) {
    const d = st.drops[i], j = FUMES + i;
    if (!d) { fp.setXYZ(j, 0, FLOOR, 0); fc.setXYZW(j, 0, 0, 0, 0); continue; }
    d.age += dt;
    if (d.landed == null) {
      d.vy -= GRAVITY * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      if (d.y <= FLOOR) { d.y = FLOOR; d.landed = 0; }
    } else d.landed += dt;
    const fizz = d.landed == null ? 1 : clamp01(1 - d.landed / FIZZ) * (.6 + .4 * Math.abs(Math.sin(d.landed * 31 + i)));
    fp.setXYZ(j, d.x, d.y, d.z);
    fc.setXYZW(j, DROP_C[0], DROP_C[1], DROP_C[2], DROP_ALPHA * fizz * (dead ? w : 1));
    if (d.landed != null && d.landed >= FIZZ) st.drops[i] = null;
  }
  if (dead && w === 0) st.drops.fill(null);
  fp.needsUpdate = fc.needsUpdate = true;
  return st;
}

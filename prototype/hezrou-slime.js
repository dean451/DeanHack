// The hezrou's slime and stench (creature animation queue item 2, part 2). hezrou-gurgle.js already
// stretches and snaps its drool and swells its throat sac; this adds what drips off it:
//  - Slime drops: each time a drool string snaps, a gob falls from its tip; between those, slime
//    beads off the claws and the bottom of the throat sac now and then. A gob stretches as it falls,
//    splats flat on the floor and soaks into the puddle.
//  - The puddle: a ragged, dark, glossy green-black pool under it with a sickly sheen on its rim.
//    Every gob that lands spreads it; it slowly dries back, faster while the hezrou walks (so it
//    doesn't look like it carries a puddle along). It never dries below a small wet patch.
//  - Stench: a faint, slow yellow-green haze that hangs about its body and rolls lazily round it.
//    A gurgle's belch spews a thicker puff of it forward from the maw.
//  - A blow knocks a spray of gobs off it, flung away from the attacker.
//  - Wet prints: as it walks it leaves a trail of webbed, three-toed clawed prints, left and right
//    in turn. They stay where they were trodden on the floor, glossy at first, then dry dark and fade.
//    The first prints off the puddle are the wettest; the trail thins as its feet dry.
//  - On death nothing new drips and the haze thins away; gobs already falling still land, and the
//    puddle stays where it is. A dead one leaves no more prints, and the old ones go on drying.
//
// Four extra draws per hezrou: the puddle (a mesh on the actor's group, at the floor), the prints
// (one mesh on the group, its quads re-placed each frame from fixed world spots) and two point clouds
// on the group (the gobs and the haze). The module never moves the model itself.
import * as THREE from 'three';
import {STRETCH} from './hezrou-gurgle.js';

const TAU = Math.PI * 2, FLOOR = .012;
// Gobs: the pool, gravity (units/s²), how long a splat lingers (s), the bead drips off claws and sac
// (first after BEAD_MIN..+BEAD_SPAN s, then that apart), and how many a blow knocks off and how fast.
export const GOBS = 28, GRAVITY = 2.4, SPLAT = 1.1, BEAD_MIN = .7, BEAD_SPAN = 1.6, SPRAY = 9, SPRAY_SPEED = .9, GOB_ALPHA = .9;
// The puddle: its wetness 0..1 at the start, the least it dries to, how much one gob adds, and how
// fast it dries (1/s) standing and walking. Its radius at full wetness, in the group's frame.
export const WET0 = .45, WET_MIN = .25, SOAK = .035, DRY = .03, DRY_WALK = .5, POOL_R = .42;
// Haze: points, peak opacity at rest and in a belch, and its slow roll (rad/s).
export const HAZE = 10, HAZE_ALPHA = .13, BELCH_ALPHA = .34, ROLL = .25;
// How fast the haze thins after death (1/s), and its share while walking.
export const REST_RATE = 2, WALK_RATE = 4, WALK_HAZE = .55;
// Prints: how many, one per STEP of ground covered, FOOT_X out to the side; their size, peak
// opacity, how long they stay glossy (s) and how long until they're gone (s). A jump further than
// JUMP in one frame (a teleport, a new level) starts a fresh trail; prints further than FAR away go.
export const PRINTS = 14, STEP = .3, FOOT_X = .13, PRINT_LEN = .24, PRINT_W = .2, PRINT_ALPHA = .75, PRINT_WET = 1.5, PRINT_LIFE = 8, JUMP = 1.5, FAR = 8;
const SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

// A print's opacity share (0..1) at `age` s: it presses in, stays wet a while, then dries away.
export function printFade(age) {
  if (!(age >= 0) || age >= PRINT_LIFE) return 0;
  return smooth(age / .12) * (1 - smooth((age - PRINT_WET) / (PRINT_LIFE - PRINT_WET)));
}
// How much a print shows for the puddle's wetness when it was trodden: wettest off the full puddle.
export const printStrength = wet => .45 + .55 * smooth((wet - WET_MIN) / (.65 - WET_MIN));

export const slimes = a => !!(a && !a.asset && a.kind === 'hezrou' && a.g && a.body && a.drools?.length);

// Deterministic per-actor randoms (a small LCG), so tests are repeatable.
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// How strongly a gurgle's belch spews haze at gurgle progress u (hezrou-gurgle.js: the belch is .62–.7).
export function belchPuff(u) {
  if (!(u > .6) || !(u < 1)) return 0;
  return smooth((u - .6) / .06) * smooth((1 - u) / .3);
}

// A haze mote at time T from its seeds: a slow orbit round the body, bobbing between knee and head.
// Returns {x, y, z, size} in the group's frame (the hezrou is about 1.2 tall).
export function hazeAt([a, b, c, d], T) {
  const th = a * TAU + T * ROLL * (.6 + .8 * b), r = .28 + .2 * c + .05 * Math.sin(T * .7 + d * TAU);
  return {x: Math.cos(th) * r, y: .3 + .7 * d + .08 * Math.sin(T * .5 + a * TAU), z: Math.sin(th) * r, size: .8 + .4 * Math.sin(T * .9 + b * TAU)};
}

// ---- shared resources (built once) ----
let shared = null;
function softDot() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - Math.hypot(x, y)) ** 1.6 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
// A webbed foot with three clawed toes, toes toward +v: a heel pad, three splayed toes with hooked
// claw tips and a thinner web between them, with a slightly ragged edge.
export function printMask(u, v) {
  const ell = (x, y, cx, cy, rx, ry, a = 0) => {
    const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
    return Math.hypot((dx * c - dy * s) / rx, (dx * s + dy * c) / ry);
  };
  const soft = d => clamp01((1 - d) / .25);
  let m = soft(ell(u, v, 0, -.42, .34, .4));
  for (const a of [-.5, 0, .5]) {
    const cx = Math.sin(a) * .5, cy = -.12 + Math.cos(a) * .5;
    m = Math.max(m, soft(ell(u, v, cx, cy, .13, .32, a)));
    m = Math.max(m, soft(ell(u, v, Math.sin(a) * .86, -.12 + Math.cos(a) * .86, .04, .12, a + .25)));
  }
  m = Math.max(m, .5 * soft(ell(u, v, 0, .12, .44, .36)));
  return m * (.85 + .15 * Math.sin(u * 23 + v * 17) * Math.sin(u * 11 - v * 29));
}
function printTexture() {
  const n = 48, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255;
    data[k + 3] = Math.round(clamp01(printMask((i + .5) / n * 2 - 1, (j + .5) / n * 2 - 1)) * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  if (shared) return shared;
  const dot = softDot();
  shared = {
    poolMat: new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide}),
    printMat: new THREE.MeshBasicMaterial({map: printTexture(), vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, side: THREE.DoubleSide}),
    gobMat: new THREE.PointsMaterial({size: .05, map: dot, vertexColors: true, transparent: true, depthWrite: false}),
    hazeMat: new THREE.PointsMaterial({size: .5, map: dot, vertexColors: true, transparent: true, depthWrite: false}),
  };
  return shared;
}

const POOL_RAYS = 24;
const POOL_DARK = [.06, .1, .03], POOL_RIM = [.36, .5, .1], GOB_C = [.42, .6, .12], HAZE_C = [.56, .62, .2];

// The puddle: a fan from the centre out to a lobed, ragged rim, built per actor so no two match.
// Unit radius; the mesh is scaled to the puddle's size each frame.
function poolGeometry(st) {
  const n = POOL_RAYS, pos = [0, .005, 0], idx = [];
  const lobes = 2 + Math.floor(rand(st) * 3), lp = rand(st) * TAU;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (rand(st) - .5) * .1, ro = .75 + .2 * Math.sin(a * lobes + lp) + rand(st) * .12, ri = ro * (.72 + rand(st) * .08);
    pos.push(Math.cos(a) * ri, .005, Math.sin(a) * ri, Math.cos(a) * ro, .005, Math.sin(a) * ro);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ia = 1 + i * 2, ib = 1 + j * 2;
    idx.push(0, ia, ib, ia, ia + 1, ib + 1, ia, ib + 1, ib);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  const col = new Float32Array((1 + n * 2) * 4);
  for (let k = 0; k < 1 + n * 2; k++) {
    const rim = k > 0 && k % 2 === 0, c = rim ? POOL_RIM : POOL_DARK;
    col.set([...c, rim ? .32 : .72], k * 4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.2);
  return geo;
}

// The prints: PRINTS quads whose corners are re-placed every frame; UVs are set per print (a left
// foot is the right one mirrored).
function printMesh(material) {
  const geo = new THREE.BufferGeometry(), idx = [];
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PRINTS * 12), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(PRINTS * 8), 2));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PRINTS * 16), 4));
  for (let i = 0; i < PRINTS; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, material);
  m.frustumCulled = false; m.renderOrder = -3; m.userData.part = 'hezrouPrints';
  m.castShadow = m.receiveShadow = false;
  return m;
}

function points(count, material, part) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  const p = new THREE.Points(geo, material);
  p.frustumCulled = false; p.renderOrder = 2; p.userData.part = part;
  return p;
}

// Lowest point of a mesh's geometry, in its parent group's frame: where slime beads off a claw.
function tipOf(group) {
  const m = group.children.find(c => c.isMesh);
  if (!m) return null;
  m.geometry.computeBoundingBox();
  const b = m.geometry.boundingBox;
  return new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + .01, (b.min.z + b.max.z) / 2).applyMatrix4(m.matrix);
}

function setup(a) {
  const R = sharedResources();
  const st = {seed: ((a.g.id ?? 1) * 69069) % 2147483647 || 1, t: 0, life: 1, walk: 0, wet: WET0,
    gobs: new Array(GOBS).fill(null), next: 0, snaps: [], lastHit: null, belch: 0};
  st.bead = BEAD_MIN + BEAD_SPAN * rand(st);
  st.claws = (a.arms || []).map(arm => ({group: arm, tip: tipOf(arm)})).filter(c => c.tip);
  st.pool = new THREE.Mesh(poolGeometry(st), R.poolMat);
  st.pool.userData.part = 'hezrouPool'; st.pool.renderOrder = -2;
  st.pool.castShadow = st.pool.receiveShadow = false;
  st.pool.position.set(0, 0, .06);
  st.gobPts = points(GOBS, R.gobMat, 'hezrouGobs');
  st.hazePts = points(HAZE, R.hazeMat, 'hezrouHaze');
  st.haze = Array.from({length: HAZE}, () => [rand(st), rand(st), rand(st), rand(st)]);
  st.printMesh = printMesh(R.printMat);
  st.prints = new Array(PRINTS).fill(null); st.nextPrint = 0; st.trail = null; st.stride = 0; st.foot = 1;
  a.g.add(st.pool, st.printMesh, st.gobPts, st.hazePts);
  return st;
}

const v = new THREE.Vector3();
// A point in `obj`'s frame, carried into the actor group's frame.
function toGroup(a, obj, p) {
  a.g.updateMatrixWorld(true);
  return a.g.worldToLocal(obj.localToWorld(v.copy(p)));
}

function drop(st, p, vx = 0, vy = 0, vz = 0) {
  st.gobs[st.next] = {x: p.x, y: p.y, z: p.z, vx, vy, vz, age: 0, landed: null};
  st.next = (st.next + 1) % GOBS;
}

const here = new THREE.Vector3(), corner = new THREE.Vector3();
// Lay a print at world spot (x, y, z), facing world yaw `yaw`, on side `foot` (+1 or -1; the -1 foot is mirrored).
function tread(st, x, y, z, yaw, foot) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx, j = (rand(st) - .5) * .03;
  st.prints[st.nextPrint] = {x: x + rx * FOOT_X * foot + fx * j, y: y + .004, z: z + rz * FOOT_X * foot + fz * j,
    yaw: yaw + foot * .12 + (rand(st) - .5) * .1, foot, age: 0, strength: printStrength(st.wet)};
  const uv = st.printMesh.geometry.attributes.uv, l = foot < 0;
  uv.setXY(st.nextPrint * 4, l ? 1 : 0, 0); uv.setXY(st.nextPrint * 4 + 1, l ? 0 : 1, 0);
  uv.setXY(st.nextPrint * 4 + 2, l ? 0 : 1, 1); uv.setXY(st.nextPrint * 4 + 3, l ? 1 : 0, 1);
  uv.needsUpdate = true;
  st.nextPrint = (st.nextPrint + 1) % PRINTS;
}

// Follow the hezrou over the floor and tread a print every STEP; then place and fade every print.
function updatePrints(a, st, dt, dead) {
  a.g.updateMatrixWorld(true);
  a.g.getWorldPosition(here);
  const tr = st.trail;
  if (!tr || Math.hypot(here.x - tr.x, here.z - tr.z) > JUMP) { st.trail = {x: here.x, z: here.z}; st.stride = 0; }
  else {
    const dx = here.x - tr.x, dz = here.z - tr.z, d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      if (!dead) {
        st.stride += d;
        if (st.stride >= STEP) { st.stride %= STEP; st.foot = -st.foot; tread(st, here.x, here.y, here.z, Math.atan2(dx, dz), st.foot); }
      }
      tr.x = here.x; tr.z = here.z;
    }
  }
  const pos = st.printMesh.geometry.attributes.position, col = st.printMesh.geometry.attributes.color;
  for (let i = 0; i < PRINTS; i++) {
    const p = st.prints[i];
    if (p) { p.age += dt; if (p.age >= PRINT_LIFE || Math.hypot(p.x - here.x, p.z - here.z) > FAR) st.prints[i] = null; }
    const q = st.prints[i];
    if (!q) { for (let k = 0; k < 4; k++) { pos.setXYZ(i * 4 + k, 0, 0, 0); col.setXYZW(i * 4 + k, 0, 0, 0, 0); } continue; }
    const fx = Math.sin(q.yaw), fz = Math.cos(q.yaw), hl = PRINT_LEN / 2, hw = PRINT_W / 2;
    // the corners in the same order as their uvs: u across the foot, v from heel to toes
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([cu, cv], k) => {
      corner.set(q.x + fz * hw * cu + fx * hl * cv, q.y, q.z - fx * hw * cu + fz * hl * cv);
      a.g.worldToLocal(corner);
      pos.setXYZ(i * 4 + k, corner.x, corner.y, corner.z);
    });
    // glossy green while wet, drying to the puddle's dark
    const w = 1 - smooth(q.age / (PRINT_WET + 1)), alpha = PRINT_ALPHA * q.strength * printFade(q.age);
    const r = POOL_DARK[0] + (POOL_RIM[0] * .7 - POOL_DARK[0]) * w, g = POOL_DARK[1] + (POOL_RIM[1] * .7 - POOL_DARK[1]) * w, b = POOL_DARK[2] + (POOL_RIM[2] * .7 - POOL_DARK[2]) * w;
    for (let k = 0; k < 4; k++) col.setXYZW(i * 4 + k, r, g, b, alpha);
  }
  pos.needsUpdate = col.needsUpdate = true;
}

// The live hit action on this actor, once its blow has landed.
function landedHit(a) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === 'hit' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Call once a frame, after updateHezrouGurgle has stretched the drool this frame (fidget.js does).
// `walking` is true while sliding to a new cell. Returns the state, or null for anything else.
export function updateHezrouSlime(a, dt, t, busy, walking) {
  if (!slimes(a)) return null;
  const st = a.hezrouSlime || (a.hezrouSlime = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, WALK_RATE, dt);
  if (st.walk < SNAP) st.walk = 0;

  if (!dead) {
    // a drool string snapping (hezrou-gurgle.js restarts its `since` clock) lets a gob go from where
    // its tip hung at full stretch (the string has already sprung back by now; its rest length is .1)
    const g = a.hezrouGurgle;
    a.drools.forEach((d, i) => {
      const since = g?.drools?.[i]?.since;
      if (Number.isFinite(since) && typeof st.snaps[i] === 'number' && since < st.snaps[i]) drop(st, toGroup(a, d, v.set(0, -.1 * STRETCH / Math.max(.2, d.scale.y), 0)), 0, -.15, 0);
      st.snaps[i] = since;
    });
    // and slime beads off a claw or the bottom of the sac now and then (less while walking)
    st.bead -= dt * (1 - .5 * st.walk);
    if (st.bead <= 0) {
      st.bead = BEAD_MIN + BEAD_SPAN * rand(st);
      const k = Math.floor(rand(st) * (st.claws.length + 1));
      if (k < st.claws.length) drop(st, toGroup(a, st.claws[k].group, st.claws[k].tip));
      else if (a.sac) drop(st, toGroup(a, a.sac, v.set((rand(st) - .5) * .1, -.065, (rand(st) - .3) * .08)));
    }
    // a blow knocks a spray of gobs off it, flung on along the blow (away from the attacker)
    const hit = landedHit(a);
    if (hit && hit !== st.lastHit) {
      st.lastHit = hit;
      let th = null;
      if (Array.isArray(hit.dir) && (hit.dir[0] || hit.dir[1])) {
        const yaw = a.g.rotation.y || 0, c = Math.cos(yaw), s = Math.sin(yaw), x = hit.dir[0], z = hit.dir[1];
        th = Math.atan2(x * s + z * c, x * c - z * s);
      }
      for (let i = 0; i < SPRAY; i++) {
        const dir = th !== null && rand(st) < .75 ? th + (rand(st) - .5) * 1.4 : rand(st) * TAU, sp = SPRAY_SPEED * (.5 + rand(st) * .6);
        drop(st, v.set(Math.cos(dir) * .2, .55 + rand(st) * .35, Math.sin(dir) * .2), Math.cos(dir) * sp, .4 + rand(st) * .5, Math.sin(dir) * sp);
      }
    }
  }

  // gobs fall, stretching with speed; land, splat flat and soak into the puddle
  const gp = st.gobPts.geometry.attributes.position, gc = st.gobPts.geometry.attributes.color;
  for (let i = 0; i < GOBS; i++) {
    const o = st.gobs[i];
    let alpha = 0;
    if (o) {
      o.age += dt;
      if (o.landed === null) {
        o.vy -= GRAVITY * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
        if (o.y <= FLOOR) { o.y = FLOOR; o.landed = 0; st.wet = Math.min(1, st.wet + SOAK); }
        alpha = GOB_ALPHA * smooth(o.age / .08);
      } else {
        o.landed += dt;
        alpha = GOB_ALPHA * .8 * (1 - smooth(o.landed / SPLAT));
        if (o.landed >= SPLAT) { st.gobs[i] = null; alpha = 0; }
      }
      if (o.y > 3 || Math.hypot(o.x, o.z) > 1.5) { st.gobs[i] = null; alpha = 0; }
    }
    const q = st.gobs[i];
    gp.setXYZ(i, q ? q.x : 0, q ? q.y : 0, q ? q.z : 0);
    gc.setXYZW(i, ...GOB_C, alpha);
  }
  gp.needsUpdate = gc.needsUpdate = true;

  // wet prints where it treads (read before the puddle dries this frame, so the first are wettest)
  updatePrints(a, st, dt, dead);

  // the puddle dries back (faster while walking), never below a wet patch; a dead one stays put
  if (!dead) st.wet = Math.max(WET_MIN, st.wet - dt * (DRY + DRY_WALK * st.walk));
  st.pool.scale.setScalar(POOL_R * Math.sqrt(st.wet));

  // the haze hangs about it; a belch spews a thick puff out of the maw
  const g = a.hezrouGurgle, u = g?.cur?.u ?? 0, f = g?.f ?? 0;
  st.belch = Math.max(belchPuff(u) * f, st.belch * Math.exp(-1.5 * dt));
  if (st.belch < SNAP) st.belch = 0;
  const hp = st.hazePts.geometry.attributes.position, hc = st.hazePts.geometry.attributes.color;
  const base = HAZE_ALPHA * st.life * (1 - (1 - WALK_HAZE) * st.walk);
  for (let i = 0; i < HAZE; i++) {
    const m = hazeAt(st.haze[i], st.t), puff = i < HAZE / 2 ? st.belch * st.life : 0;
    // the first half of the motes are drawn toward the maw (front, head height) by a belch
    const x = m.x * (1 - .6 * puff), y = m.y + (1 - m.y) * .7 * puff, z = m.z + (.5 - m.z) * .8 * puff;
    hp.setXYZ(i, x, y, z);
    hc.setXYZW(i, ...HAZE_C, Math.min(BELCH_ALPHA, base * (.7 + .3 * m.size) + (BELCH_ALPHA - HAZE_ALPHA) * puff));
  }
  hp.needsUpdate = hc.needsUpdate = true;
  return st;
}

// The blue jelly's cold (creature animation queue item 3). Its model is creatures.js's flat blob:
// a squat translucent dome (the skin), a dark nucleus inside, and six tendrils splayed on the
// floor. In NetHack it does nothing but sit there and freeze whatever touches it (passive cold),
// so it gets a frozen, brooding idle and a cold answer to every blow:
//  - Frost creeps over the floor under it: a jagged, glassy rime that slowly spreads and draws
//    back, shrinks in under it while it slides along and creeps back out once it settles.
//  - Cold mist wells up off the top of the dome and spills over its rim, sinking to the floor.
//  - It breathes, slow and uneven, and now and then shivers: the dome trembles, the tendrils
//    twitch and ice glints flash across its skin. Glints also twinkle on their own.
//  - When it is hit, a puff of frost bursts off it, mostly toward the attacker, and sinks; the
//    dome shudders hard and the rime on the floor flares out.
//  - On death everything eases back to rest; the mist and glints thin out to nothing.
//
// The module owns the skin, nucleus and tendrils' scale and rotation (nothing else writes them),
// plus three things it adds itself: the rime (on the actor's group, so it stays on the floor) and
// two point clouds, the glints (on the body, so they ride its bob) and the mist and frost puff.
// Those share their geometry layout and materials across jellies; only the per-actor buffers
// change. Three extra draws per jelly.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Breathing: share of rest scale, and rate (Hz).
export const BREATH = .035, BREATH_HZ = .21;
// A shiver: how hard the dome trembles (share of rest), how fast, and how long (s). A hit's shudder is HIT_SHIVER × as hard.
export const SHAKE = .06, SHAKE_HZ = 15, SHIVER_LEN = .8, HIT_SHIVER = 1.7;
// First shiver after FIRST_MIN..+FIRST_SPAN s alive, then GAP_MIN..+GAP_SPAN apart (busy or not).
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 3.5, GAP_SPAN = 4.5;
// Rime: how far it creeps in and out (share), how far it shrinks while sliding, how far a hit flares
// it, and how fast the flare swells and settles (1/s).
export const CREEP = .09, WALK_SHRINK = .45, FLARE = .5, FLARE_RISE = 10, FLARE_DECAY = 1.4;
// Mist: wisps, seconds per wisp, peak opacity. Puff: motes per hit, life (s), launch speed, gravity, drag.
export const WISPS = 6, WISP_LEN = 3.4, WISP_ALPHA = .32;
export const PUFF = 24, PUFF_LIFE = 1.1, PUFF_SPEED = .8, PUFF_GRAVITY = 1.1, PUFF_DRAG = 2.4, PUFF_ALPHA = .6;
// Glints on the dome.
export const GLINTS = 7;
// How fast the motion eases out after death (1/s), and in from walking.
export const REST_RATE = 2.5, WALK_RATE = 4;
const SNAP = 1e-3;

// The dome, as creatures.js's blob({flat:true}) builds it (radius .28, y-scale .45 at y .12).
const DOME = {y: .12, r: .28, h: .126};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

export const freezes = a => !!(a && !a.asset && a.body && a.species === 'blue jelly');

// Deterministic per-actor randoms (a small LCG), so tests are repeatable.
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The shiver's strength at progress u (0..1): snaps in, rings down.
export function shiverEnvelope(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .08) * (1 - u) ** 2;
}

// A cold wisp at progress u (0..1) from start radius r0 and angle th: it wells up off the top of the
// dome, spills over the rim and sinks to the floor. Position in the actor's frame and opacity.
export function wispAt(u, r0, th) {
  u = clamp01(u);
  const r = r0 + .34 * u, y = DOME.y + DOME.h * .9 + .07 * Math.sin(Math.PI * u) - .2 * u * u;
  return {x: Math.cos(th) * r, y: Math.max(.015, y), z: Math.sin(th) * r, alpha: WISP_ALPHA * Math.sin(Math.PI * u) ** 1.5};
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
// The rime: a jagged star of frost, flat on the floor, with a second, finer layer of spikes.
function rimeGeometry() {
  const s = new THREE.Shape(), n = 26;
  let seed = 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, out = i % 2 === 0, rad = out ? .4 + r() * .12 : .29 + r() * .05;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (i) s.lineTo(x, z); else s.moveTo(x, z);
  }
  s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, .004, 0);
  return geo;
}
function sharedResources() {
  if (shared) return shared;
  shared = {
    rimeGeo: rimeGeometry(),
    rimeMat: new THREE.MeshStandardMaterial({color: '#cfe4ff', emissive: '#5c8fd6', emissiveIntensity: .3, roughness: .2,
      transparent: true, opacity: .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide}),
    mistMat: new THREE.PointsMaterial({size: .09, map: dotTexture(false), vertexColors: true, transparent: true, depthWrite: false}),
    glintMat: new THREE.PointsMaterial({size: .07, map: dotTexture(true), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending}),
  };
  return shared;
}

function points(count, material, part) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .25, 0), 1.2);
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
  const st = {seed: ((a.g?.id ?? 1) * 7919) % 2147483647 || 1, t: 0, life: 1, walk: 0, flareAge: null, shiver: null, wait: 0,
    skin, nucleus, tendrils, puffs: [], lastHit: null};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.rime = new THREE.Mesh(R.rimeGeo, R.rimeMat);
  st.rime.userData.part = 'rime'; st.rime.castShadow = false; st.rime.receiveShadow = false; st.rime.renderOrder = -2;
  a.g.add(st.rime);
  st.mist = points(WISPS + PUFF, R.mistMat, 'frostMist');
  a.g.add(st.mist);
  st.glints = points(GLINTS, R.glintMat, 'iceGlints');
  a.body.add(st.glints);
  st.wisps = Array.from({length: WISPS}, (_, i) => ({off: i / WISPS + rand(st) * .1, r0: .04 + rand(st) * .1, th: rand(st) * TAU, len: WISP_LEN * (.85 + rand(st) * .3)}));
  st.glintAt = Array.from({length: GLINTS}, (_, i) => {
    const th = i * 2.399 + rand(st) * .4, el = .3 + rand(st) * .9;
    return {x: Math.cos(el) * Math.cos(th) * DOME.r * 1.02, y: DOME.y + Math.sin(el) * DOME.h * 1.05, z: Math.cos(el) * Math.sin(th) * DOME.r * 1.02,
      hz: .3 + rand(st) * .35, ph: rand(st) * TAU};
  });
  return st;
}

const MIST = [.78, .9, 1], PUFFC = [.86, .95, 1], GLINT = [.85, .95, 1];

// Launches a frost puff: motes burst off the dome, biased toward `dir` (local [x, z], toward the attacker).
function puff(st, dir) {
  const [bx, bz] = dir || [0, 0];
  st.puffs.length = 0;
  for (let i = 0; i < PUFF; i++) {
    let th = rand(st) * TAU;
    if (dir && rand(st) < .65) th = Math.atan2(bz, bx) + (rand(st) - .5) * 1.8;
    const el = rand(st) * .9, sp = PUFF_SPEED * (.55 + rand(st) * .6), r = DOME.r * (.6 + rand(st) * .4);
    st.puffs.push({x: Math.cos(th) * r, y: DOME.y + .02 + rand(st) * DOME.h, z: Math.sin(th) * r,
      vx: Math.cos(th) * Math.cos(el) * sp, vy: Math.sin(el) * sp * .8, vz: Math.sin(th) * Math.cos(el) * sp,
      age: 0, life: PUFF_LIFE * (.7 + rand(st) * .5)});
  }
}

// The live hit action on this actor, once its blow has landed (a pounce's flinch waits for it).
function landedHit(a) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === 'hit' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Call once a frame (fidget.js does, before actions.js applies this frame's pose). `busy` is true
// while walking or acting, `walking` while sliding to a new cell. Returns the state, or null.
export function updateJellyFrost(a, dt, t, busy, walking) {
  if (!freezes(a)) return null;
  const st = a.jellyFrost || (a.jellyFrost = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, WALK_RATE, dt);
  if (st.walk < SNAP) st.walk = 0;
  const w = st.life;

  // a blow lands: a hard shudder, a flare of rime and a frost puff toward the attacker
  const hit = dead ? null : landedHit(a);
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit;
    st.shiver = {u: 0, amp: HIT_SHIVER};
    st.flareAge = 0;
    let dir = null;
    if (Array.isArray(hit.dir) && (hit.dir[0] || hit.dir[1])) {
      // the blow travels attacker → jelly; the puff goes back the other way, in the group's frame
      const yaw = a.g.rotation.y || 0, c = Math.cos(yaw), s = Math.sin(yaw), x = -hit.dir[0], z = -hit.dir[1];
      dir = [x * c - z * s, x * s + z * c];
    }
    puff(st, dir);
  }
  // shivers on their own clock
  if (st.shiver) { st.shiver.u += dt / SHIVER_LEN; if (st.shiver.u >= 1) st.shiver = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0) { st.shiver = {u: 0, amp: 1}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  if (dead && st.shiver) st.shiver.amp *= Math.exp(-REST_RATE * 2 * dt);
  const s = st.shiver ? shiverEnvelope(st.shiver.u) * st.shiver.amp * w : 0;
  // the flare swells out quickly and creeps back slowly
  let flare = 0;
  if (st.flareAge != null) {
    st.flareAge += dt;
    flare = (1 - Math.exp(-FLARE_RISE * st.flareAge)) * Math.exp(-FLARE_DECAY * st.flareAge) * (dead ? w : 1);
    if (flare < SNAP && st.flareAge > 1) { st.flareAge = null; flare = 0; }
  }

  // the dome breathes and trembles; the nucleus lags; the tendrils twitch
  const breath = BREATH * w * (.7 * Math.sin(T * BREATH_HZ * TAU + st.ph) + .3 * Math.sin(T * BREATH_HZ * 2.7 * TAU + st.ph * 2));
  const qa = SHAKE * s * Math.sin(T * SHAKE_HZ * TAU), qb = SHAKE * s * Math.sin(T * SHAKE_HZ * 1.13 * TAU + 1.9);
  const sx = 1 + breath + qa, sz = 1 + breath + qb, sy = 1 - breath * 1.4 - .6 * (qa + qb) / 2;
  if (st.skin) st.skin.m.scale.set(st.skin.scale.x * sx, st.skin.scale.y * sy, st.skin.scale.z * sz);
  if (st.nucleus) {
    const n = st.nucleus;
    n.m.position.set(n.pos.x + .012 * s * Math.sin(T * SHAKE_HZ * .5 * TAU), n.pos.y - DOME.h * breath * .5, n.pos.z + .012 * s * Math.cos(T * SHAKE_HZ * .43 * TAU));
    n.m.rotation.set(n.rot.x, n.rot.y + .3 * w * Math.sin(T * .17 + st.ph), n.rot.z);
  }
  st.tendrils.forEach((r, i) => {
    const twitch = .14 * s * Math.sin(T * SHAKE_HZ * .7 * TAU + i * 1.7), curl = .03 * w * Math.sin(T * .5 + i * 1.3 + st.ph);
    r.m.rotation.set(r.rot.x, r.rot.y + twitch + curl, r.rot.z);
    r.m.scale.set(r.scale.x * (1 + breath * .6), r.scale.y, r.scale.z * (1 + breath * .6));
  });

  // the rime creeps; it draws in under a sliding jelly and flares when it's hit
  const creep = 1 + CREEP * w * (.6 * Math.sin(T * .23 + st.ph) + .4 * Math.sin(T * .61 + st.ph * 1.7));
  const k = creep * (1 - WALK_SHRINK * st.walk) * (1 + FLARE * flare);
  st.rime.scale.set(k, 1, k);
  st.rime.rotation.y = .06 * w * Math.sin(T * .11 + st.ph);

  // mist wisps spill off the top and sink; a dead jelly's mist thins out
  const pos = st.mist.geometry.attributes.position, col = st.mist.geometry.attributes.color;
  st.wisps.forEach((wp, i) => {
    const p = wispAt(((T / wp.len) + wp.off) % 1, wp.r0, wp.th + .15 * Math.sin(T * .3 + i));
    pos.setXYZ(i, p.x, p.y, p.z); col.setXYZW(i, MIST[0], MIST[1], MIST[2], p.alpha * w * (1 - .5 * st.walk));
  });
  // the frost puff: thrown out, dragged, sinking to the floor
  for (let i = 0; i < PUFF; i++) {
    const p = st.puffs[i], j = WISPS + i;
    if (!p || p.age >= p.life) { pos.setXYZ(j, 0, DOME.y, 0); col.setXYZW(j, 0, 0, 0, 0); continue; }
    p.age += dt;
    const drag = Math.exp(-PUFF_DRAG * dt);
    p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag - PUFF_GRAVITY * dt;
    p.x += p.vx * dt; p.y = Math.max(.015, p.y + p.vy * dt); p.z += p.vz * dt;
    const u = clamp01(p.age / p.life);
    pos.setXYZ(j, p.x, p.y, p.z); col.setXYZW(j, PUFFC[0], PUFFC[1], PUFFC[2], PUFF_ALPHA * smooth(u / .06) * (1 - u) ** 1.3);
  }
  if (dead && w === 0) st.puffs.length = 0;
  pos.needsUpdate = col.needsUpdate = true;

  // glints twinkle on the skin (riding its tremble), and all flash in a shiver
  const gp = st.glints.geometry.attributes.position, gc = st.glints.geometry.attributes.color;
  st.glintAt.forEach((g, i) => {
    const tw = Math.max(0, Math.sin(T * g.hz * TAU + g.ph)) ** 14;
    const b = clamp01((tw + .9 * Math.min(1, s) * Math.abs(Math.sin(T * 23 + i * 2.1))) * w);
    gp.setXYZ(i, g.x * sx, DOME.y + (g.y - DOME.y) * sy, g.z * sz);
    gc.setXYZW(i, GLINT[0], GLINT[1], GLINT[2], b);
  });
  gp.needsUpdate = gc.needsUpdate = true;
  return st;
}

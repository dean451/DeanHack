import * as THREE from 'three';
import {BEARD, beardPath} from './cthulhu.js';

// Cthulhu's beard and wings (creature queue: "Cthulhu wing twitch and beard writhe"). Before this
// the eight face tentacles only rocked as one block on the generic tail swing, and the two torn
// bat wings fluttered on the generic 5 rad/s beat like a moth's. Now:
//  - Writhe: a slow wave runs root to tip down each tentacle, every one on its own phase, so the
//    beard coils and squirms. Quicker and wider with the hero near.
//  - Twitch: now and then one tentacle jerks aside and springs back.
//  - The beard reaches: with the hero within RANGE tiles every tip curls up and toward them.
//  - Attack: the tentacles splay out and lash forward at the target, then settle.
//  - Blow: every tentacle flinches out and the writhe goes hard for a moment.
//  - Wings: held half folded and nearly still, breathing slowly; every few seconds one (or both)
//    gives a sharp twitch, flicking up and back and settling. With the hero near they spread
//    half open and lift, menacing; an attack flares them wide; a blow jolts them.
//  - Death: the writhe dies away, the tentacles hang limp and the wings sag shut.
//  - Turned to stone: everything holds where it was.
//
// The tentacles are one merged mesh (one draw), so as with the beholder's stalks each Cthulhu
// gets its own copy of that geometry the first time it's updated, and the tentacle vertices are
// moved on the CPU: a vertex h of the way down tentacle k moves by h^1.5 × (its wave + its tip
// offset), so the roots stay at the maw and the suckers ride along. The wings are posed as whole
// groups: their rotation is written absolutely each frame, over live.js's generic flutter.

// RANGE: tiles within which it notices the hero. WAVE/WAVE_NEAR: writhe size at the tip (model
// units, before Cthulhu's 1.5 scale); RATE/RATE_NEAR: writhe speed; AGITATE: extra after a blow.
export const RANGE = 6, WAVE = .02, WAVE_NEAR = .032, RATE = 1.3, RATE_NEAR = 2.3, AGITATE = 1.8;
// Each tentacle tip is a damped spring (stiffness K, damping D) chasing a target offset. REACH:
// how far a tip curls toward the hero; LASH: an attack's splay, forward and upward lash; FLINCH:
// a blow's kick; TWITCH: an idle jerk, every TWITCH_WAIT s (TWITCH_WAIT_NEAR with the hero near);
// LIMP: the dead tips' fall; REST_RATE: how fast the dead writhe stops.
export const K = 55, D = 8, REACH = {toward: .05, fwd: .03, up: .035}, LASH = {out: .05, fwd: .09, up: .05};
export const FLINCH = 1.1, TWITCH = .6, TWITCH_WAIT = [.6, 1.8], TWITCH_WAIT_NEAR = [.25, .8];
export const LIMP = {down: .04, back: .06}, REST_RATE = 2.2;
// Wings, as offsets (rad) from the rest fold FOLD (live.js's base): SPREAD swings a wing back
// and LIFT raises its tip. BREATH: the slow idle drift; NEAR, FLARE, SAG: the spread/lift with the
// hero near, at an attack's peak and in death. WING_K/WING_D: each wing's twitch spring; FLICK: a
// twitch's kick, every FLICK_WAIT s (FLICK_WAIT_NEAR near); JOLT: a blow's kick.
export const FOLD = .18, BREATH = {spread: .025, lift: .03, rate: .9};
export const NEAR = {spread: .22, lift: .14}, FLARE = {spread: .5, lift: .32}, SAG = {spread: -.12, lift: -.38};
export const WING_K = 70, WING_D = 7, FLICK = 4, FLICK_WAIT = [1.6, 4.2], FLICK_WAIT_NEAR = [.7, 2], JOLT = 4;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }
const between = (st, [lo, hi]) => lo + (hi - lo) * rand(st);

export const writhes = a => !!(a && !a.asset && a.kind === 'cthulhu' && a.tail && a.g);

// Samples of each tentacle's centre line (point and fraction along), built once. A vertex takes
// the h of its nearest sample, so the writhe is worked out per sample, not per vertex.
const SAMPLES = 61;
let lines = null;
function beardLines() {
  if (lines) return lines;
  lines = Array.from({length: BEARD}, (_, i) => {
    const {pts, len} = beardPath(i), curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), n = SAMPLES - 1, s = [];
    for (let k = 0; k <= n; k++) s.push({p: curve.getPointAt(k / n), f: k / n, n: k});
    return {s, len, side: Math.sign(pts[0][0]) || 1};
  });
  return lines;
}
const nearest = (l, v) => { let best = l.s[0], bd = Infinity; for (const q of l.s) { const d = v.distanceToSquared(q.p); if (d < bd) { bd = d; best = q; } } return {q: best, d: bd}; };

// For every vertex of the beard geometry: its tentacle k and h (0 at the maw, 1 at the tip). The
// mesh isn't indexed, so its pieces (a tentacle's tube, each sucker) are found by welding
// triangles that share a position; each piece goes whole to the tentacle nearest it on average,
// so neighbours that touch at the root can't swap vertices.
export function beardVertices(geo) {
  const L = beardLines(), pos = geo.attributes.position, n = pos.count, up = Array.from({length: n}, (_, i) => i);
  const find = i => { while (up[i] !== i) i = up[i] = up[up[i]]; return i; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) up[b] = a; };
  const at = new Map();
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
    if (at.has(key)) join(at.get(key), i); else at.set(key, i);
  }
  for (let i = 0; i + 2 < n; i += 3) { join(i, i + 1); join(i, i + 2); }
  const pieces = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); (pieces.get(r) || pieces.set(r, []).get(r)).push(i); }
  const v = new THREE.Vector3(), out = new Array(n);
  for (const list of pieces.values()) {
    const step = Math.max(1, Math.floor(list.length / 24));
    let k = 0, bd = Infinity;
    L.forEach((l, j) => {
      let d = 0;
      for (let m = 0; m < list.length; m += step) d += nearest(l, v.fromBufferAttribute(pos, list[m])).d;
      if (d < bd) { bd = d; k = j; }
    });
    for (const i of list) { const {q} = nearest(L[k], v.fromBufferAttribute(pos, i)); out[i] = {i, k, h: q.f, n: q.n}; }
  }
  return out;
}

// The writhe's offset for a point h down tentacle k, given the phase P and size A.
export function wave(k, h, P, A, out = [0, 0, 0]) {
  const ph = k * 2.17;
  out[0] = A * Math.sin(P * 1.2 + ph - h * 3.4);
  out[1] = A * .35 * Math.sin(P * .8 + ph * 1.6 - h * 2.1);
  out[2] = A * .75 * Math.cos(P + ph * .7 - h * 2.8);
  return out;
}

function own(mesh) {
  const geo = mesh.geometry.clone(), verts = beardVertices(geo), pos = geo.attributes.position;
  const rest = Float32Array.from(pos.array);
  geo.computeBoundingSphere(); geo.boundingSphere.radius += .15;
  const shared = mesh.geometry;
  mesh.geometry = geo;
  const before = mesh.userData.dispose;
  mesh.userData.dispose = () => { geo.dispose(); before?.(); };
  const slot = Int32Array.from(verts, q => (q.k * SAMPLES + q.n) * 3);
  return {mesh, geo, shared, verts, rest, slot, offs: new Float32Array(BEARD * SAMPLES * 3)};
}

function setup(a) {
  const beard = a.tail.children.find(c => c.isMesh && c.userData.part === 'tentacles');
  if (!beard) return null;
  const st = {seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, P: 0, A: WAVE, near: 0, agit: 0, life: 1, lastHit: null,
    beard: own(beard), tips: Array.from({length: BEARD}, () => ({s: new THREE.Vector3(), v: new THREE.Vector3(), aim: 1})),
    wings: (a.wings || []).map(w => ({w, side: w.userData.side || 1, s: 0, v: 0})), wait: 0, flick: 0, breath: 0, flare: 0};
  st.tips.forEach(t => { t.aim = .6 + .5 * rand(st); });
  st.wait = between(st, TWITCH_WAIT); st.flick = between(st, FLICK_WAIT);
  st.P = rand(st) * 10; st.breath = rand(st) * 6;
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's direction in the body's frame (x, z) and distance, or null out of range.
function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  const r = -g.rotation.y, c = Math.cos(r), s = Math.sin(r);
  return {x: (dx * c + dz * s) / d, z: (-dx * s + dz * c) / d, d};
}

const tgt = new THREE.Vector3(), kick = new THREE.Vector3(), w = [0, 0, 0];

// Call once a frame (fidget.js does), after live.js has written the wings' generic flutter.
// `look` is where the hero stands. Returns the state.
export function updateCthulhuWrithe(a, dt, t, busy, look = null) {
  if (!writhes(a)) return null;
  const st = a.cthulhuWrithe === undefined ? (a.cthulhuWrithe = setup(a)) : a.cthulhuWrithe;
  if (!st) return null;
  // turned to stone: hold the last pose (petrify.js holds the wings' rotation.y to it as well)
  dt = a.stone ? 0 : Math.min(Math.max(0, dt || 0), .1);
  const dead = !!a.actions?.dead, L = beardLines();
  if (dt > 0) {
    st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
    const h = dead ? null : sense(a, look);
    st.hero = h;
    st.near = approach(st.near, h ? clamp01(1.2 - h.d / RANGE) : 0, 2.5, dt);
    st.agit = approach(st.agit, 0, 1.4, dt);

    // a blow: every tentacle flinches out and both wings jolt
    const hit = dead ? null : current(a, 'hit');
    if (hit && hit !== st.lastHit) {
      st.lastHit = hit; st.agit = 1;
      st.tips.forEach((tp, k) => tp.v.addScaledVector(kick.set(L[k].side * .8, .3, .6).normalize(), FLINCH * (.7 + .5 * rand(st))));
      st.wings.forEach(wg => { wg.v += JOLT * (.8 + .4 * rand(st)); });
    }
    if (!dead) {
      // an idle tentacle twitch
      st.wait -= dt;
      if (st.wait <= 0) {
        st.wait = between(st, st.near > .5 ? TWITCH_WAIT_NEAR : TWITCH_WAIT);
        const tp = st.tips[Math.floor(rand(st) * BEARD) % BEARD];
        tp.v.add(kick.set(rand(st) - .5, (rand(st) - .2) * .5, rand(st) - .3).normalize().multiplyScalar(TWITCH));
      }
      // a wing twitch: one wing, or now and then both
      st.flick -= dt;
      if (st.flick <= 0 && st.wings.length) {
        st.flick = between(st, st.near > .5 ? FLICK_WAIT_NEAR : FLICK_WAIT);
        const both = rand(st) < .3, one = Math.floor(rand(st) * st.wings.length) % st.wings.length;
        st.wings.forEach((wg, i) => { if (both || i === one) wg.v += FLICK * (.7 + .5 * rand(st)); });
      }
    }
    const atk = dead ? null : current(a, 'attack'), u = atk ? a.actions.u ?? 0 : 0;
    st.lash = atk ? smooth(u / .25) * (1 - smooth((u - .6) / .35)) : 0;
    st.flare = approach(st.flare, st.lash, 14, dt);

    st.P += dt * (RATE + (RATE_NEAR - RATE) * st.near + AGITATE * st.agit) * st.life;
    st.A = (WAVE + (WAVE_NEAR - WAVE) * st.near) * (1 + st.agit * .9) * st.life;
    st.breath += dt * BREATH.rate * st.life;

    // each tentacle tip chases its target
    st.tips.forEach((tp, k) => {
      tgt.set(0, 0, 0);
      if (st.hero) tgt.set(st.hero.x * REACH.toward, REACH.up, Math.max(0, st.hero.z) * REACH.toward + REACH.fwd).multiplyScalar(tp.aim * st.near);
      const lash = st.lash;
      if (lash) tgt.multiplyScalar(1 - lash).add(kick.set(L[k].side * LASH.out * tp.aim, LASH.up, LASH.fwd).multiplyScalar(lash));
      if (dead) tgt.set(0, -LIMP.down, -LIMP.back).multiplyScalar(1 - st.life);
      tp.v.addScaledVector(kick.copy(tgt).sub(tp.s), K * dt).multiplyScalar(Math.exp(-D * dt));
      tp.s.addScaledVector(tp.v, dt);
    });
    // the wings' twitch springs
    st.wings.forEach(wg => { wg.v += -wg.s * WING_K * dt; wg.v *= Math.exp(-WING_D * dt); wg.s += wg.v * dt; });
  }

  // move the tentacle vertices: each sample's offset is h^1.5 × (wave + tip), so roots stay put
  const {geo, rest, slot, offs} = st.beard, arr = geo.attributes.position.array;
  for (let k = 0; k < BEARD; k++) {
    const tp = st.tips[k].s;
    for (let n = 0; n < SAMPLES; n++) {
      const h = n / (SAMPLES - 1), f = h * Math.sqrt(h), o = (k * SAMPLES + n) * 3;
      wave(k, h, st.P, st.A, w);
      offs[o] = f * (w[0] + tp.x); offs[o + 1] = f * (w[1] + tp.y); offs[o + 2] = f * (w[2] + tp.z);
    }
  }
  for (let j = 0, i = 0; j < slot.length; j++, i += 3) {
    const o = slot[j];
    arr[i] = rest[i] + offs[o]; arr[i + 1] = rest[i + 1] + offs[o + 1]; arr[i + 2] = rest[i + 2] + offs[o + 2];
  }
  geo.attributes.position.needsUpdate = true;

  // pose the wings
  for (const wg of st.wings) {
    const p = wingPose(st, wg);
    wg.w.rotation.y = wg.side * (p.spread - FOLD);
    wg.w.rotation.z = wg.side * p.lift;
  }
  return st;
}

// A wing's spread and lift (rad, positive = back and up) for the state.
export function wingPose(st, wg) {
  const life = st.life, b = Math.sin(st.breath + (wg.side > 0 ? 0 : .7)), dead = 1 - life;
  const twitch = wg.s;
  return {
    spread: (BREATH.spread * b + NEAR.spread * st.near) * life + FLARE.spread * st.flare + .45 * twitch + SAG.spread * dead,
    lift: (BREATH.lift * b + NEAR.lift * st.near) * life + FLARE.lift * st.flare + .8 * twitch + SAG.lift * dead,
  };
}

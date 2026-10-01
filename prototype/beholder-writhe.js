import * as THREE from 'three';
import {STALKS, stalkPath} from './beholder.js';

// The beholder's eyestalks (creature queue: "beholder glance and stalk writhe"). Its great eye
// darts and stares through glance.js; this makes the ten stalks on its crown live:
//  - Writhe: a slow wave runs up each stalk from root to tip, every stalk on its own phase, so
//    they coil and sway like worms. Quicker and wider with the hero near.
//  - Twitch: every so often one stalk jerks aside and springs back (more often with the hero near).
//  - All eyes on you: with the hero within RANGE tiles every stalk bends its tip toward them,
//    the ones behind included, each by its own amount.
//  - Attack: the stalks rear up and lash forward at the target, then settle.
//  - Blow: every stalk flinches out and up from the crown and writhes hard for a moment.
//  - Death: the writhe dies away and the stalks flop down limp.
//
// The stalks are merged into the hide mesh (one draw), so they can't be posed as bones. Instead
// each beholder gets its own copy of the hide and stalk-eye geometry the first time it's updated,
// and the stalk vertices are moved on the CPU: a vertex `h` of the way up stalk k moves by
// h² × (that stalk's wave at h + its tip offset), so roots stay planted and the eye on each tip
// rides with it (eyes count as h = 1). Working on the geometry rather than in a shader keeps the
// pose through the death fade's and petrify's material clones, and in the shadow.

// RANGE: tiles within which it notices the hero. WAVE/WAVE_NEAR: writhe size at the tip;
// RATE/RATE_NEAR: writhe speed; AGITATE: extra speed and size just after a blow.
export const RANGE = 6, WAVE = .022, WAVE_NEAR = .034, RATE = 1.1, RATE_NEAR = 1.9, AGITATE = 1.6;
// Each stalk's tip is a damped spring (stiffness K, damping D) chasing a target offset. AIM: how
// far a tip bends toward the hero; LASH: the forward and upward lash of an attack; FLINCH: the
// speed of a blow's kick; TWITCH: the speed of an idle jerk, every TWITCH_WAIT s (TWITCH_WAIT_NEAR
// with the hero near); DROOP: the dead stalks' fall; REST_RATE: how fast the dead writhe stops.
export const K = 60, D = 9, AIM = .045, LASH = {fwd: .075, up: .025}, FLINCH = .9, TWITCH = .55;
export const TWITCH_WAIT = [.5, 1.6], TWITCH_WAIT_NEAR = [.2, .7], DROOP = {down: .12, out: .03}, REST_RATE = 2.5;
// A vertex counts as on a stalk within this distance of its centre line, past its radius.
const SLACK = .01;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

export const writhes = a => !!(a && !a.asset && a.species === 'beholder' && a.head?.parent && a.g);

// Samples of each stalk's centre line: point, fraction along and the tube's radius there (as
// beholder.js builds it, with a little slack). Built once.
let lines = null;
function stalkLines() {
  if (lines) return lines;
  lines = STALKS.map((_, i) => {
    const {pts, outward} = stalkPath(i), curve = new THREE.CatmullRomCurve3(pts), n = 80, s = [];
    for (let k = 0; k <= n; k++) {
      const f = k / n, p = curve.getPointAt(f);
      s.push({p, f, r: (.019 - .01 * f) * 1.18 + .004 + SLACK});
    }
    const box = new THREE.Box3().setFromPoints(s.map(q => q.p)).expandByScalar(.035);
    return {s, box, tip: s[n].p, outward};
  });
  return lines;
}

// For each vertex of `geo` that's on a stalk: its index, stalk and h. `eyes` puts every vertex
// on the nearest stalk's tip (h = 1).
export function stalkVertices(geo, eyes = false) {
  const L = stalkLines(), pos = geo.attributes.position, v = new THREE.Vector3(), out = [];
  if (eyes) return eyeVertices(geo, L);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let best = null;
    L.forEach((l, k) => {
      if (!l.box.containsPoint(v)) return;
      for (const q of l.s) {
        const d = v.distanceTo(q.p);
        if (d < q.r && (!best || d / q.r < best.score)) best = {i, k, h: q.f, score: d / q.r};
      }
    });
    if (best && best.h > .01) out.push({i: best.i, k: best.k, h: best.h});
  }
  return out;
}

// The stalk eyes: each ball (a connected piece of the mesh) goes with the stalk whose tip is
// nearest its centre. Two front tips sit close, so single vertices can't be trusted to pick.
function eyeVertices(geo, L) {
  const pos = geo.attributes.position, n = pos.count, up = Array.from({length: n}, (_, i) => i);
  const find = i => { while (up[i] !== i) i = up[i] = up[up[i]]; return i; };
  const idx = geo.index;
  if (idx) for (let j = 0; j < idx.count; j += 3) {
    const a = find(idx.getX(j)), b = find(idx.getX(j + 1)), c = find(idx.getX(j + 2));
    up[b] = a; up[find(c)] = a;
  }
  const balls = new Map(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const r = find(i), b = balls.get(r) || {c: new THREE.Vector3(), list: []};
    b.c.add(v.fromBufferAttribute(pos, i)); b.list.push(i); balls.set(r, b);
  }
  const out = [];
  for (const b of balls.values()) {
    b.c.divideScalar(b.list.length);
    let best = 0, bd = Infinity;
    L.forEach((l, k) => { const d = b.c.distanceToSquared(l.tip); if (d < bd) { bd = d; best = k; } });
    for (const i of b.list) out.push({i, k: best, h: 1});
  }
  return out.sort((p, q) => p.i - q.i);
}

// The writhe's offset for a point h up stalk k, given the phase P and size A.
export function wave(k, h, P, A, out = [0, 0, 0]) {
  const ph = k * 2.39;
  out[0] = A * Math.sin(P * 1.3 + ph - h * 2.6);
  out[1] = A * .6 * Math.sin(P * 1.1 + ph * 1.7 - h * 2.2);
  out[2] = A * Math.cos(P * .9 + ph * .6 - h * 2.9);
  return out;
}

function own(mesh, eyes) {
  const geo = mesh.geometry.clone(), verts = stalkVertices(geo, eyes);
  const rest = new Float32Array(verts.length * 3), pos = geo.attributes.position;
  verts.forEach((q, j) => { rest[j * 3] = pos.getX(q.i); rest[j * 3 + 1] = pos.getY(q.i); rest[j * 3 + 2] = pos.getZ(q.i); });
  geo.computeBoundingSphere(); geo.boundingSphere.radius += .2;
  const shared = mesh.geometry;
  mesh.geometry = geo;
  const before = mesh.userData.dispose;
  mesh.userData.dispose = () => { geo.dispose(); before?.(); };
  return {mesh, geo, shared, verts, rest};
}

function setup(a) {
  const lift = a.head.parent, find = part => lift.children.find(c => c.isMesh && c.userData.part === part);
  const hide = find('hide'), eyes = find('stalk eyes');
  if (!hide) return null;
  const st = {seed: ((a.g.id ?? 1) * 69621) % 2147483647 || 1, P: 0, A: WAVE, near: 0, agit: 0, life: 1, lastHit: null,
    parts: [own(hide, false), ...(eyes ? [own(eyes, true)] : [])],
    tips: STALKS.map(() => ({s: new THREE.Vector3(), v: new THREE.Vector3(), aim: .6})), wait: 0};
  st.tips.forEach(t => { t.aim = .6 + .4 * rand(st); });
  st.wait = TWITCH_WAIT[0] + (TWITCH_WAIT[1] - TWITCH_WAIT[0]) * rand(st);
  st.P = rand(st) * 10;
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

// Call once a frame (fidget.js does). `look` is where the hero stands. Returns the state.
export function updateBeholderWrithe(a, dt, t, busy, look = null) {
  if (!writhes(a)) return null;
  const st = a.writhe === undefined ? (a.writhe = setup(a)) : a.writhe;
  if (!st) return null;
  dt = Math.min(Math.max(0, dt || 0), .1);
  const dead = !!a.actions?.dead, L = stalkLines();
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? clamp01(1.2 - h.d / RANGE) : 0, 2.5, dt);
  st.agit = approach(st.agit, 0, 1.4, dt);

  // a blow: every stalk flinches out and up, and the writhe goes wild for a moment
  const hit = dead ? null : current(a, 'hit');
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit; st.agit = 1;
    st.tips.forEach((tp, k) => tp.v.addScaledVector(kick.copy(L[k].outward).setY(.8).normalize(), FLINCH * (.7 + .5 * rand(st))));
  }
  // an idle twitch
  if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0) {
      const [lo, hi] = st.near > .5 ? TWITCH_WAIT_NEAR : TWITCH_WAIT;
      st.wait = lo + (hi - lo) * rand(st);
      const tp = st.tips[Math.floor(rand(st) * st.tips.length) % st.tips.length];
      tp.v.add(kick.set(rand(st) - .5, (rand(st) - .3) * .6, rand(st) - .5).normalize().multiplyScalar(TWITCH));
    }
  }
  const atk = dead ? null : current(a, 'attack'), u = atk ? a.actions.u ?? 0 : 0;
  const lash = atk ? smooth(u / .25) * (1 - smooth((u - .65) / .3)) : 0;

  st.P += dt * (RATE + (RATE_NEAR - RATE) * st.near + AGITATE * st.agit) * st.life;
  st.A = (WAVE + (WAVE_NEAR - WAVE) * st.near) * (1 + st.agit * .8) * st.life;

  // each tip chases its target
  st.tips.forEach((tp, k) => {
    tgt.set(0, 0, 0);
    if (h) tgt.set(h.x, .15, h.z).multiplyScalar(AIM * tp.aim * st.near);
    if (lash) tgt.x *= 1 - lash, tgt.z = tgt.z * (1 - lash) + LASH.fwd * lash, tgt.y += LASH.up * lash;
    if (dead) tgt.copy(L[k].outward).multiplyScalar(DROOP.out).setY(-DROOP.down).multiplyScalar(1 - st.life);
    tp.v.addScaledVector(kick.copy(tgt).sub(tp.s), K * dt).multiplyScalar(Math.exp(-D * dt));
    tp.s.addScaledVector(tp.v, dt);
  });

  // move the stalk vertices
  for (const part of st.parts) {
    const pos = part.geo.attributes.position, arr = pos.array, {verts, rest} = part;
    for (let j = 0; j < verts.length; j++) {
      const q = verts[j], tp = st.tips[q.k].s, f = q.h * q.h;
      wave(q.k, q.h, st.P, st.A, w);
      arr[q.i * 3] = rest[j * 3] + f * (w[0] + tp.x);
      arr[q.i * 3 + 1] = rest[j * 3 + 1] + f * (w[1] + tp.y);
      arr[q.i * 3 + 2] = rest[j * 3 + 2] + f * (w[2] + tp.z);
    }
    pos.needsUpdate = true;
  }
  return st;
}

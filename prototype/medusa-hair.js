import * as THREE from 'three';
import {SNAKES, snakePath} from './medusa.js';

// Medusa's hair of snakes (creature queue: "Medusa hair writhe", after medusa-coil.js). The fifteen
// snakes on her scalp used to sit still as a carved wig; now they live:
//  - Writhe: a slow S-wave slides root to tip along every snake, each on its own phase, so the nest
//    coils and glides. Quicker and wider with the hero near.
//  - Tongues: every so often a snake flickers its tongue, in and out three times.
//  - The hero near: every snake leans its head toward them, and now and then one rears and strikes
//    at them, then springs back.
//  - Bite (her snakes' bite attack): the whole nest lunges forward at once.
//  - Gaze: the snakes rear back and fan out round her face, like a hood behind the stare.
//  - Struck: every snake flinches out from the skull and writhes hard for a moment.
//  - Death: the writhe dies away and the snakes droop limp down over her head.
//
// The snakes are merged into the head mesh (and their eyes into the glow mesh), so like the
// beholder's stalks (beholder-writhe.js) each Medusa gets her own copy of those two geometries the
// first time she's updated, and the snake vertices are moved on the CPU: a vertex h of the way up
// snake k moves by h^GROW × (its wave at h + its head's spring offset). The snake's head, tongue
// and eyes ride rigidly at h = 1. medusa-coil.js only turns the head group, so the two never fight.

// RANGE: tiles within which the snakes notice the hero. WAVE/WAVE_NEAR: writhe size at the tip;
// RATE/RATE_NEAR: writhe speed (rad/s); WAVES: waves along a snake; AGITATE: extra speed after a blow.
export const RANGE = 6, WAVE = .011, WAVE_NEAR = .017, RATE = 2.2, RATE_NEAR = 3.6, WAVES = .9, AGITATE = 3, GROW = 1.5;
// Each snake's head is a damped spring (stiffness K, damping D) chasing a target. AIM: lean toward
// the hero; STRIKE: speed of a strike every STRIKE_WAIT s with the hero near; TWITCH: speed of an
// idle jerk every TWITCH_WAIT s; LUNGE: the nest's forward lunge on a bite; REAR: back and out on a
// gaze; FLINCH: speed of a blow's kick; DROOP: the dead snakes' fall; REST_RATE: how fast it dies.
export const K = 110, D = 11, AIM = .022, STRIKE = .5, STRIKE_WAIT = [.35, 1.1], TWITCH = .22, TWITCH_WAIT = [.6, 1.8];
export const LUNGE = .045, REAR = {back: .018, out: .02, up: .01}, FLINCH = .4, DROOP = {down: .05, out: .012}, REST_RATE = 2.5;
// A tongue flicker: how far it pulls in (units), how long it lasts (s), and how often (s).
export const FLICK = .012, FLICK_TIME = .3, FLICK_WAIT = [.4, 1.6];
const SNAP = 1e-4, SAMPLES = 40;

const TAU = Math.PI * 2;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

export const writhes = a => !!(a && !a.asset && (a.kind === 'medusa' || a.species === 'medusa') && a.g && a.head);

// Each snake's centre line (in the head's frame), with two directions across it to wave in. Built once.
let lines = null;
function snakeLines() {
  if (lines) return lines;
  lines = Array.from({length: SNAKES}, (_, i) => {
    const {pts, dir} = snakePath(i), curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const s = curve.getSpacedPoints(SAMPLES), side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const up = new THREE.Vector3().crossVectors(dir, side).normalize();
    const out = new THREE.Vector3(dir.x, 0, dir.z);
    if (out.lengthSq() < 1e-6) out.set(0, 0, -1);
    out.normalize();
    // where medusa.js puts the snake's head (a wedge just past the end, tipped up) and its tongue
    const tan = curve.getTangentAt(1); tan.y += .6; tan.normalize();
    const end = s[SAMPLES];
    return {s, end, head: end.clone().addScaledVector(tan, .016), tongue: end.clone().addScaledVector(tan, .042), side, up, out};
  });
  return lines;
}

// Splits geo into its connected pieces: a list of vertex lists. The merged mesh isn't indexed, so
// vertices join through their triangles and through sharing a position.
function pieces(geo) {
  const pos = geo.attributes.position, n = pos.count, up = Array.from({length: n}, (_, i) => i);
  const find = i => { while (up[i] !== i) i = up[i] = up[up[i]]; return i; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) up[b] = a; };
  const idx = geo.index;
  if (idx) for (let j = 0; j < idx.count; j += 3) { join(idx.getX(j), idx.getX(j + 1)); join(idx.getX(j), idx.getX(j + 2)); }
  else for (let j = 0; j + 2 < n; j += 3) { join(j, j + 1); join(j, j + 2); }
  const at = new Map();
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
    const o = at.get(key);
    if (o === undefined) at.set(key, i); else join(o, i);
  }
  const m = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); (m.get(r) || m.set(r, []).get(r)).push(i); }
  return [...m.values()];
}

// For each snake vertex of geo: its index, snake k, h along the snake (1 for the head, tongue and
// eyes) and whether it's a tongue. A tube is a piece lying along one snake's centre line; a small
// piece by a snake's end, well out from the skull, is that snake's head, tongue or eye.
export function snakeVertices(geo) {
  const L = snakeLines(), pos = geo.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), skull = new THREE.Vector3(0, .1, 0);
  const out = [];
  for (const list of pieces(geo)) {
    c.set(0, 0, 0);
    for (const i of list) c.add(v.fromBufferAttribute(pos, i));
    c.divideScalar(list.length);
    // a tube: every vertex within its radius of one snake's line
    let tube = null;
    for (let k = 0; k < L.length && !tube; k++) {
      const hs = [];
      for (const i of list) {
        v.fromBufferAttribute(pos, i);
        let bd = Infinity, bh = 0;
        L[k].s.forEach((p, j) => { const d = v.distanceToSquared(p); if (d < bd) { bd = d; bh = j / SAMPLES; } });
        if (bd > .016 * .016) break;
        hs.push(bh);
      }
      if (hs.length === list.length && Math.max(...hs) - Math.min(...hs) > .5) tube = {k, hs};
    }
    if (tube) { list.forEach((i, j) => out.push({i, k: tube.k, h: tube.hs[j], tongue: false})); continue; }
    if (c.distanceTo(skull) < .1) continue;
    // the tongue is the one thin box (36 vertices unindexed); the head is a sphere, the eyes smaller spheres
    const tongue = list.length === 36;
    let best = -1, bd = .025 * .025;
    L.forEach((l, k) => { const d = c.distanceToSquared(tongue ? l.tongue : l.head); if (d < bd) { bd = d; best = k; } });
    if (best < 0) continue;
    for (const i of list) out.push({i, k: best, h: 1, tongue});
  }
  return out.sort((p, q) => p.i - q.i);
}

function own(mesh) {
  const geo = mesh.geometry.clone(), verts = snakeVertices(geo), pos = geo.attributes.position;
  const rest = new Float32Array(verts.length * 3);
  verts.forEach((q, j) => { rest[j * 3] = pos.getX(q.i); rest[j * 3 + 1] = pos.getY(q.i); rest[j * 3 + 2] = pos.getZ(q.i); });
  // each tongue pulls in along the line from its snake's head to its own tip
  const tongueDir = new Map(), sum = new Map(), cnt = new Map(), L = snakeLines(), v = new THREE.Vector3();
  verts.forEach(q => { if (!q.tongue) return; v.fromBufferAttribute(pos, q.i); (sum.get(q.k) || sum.set(q.k, new THREE.Vector3()).get(q.k)).add(v); cnt.set(q.k, (cnt.get(q.k) || 0) + 1); });
  for (const [k, s] of sum) tongueDir.set(k, s.divideScalar(cnt.get(k)).sub(L[k].end).normalize());
  // per vertex: its weight h^GROW and which sample of the wave it takes (h is on the SAMPLES grid)
  const f = Float32Array.from(verts, q => Math.pow(q.h, GROW)), hi = Uint8Array.from(verts, q => Math.round(q.h * SAMPLES));
  geo.computeBoundingSphere(); geo.boundingSphere.radius += .1;
  const shared = mesh.geometry;
  mesh.geometry = geo;
  const before = mesh.userData.dispose;
  mesh.userData.dispose = () => { geo.dispose(); before?.(); };
  return {mesh, geo, shared, verts, rest, tongueDir, f, hi};
}

function setup(a) {
  const find = part => a.head.children.find(c => c.isMesh && c.userData.part === part);
  const head = find('head'), eyes = find('eyes');
  if (!head) return null;
  const st = {seed: ((a.g.id ?? 1) * 40692) % 2147483647 || 1, P: 0, A: WAVE, near: 0, agit: 0, life: 1, lastHit: null,
    parts: [own(head), ...(eyes ? [own(eyes)] : [])], wait: 0, twitch: 0,
    snakes: Array.from({length: SNAKES}, () => ({s: new THREE.Vector3(), v: new THREE.Vector3(), aim: .6, flick: -1, next: 0, ph: 0}))};
  st.snakes.forEach(sn => {
    sn.aim = .5 + .5 * rand(st); sn.ph = rand(st) * TAU;
    sn.next = FLICK_WAIT[0] + (FLICK_WAIT[1] - FLICK_WAIT[0]) * rand(st) * 3;
  });
  st.wait = STRIKE_WAIT[1] * rand(st); st.twitch = TWITCH_WAIT[1] * rand(st);
  st.P = rand(st) * 10;
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's direction in the head's frame (x, z, level) and distance, or null out of range.
// medusa-coil.js has already turned the body and head toward them this frame.
function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  const r = -(g.rotation.y + (a.body?.rotation.y || 0) + (a.head.rotation.y || 0)), c = Math.cos(r), s = Math.sin(r);
  return {x: (dx * c + dz * s) / d, z: (-dx * s + dz * c) / d, d};
}

const tgt = new THREE.Vector3(), kick = new THREE.Vector3();

// The writhe across snake k at h along it, phase P, size A: [side, up].
export function wave(k, h, P, A, out = [0, 0]) {
  const ph = k * 2.17;
  out[0] = A * Math.sin(P + ph - h * WAVES * TAU);
  out[1] = A * .55 * Math.sin(P * .8 + ph * 1.6 - h * WAVES * TAU * .8);
  return out;
}

// A tongue flicker over its progress u (0..1): in and out three times, 0 at both ends.
export const flicker = u => !(u > 0) || !(u < 1) ? 0 : Math.abs(Math.sin(u * Math.PI * 3)) * Math.sin(u * Math.PI);

const w = [0, 0];

// Call once a frame (fidget.js does, after medusa-coil.js). `look` is the hero's position. Returns the state.
export function updateMedusaHair(a, dt, t, busy, look = null) {
  if (!writhes(a)) return null;
  const st = a.medusaHair === undefined ? (a.medusaHair = setup(a)) : a.medusaHair;
  if (!st) return null;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  const dead = !!a.actions?.dead, L = snakeLines();
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? clamp01(1.2 - h.d / RANGE) : 0, 2.5, dt);
  st.agit = approach(st.agit, 0, 1.6, dt);

  // struck: every snake flinches out from the skull, and the nest writhes hard
  const hit = dead ? null : current(a, 'hit');
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit; st.agit = 1;
    st.snakes.forEach((sn, k) => sn.v.addScaledVector(kick.copy(L[k].out).setY(.7).normalize(), FLINCH * (.6 + .6 * rand(st))));
  }
  if (!dead) {
    // one snake rears and strikes at the hero now and then; alone, one jerks aside
    if (h && st.near > .4) {
      st.wait -= dt;
      if (st.wait <= 0) {
        st.wait = STRIKE_WAIT[0] + (STRIKE_WAIT[1] - STRIKE_WAIT[0]) * rand(st);
        const sn = st.snakes[Math.floor(rand(st) * SNAKES) % SNAKES];
        sn.v.add(kick.set(h.x, .25, h.z).normalize().multiplyScalar(STRIKE));
      }
    }
    st.twitch -= dt;
    if (st.twitch <= 0) {
      st.twitch = TWITCH_WAIT[0] + (TWITCH_WAIT[1] - TWITCH_WAIT[0]) * rand(st);
      const sn = st.snakes[Math.floor(rand(st) * SNAKES) % SNAKES];
      sn.v.add(kick.set(rand(st) - .5, (rand(st) - .4) * .6, rand(st) - .5).normalize().multiplyScalar(TWITCH));
    }
  }
  const atk = dead ? null : current(a, 'attack'), u = atk ? clamp01(a.actions.u ?? 0) : 0;
  const bite = atk?.attack === 'bite' ? smooth(u / .3) * (1 - smooth((u - .6) / .35)) : 0;
  const gaze = atk?.attack === 'gaze' ? Math.sin(u * Math.PI) : 0;

  st.P += dt * (RATE + (RATE_NEAR - RATE) * st.near + AGITATE * st.agit) * st.life;
  st.A = (WAVE + (WAVE_NEAR - WAVE) * st.near) * (1 + st.agit * .9) * st.life;

  st.snakes.forEach((sn, k) => {
    const l = L[k];
    tgt.set(0, 0, 0);
    if (h) tgt.set(h.x, .1, h.z).multiplyScalar(AIM * sn.aim * st.near);
    if (bite) tgt.multiplyScalar(1 - bite).add(kick.set(0, -.15, 1).normalize().multiplyScalar(LUNGE * bite * (.7 + .3 * sn.aim)));
    if (gaze) tgt.multiplyScalar(1 - gaze).add(kick.copy(l.out).multiplyScalar(REAR.out).setY(REAR.up).add(new THREE.Vector3(0, 0, -REAR.back)).multiplyScalar(gaze));
    if (dead) tgt.copy(l.out).multiplyScalar(DROOP.out).setY(-DROOP.down).multiplyScalar(1 - st.life);
    sn.v.addScaledVector(kick.copy(tgt).sub(sn.s), K * dt).multiplyScalar(Math.exp(-D * dt));
    sn.s.addScaledVector(sn.v, dt);
    // tongue flickers, not in death
    if (sn.flick >= 0) { sn.flick += dt / FLICK_TIME; if (sn.flick >= 1) sn.flick = -1; }
    else if (!dead) {
      sn.next -= dt * (1 + st.near);
      if (sn.next <= 0) { sn.flick = 0; sn.next = FLICK_WAIT[0] + (FLICK_WAIT[1] - FLICK_WAIT[0]) * rand(st); }
    }
    sn.t = sn.flick >= 0 ? flicker(sn.flick) * FLICK : 0;
  });

  // each snake's offset (wave across it plus its head's spring) at every sample along it
  const W = st.W || (st.W = new Float32Array(SNAKES * (SAMPLES + 1) * 3));
  for (let k = 0; k < SNAKES; k++) {
    const l = L[k], sn = st.snakes[k];
    for (let j = 0; j <= SAMPLES; j++) {
      wave(k, j / SAMPLES, st.P, st.A, w);
      const o = (k * (SAMPLES + 1) + j) * 3;
      W[o] = l.side.x * w[0] + l.up.x * w[1] + sn.s.x;
      W[o + 1] = l.side.y * w[0] + l.up.y * w[1] + sn.s.y;
      W[o + 2] = l.side.z * w[0] + l.up.z * w[1] + sn.s.z;
    }
  }
  for (const part of st.parts) {
    const pos = part.geo.attributes.position, arr = pos.array, {verts, rest, tongueDir, f: F, hi} = part;
    for (let j = 0; j < verts.length; j++) {
      const q = verts[j], sn = st.snakes[q.k], f = F[j], o = (q.k * (SAMPLES + 1) + hi[j]) * 3;
      let x = f * W[o], y = f * W[o + 1], z = f * W[o + 2];
      if (q.tongue && sn.t) { const td = tongueDir.get(q.k); x -= td.x * sn.t; y -= td.y * sn.t; z -= td.z * sn.t; }
      arr[q.i * 3] = rest[j * 3] + x; arr[q.i * 3 + 1] = rest[j * 3 + 1] + y; arr[q.i * 3 + 2] = rest[j * 3 + 2] + z;
    }
    pos.needsUpdate = true;
  }
  return st;
}

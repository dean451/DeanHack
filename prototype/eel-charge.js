// The eels (user request, 2026-10-01). Both eels glide, and the electric eel shows its charge:
//  - Swim: a slow wave travels through the reared front (the body), the head (leading it) and the
//    rear coils (the tail, lagging it), on top of the tail swing, so it weaves like an eel instead
//    of just swaying. Faster while it moves.
//  - The hero within RANGE tiles: the head (and a little of the body) turns to track them.
//  - Charge (electric eel): its glow spots pulse in a wave that runs head to tail, brighter and
//    quicker the nearer the hero is.
//  - Crackle (electric eel): now and then a short jagged arc jumps between two spots along the body,
//    flickering for a moment; much more often with the hero near.
//  - Bite: the head draws back to gape, then lunges. The electric eel's spots flare white, arcs snap
//    from its jaws to the target and it shudders.
//  - A blow on the electric eel makes it discharge: a flare and a burst of arcs.
//  - On death no new arcs; the glow fades and the pose eases back to rest.
//
// The model (creatures.js, form 'eel') has no handles for this, so the module finds the head group
// (body's only child group besides the tail) and lays its own glow over the spark spots, whose
// positions are copied from the model below (eel-charge.test.js checks they still match). Two extra
// draws per electric eel (glow points and arc lines); none for the giant eel.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero sensing: range (tiles), the most the head and body turn to the hero (rad) and how fast (1/s).
export const RANGE = 5, HEAD_YAW = .6, BODY_YAW = .2, FACE_RATE = 3;
// Swim: wave rate (rad/s) standing and moving, and the amplitudes (rad) for the body yaw and roll,
// the head's yaw and pitch, and the tail's extra sweep; the head leads and the tail lags by LAG rad.
export const SWIM_RATE = 1.7, SWIM_RATE_WALK = 4.2, BODY_SWAY = .1, BODY_ROLL = .05, HEAD_SWAY = .22, HEAD_BOB = .07, TAIL_SWAY = .2, LAG = 1.1;
// Charge wave: pulses/s far and near, the crest's brightness far and the extra near, and the point size.
export const PULSE_RATE = .5, PULSE_RATE_NEAR = 2.2, GLOW_BASE = .18, GLOW_NEAR = .45, GLOW_SIZE = .11;
// Arcs: the pool, segments per arc, how long one lives and re-jitters (s), the wait between arcs
// (s) with the hero away and near, and how many a blow or bite throws.
export const ARCS = 4, ARC_SEGS = 7, ARC_LIFE = .16, ARC_JITTER = .035, ARC_WAIT = [1.6, 4.2], ARC_WAIT_NEAR = [.35, 1.1], BURST = 3;
// Bite: how far the head draws back to gape and lunges (rad); shudder amplitude (units) and rate (Hz).
export const GAPE = .55, LUNGE = .35, SHUDDER = .018, SHUDDER_HZ = 31;
// Flare decay (1/s) and how fast everything eases to rest after death.
export const FLARE_DECAY = 3.5, REST_RATE = 3;
const SNAP = 1e-3;

// The spark spots, head to tail: three on the reared front (in body's frame), six on the rear
// coils (in the tail's frame). Copied from seaMonster's eel (front.slice(1,4) and rear.slice(1),
// offset as its glow spheres are).
export const FRONT_SPOTS = [[.035, .38, .1], [.075, .26, .08], [.035, .12, .04]];
export const REAR_SPOTS = [[.15, .06, .02], [.23, .2, .01], [.11, .34, 0], [-.09, .36, -.01], [-.17, .24, -.015], [-.13, .12, -.02]];
const MOUTH = [0, -.02, .14];

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const EELS = {'electric eel': {electric: true}, 'giant eel': {electric: false}};
export const glides = a => !!(a && !a.asset && EELS[a.species] && a.g && a.body && a.tail);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The charge wave's brightness (0..1) at a spot s (0 head .. 1 tail) and phase p (cycles): a sharp
// crest that sweeps from head to tail once a cycle, with a short tail of afterglow.
export function crest(p, s) {
  const x = ((p - s * .8) % 1 + 1) % 1;
  return x < .12 ? smooth(x / .12) : Math.exp(-(x - .12) * 9);
}

// The bite at action progress u: {pitch, flare}. The head draws back (negative pitch) to gape over
// the first 35%, snaps forward past rest, and settles; the flare peaks as it lands.
export function bitePose(u) {
  if (!(u > 0) || !(u < 1)) return {pitch: 0, flare: 0};
  const draw = smooth(u / .35), snap = smooth((u - .35) / .12), back = smooth((u - .55) / .45);
  return {pitch: -GAPE * draw * (1 - snap) + LUNGE * snap * (1 - back), flare: smooth((u - .3) / .1) * (1 - smooth((u - .6) / .3))};
}

// ---- shared resources ----
let shared = null;
function softDot() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - Math.hypot(x, y)) ** 2 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  return shared || (shared = {
    glowMat: new THREE.PointsMaterial({size: GLOW_SIZE, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
    arcMat: new THREE.LineBasicMaterial({vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
  });
}
const CYAN = [.45, .9, 1], WHITE = [1, 1, 1];

function setup(a) {
  const look = EELS[a.species];
  const st = {seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, T: 0, life: 1, near: 0, face: 0, walk: 0, flare: 0,
    phase: 0, lastHit: null, lastBite: null, arcs: [], electric: look.electric, off: new Map()};
  st.ph = rand(st) * TAU;
  st.head = a.body.children.find(c => !c.isMesh && c !== a.tail && c.isObject3D) || null;
  if (st.electric) {
    const R = sharedResources(), n = FRONT_SPOTS.length + REAR_SPOTS.length;
    const geo = (count) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
      return g;
    };
    // the glow sits in the actor group's frame, refreshed from the spots each frame, so it follows the tail
    st.glow = new THREE.Points(geo(n), R.glowMat);
    st.arcLines = new THREE.LineSegments(geo(ARCS * ARC_SEGS * 2), R.arcMat);
    for (const o of [st.glow, st.arcLines]) { o.frustumCulled = false; o.renderOrder = 3; o.castShadow = o.receiveShadow = false; }
    st.glow.userData.part = 'eelGlow'; st.arcLines.userData.part = 'eelArcs';
    a.g.add(st.glow, st.arcLines);
    st.wait = ARC_WAIT[0] + (ARC_WAIT[1] - ARC_WAIT[0]) * rand(st);
  }
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since.
function offset(st, obj, prop, axis, v) {
  if (!obj) return;
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && obj[prop][axis] === o.out) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

function sense(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return {b: wrap(Math.atan2(dx, dz) - g.rotation.y), d};
}

const v = new THREE.Vector3();
// The spots, head to tail, in the actor group's frame.
function spots(a, st, out) {
  a.g.updateMatrixWorld(true);
  const inv = st.inv || (st.inv = new THREE.Matrix4());
  inv.copy(a.g.matrixWorld).invert();
  const put = (k, p, obj) => { out[k] = v.set(...p).applyMatrix4(obj.matrixWorld).applyMatrix4(inv).toArray(out[k] || []); };
  FRONT_SPOTS.forEach((p, k) => put(k, p, a.body));
  REAR_SPOTS.forEach((p, k) => put(FRONT_SPOTS.length + k, p, a.tail));
  return out;
}
function mouth(a, st) {
  const obj = st.head || a.body;
  return v.set(...MOUTH).applyMatrix4(obj.matrixWorld).applyMatrix4(st.inv).toArray();
}

function spark(st, from, to, life = ARC_LIFE) {
  if (st.arcs.length >= ARCS) st.arcs.shift();
  st.arcs.push({from, to, age: 0, life, pts: null, jit: 0, seed: rand(st)});
}

// A jagged path from a to b: ARC_SEGS pieces whose inner points jump off the line, most in the middle.
function jag(st, arc) {
  const [ax, ay, az] = arc.from, [bx, by, bz] = arc.to, len = Math.hypot(bx - ax, by - ay, bz - az), amp = Math.min(.06, .18 * len + .015);
  const pts = [];
  for (let i = 0; i <= ARC_SEGS; i++) {
    const s = i / ARC_SEGS, m = i === 0 || i === ARC_SEGS ? 0 : amp * Math.sin(s * Math.PI);
    pts.push([ax + (bx - ax) * s + (rand(st) - .5) * 2 * m, ay + (by - ay) * s + (rand(st) - .5) * 2 * m, az + (bz - az) * s + (rand(st) - .5) * 2 * m]);
  }
  return pts;
}

// Call once a frame (fidget.js does). `busy` is true while it moves or acts; `look` is the hero's
// position (same parent as actor.g); `walking` quickens the swim. Returns the state, or null.
export function updateEelCharge(a, dt, t, busy, look = null, walking = false) {
  if (!glides(a)) return null;
  const st = a.eelCharge || (a.eelCharge = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, 4, dt);

  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? clamp01(1.15 - h.d / RANGE) : 0, 2.5, dt);
  st.face = approach(st.face, h ? h.b : 0, FACE_RATE, dt);

  // the bite and a blow
  const atk = dead ? null : current(a, 'attack'), bite = bitePose(atk ? a.actions.u ?? 0 : 0);
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  st.flare = Math.max(st.flare * Math.exp(-FLARE_DECAY * dt), bite.flare);
  if (st.flare < SNAP) st.flare = 0;

  // the swim wave: body, then head ahead and tail behind
  const rate = SWIM_RATE + (SWIM_RATE_WALK - SWIM_RATE) * st.walk;
  st.phase += dt * rate;
  const P = st.phase + st.ph, calm = 1 - .5 * smooth(st.near) * (1 - st.walk);
  const face = clamp(st.face, -HEAD_YAW - BODY_YAW, HEAD_YAW + BODY_YAW) * (1 - .7 * (atk ? 1 : 0));
  const bodyYaw = (Math.sin(P) * BODY_SWAY * calm + clamp(face, -BODY_YAW, BODY_YAW)) * w;
  const shudder = st.electric ? st.flare * SHUDDER * Math.sin(st.T * SHUDDER_HZ * TAU) * (atk || hit ? 1 : .4) : 0;
  offset(st, a.body, 'rotation', 'y', bodyYaw);
  offset(st, a.body, 'rotation', 'z', Math.sin(P - .4) * BODY_ROLL * calm * w);
  offset(st, a.body, 'position', 'x', shudder * w);
  offset(st, a.tail, 'rotation', 'z', Math.sin(P - LAG) * TAIL_SWAY * w);
  if (st.head) {
    const headYaw = Math.sin(P + LAG) * HEAD_SWAY * calm + clamp(face - clamp(face, -BODY_YAW, BODY_YAW), -HEAD_YAW, HEAD_YAW);
    offset(st, st.head, 'rotation', 'y', headYaw * w);
    offset(st, st.head, 'rotation', 'x', (Math.sin(P * 1.3 + 1) * HEAD_BOB * calm + bite.pitch) * w);
  }
  if (!st.electric) return st;

  // the charge wave over the spots, head to tail
  const pts = spots(a, st, st.pts || (st.pts = []));
  st.pulse = (st.pulse || 0) + dt * (PULSE_RATE + (PULSE_RATE_NEAR - PULSE_RATE) * st.near);
  const pos = st.glow.geometry.attributes.position, col = st.glow.geometry.attributes.color, n = pts.length;
  const lit = w * (dead ? .5 : 1), peak = GLOW_BASE + GLOW_NEAR * st.near;
  for (let i = 0; i < n; i++) {
    const c = crest(st.pulse, i / (n - 1)), b = clamp01((.12 + peak * c + st.flare) * lit), white = clamp01(st.flare + c * st.near * .4);
    pos.setXYZ(i, ...pts[i]);
    col.setXYZW(i, CYAN[0] + (WHITE[0] - CYAN[0]) * white, CYAN[1] + (WHITE[1] - CYAN[1]) * white, CYAN[2] + (WHITE[2] - CYAN[2]) * white, b);
  }
  pos.needsUpdate = col.needsUpdate = true;

  // arcs: idle crackle, quicker near the hero; a burst at a blow; jaw-to-target at a bite
  if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0) {
      const i = Math.floor(rand(st) * n), j = clamp(i + (rand(st) < .5 ? -1 : 1) * (1 + Math.floor(rand(st) * 2)), 0, n - 1);
      if (i !== j) spark(st, pts[i].slice(), pts[j].slice());
      const [lo, hi] = st.near > .3 ? ARC_WAIT_NEAR : ARC_WAIT;
      st.wait = lo + (hi - lo) * rand(st) * (1 - .5 * st.near);
    }
    if (hit && hit !== st.lastHit) {
      st.lastHit = hit; st.flare = 1;
      for (let k = 0; k < BURST; k++) { const i = Math.floor(rand(st) * n), j = Math.floor(rand(st) * n); if (i !== j) spark(st, pts[i].slice(), pts[j].slice(), ARC_LIFE * 1.5); }
    }
    if (atk && bite.flare > .5 && atk !== st.lastBite) {
      st.lastBite = atk;
      const m = mouth(a, st), sc = a.g.scale.x || 1;
      for (let k = 0; k < BURST; k++) spark(st, m.slice(), [(rand(st) - .5) * .3 / sc, (.25 + rand(st) * .3) / sc, (.8 + rand(st) * .2) / sc], ARC_LIFE * 1.8);
    }
  } else st.wait = Math.max(st.wait, 1);
  const lp = st.arcLines.geometry.attributes.position, lc = st.arcLines.geometry.attributes.color;
  let s = 0;
  st.arcs = st.arcs.filter(arc => (arc.age += dt) < arc.life);
  for (const arc of st.arcs) {
    arc.jit -= dt;
    if (!arc.pts || arc.jit <= 0) { arc.pts = jag(st, arc); arc.jit = ARC_JITTER; }
    const fade = 1 - smooth(arc.age / arc.life) * .7, flick = .55 + .45 * Math.sin(arc.age * 140 + arc.seed * 9);
    for (let i = 0; i < ARC_SEGS; i++) {
      lp.setXYZ(s, ...arc.pts[i]); lp.setXYZ(s + 1, ...arc.pts[i + 1]);
      const al = clamp01(fade * flick * w);
      lc.setXYZW(s, .8, .97, 1, al); lc.setXYZW(s + 1, .8, .97, 1, al);
      s += 2;
    }
  }
  for (; s < ARCS * ARC_SEGS * 2; s++) { lp.setXYZ(s, 0, 0, 0); lc.setXYZW(s, 0, 0, 0, 0); }
  lp.needsUpdate = lc.needsUpdate = true;
  st.arcLines.geometry.setDrawRange(0, st.arcs.length * ARC_SEGS * 2);
  return st;
}

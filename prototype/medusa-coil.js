// Medusa's coil and stare (creature animation queue: "Medusa tail sway").
//  - Tail: a slow wave runs root to tip along the tail that trails from her coil, swelling toward
//    the tip, so it slides over the floor like a serpent's instead of rocking as one stiff piece.
//    With the hero near the wave quickens and the tip lifts off the floor and quivers.
//  - Body: she sways slowly on her coils and turns to the hero within RANGE tiles; the head turns
//    the rest of the way and tips to meet the hero's eyes, holding the stare.
//  - Eyes: a smouldering glow over her slit eyes that builds as she stares the hero down, and a
//    blinding flare at a gaze attack (her stoning gaze) as the head thrusts forward.
//  - Attacks: any blow lashes the tail; a bite (the snakes on her head) dips the head forward; a
//    gaze thrusts it out.
//  - Struck: the tail thrashes, then settles. Death: the wave stills, the tip sinks, the eyes go
//    dark and the pose eases back to rest.
//
// The tail (medusa.js `tail`) is one merged mesh shared by every Medusa, so on first update she
// gets her own copy of its geometry, which this module bends each frame (freed with the actor via
// userData.dispose). live.js writes tail.rotation.z every frame from tail-sway.js, which returns 0
// for her, so the tail stays on the floor. The eye glow is one Points (2 points): 1 extra draw.
// Everything else is an offset on the body and head, taken back the next frame.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero sensing: range (tiles), the most the body and head turn to the hero (rad), how fast (1/s).
export const RANGE = 6, BODY_YAW = .35, HEAD_YAW = .55, HEAD_PITCH = .3, FACE_RATE = 2.4;
// The tail wave: waves along the tail, its rate (rad/s) alone and near, its sideways size at the
// tip (units) alone and near, and how sharply it grows toward the tip.
export const WAVES = 1.25, RATE = 1.6, RATE_NEAR = 3.4, AMP = .045, AMP_NEAR = .07, GROW = 1.4;
// The tip: how high it lifts with the hero near, over how much of the tail, and its quiver (units, Hz).
export const TIP_LIFT = .07, TIP_SPAN = .32, QUIVER = .008, QUIVER_HZ = 19;
// A lash (attacks) and a thrash (struck): extra tip swing (units) and how fast a thrash fades (1/s).
export const LASH = .11, THRASH = .09, THRASH_FADE = 2.2;
// The sway on her coils: rate (rad/s), roll (rad) and lean toward the hero (rad).
export const SWAY_RATE = .7, SWAY_ROLL = .03, LEAN = .06;
// The eye glow: point size, glow while staring the hero down, at a gaze, and how fast it eases (1/s).
export const GLOW_SIZE = .09, GLOW_STARE = .55, GLOW_GAZE = 1, GLOW_RATE = 5;
export const REST_RATE = 2.5;
const SNAP = 1e-3, SAMPLES = 64;

// Medusa's slit eyes in the head's frame (medusa.js buildHead), and her tail's path relative to its root.
const EYES = [[-.031, .116, .072], [.031, .116, .072]];
const TAIL_ROOT = [-.1, .054, .18];
const TAIL = [[-.1, .054, .18], [.04, .05, .24], [.22, .046, .2], [.33, .042, .04], [.32, .038, -.16], [.2, .032, -.32], [.04, .026, -.42], [-.12, .02, -.46]];

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const coils = a => !!(a && !a.asset && (a.kind === 'medusa' || a.species === 'medusa') && a.g && a.body && a.head && a.tail);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The tail's sideways wave at arc position s (0 root .. 1 tip), wave phase p, tip size amp.
export const wave = (s, p, amp) => amp * Math.pow(clamp01(s), GROW) * Math.sin(s * WAVES * TAU - p);
// How much of the tip lift a point at s gets.
export const tipShare = s => smooth((s - (1 - TIP_SPAN)) / TIP_SPAN);
// A lash over attack progress u: out and back once, 0 at both ends.
export const lashCurve = u => !(u > 0) || !(u < 1) ? 0 : Math.sin(u * Math.PI) * Math.sin(u * TAU * 1.5);

// For each tail vertex: its arc position s along the tail and the floor-plane sideways direction there.
function mapTail(geo) {
  const curve = new THREE.CatmullRomCurve3(TAIL.map(([x, y, z]) => new THREE.Vector3(x - TAIL_ROOT[0], y - TAIL_ROOT[1], z - TAIL_ROOT[2])));
  const pts = curve.getSpacedPoints(SAMPLES), side = pts.map((_, i) => {
    const tn = curve.getTangentAt(i / SAMPLES), n = Math.hypot(tn.x, tn.z) || 1;
    return [-tn.z / n, tn.x / n];
  });
  const p = geo.attributes.position, n = p.count, s = new Float32Array(n), sx = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let best = 0, bd = Infinity;
    for (let k = 0; k <= SAMPLES; k++) { const d = (pts[k].x - x) ** 2 + (pts[k].y - y) ** 2 + (pts[k].z - z) ** 2; if (d < bd) { bd = d; best = k; } }
    s[i] = best / SAMPLES; sx[i] = side[best][0]; sz[i] = side[best][1];
  }
  return {s, sx, sz, rest: Float32Array.from(p.array)};
}

let glowMat = null;
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
const glowMaterial = () => glowMat || (glowMat = new THREE.PointsMaterial({size: GLOW_SIZE, map: softDot(), color: '#e8ff4a',
  transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}));

function setup(a) {
  const st = {seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, T: 0, life: 1, on: 0, near: 0, face: 0, pitch: 0,
    thrash: 0, lastHit: null, glow: 0, mesh: null, map: null, off: new Map()};
  st.ph = rand(st) * TAU;
  st.mesh = a.tail.children.find(m => m.isMesh) || null;
  if (st.mesh) {
    st.mesh.geometry = st.mesh.geometry.clone();
    st.map = mapTail(st.mesh.geometry);
    const geo = st.mesh.geometry;
    st.mesh.userData.dispose = () => geo.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EYES.flat()), 3));
  // its own material instance, so one Medusa's glare doesn't light every other's eyes
  st.eyes = new THREE.Points(geo, glowMaterial().clone());
  st.eyes.frustumCulled = false; st.eyes.renderOrder = 3; st.eyes.visible = false; st.eyes.userData.part = 'medusaGlare';
  st.eyes.userData.dispose = () => { geo.dispose(); st.eyes.material.dispose(); };
  a.head.add(st.eyes);
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
  // the hero's face (1.1 up) seen from her eyes (about 1.07 up at her scale 1); positive pitch looks down
  return {b: wrap(Math.atan2(dx, dz) - g.rotation.y), d, pitch: -Math.atan2(((look.y || 0) + 1.1) - (g.position.y + 1.07 * (g.scale.y || 1)), d)};
}

// Bends the tail: the wave sideways along the floor plane and the tip lifted (never below rest).
function bendTail(st, p, amp, lift, quiver) {
  const {s, sx, sz, rest} = st.map, pos = st.mesh.geometry.attributes.position, arr = pos.array;
  for (let i = 0, n = s.length; i < n; i++) {
    const w = wave(s[i], p, amp), k = 3 * i, up = lift * tipShare(s[i]);
    arr[k] = rest[k] + sx[i] * w + sx[i] * quiver * up / (TIP_LIFT || 1);
    arr[k + 1] = rest[k + 1] + up;
    arr[k + 2] = rest[k + 2] + sz[i] * w + sz[i] * quiver * up / (TIP_LIFT || 1);
  }
  pos.needsUpdate = true;
  st.mesh.geometry.boundingSphere = null;
}

// Call once a frame (fidget.js does). `busy` is true while she moves or acts; `look` is the hero's
// position (same parent as actor.g). Returns the state, or null for anything but Medusa.
export function updateMedusaCoil(a, dt, t, busy, look = null, walking = false) {
  if (!coils(a)) return null;
  const st = a.medusaCoil || (a.medusaCoil = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  st.on = st.on > 1 - SNAP ? 1 : approach(st.on, 1, REST_RATE, dt);
  const w = st.life * st.on;

  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? clamp01(1.2 - h.d / RANGE) : 0, 2, dt);
  st.face = approach(st.face, h ? h.b : 0, FACE_RATE, dt);
  st.pitch = approach(st.pitch, h ? h.pitch : 0, FACE_RATE, dt);
  if (st.near < SNAP) st.near = 0;
  const near = st.near;

  // blows: struck, she thrashes; attacking, she lashes
  const hit = dead ? null : current(a, 'hit');
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.thrash = 1; }
  st.thrash = approach(st.thrash, 0, THRASH_FADE, dt);
  if (st.thrash < SNAP) st.thrash = 0;
  const atk = dead ? null : current(a, 'attack'), u = atk ? a.actions.u ?? 0 : 0;
  const gaze = atk?.attack === 'gaze' ? Math.sin(clamp01(u) * Math.PI) : 0;
  const bite = atk?.attack === 'bite' ? Math.sin(clamp01(u) * Math.PI) : 0;

  // the tail: the wave runs faster with the hero near and when thrashing
  st.phase = (st.phase ?? st.ph) + dt * (RATE + (RATE_NEAR - RATE) * near + 4 * st.thrash);
  if (st.mesh && st.map) {
    const amp = (AMP + (AMP_NEAR - AMP) * near) * w + LASH * lashCurve(u) * w + THRASH * st.thrash * Math.sin(st.T * 9) * w;
    const lift = TIP_LIFT * smooth(near / .6) * (1 - .7 * (walking ? 1 : 0)) * w;
    bendTail(st, st.phase, amp, lift, QUIVER * Math.sin(st.T * QUIVER_HZ * TAU) * smooth(near / .6));
  }

  // body and head: sway on the coils, turn and lean to the hero, the head meeting the hero's eyes
  const S = st.T * SWAY_RATE + st.ph, look01 = smooth(near / .3);
  const face = clamp(st.face, -BODY_YAW - HEAD_YAW, BODY_YAW + HEAD_YAW) * look01;
  const bodyYaw = clamp(face, -BODY_YAW, BODY_YAW), headYaw = clamp(face - bodyYaw, -HEAD_YAW, HEAD_YAW);
  offset(st, a.body, 'rotation', 'y', bodyYaw * w);
  offset(st, a.body, 'rotation', 'z', Math.sin(S) * SWAY_ROLL * w);
  offset(st, a.body, 'rotation', 'x', (LEAN * near + .05 * gaze) * w);
  offset(st, a.head, 'rotation', 'y', (headYaw + Math.sin(S * .6 + 1) * .06 * (1 - look01)) * w);
  offset(st, a.head, 'rotation', 'x', (clamp(st.pitch, -HEAD_PITCH, HEAD_PITCH) * look01 - .12 * gaze + .35 * bite) * w);
  offset(st, a.head, 'rotation', 'z', -Math.sin(S) * SWAY_ROLL * .8 * w);
  offset(st, a.head, 'position', 'z', (.035 * gaze + .02 * bite) * w);

  // the eyes: smoulder as she stares the hero down, flare at a gaze, dark in death
  st.glow = approach(st.glow, dead ? 0 : Math.max(GLOW_STARE * smooth((near - .2) / .6), GLOW_GAZE * gaze), GLOW_RATE + 20 * gaze, dt);
  if (st.glow < SNAP) st.glow = 0;
  const g = st.glow * st.life;
  st.eyes.visible = g > 0;
  st.eyes.material.opacity = clamp01(g * (.85 + .15 * Math.sin(st.T * 7 + st.ph)));
  st.eyes.material.size = GLOW_SIZE * (1 + 1.4 * gaze) * (a.g.scale.x || 1);
  return st;
}

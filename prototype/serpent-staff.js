// The serpent coiled up Hippocrates' staff of Asclepius comes alive. The staff is one merged mesh
// (hippocrates.js), so this moves its vertices: only the serpent's reared neck and head (picked by
// colour, so the wood and the knob never move) and its forked tongue.
//  - Weave: the head glides slowly from side to side on its neck in an uneven figure, like a snake
//    reading the air, with a small rise and dip. Never a snap.
//  - Taste: at rest the tongue is drawn in. Every few seconds the head lifts a little and the tongue
//    flicks out two or three times, quick and thin, then draws back in.
//  - Hero near (within RANGE tiles): the weave narrows and slows as it fixes on them, and it tastes
//    the air far more often, a cold, interested stillness.
// Dead, it all eases out and the built shape is written back once: head at rest, the tongue left
// lolling out. Stone (`a.stone`) holds.
//
// The staff geometry is shared, so it's cloned per actor on first use and the clone is disposed with
// the actor (userData.dispose, which live.js's release calls).

// The staff is built upright and then tipped by this rotation in hippocrates.js; the serpent's
// motion is worked out in the upright frame. PIVOT: where the neck leaves the coil (the coil's top).
export const TILT = [.3, 0, -.06], PIVOT = [0, .68, -.028];
// The neck bends from NECK_LO (no motion) to NECK_HI (the whole head moves), upright heights.
export const NECK_LO = .668, NECK_HI = .705;
// Weave: side-to-side (yaw, radians) and rise-and-dip (pitch) amplitudes, and the slow base rate.
export const WEAVE = .38, BOB = .09, WEAVE_HZ = .23;
// Taste: gaps between tastes ([alone, near] min and span, s), its length (s), flicks per taste,
// and how far the head lifts through it (pitch, negative rears back).
export const GAP = {far: [3, 4], near: [1.1, 1.4]}, TASTE_LEN = .75, FLICKS = [2, 3], REAR = -.16;
// Hero near: the weave's amplitude and rate scale, and how fast it eases in and out.
export const RANGE = 6, NEAR_WEAVE = .35, NEAR_RATE = .6, NEAR_EASE = 2;
const MAX_DT = .1, EASE = 1.5, REST = 1e-4;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const isSerpentStaff = a => !!a && !a.asset && a.kind === 'hippocrates' && !!a.weaponSocket;

function staffMesh(actor) {
  return actor.weaponSocket.children.find(o => o.isMesh && o.userData.part === 'staff') ?? null;
}

// Wood (the staff, its knots and knob) is dark and reddish; the serpent is green, its belly pale,
// its eyes gold and its tongue red.
const isWood = (r, g) => r > g && r < .06;
const isTongue = (r, g) => r > .2 && g < .03;

// rotation matrices for TILT (Euler XYZ, as three.js applies it): upright -> built, and back
function tilt() {
  const [a, b, c] = TILT, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  const m = [cb * cc, -cb * sc, sb, ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb, sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb];
  return {m, inv: [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]};
}
const mul = (m, x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];

function setup(actor) {
  const mesh = staffMesh(actor), p = mesh?.geometry?.attributes?.position, c = mesh?.geometry?.attributes?.color;
  if (!p || !c) return null;
  const T = tilt(), idx = [], up = [], w = [], tongue = [];
  for (let i = 0; i < p.count; i++) {
    const r = c.getX(i), g = c.getY(i);
    if (isWood(r, g)) continue;
    const u = mul(T.inv, p.getX(i), p.getY(i), p.getZ(i));
    if (u[1] <= NECK_LO) continue;
    idx.push(i); up.push(...u); w.push(smooth((u[1] - NECK_LO) / (NECK_HI - NECK_LO))); tongue.push(isTongue(r, g) ? 1 : 0);
  }
  if (!idx.length) return null;
  // the tongue's root: the middle of its rearmost vertices (the forks spread forward from it)
  let zMin = Infinity;
  for (let n = 0; n < idx.length; n++) if (tongue[n]) zMin = Math.min(zMin, up[n * 3 + 2]);
  const root = [0, 0, 0];
  let k = 0;
  for (let n = 0; n < idx.length; n++) if (tongue[n] && up[n * 3 + 2] < zMin + .003) { root[0] += up[n * 3]; root[1] += up[n * 3 + 1]; root[2] += up[n * 3 + 2]; k++; }
  if (k) for (let j = 0; j < 3; j++) root[j] /= k;
  const geo = mesh.geometry.clone();
  mesh.geometry = geo;
  const prev = mesh.userData.dispose;
  mesh.userData.dispose = () => { prev?.(); geo.dispose(); };
  const seed = ((actor.g?.id ?? 1) * 48271) % 2147483647 || 1;
  return {
    geo, T, rest: Float32Array.from(geo.attributes.position.array), idx: Uint32Array.from(idx), up: Float32Array.from(up),
    w: Float32Array.from(w), tongue: Uint8Array.from(tongue), root, seed, phase: (seed % 1000) / 1000 * Math.PI * 2,
    clock: 0, next: GAP.far[0] * .5 + (seed % 997) / 997 * GAP.far[1], taste: -1, flicks: FLICKS[0],
    near: 0, life: 1, settled: false, pose: {yaw: 0, pitch: 0, ext: 0},
  };
}

function rand(st) { st.seed = st.seed * 48271 % 2147483647; return st.seed / 2147483647; }

// The tongue's reach (0 drawn in, 1 out) at u through a taste of n flicks: quick out, quick in.
export function flick(u, n) {
  if (!(u > 0 && u < 1)) return 0;
  const k = u * n % 1;
  return Math.pow(Math.sin(Math.PI * k), .6);
}

// The serpent's pose at time t: yaw and pitch of the head on its neck, and the tongue's reach.
export function serpentPose(st, t) {
  const life = st.life, calm = 1 - st.near * (1 - NEAR_WEAVE), rate = 1 - st.near * (1 - NEAR_RATE), ph = st.phase;
  const s = Math.PI * 2 * WEAVE_HZ * rate * t;
  const yaw = WEAVE * calm * (Math.sin(s + ph) * .7 + Math.sin(2.3 * s + ph * 1.9) * .3);
  const bob = BOB * calm * Math.sin(1.6 * s + ph * .7);
  let rear = 0, ext = 0;
  if (st.taste >= 0) {
    const u = st.taste / TASTE_LEN;
    rear = REAR * Math.sin(Math.PI * clamp01(u));
    ext = flick(clamp01((u - .15) / .75), st.flicks);
  }
  return {yaw: yaw * life, pitch: (bob + rear) * life, ext: ext * life};
}

// Per frame. `look` is the hero's position (same parent as actor.g), or null. Returns the state, or
// null for other actors.
export function updateSerpentStaff(actor, dt, t, look = null) {
  if (!isSerpentStaff(actor)) return null;
  let st = actor.serpentStaff;
  if (st === undefined) st = actor.serpentStaff = setup(actor);
  if (!st || actor.stone) return st;
  dt = Number.isFinite(dt) ? Math.min(MAX_DT, Math.max(0, dt)) : 0;
  t = Number.isFinite(t) ? t : 0;
  const dead = !!actor.actions?.dead, g = actor.g;
  let near = false;
  if (!dead && look && Number.isFinite(look.x) && Number.isFinite(look.z))
    near = Math.hypot(look.x - g.position.x, look.z - g.position.z) <= RANGE;
  st.near += ((near ? 1 : 0) - st.near) * (1 - Math.exp(-NEAR_EASE * dt));
  st.life += ((dead ? 0 : 1) - st.life) * (1 - Math.exp(-EASE * dt));

  st.clock += dt;
  if (st.taste >= 0) {
    st.taste += dt;
    if (st.taste >= TASTE_LEN) st.taste = -1;
  } else if (!dead && st.clock >= st.next) {
    const [min, span] = near ? GAP.near : GAP.far;
    st.taste = 0; st.clock = 0; st.next = min + rand(st) * span;
    st.flicks = FLICKS[0] + Math.floor(rand(st) * (FLICKS[1] - FLICKS[0] + 1));
  }

  const pose = serpentPose(st, t);
  st.pose = pose;
  // dead and still: the built shape (the tongue out, lolling)
  const quiet = dead && st.life < .01 && st.taste < 0;
  if (quiet && st.settled) return st;
  const pos = st.geo.attributes.position.array, rest = st.rest, up = st.up, [px, py, pz] = PIVOT, r = st.root;
  // drawn in while alive, eased back out to the built shape as it dies
  const ext = pose.ext + (1 - st.life);
  for (let n = 0; n < st.idx.length; n++) {
    const j = st.idx[n] * 3;
    if (quiet) { pos[j] = rest[j]; pos[j + 1] = rest[j + 1]; pos[j + 2] = rest[j + 2]; continue; }
    let x = up[n * 3], y = up[n * 3 + 1], z = up[n * 3 + 2];
    if (st.tongue[n]) { x = r[0] + (x - r[0]) * ext; y = r[1] + (y - r[1]) * ext; z = r[2] + (z - r[2]) * ext; }
    const w = st.w[n], ay = pose.yaw * w, ax = pose.pitch * w, cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    // pitch about x, then yaw about y, both through the pivot
    let dx = x - px, dy = y - py, dz = z - pz;
    const ry = dy * cx - dz * sx, rz = dy * sx + dz * cx;
    dy = ry; dz = rz;
    const qx = dx * cy + dz * sy, qz = -dx * sy + dz * cy;
    const b = mul(st.T.m, px + qx, py + dy, pz + qz);
    pos[j] = b[0]; pos[j + 1] = b[1]; pos[j + 2] = b[2];
  }
  st.settled = quiet;
  st.geo.attributes.position.needsUpdate = true;
  return st;
}

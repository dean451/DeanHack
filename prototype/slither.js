// Slither: snakes, nagas, cobras and vipers ripple their coils as they crawl, and the newts, geckos,
// iguanas and the other lizards (and crocodiles) throw their spine into an S with every stride.
//
// Serpents (quirk 'snake' with a coil mesh: creatures.js snake(), the old naga and naga.js): the coil is one
// rigid tube, so the slither moves its vertices. A wave runs round the coil from the head end out to the tail,
// pushing each ring out and in along the spiral's radius; it grows toward the outer, tail end of the coil and is
// all but still where the coil rises into the neck. The body sways from side to side with it, and the head (a
// cobra's or viper's, held up) or the naga's raised neck turns back against the sway, so the head holds steady
// while the coil works under it. Each snake gets its own copy of the coil's geometry the first time it moves (and
// so does its outline hull, which shares it), so one snake's ripple never shows on another.
//
// Lizards (quirk 'lizard': lizard.js, crocodile.js): the trunk yaws from side to side in step with the legs live.js
// swings (sin(t*22)), the tail's base swings the other way, and the head turns back against the trunk to stay
// nearly level, the sprawling-lizard S walk.
//
// At rest both drop to a slow, small idle wave. Every rotation is an offset taken back first thing next frame,
// unless something else rewrote the value since (swing.js style), so a snake or lizard that stops is exactly at
// rest. Dragons have their own walk (dragon-walk.js), whose trunk swing and serpent wave are a gentler version of
// the lizard's.

export const SERPENT = {rate: 7, ripple: .028, idleRate: 1.6, idleRipple: .006, waves: 3, sway: .09, idleSway: .015, head: .85, blend: 6};
export const LIZARD = {rate: 22, trunk: .16, tail: 1.6, head: .8, idleRate: 1.3, idleTail: .05, blend: 8};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export function coilOf(a) {
  let coil = null;
  a?.body?.traverse?.(o => { if (!coil && o.isMesh && (o.userData.coil || o.userData.part === 'coil')) coil = o; });
  return coil;
}

export function slitherKind(a) {
  if (!a || a.asset || !a.body || a.actions?.dead) return null;
  if (a.quirk === 'snake') return coilOf(a) ? 'serpent' : null;
  if (a.quirk === 'lizard' && a.tail && a.head && !a.rustFeel) return 'lizard';
  return null;
}

// How far a coil vertex at radius r (of the coil's outer radius R), round the coil at angle `angle`, moves out
// along its radius at wave phase `phase` with ripple amplitude `amp`. Grows toward the outer (tail) end.
export function rippleAt(angle, r, R, phase, amp, waves = SERPENT.waves) {
  const reach = smooth(r / (R || 1) * 1.4 - .25);
  return amp * reach * Math.sin(waves * angle - phase);
}

// The lizard's yaws at stride phase `phase` and walk blend `w`: the trunk, the tail's base (the other way) and
// the head (back against the trunk).
export function lizardYaw(phase, w) {
  const trunk = LIZARD.trunk * Math.sin(phase) * w;
  return {trunk, tail: -LIZARD.tail * trunk, head: -LIZARD.head * trunk};
}

// Add v to rot[axis], first taking back last frame's offset if the value is still what we left it at.
function offset(st, key, rot, axis, v) {
  const last = st.applied.get(key);
  if (last && rot[axis] === last.result) rot[axis] -= last.v;
  rot[axis] += v;
  st.applied.set(key, {v, result: rot[axis]});
}

function approach(v, to, rate, dt) { const n = to + (v - to) * Math.exp(-rate * dt); return Math.abs(n - to) < 1e-3 ? to : n; }

// Give the coil its own geometry (and the outline hull sharing it), and note each vertex's rest position.
function ownCoil(coil) {
  const old = coil.geometry, geo = old.clone();
  coil.geometry = geo;
  for (const c of coil.children) if (c.userData.outline && c.geometry === old) c.geometry = geo;
  const pos = geo.attributes.position, base = Float32Array.from(pos.array), n = pos.count;
  const angle = new Float32Array(n), radius = new Float32Array(n);
  let R = 0;
  for (let i = 0; i < n; i++) { const x = base[i * 3], z = base[i * 3 + 2]; angle[i] = Math.atan2(z, x); radius[i] = Math.hypot(x, z); R = Math.max(R, radius[i]); }
  return {geo, base, angle, radius, R};
}

function updateSerpent(a, st, dt, walking) {
  const S = SERPENT;
  st.w = approach(st.w, walking ? 1 : 0, S.blend, dt);
  st.phase += (S.idleRate + (S.rate - S.idleRate) * st.w) * dt;
  st.swayPhase += (S.idleRate + (S.rate * .5 - S.idleRate) * st.w) * dt;
  const amp = S.idleRipple + (S.ripple - S.idleRipple) * st.w;
  if (!st.coil) st.coil = ownCoil(coilOf(a));
  const {geo, base, angle, radius, R} = st.coil, pos = geo.attributes.position, arr = pos.array;
  for (let i = 0; i < pos.count; i++) {
    const r = radius[i], d = rippleAt(angle[i], r, R, st.phase, amp), k = r > 1e-6 ? d / r : 0;
    arr[i * 3] = base[i * 3] * (1 + k); arr[i * 3 + 1] = base[i * 3 + 1]; arr[i * 3 + 2] = base[i * 3 + 2] * (1 + k);
  }
  pos.needsUpdate = true;
  const sway = (S.idleSway + (S.sway - S.idleSway) * st.w) * Math.sin(st.swayPhase);
  offset(st, 'body', a.body.rotation, 'y', sway);
  const head = a.head || a.jaw?.parent || a.tail;
  if (head) offset(st, 'head', head.rotation, 'y', -S.head * sway);
  return {sway, amp};
}

function updateLizard(a, st, dt, t, walking) {
  const L = LIZARD;
  st.w = approach(st.w, walking ? 1 : 0, L.blend, dt);
  const y = lizardYaw(t * L.rate, st.w);
  const idle = L.idleTail * Math.sin(t * L.idleRate + st.seed) * (1 - st.w);
  offset(st, 'body', a.body.rotation, 'y', y.trunk);
  offset(st, 'tail', a.tail.rotation, 'y', y.tail + idle);
  offset(st, 'head', a.head.rotation, 'y', y.head);
  return y;
}

// Call once per frame after live.js has written the legs and the gait layers have run.
export function updateSlither(a, dt, t, walking) {
  const kind = slitherKind(a);
  if (!kind) return null;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  const st = a.slither || (a.slither = {w: 0, phase: 0, swayPhase: 0, seed: (a.g?.id || 0) * 1.7, applied: new Map(), coil: null});
  return kind === 'serpent' ? updateSerpent(a, st, dt, !!walking) : updateLizard(a, st, dt, t, !!walking);
}

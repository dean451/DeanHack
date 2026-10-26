// A chickatrice, cockatrice or pyrolisk crowing in play: left standing still with the hero not close (close, the
// hiss in cockatrice-hiss.js owns it), every so often it throws its beak up, flings its wings up and cocks its tail,
// the pose cockatrice-crow.js solves by role, holds it trembling for the measured crow, and lets it fall. Called
// from live.js's actor loop after updateCockatriceSettle. Like the settling it adds its share to each joint and
// takes that back at the start of the next call, so every joint returns exactly to its awake value.
import {crowPose, crows, CROW} from './cockatrice-crow.js';
import {takeBackRest, NEAR} from './insect-settle.js';

// RISE, FALL: seconds to throw the head up and to let it down (the hold is the rest of the crow); FIRST and GAP:
// seconds of stillness before the first crow, and between crows (a minimum and a span, drawn from the bird's
// seed); BREAK: how fast it drops out of a crow when the bird moves, acts or the hero comes near (1/s);
// TREMBLE, RATE: the shake of the neck while held (radians, rad/s).
export const RISE = .22, FALL = .5, FIRST = [5, 6], GAP = [12, 14], BREAK = 6, TREMBLE = .05, RATE = 29;

const POSES = new Map();
// The solved crowing pose for this kind of bird (cached by name), or null when it did not meet every goal.
export function crowFor(a) {
  const key = `${a.species || a.name || ''}:${a.g.scale.x}`;
  if (!POSES.has(key)) {
    const r = crowPose(a), worst = Math.max(...r.residuals.map(v => Math.hypot(...(Array.isArray(v) ? v : [v]))));
    POSES.set(key, worst < .02 ? r.pose : null);
  }
  return POSES.get(key);
}

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
// How far into the crow pose (0..1) s seconds in: a quick rise, a hold, a slower fall; zero outside the crow.
export function crowWeight(s) {
  if (!Number.isFinite(s) || s <= 0 || s >= CROW.seconds) return 0;
  if (s < RISE) return 1 - (1 - s / RISE) ** 3;
  return s < CROW.seconds - FALL ? 1 : 1 - smooth((s - CROW.seconds + FALL) / FALL);
}

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// Called every frame for every actor; does nothing for a creature that is not a cockerel. Returns how far into
// the crow it is (0..1).
export function updateCockatriceCrow(a, dt, t, busy, look = null) {
  if (!crows(a)) return 0;
  const st = a.fowlCrow || (a.fowlCrow = {seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, wait: null, s: -1, f: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0; t = Number.isFinite(t) ? t : 0;
  if (st.wait === null) st.wait = FIRST[0] + FIRST[1] * rand(st);
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  // (not while it is lying down for the night, nor mid-hiss: those have the joints then)
  const still = !busy && !a.actions?.dead && !near && !(a.fowlRest?.p > 0) && !a.hissing?.hiss;
  if (st.s >= 0) {
    st.s += dt;
    st.f = still ? Math.min(1, st.f + dt * BREAK) : Math.max(0, st.f - dt * BREAK);
    if (st.s >= CROW.seconds || st.f <= 0) { st.s = -1; st.f = 0; st.wait = GAP[0] + GAP[1] * rand(st); }
  } else if (still && (st.wait -= dt) <= 0) { st.s = 0; st.f = 1; }
  const w = st.s >= 0 ? crowWeight(st.s) * st.f : 0;
  const pose = w ? crowFor(a) : null;
  if (!pose) { if (w) { st.s = -1; st.f = 0; } return 0; }
  const shake = TREMBLE * Math.sin(t * RATE) * (st.s > RISE && st.s < CROW.seconds - FALL ? st.f : 0);
  for (const [n, p] of Object.entries(pose)) {
    const o = a.joints[n]?.rotation;
    if (!o || typeof p !== 'object') continue;
    for (const ax of ['x', 'y', 'z']) {
      const add = (p[ax] || 0) * w + (n === 'neck0' && ax === 'x' ? shake : 0), now = o[ax];
      if (!add) continue;
      o[ax] = now + add; st.written.push({get: () => o[ax], set: v => { o[ax] = v; }, left: now + add, was: now});
    }
  }
  return w;
}

// Shell tuck for the giant turtle (turtle.js). When a blow lands the head snaps back under the
// front rim of the shell and the tail draws in under the back. It stays in for a moment after
// the flinch ends, then peeks out in two stages: halfway, a wary pause, then the rest of the way.
// A turtle that walks off comes out quickly (it has to see where it's going). A dead turtle
// withdraws and stays in.
//
// The tuck is an offset on head.position and tail.position, which nothing else writes. Call
// updateTuck once per frame after updateActions: it takes back its own last offset first, so it
// never drifts.

// How far the head and tail draw in, in world units (the model is ~.9 long).
export const HEAD_BACK = .15, HEAD_DOWN = .025, TAIL_IN = .045;
// Seconds in after the flinch ends: HOLD_MIN..+HOLD_SPAN (0 while walking).
export const HOLD_MIN = 1.4, HOLD_SPAN = 1.2;
// The peek: PEEK of the way out over PEEK_S, a PAUSE_S pause, then fully out over OUT_S.
export const PEEK = .55, PEEK_S = .8, PAUSE_S = .6, OUT_S = .8;
// Walking: out at this exponential rate (~.4 s), no pause.
export const WALK_OUT_RATE = 9;
const TUCK_RATE = 28, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const tucks = a => !!(a?.quirk === 'turtle' && a.head && !a.asset);

// How far in (1 = fully tucked) at s seconds into the peek.
export function peekPose(s) {
  if (!(s > 0)) return 1;
  if (s < PEEK_S) return 1 - PEEK * smooth(s / PEEK_S);
  if (s < PEEK_S + PAUSE_S) return 1 - PEEK;
  return (1 - PEEK) * (1 - smooth((s - PEEK_S - PAUSE_S) / OUT_S));
}
export const peekLength = () => PEEK_S + PAUSE_S + OUT_S;

// A flinch that has actually landed (a hit waits for the blow that causes it).
const struck = q => q?.current?.kind === 'hit' && q.age >= (q.current.wait ?? 0);

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `walking` is true while the actor moves between
// cells. Returns how far in it is this frame (0..1).
export function updateTuck(actor, dt, walking = false) {
  if (!tucks(actor)) return 0;
  const st = actor.tuck || (actor.tuck = {seed: ((actor.g?.id ?? 1) * 7919) % 2147483647 || 1, f: 0, hold: 0, peek: -1, from: 0, applied: 0});
  actor.head.position.z += st.applied * HEAD_BACK;
  actor.head.position.y += st.applied * HEAD_DOWN;
  if (actor.tail) actor.tail.position.z -= st.applied * TAIL_IN;
  st.applied = 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const q = actor.actions, dead = !!q?.dead;

  if (dead || struck(q)) {
    // Snap in; any peek starts over after the hold.
    st.f += (1 - st.f) * (1 - Math.exp(-TUCK_RATE * dt));
    if (1 - st.f < SNAP) st.f = 1;
    st.hold = dead ? Infinity : HOLD_MIN + HOLD_SPAN * rand(st);
    st.peek = -1;
  } else if (st.f > 0 && walking) {
    // Out quickly and smoothly from wherever it is, with no pause.
    st.f *= Math.exp(-WALK_OUT_RATE * dt);
    st.hold = 0; st.peek = -1;
    if (st.f < SNAP) st.f = 0;
  } else if (st.f > 0) {
    if (st.peek < 0) {
      st.hold -= dt;
      if (st.hold <= 0) { st.peek = 0; st.from = st.f; }
    } else {
      st.peek += dt;
      // A peek that starts only partly tucked scales down, so it never jumps further in.
      st.f = st.from * peekPose(st.peek);
      if (st.peek >= peekLength() || st.f < SNAP) { st.f = 0; st.peek = -1; }
    }
  }

  if (!(st.f > 0)) return 0;
  st.applied = st.f;
  actor.head.position.z -= st.f * HEAD_BACK;
  actor.head.position.y -= st.f * HEAD_DOWN;
  if (actor.tail) actor.tail.position.z += st.f * TAIL_IN;
  return st.f;
}

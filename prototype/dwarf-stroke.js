// Idle beard-stroke for dwarves (dwarf.js). A dwarf that has stood still for a few seconds now and
// then sizes the place up like a miner pricing a seam: the free (left) hand comes up and draws
// down the beard in two slow strokes while the head tips down and nods, grudgingly, then jerks
// aside to glare at nothing before the hand drops back. Walking, an action or death fades it out
// within ~0.1 s.
//
// Only the head and the left arm move, as offsets on top of whatever the idle loop and actions.js
// posed this frame; the body is left alone because the legs hang from it. The stroke takes back
// its own last offset first and then adds this frame's.

// RAISE: left arm lifted forward (negative x); IN: arm swung across toward the beard (z); STROKE:
// size of each downward draw (arm pitch); NOD: head tipped down (+x tips it down); GLARE: the jerk
// of the head aside at the end (y).
export const RAISE = 1.25, IN = .42, STROKE = .22, NOD = .2, GLARE = .55;
// Seconds for one stroke.
export const STROKE_LEN = 4;
// First stroke after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 6, FIRST_SPAN = 4, GAP_MIN = 9, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const strokes = a => !!(a && !a.asset && a.quirk === 'dwarf' && a.head && a.beard && Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({raise: 0, across: 0, draw: 0, nod: 0, glare: 0});

// Phases in u: hand up .05–.25, two strokes .25–.7, hand down .74–.9, glare .78–.95.
export function strokePose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const held = win(u, .1, .74, .15);
  p.raise = RAISE * held * f;
  p.across = IN * held * f;
  // two slow draws down the beard: the hand sinks a little, then comes back up
  p.draw = STROKE * (hump(u, .27, .47) + hump(u, .5, .7)) * f;
  // the head tips down over the hand and nods once, grudgingly, at each stroke
  p.nod = NOD * (.6 * held + .4 * (hump(u, .27, .47) + hump(u, .5, .7))) * f;
  // the jerk aside: sharp out, slower back
  p.glare = GLARE * (smooth((u - .78) / .04) - smooth((u - .88) / .09)) * f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not stroking.
export function updateDwarfStroke(actor, dt, t, busy) {
  if (!strokes(actor)) return null;
  const st = actor.dwarfStroke || (actor.dwarfStroke = {seed: ((actor.g?.id ?? 1) * 32452843) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, arms: [hand]} = actor, o = st.applied;
  hand.rotation.x += o.raise - o.draw; hand.rotation.z -= o.across;
  head.rotation.x -= o.nod; head.rotation.y -= o.glare;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted stroke always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / STROKE_LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = strokePose(st.cur.u, st.f);
  hand.rotation.x -= p.raise - p.draw; hand.rotation.z += p.across;
  head.rotation.x += p.nod; head.rotation.y += p.glare;
  st.applied = p;
  return p;
}

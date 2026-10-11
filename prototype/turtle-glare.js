// Idle glare tic for giant turtles (turtle.js, quirk 'turtle'). A turtle that has stood still for a
// few seconds now and then turns its head very slowly to one side, lifts it a little and holds a
// cold, unblinking stare at nothing. Then, with no warning, it snaps its beak shut on the air in
// one hard bite and sinks back to rest as slowly as it rose. Walking, an action or death fades it
// out within ~0.1 s.
//
// Only the head's rotation moves, as offsets on top of whatever the idle loop, tuck.js (which
// owns head.position) and actions.js posed this frame. The glare takes back its own last offset
// first and then adds this frame's.

// TURN: head swung round (y); LIFT: head raised (negative x); BITE: the beak driven down (x).
export const TURN = .55, LIFT = .2, BITE = .4;
// Seconds for one glare.
export const GLARE_LEN = 4.4;
// First glare after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 5, GAP_MIN = 10, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const glares = a => !!(a && !a.asset && a.quirk === 'turtle' && a.head);

const ZERO = () => ({turn: 0, lift: 0, bite: 0});

// Phases in u: the head turns .06-.4 and stays round to .64, rolling home .64-.98; it lifts .14-.5
// and holds to .56, settling .56-.96. The bite is one sharp hump at .62-.68, then a smaller rebound .68-.72.
export function glarePose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.turn = TURN * win(u, .06, .34, .64, .34) * f;
  p.lift = LIFT * win(u, .14, .36, .56, .4) * f;
  p.bite = BITE * (hump(u, .62, .68) + .25 * hump(u, .68, .72)) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not glaring.
export function updateTurtleGlare(actor, dt, t, busy) {
  if (!glares(actor)) return null;
  const st = actor.turtleGlare || (actor.turtleGlare = {seed: ((actor.g?.id ?? 1) * 40503719) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head} = actor, o = st.applied;
  head.rotation.y -= o.turn; head.rotation.x -= o.bite - o.lift;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted glare always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / GLARE_LEN;
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
  const p = glarePose(st.cur.u, st.f);
  head.rotation.y += p.turn; head.rotation.x += p.bite - p.lift;
  st.applied = p;
  return p;
}

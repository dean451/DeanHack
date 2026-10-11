// A manes's idle scrabble (manes.js, quirk 'manes'). A manes that stands still now and then is
// seized by a starved fit: it hunches, both long arms rake at the floor in turn with the three-
// clawed hands, the head jerking from side to side as the jaw gapes at nothing, and then it slumps
// upright again as if it had forgotten what it wanted. Walking, an action or death takes it back
// within a moment.
//
// Offsets only: the body's drop, the head's yaw (rotation.y) and pitch (rotation.x) and each arm's
// rake (rotation.x) are added on top of whatever the idle loop and the action layer wrote, and
// taken back first next frame, so nothing drifts.

// HUNCH: body drop; JERK: head yaw (rad); GAPE: head pitch (rad); RAKE: arm swing (rad).
export const HUNCH = .04, JERK = .45, GAPE = .25, RAKE = .7;
// First scrabble after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 7, GAP_SPAN = 8, SCRABBLE_LEN = 3;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const scrabbles = a => !!(a && !a.asset && a.quirk === 'manes' && a.head && a.body && a.arms?.length === 2);

const ZERO = () => ({hunch: 0, jerk: 0, gape: 0, left: 0, right: 0});

// The scrabble at progress u (0..1): {hunch} 0..1 the body drops .04-.2 and holds to .85, rising
// .85-.98; {gape} 0..1 the jaw-head tips open over the same span; {jerk} -1..1 the head snaps
// side to side (a fast sine under that swell); {left}, {right} -1..1 the arms rake in turn
// (sines half a turn apart under a swell over .12-.8). All exactly zero at both ends.
export function scrabblePose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.hunch = win(u, .04, .16, .85, .13) * f;
  p.gape = p.hunch;
  p.jerk = Math.sin(u * 52) * win(u, .1, .1, .8, .12) * f;
  const rake = win(u, .12, .1, .8, .12) * f;
  p.left = Math.sin(u * 38) * rake;
  p.right = -Math.sin(u * 38) * rake;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not scrabbling.
export function updateManesScrabble(actor, dt, t, busy) {
  if (!scrabbles(actor)) return null;
  const st = actor.manesScrabble || (actor.manesScrabble = {seed: ((actor.g?.id ?? 1) * 22013) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, body, arms} = actor, o = st.applied;
  body.position.y += o.hunch * HUNCH;
  head.rotation.y -= o.jerk * JERK; head.rotation.x -= o.gape * GAPE;
  arms[0].rotation.x -= o.left * RAKE; arms[1].rotation.x -= o.right * RAKE;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted scrabble always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / SCRABBLE_LEN;
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
  const p = scrabblePose(st.cur.u, st.f);
  body.position.y -= p.hunch * HUNCH;
  head.rotation.y += p.jerk * JERK; head.rotation.x += p.gape * GAPE;
  arms[0].rotation.x += p.left * RAKE; arms[1].rotation.x += p.right * RAKE;
  st.applied = p;
  return p;
}

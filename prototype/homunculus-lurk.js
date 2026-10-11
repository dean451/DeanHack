// Idle lurk for homunculi (homunculus.js). A homunculus that has stood still for a few seconds
// now and then goes wrong: the head sinks slowly to stare at the floor at its own feet, then
// snaps up and round to stare at nothing, and the leathery wings give one hard twitch behind it.
// Walking, an action or death fades it out within ~0.1 s.
//
// Only the head (pitch rotation.x, yaw rotation.y) and the wings' roll are offsets on top of
// whatever the idle loop and actions.js posed this frame. The lurk takes back its own last
// offset first.

// SINK: head pitched down (x); STARE: the snap round (y); TWITCH: each wing thrown (z, mirrored).
export const SINK = .5, STARE = .8, TWITCH = .6;
// Seconds for one lurk.
export const LURK_LEN = 3;
// First lurk after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 4, GAP_MIN = 10, GAP_SPAN = 8;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const lurks = a => !!(a && !a.asset && a.quirk === 'homunculus' && a.head && a.wings?.length === 2);

const ZERO = () => ({sink: 0, stare: 0, twitch: 0});

// Phases in u: the head sinks slowly .05-.45 and holds to .55, then snaps up .55-.58; the stare
// is held .56-.85 and released .85-.93; the wings twitch hard .6-.66 and rebound .66-.76.
// Exactly zero at both ends.
export function lurkPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.sink = SINK * (smooth((u - .05) / .4) - smooth((u - .55) / .03)) * f;
  p.stare = STARE * win(u, .56, .85, .03) * f;
  p.twitch = TWITCH * (hump(u, .6, .66) - .3 * hump(u, .66, .76)) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not lurking.
export function updateHomunculusLurk(actor, dt, t, busy) {
  if (!lurks(actor)) return null;
  const st = actor.homunculusLurk || (actor.homunculusLurk = {seed: ((actor.g?.id ?? 1) * 69069) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, wings} = actor, o = st.applied;
  head.rotation.x -= o.sink; head.rotation.y -= o.stare;
  for (const w of wings) w.rotation.z -= o.twitch * (w.userData.side || 1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted lurk always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / LURK_LEN;
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
  const p = lurkPose(st.cur.u, st.f);
  head.rotation.x += p.sink; head.rotation.y += p.stare;
  for (const w of wings) w.rotation.z += p.twitch * (w.userData.side || 1);
  st.applied = p;
  return p;
}

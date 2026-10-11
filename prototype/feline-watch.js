// Idle watching tic for wild cats (feline.js, quirk 'feline'). A cat that has stood still for a few
// seconds now and then sinks its head low and locks onto something that is not there: the head
// jerks after it in three hard snaps, left, further left, then all the way back across, never
// smooth, as if the thing were crossing the room. The tail tip twitches twice, then the stare
// lets go with a slow roll back to rest. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head and the tail move, as offsets on top of whatever the idle loop and actions.js
// posed this frame. The watch takes back its own last offset first and then adds this frame's.

// CROUCH: head sunk low for the stare (x); TRACK: the head swung after the unseen thing (y);
// TWITCH: the tail thrown sideways (z).
export const CROUCH = .32, TRACK = .6, TWITCH = .55;
// Seconds for one watch.
export const WATCH_LEN = 3.6;
// First watch after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 5, GAP_MIN = 10, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const step = (u, a, edge) => smooth((u - a) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const watches = a => !!(a && !a.asset && a.quirk === 'feline' && a.head && a.tail);

const ZERO = () => ({crouch: 0, track: 0, twitch: 0});

// Phases in u: the head sinks .06-.16 and stays low to .84; it snaps to +.5 of TRACK at .2, to
// the full TRACK at .36 and back across to -.7 at .52 (each snap ~.03 long), holds, then rolls
// slowly home .78-.92. The tail twitches .56-.62 and .66-.72.
export function watchPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.crouch = CROUCH * win(u, .06, .84, .1) * f;
  const sweep = .5 * step(u, .2, .03) + .5 * step(u, .36, .03) - 1.7 * step(u, .52, .03) + .7 * step(u, .78, .14);
  p.track = TRACK * sweep * f;
  p.twitch = TWITCH * (hump(u, .56, .62) + hump(u, .66, .72)) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not watching.
export function updateFelineWatch(actor, dt, t, busy) {
  if (!watches(actor)) return null;
  const st = actor.felineWatch || (actor.felineWatch = {seed: ((actor.g?.id ?? 1) * 40503719) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, tail} = actor, o = st.applied;
  head.rotation.x -= o.crouch; head.rotation.y -= o.track; tail.rotation.z -= o.twitch;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted watch always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / WATCH_LEN;
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
  const p = watchPose(st.cur.u, st.f);
  head.rotation.x += p.crouch; head.rotation.y += p.track; tail.rotation.z += p.twitch;
  st.applied = p;
  return p;
}

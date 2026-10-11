// A locust's idle rasp (locust.js). A locust that stands still now and then goes wrong: the head
// dips and cocks to one side as if listening to the ground, then the whole frame shivers in a dry,
// fast rasp, like a blade drawn over a washboard, and the head snaps level again. Walking, hopping,
// an action or death takes it back within a moment.
//
// Offsets only: the head's dip (rotation.x) and cock (rotation.y) and the body's shiver (rotation.z)
// are added on top of whatever the idle loop and the action layer wrote, and taken back first
// next frame, so nothing drifts.

// DIP: head pitch (rad); COCK: head yaw (rad); RASP: body shiver (rad).
export const DIP = .35, COCK = .3, RASP = .05;
// First rasp after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 6, GAP_SPAN = 8, RASP_LEN = 2.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const rasps = a => !!(a && !a.asset && a.hopper === 'locust' && a.head && a.body);

const ZERO = () => ({dip: 0, cock: 0, rasp: 0});

// The rasp at progress u (0..1): {dip} 0..1 of the head's drop (.05-.2, held to .72, snapping
// level .72-.8), {cock} 0..1 of its sideways cant (.1-.3 to .75), {rasp} -1..1 of the body's
// shiver (a fast sine under a swell over .3-.68). All exactly zero at both ends.
export function raspPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.dip = win(u, .05, .15, .72, .08) * f;
  p.cock = win(u, .1, .2, .75, .05) * f;
  const w = win(u, .3, .12, .68, .08);
  p.rasp = Math.sin(u * 260) * w * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not rasping.
export function updateLocustRasp(actor, dt, t, busy) {
  if (!rasps(actor)) return null;
  const st = actor.locustRasp || (actor.locustRasp = {seed: ((actor.g?.id ?? 1) * 29567) % 2147483647 || 1, wait: 0, cur: null, f: 0, side: 1, applied: ZERO()});
  const {head, body} = actor, o = st.applied;
  head.rotation.x -= o.dip * DIP; head.rotation.y -= o.cock * COCK * st.side;
  body.rotation.z -= o.rasp * RASP;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted rasp always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / RASP_LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; st.side = rand(st) < .5 ? -1 : 1; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = raspPose(st.cur.u, st.f);
  head.rotation.x += p.dip * DIP; head.rotation.y += p.cock * COCK * st.side;
  body.rotation.z += p.rasp * RASP;
  st.applied = p;
  return p;
}

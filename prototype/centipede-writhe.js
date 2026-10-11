// A centipede's idle writhe (centipede in creatures.js). A centipede that stands still now and then
// cannot keep its long body straight: it sweeps into slow S-shaped curves, left then right then
// left, the legs seeming to crawl on without it, and finishes with one sharp sideways flinch, as
// if something had brushed its tail. Walking, an action or death takes it back within a moment.
//
// Offsets only: the body's sweep (rotation.y) and flinch roll (rotation.z) are added on top of
// whatever the idle loop and the action layer wrote, and taken back first next frame, so nothing drifts.

// SWEEP: body yaw (rad); FLINCH: body roll (rad).
export const SWEEP = .28, FLINCH = .2;
// First writhe after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 6, GAP_SPAN = 8, WRITHE_LEN = 2.8;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const writhes = a => !!(a && !a.asset && a.quirk === 'insect' && !a.head && a.legs?.length === 16 && a.body);

const ZERO = () => ({sweep: 0, flinch: 0});

// The writhe at progress u (0..1): {sweep} -1..1 of the S-curves (a slow sine of one and a half
// turns under a swell over .05-.75, so it is still at both ends) and {flinch} 0..1 of the sharp
// roll at .78-.86. All exactly zero at both ends.
export function writhePose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.sweep = Math.sin(u * Math.PI * 3.5) * win(u, .05, .15, .72, .1) * f;
  p.flinch = hump(u, .78, .86) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not writhing.
export function updateCentipedeWrithe(actor, dt, t, busy) {
  if (!writhes(actor)) return null;
  const st = actor.centipedeWrithe || (actor.centipedeWrithe = {seed: ((actor.g?.id ?? 1) * 40507) % 2147483647 || 1, wait: 0, cur: null, f: 0, side: 1, applied: ZERO()});
  const {body} = actor, o = st.applied;
  body.rotation.y -= o.sweep * SWEEP; body.rotation.z -= o.flinch * FLINCH * st.side;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted writhe always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / WRITHE_LEN;
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
  const p = writhePose(st.cur.u, st.f);
  body.rotation.y += p.sweep * SWEEP; body.rotation.z += p.flinch * FLINCH * st.side;
  st.applied = p;
  return p;
}

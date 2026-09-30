// Idle heft for the bugbear, whose model (bugbear.js) carries a heavy morning star in its right
// fist. A bugbear that has stood still for a few seconds now and then limbers up like a thug: it
// cracks its neck, tipping its head hard to one side and then the other, then hefts the morning
// star forward and lazily twirls it (the wrist circles, so the spiked ball traces a loop), glaring
// with its chin down. It lets the weapon drop back to its side, and the ball swings on after the
// arm stops and settles. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head, the weapon arm and the weapon socket move, as offsets on top of whatever the idle
// loop and actions.js posed this frame. The body is left alone, because the legs hang from it.
// Nothing else writes these parts absolutely each frame (actions.js also works in offsets), so
// the heft takes back its own last offset first and then adds this frame's.

// CRACK: head roll at each side of the neck crack; GLARE: chin down while twirling (+x tips the
// head down); RAISE: weapon arm hefted forward (negative x); TWIRL: size of the wrist circle
// (socket pitch and roll, a quarter-cycle apart); SETTLE: the ball's swing after the drop
// (socket pitch).
export const CRACK = .3, GLARE = .12, RAISE = .55, TWIRL = .32, SETTLE = .22;
// Seconds for one heft; wrist circles per second.
export const HEFT_LEN = 4.2, TWIRL_RATE = 1.3;
// First heft after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 1 between a and b, easing in and out over `edge` either side; 0 outside.
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
// A rise-and-fall bump over [a, b], 0 at both ends, peaking at 1.
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const hefts = a => !!(a && !a.asset && a.g?.name === 'bugbear' && a.head && a.arm && a.weaponSocket);

const ZERO = () => ({crack: 0, glare: 0, raise: 0, pitch: 0, roll: 0});

// Phases in u: neck crack .03–.3, heft .3–.8 (twirl .38–.76), drop and settle .8–1.
const TWIRL_FROM = .38, TWIRL_TO = .76, SETTLE_FROM = .8;

// The heft's offsets at progress u (0..1), scaled by f (0..1). Everything is 0 at u = 0 and 1.
export function heftPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  // the neck crack: head over to the left, then over to the right, a slight dip at each end
  p.crack = CRACK * (hump(u, .03, .17) - hump(u, .15, .3)) * f;
  p.glare = (GLARE * win(u, .34, .8, .06) + .4 * GLARE * (hump(u, .08, .14) + hump(u, .21, .27))) * f;
  // heft up steadily, drop fast
  p.raise = RAISE * (smooth((u - .28) / .1) - smooth((u - .78) / .04)) * f;
  // the twirl: the wrist circles while the arm is up
  const e = win(u, TWIRL_FROM, TWIRL_TO, .06), ph = 2 * Math.PI * TWIRL_RATE * (u - TWIRL_FROM) * HEFT_LEN;
  p.pitch = TWIRL * e * Math.sin(ph);
  p.roll = TWIRL * e * (1 - Math.cos(ph)) * .5;
  // the ball swings on after the drop and dies away
  if (u > SETTLE_FROM) { const w = (u - SETTLE_FROM) / (1 - SETTLE_FROM); p.pitch += SETTLE * Math.sin(3 * Math.PI * w) * (1 - w) * (1 - w); }
  p.pitch *= f; p.roll *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not hefting.
export function updateHeft(actor, dt, t, busy) {
  if (!hefts(actor)) return null;
  const st = actor.heft || (actor.heft = {seed: ((actor.g?.id ?? 1) * 32452843) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, arm, weaponSocket: socket} = actor, o = st.applied;
  head.rotation.z -= o.crack; head.rotation.x -= o.glare;
  arm.rotation.x += o.raise;
  socket.rotation.x -= o.pitch; socket.rotation.z -= o.roll;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted heft always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / HEFT_LEN;
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
  const p = heftPose(st.cur.u, st.f);
  head.rotation.z += p.crack; head.rotation.x += p.glare;
  arm.rotation.x -= p.raise;
  socket.rotation.x += p.pitch; socket.rotation.z += p.roll;
  st.applied = p;
  return p;
}

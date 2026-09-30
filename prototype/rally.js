// Idle rallying roar for the orc-captain, whose model (orc.js) carries a great notched scimitar in
// its right fist. A captain that has stood still for a few seconds now and then rallies its band:
// it throws its head back and thrusts the scimitar up overhead, blade to the ceiling, and
// brandishes it twice; then it bellows, head jutting forward and shaking with the roar, its free
// fist punched out in front of it; and it ends by chopping the blade down to point straight ahead
// ("that way!") with a hard nod, before lowering it back to its side. Walking, an action or death
// fades it out within ~0.1 s.
//
// Only the head, the arms and the weapon socket (pitch) move, as offsets on top of whatever the
// idle loop and actions.js posed this frame. The body is left alone, because the legs hang from
// it. Nothing else writes these parts absolutely each frame (actions.js also works in offsets),
// so the rally takes back its own last offset first and then adds this frame's.

// OVERHEAD: sword arm thrust up (negative x); POINT: sword arm level in front for the point;
// UPRIGHT/LEVEL: the fist's pitch that stands the blade up overhead / lays it level for the point
// (at rest the blade juts forward); PUMP: the brandish (arm pitch); LOOK: head thrown back
// (negative x); THRUST: head jutting forward in the bellow; SHAKE: the bellow's head tremor (roll);
// NOD: the nod on the point; FIST: free arm punched forward (negative x); FIST_SHAKE: its tremble.
export const OVERHEAD = 2.5, POINT = 1.35, UPRIGHT = .95, LEVEL = 1.35, PUMP = .2, LOOK = .28,
  THRUST = .16, SHAKE = .06, NOD = .2, FIST = 1.15, FIST_SHAKE = .05;
// Seconds for one rally; brandishes over the brandish window; tremors per second in the bellow.
export const RALLY_LEN = 3.6, PUMPS = 2, SHAKE_RATE = 9;
// First rally after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 4, GAP_MIN = 9, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;
const CAPTAINS = new Set(['orc-captain']);

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 1 between a and b, easing in and out over `edge` either side; 0 outside.
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
// A rise-and-fall bump over [a, b], 0 at both ends, peaking at 1.
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const rallies = a => !!(a && !a.asset && CAPTAINS.has(a.g?.name) && a.head && a.arm && a.weaponSocket && a.arms?.length >= 2);

const ZERO = () => ({raise: 0, tip: 0, look: 0, shake: 0, fist: 0, tremble: 0});

// Phases in u: thrust up .04–.2, brandish .22–.42, bellow .32–.64, point .64–.74, held to .84,
// lowered by .96.
const PUMP_FROM = .22, PUMP_TO = .42, ROAR_FROM = .32, ROAR_TO = .64;

// The rally's offsets at progress u (0..1), scaled by f (0..1). Everything is 0 at u = 0 and 1.
export function rallyPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  // up overhead, then down to the point, then back to the side
  const up = smooth((u - .04) / .16), toPoint = smooth((u - .64) / .1), down = smooth((u - .84) / .12);
  const pump = PUMP * Math.sin(Math.PI * PUMPS * clamp01((u - PUMP_FROM) / (PUMP_TO - PUMP_FROM))) ** 2;
  p.raise = (OVERHEAD * up + (POINT - OVERHEAD) * toPoint - POINT * down + pump) * f;
  p.tip = (UPRIGHT * up + (LEVEL - UPRIGHT) * toPoint - LEVEL * down) * f;
  // head back with the blade going up, jutting forward and shaking in the bellow, a nod on the point
  const roar = win(u, ROAR_FROM, ROAR_TO, .05);
  p.look = (-LOOK * win(u, .06, .3, .06) + THRUST * roar + NOD * hump(u, .66, .78)) * f;
  p.shake = SHAKE * roar * Math.sin(2 * Math.PI * SHAKE_RATE * RALLY_LEN * (u - ROAR_FROM)) * f;
  // the free fist punched out through the bellow, trembling with it
  p.fist = FIST * win(u, ROAR_FROM, ROAR_TO + .04, .07) * f;
  p.tremble = FIST_SHAKE * roar * Math.cos(2 * Math.PI * SHAKE_RATE * RALLY_LEN * (u - ROAR_FROM)) * f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not rallying.
export function updateRally(actor, dt, t, busy) {
  if (!rallies(actor)) return null;
  const st = actor.rally || (actor.rally = {seed: ((actor.g?.id ?? 1) * 49979687) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, arm, arms, weaponSocket: socket} = actor, o = st.applied;
  head.rotation.x -= o.look; head.rotation.z -= o.shake;
  arm.rotation.x += o.raise; socket.rotation.x -= o.tip;
  arms[0].rotation.x += o.fist; arms[0].rotation.z -= o.tremble;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted rally always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / RALLY_LEN;
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
  const p = rallyPose(st.cur.u, st.f);
  head.rotation.x += p.look; head.rotation.z += p.shake;
  arm.rotation.x -= p.raise; socket.rotation.x += p.tip;
  arms[0].rotation.x -= p.fist; arms[0].rotation.z += p.tremble;
  st.applied = p;
  return p;
}

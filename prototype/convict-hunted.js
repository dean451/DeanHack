// Idle hunted glance for the convict (convict.js): a gaunt escaped jailbird in a torn striped suit, a
// broken chain trailing from the left manacle and a rag-bound glass shiv in the right fist.
// A convict that has stood still for a few seconds now and then jerks its head round to look back over
// one shoulder, the shoulders twisting after it, and in the same moment draws the shiv up in front of
// its ribs, point out. It holds the look, trembling, turning the blade over in its fingers; about half
// the time it then snaps round to check the other shoulder too. Then it slowly settles back, the shiv
// sinking to its side.
// The looks are fast and the settling slow, following the sinister direction. Walking, an action or
// death fades it out within ~0.1 s.
//
// Only the head, body, both arms and the weapon socket move, as offsets on top of whatever the idle loop
// and actions.js posed this frame. Each frame it takes back its own last offset first and then adds this
// frame's, like mugger-cosh.js.

// The look: head yaw over the shoulder (rad), the share of it the body twists, the chin lift, and the
// second look's size against the first.
export const LOOK = 1.05, TWIST = .3, CHIN = -.1, BACK_LOOK = .85;
// The guard: the shiv arm comes forward and in, the wrist levels the blade; the chain arm draws in a little.
export const GUARD = {rx: -.9, rz: -.3, sx: .6, lx: -.18, lz: .06};
// The blade turns over this far (about its own axis) while the convict holds a look.
export const TURN = .9;
// The tremble while holding a look: amplitude (rad) and rate (Hz).
export const SHAKE = .03, SHAKE_HZ = 11;
// Seconds: the snap round, each hold (HOLD_MIN..+HOLD_SPAN), the switch to the other shoulder, the
// slow settle back. The guard comes up over GUARD_UP.
export const SNAP = .16, HOLD_MIN = .55, HOLD_SPAN = .4, SWITCH = .2, SETTLE = 1.1, GUARD_UP = .25;
// First glance after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 6;
const FADE_OUT = 14, SNAP_OFF = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const jerk = v => { v = clamp01(v); return 1 - (1 - v) ** 3; };

// A plan: which shoulder first (±1), whether it checks the other one, and the two holds.
export const glanceLength = plan => SNAP + plan.hold1 + (plan.second ? SWITCH + plan.hold2 : 0) + SETTLE;

export const glances = a => !!(a && !a.asset && a.kind === 'convict' && a.head && a.body && a.arm && a.weaponSocket &&
  Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({yaw: 0, pitch: 0, twist: 0, rx: 0, rz: 0, lx: 0, lz: 0, sx: 0, sz: 0});

// The pose `time` seconds into a glance following `plan`, scaled by f.
export function huntedPoseAt(time, plan, f = 1) {
  const p = ZERO(), T = glanceLength(plan);
  if (!(f > 0) || !(time > 0) || !(time < T)) return p;
  const side = plan.side < 0 ? -1 : 1, y1 = side * LOOK, y2 = -side * LOOK * BACK_LOOK;
  const t1 = SNAP + plan.hold1, t2 = plan.second ? t1 + SWITCH + plan.hold2 : t1, settle = smooth((time - t2) / SETTLE);
  // the head: snap round, hold (trembling), maybe snap to the other side and hold, then settle back
  let yaw, hold = 0;
  if (time < SNAP) yaw = y1 * jerk(time / SNAP);
  else if (time < t1) { yaw = y1; hold = Math.sin(Math.PI * (time - SNAP) / plan.hold1); }
  else if (time < t1 + SWITCH && plan.second) yaw = y1 + (y2 - y1) * jerk((time - t1) / SWITCH);
  else if (time < t2) { yaw = y2; hold = Math.sin(Math.PI * (time - t1 - SWITCH) / plan.hold2); }
  else yaw = (plan.second ? y2 : y1) * (1 - settle);
  const look = Math.abs(yaw) / LOOK;
  p.yaw = yaw + SHAKE * hold * Math.sin(2 * Math.PI * SHAKE_HZ * time);
  p.pitch = CHIN * look;
  p.twist = TWIST * yaw;
  // the guard comes up fast with the first snap and sinks back with the settle
  const g = jerk(time / GUARD_UP) * (1 - settle);
  p.rx = GUARD.rx * g; p.rz = GUARD.rz * g; p.sx = GUARD.sx * g; p.lx = GUARD.lx * g; p.lz = GUARD.lz * g;
  // the blade turns over through the first hold and stays turned until the settle takes it back
  p.sz = TURN * side * smooth((time - SNAP) / plan.hold1) * (1 - settle);
  for (const key of Object.keys(p)) p[key] *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const makePlan = st => ({side: rand(st) < .5 ? -1 : 1, second: rand(st) < .5,
  hold1: HOLD_MIN + HOLD_SPAN * rand(st), hold2: HOLD_MIN + HOLD_SPAN * rand(st)});

function apply(actor, p, s) {
  actor.head.rotation.x += s * p.pitch; actor.head.rotation.y += s * p.yaw;
  actor.body.rotation.y += s * p.twist;
  const [left, right] = actor.arms;
  left.rotation.x += s * p.lx; left.rotation.z += s * p.lz;
  right.rotation.x += s * p.rx; right.rotation.z += s * p.rz;
  actor.weaponSocket.rotation.x += s * p.sx; actor.weaponSocket.rotation.z += s * p.sz;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not glancing.
export function updateConvictHunted(actor, dt, t, busy) {
  if (!glances(actor)) return null;
  const st = actor.convictHunted || (actor.convictHunted = {seed: ((actor.g?.id ?? 1) * 16807) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted glance always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.time += dt;
    else {
      st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP_OFF) st.f = 0;
    }
    if (st.cur.time >= glanceLength(st.cur.plan) || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {time: 0, plan: makePlan(st)}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = huntedPoseAt(st.cur.time, st.cur.plan, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

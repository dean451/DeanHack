// Idle brood for the barbarian, whose model (barbarian.js) wears a horned iron cap and a wolf-pelt
// mantle and carries a notched great axe upright in the right fist. A barbarian that has stood
// still for a few seconds now and then does one of two things, taking turns:
//  - shoulder: the axe arm swings up across the chest and the axe tips back, so the haft comes to
//    rest over the right shoulder with the blade behind it. The chin drops into a glare and the
//    shoulders turn a little toward the axe. It holds there, the axe settling once on the shoulder
//    like a weight, then lowers it back to the side.
//  - roll: a slow roll of the neck, chin down, over to the left, back, over to the right and home,
//    the horns sweeping a full circle, then a last low glare.
// Both glide in and out (no snaps), following the sinister direction. Walking, an action or death
// fades it out within ~0.1 s.
//
// Only the head, the body's yaw, the axe arm and the weapon socket move, as offsets on top of
// whatever the idle loop and actions.js posed this frame. Each frame the brood takes back its own
// last offset first and then adds this frame's, like rogue-prowl.js. The body only turns about its
// upright axis, so the feet stay on the floor.

// Shoulder: the axe arm's pitch (negative raises it forward; the arm has no elbow, so this brings
// the fist up in front of the chest), the socket's pitch (negative tips the axe head back), the
// body's yaw toward the axe, the glare (+x tips the chin down) and the settle (extra arm pitch for
// the one heavy bounce on the shoulder). With these the haft crosses the top of the right shoulder
// and the blade hangs behind it.
export const HOIST = -1.2, TIP = -.17, TURN = .1, GLARE = .12, SETTLE = .05;
// Roll: size of the neck circle (roll about z, and pitch about x at .8 of it), and the last glare.
export const ROLL = .26, ROLL_GLARE = .1;
// Seconds for one turn of each.
export const LEN = {shoulder: 6, roll: 4.8};
// First brood after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 7, GAP_SPAN = 7;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const broods = a => !!(a && !a.asset && a.kind === 'barbarian' && a.head && a.body && a.arm && a.weaponSocket);

const ZERO = () => ({pitch: 0, roll: 0, turn: 0, arm: 0, tip: 0});

// Shoulder phases in u: hoist .04–.26 (the axe tips back a beat behind the arm, .08–.3), the
// settle bounce around .34, held to .7, lowered .72–.96.
function shoulderPose(u, p) {
  const up = smooth((u - .04) / .22) - smooth((u - .72) / .22);
  const tip = smooth((u - .08) / .22) - smooth((u - .7) / .22);
  const b = clamp01((u - .28) / .14);
  p.arm = HOIST * up - SETTLE * Math.sin(Math.PI * b) * Math.sin(Math.PI * b);
  p.tip = TIP * tip;
  p.turn = TURN * up;
  p.pitch = GLARE * (smooth((u - .2) / .15) - smooth((u - .7) / .2));
}

// Roll phases in u: in by .12, one full circle .1–.8 (starting chin down, then over to the left,
// back and to the right), out by .97, with a low glare .78–.97 as the circle ends.
function rollPose(u, p) {
  const env = smooth(u / .12) - smooth((u - .82) / .14);
  const a = 2 * Math.PI * smooth((u - .1) / .7);
  p.pitch = ROLL * .8 * env * Math.cos(a) + ROLL_GLARE * (smooth((u - .78) / .08) - smooth((u - .88) / .09));
  p.roll = ROLL * env * Math.sin(a);
}

export function broodPose(kind, u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  if (kind === 'roll') rollPose(u, p); else shoulderPose(u, p);
  for (const k of Object.keys(p)) p[k] *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

function apply(actor, p, s) {
  actor.head.rotation.x += s * p.pitch; actor.head.rotation.z += s * p.roll;
  actor.body.rotation.y += s * p.turn;
  actor.arm.rotation.x += s * p.arm;
  actor.weaponSocket.rotation.x += s * p.tip;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not brooding.
export function updateBarbarianBrood(actor, dt, t, busy) {
  if (!broods(actor)) return null;
  const st = actor.barbarianBrood || (actor.barbarianBrood = {seed: ((actor.g?.id ?? 1) * 16807) % 2147483647 || 1, wait: 0, cur: null, f: 0, next: 'shoulder', applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted brood always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / LEN[st.cur.kind];
    else {
      st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0;
    }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) {
      st.cur = {u: 0, kind: st.next}; st.f = 1; st.wait = 0;
      st.next = st.next === 'shoulder' ? 'roll' : 'shoulder';
    }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = broodPose(st.cur.kind, st.cur.u, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

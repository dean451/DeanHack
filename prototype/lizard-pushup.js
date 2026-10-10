// A lizard's idle push-ups (lizard.js). A newt, gecko or other small lizard that stands still now
// and then bobs on its forelegs like a thing signalling to something it cannot see: the head
// lifts and drops twice, hard and stiff, then freezes, and the tail gives one dry twitch. Walking,
// an action or death takes it back within a moment. Crocodiles (they have a jaw, see bask.js) are left alone.
//
// Offsets only: the head's pitch (rotation.x, negative lifts the nose) and the tail's swing
// (rotation.z) are added on top of whatever gait.js and the action layer wrote, and taken back
// first next frame, so nothing drifts.
export const LIFT = .5, TWITCH = .45;
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 9, LEN = 2.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const pushes = a => !!(a && !a.asset && a.quirk === 'lizard' && !a.jaw && !a.rustFeel && a.head && a.tail && a.body);

// The push-ups at progress u (0..1): {lift} 0..1 head raised, {twitch} -1..1 tail. Two hard lifts
// with a held freeze after the second; the tail twitches once in the freeze. All zero at both ends.
export function pushupPose(u) {
  if (!(u > 0) || !(u < 1)) return {lift: 0, twitch: 0};
  const up = (a, b, c, d) => smooth((u - a) / (b - a)) * (1 - smooth((u - c) / (d - c)));
  const lift = Math.max(up(.08, .16, .26, .34), up(.4, .48, .78, .88));
  const twitch = Math.exp(-(((u - .6) / .04) ** 2)) * Math.sin((u - .6) * 90);
  return {lift: clamp01(lift), twitch: Math.max(-1, Math.min(1, twitch))};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateLizardPushup(actor, dt, t, busy) {
  if (!pushes(actor)) return null;
  const st = actor.lizardPushup || (actor.lizardPushup = {seed: ((actor.g?.id ?? 1) * 3187) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {x: 0, z: 0}});
  const o = st.o, head = actor.head, tail = actor.tail;
  head.rotation.x -= o.x; tail.rotation.z -= o.z;
  st.o = {x: 0, z: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = pushupPose(st.s), f = st.f;
  st.o = {x: -LIFT * p.lift * f, z: TWITCH * p.twitch * f};
  head.rotation.x += st.o.x; tail.rotation.z += st.o.z;
  return p;
}

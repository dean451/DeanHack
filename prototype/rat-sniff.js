// A rat's idle sniff (enormous-rat.js). A rat that stands still now and then works the air: the
// head dips and bobs in quick sniffs, swings a little from side to side hunting the scent, and the
// tail whips once as it finds nothing. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's pitch (rotation.x) and yaw (rotation.y) and the tail's swing (rotation.z)
// are added on top of whatever gait.js and the action layer wrote, and taken back first next frame,
// so nothing drifts.
export const DIP = .3, HUNT = .35, WHIP = .6;
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 3, GAP_SPAN = 8, LEN = 2.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const sniffs = a => !!(a && !a.asset && a.quirk === 'rat' && a.head && a.body);

// The sniff at progress u (0..1): {dip} -1..1 head pitch, {hunt} -1..1 head yaw, {whip} -1..1 tail.
// Rapid sniffing dips under a slow side-to-side hunt, then one tail whip at the end. All zero at both ends.
export function sniffPose(u) {
  if (!(u > 0) || !(u < 1)) return {dip: 0, hunt: 0, whip: 0};
  const env = smooth(u / .1) * (1 - smooth((u - .75) / .1));
  const dip = env * Math.sin(u * Math.PI * 2 * 7);
  const hunt = env * Math.sin(u * Math.PI * 2 * 1.5);
  const whip = Math.exp(-(((u - .88) / .04) ** 2)) * Math.sin((u - .88) * 120);
  return {dip, hunt, whip: Math.max(-1, Math.min(1, whip))};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateRatSniff(actor, dt, t, busy) {
  if (!sniffs(actor)) return null;
  const st = actor.ratSniff || (actor.ratSniff = {seed: ((actor.g?.id ?? 1) * 8123) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {x: 0, y: 0, z: 0}});
  const o = st.o, head = actor.head, tail = actor.tail;
  head.rotation.x -= o.x; head.rotation.y -= o.y;
  if (tail) tail.rotation.z -= o.z;
  st.o = {x: 0, y: 0, z: 0};
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
  const p = sniffPose(st.s), f = st.f;
  st.o = {x: DIP * p.dip * f, y: HUNT * p.hunt * f, z: WHIP * p.whip * f};
  head.rotation.x += st.o.x; head.rotation.y += st.o.y;
  if (tail) tail.rotation.z += st.o.z;
  return p;
}

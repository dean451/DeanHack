// An archeologist's idle dust-off (archeologist.js). An archeologist standing still now and then
// brushes grave-dust off the chest with the free hand, twice, the head dipping to blow it clear,
// then coughs: the head snaps back and jerks forward twice, the hand shooting to the mouth.
// Walking, an action or death takes it back within a moment.
//
// Offsets only: the free (left) arm's lift (rotation.x) and brush (rotation.z) and the head's
// pitch (rotation.x) are added on top of whatever the gait and action layers wrote, and taken
// back first next frame, so nothing drifts.
export const LIFT = 1.0, BRUSH = .28, BLOW = .22, COUGH = .3;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 9, GAP_SPAN = 9, LEN = 4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const dusts = a => !!(a && !a.asset && a.kind === 'archeologist' && a.head && a.arms?.length > 1 && a.body);

// The dust-off at progress u (0..1): {lift} 0..1 the hand raised, {brush} -1..1 the two strokes,
// {blow} 0..1 the head dipped to blow, {cough} 0..1 the head thrown back. Exactly zero at both ends.
export function dustPose(u) {
  if (!(u > 0) || !(u < 1)) return {lift: 0, brush: 0, blow: 0, cough: 0};
  const lift = smooth(u / .12) * (1 - smooth((u - .84) / .1));
  const env = smooth((u - .12) / .06) * (1 - smooth((u - .5) / .06));
  const brush = Math.sin(((u - .12) / .38) * Math.PI * 4) * env;
  const blow = smooth((u - .5) / .06) * (1 - smooth((u - .62) / .06));
  const bump = (c, w = .02) => Math.exp(-(((u - c) / w) ** 2));
  const cough = Math.min(1, bump(.7) + bump(.78));
  return {lift, brush, blow, cough};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateArcheologistDust(actor, dt, t, busy) {
  if (!dusts(actor)) return null;
  const st = actor.archeologistDust || (actor.archeologistDust = {seed: ((actor.g?.id ?? 1) * 4801) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {a: 0, z: 0, x: 0}});
  const o = st.o, head = actor.head, arm = actor.arms[0];
  arm.rotation.x -= o.a; arm.rotation.z -= o.z; head.rotation.x -= o.x;
  st.o = {a: 0, z: 0, x: 0};
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
  const p = dustPose(st.s), f = st.f;
  // a negative lift swings the arm forward; the cough throws the head back (-x) and the hand up
  st.o = {a: -(LIFT * p.lift + .5 * p.cough) * f, z: BRUSH * p.brush * f, x: (BLOW * p.blow - COUGH * p.cough) * f};
  arm.rotation.x += st.o.a; arm.rotation.z += st.o.z; head.rotation.x += st.o.x;
  return p;
}

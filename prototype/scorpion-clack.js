// A scorpion's idle clack (scorpion.js). A scorpion that stands still now and then goes wrong:
// the pincers lift a little and snap open and shut three times in quick uneven clacks, as if
// closing on something that is not there, then the tail cocks back over the body and gives one
// slow, hard twitch of the stinger before everything settles. Walking, an action or death takes
// it back within a moment.
//
// Offsets only: the pincers' spread (rotation.y) and lift (rotation.x) and the tail's pitch
// (rotation.x) are added on top of whatever the idle loop, skitter.js and the action layer wrote,
// and taken back first next frame, so nothing drifts.

// SPREAD: how wide a pincer opens (rad); LIFT: pincers raised (rad); TWITCH: tail pitch (rad).
export const SPREAD = .5, LIFT = .22, TWITCH = .35;
// First clack after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 6, GAP_SPAN = 8, CLACK_LEN = 2.4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const clacks = a => !!(a && !a.asset && a.quirk === 'spider' && a.tail && a.claws?.length === 2 && a.claws.every(c => c?.isObject3D));

const ZERO = () => ({spread: 0, lift: 0, twitch: 0});

// The clack at progress u (0..1): {spread} 0..1 of the pincers' opening, {lift} 0..1 of their
// raise, {twitch} -1..1 of the tail (a cock back, then one hard jab). The pincers rise over
// .04-.2 and settle .62-.78; they snap three times at uneven gaps (.2-.27, .31-.36, .44-.54, the
// last one slow); the tail cocks back .58-.76 and jabs once at .76-.84. All exactly zero at both ends.
export function clackPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.lift = (smooth((u - .04) / .16) - smooth((u - .62) / .16)) * f;
  p.spread = Math.min(1, hump(u, .2, .27) + hump(u, .31, .36) + hump(u, .44, .54)) * f;
  p.twitch = (-.6 * (smooth((u - .58) / .18) - smooth((u - .76) / .02)) + hump(u, .76, .84) - .2 * hump(u, .84, .94)) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not clacking.
export function updateScorpionClack(actor, dt, t, busy) {
  if (!clacks(actor)) return null;
  const st = actor.scorpionClack || (actor.scorpionClack = {seed: ((actor.g?.id ?? 1) * 31013) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {claws, tail} = actor, o = st.applied;
  claws.forEach((c, i) => { c.rotation.y -= (i ? -1 : 1) * o.spread * SPREAD; c.rotation.x -= o.lift * LIFT; });
  tail.rotation.x -= o.twitch * TWITCH;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted clack always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / CLACK_LEN;
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
  const p = clackPose(st.cur.u, st.f);
  claws.forEach((c, i) => { c.rotation.y += (i ? -1 : 1) * p.spread * SPREAD; c.rotation.x += p.lift * LIFT; });
  tail.rotation.x += p.twitch * TWITCH;
  st.applied = p;
  return p;
}

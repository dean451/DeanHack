// A shopkeeper's idle tally (shopkeeper.js, quirk 'shopkeeper'). A shopkeeper standing still now and
// then raises the ledger, bows the head over it and ticks off three entries in sharp jabs, the last
// one harder, as if counting what the hero has not yet paid for. Then the head snaps up and round to
// the door and stays there too long while the balance arm sags a notch. Walking, an action or death
// takes it back within a moment.
//
// Offsets only: the head's pitch (rotation.x) and yaw (rotation.y), the ledger arm's lift
// (rotation.x) and the balance arm's sag (rotation.x) are added on top of whatever the gait and
// action layers wrote, and taken back first next frame, so nothing drifts.
export const BOW = .5, STARE = .55, LIFT = .9, JAB = .22, SAG = .18;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 7, GAP_SPAN = 9, LEN = 3.4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const tallies = a => !!(a && !a.asset && a.quirk === 'shopkeeper' && a.head && a.arms?.length > 1 && a.body);

// The tally at progress u (0..1): {bow} 0..1 head pitch down, {lift} 0..1 ledger raised, {jab} 0..1
// taps of the ledger arm, {stare} 0..1 head yaw to the door, {sag} 0..1 balance arm. All exactly
// zero at both ends.
export function tallyPose(u) {
  if (!(u > 0) || !(u < 1)) return {bow: 0, lift: 0, jab: 0, stare: 0, sag: 0};
  const lift = smooth(u / .12) * (1 - smooth((u - .55) / .08));
  const bow = smooth((u - .05) / .1) * (1 - smooth((u - .56) / .04));
  const bump = (c, w = .02) => Math.exp(-(((u - c) / w) ** 2));
  const jab = Math.min(1, .6 * bump(.22) + .6 * bump(.32) + bump(.42, .025));
  const stare = smooth((u - .6) / .03) * (1 - smooth((u - .92) / .06));
  const sag = smooth((u - .64) / .1) * (1 - smooth((u - .94) / .05));
  return {bow, lift, jab, stare, sag};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateShopkeeperTally(actor, dt, t, busy) {
  if (!tallies(actor)) return null;
  const st = actor.shopTally || (actor.shopTally = {seed: ((actor.g?.id ?? 1) * 4813) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {hx: 0, hy: 0, l: 0, b: 0}});
  const o = st.o, head = actor.head, ledger = actor.arms[0], balance = actor.arms[1];
  head.rotation.x -= o.hx; head.rotation.y -= o.hy; ledger.rotation.x -= o.l; balance.rotation.x -= o.b;
  st.o = {hx: 0, hy: 0, l: 0, b: 0};
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
  const p = tallyPose(st.s), f = st.f;
  // the ledger arm swings forward (-x) to rise; each jab is a short dip back down
  st.o = {hx: BOW * p.bow * f, hy: STARE * p.stare * f, l: -(LIFT * p.lift - JAB * p.jab * p.lift) * f, b: SAG * p.sag * f};
  head.rotation.x += st.o.hx; head.rotation.y += st.o.hy; ledger.rotation.x += st.o.l; balance.rotation.x += st.o.b;
  return p;
}

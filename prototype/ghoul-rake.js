// A ghoul's idle rake (ghoul.js). A ghoul standing still now and then goes hunting in the dirt:
// the head dips low and hangs there while the claws drag in toward the chest in two long scrapes,
// as if raking something up off the floor, then the head jerks up, sniffing, one claw left
// curled a beat too long. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's pitch (rotation.x) and each arm's lift (rotation.x) are added on top
// of whatever the gait and action layers wrote, and taken back first next frame, so nothing drifts.
export const DIP = .5, RAKE = .45, CURL = .35;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 7, GAP_SPAN = 9, LEN = 3.6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const rakes = a => !!(a && !a.asset && a.kind === 'ghoul' && a.head && a.arms?.length > 1 && a.body);

// The rake at progress u (0..1): {dip} 0..1 head pitch down, {rake} 0..1 the claws dragged in (two
// scrapes), {curl} 0..1 the right claw left curled. All exactly zero at both ends.
export function rakePose(u) {
  if (!(u > 0) || !(u < 1)) return {dip: 0, rake: 0, curl: 0};
  const dip = smooth(u / .15) * (1 - smooth((u - .66) / .03));
  const scrape = (a, b) => smooth((u - a) / (b - a)) * (1 - smooth((u - b) / .02));
  const rake = Math.max(scrape(.2, .34), scrape(.4, .56));
  const curl = smooth((u - .64) / .04) * (1 - smooth((u - .88) / .08));
  return {dip, rake, curl};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateGhoulRake(actor, dt, t, busy) {
  if (!rakes(actor)) return null;
  const st = actor.ghoulRake || (actor.ghoulRake = {seed: ((actor.g?.id ?? 1) * 7919) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {h: 0, l: 0, r: 0}});
  const o = st.o, head = actor.head, [la, ra] = actor.arms;
  head.rotation.x -= o.h; la.rotation.x -= o.l; ra.rotation.x -= o.r;
  st.o = {h: 0, l: 0, r: 0};
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
  const p = rakePose(st.s), f = st.f;
  // the arms hang forward; a negative lift swings them further out, a positive one drags them in
  st.o = {h: DIP * p.dip * f, l: RAKE * p.rake * f, r: (RAKE * p.rake - CURL * p.curl) * f};
  head.rotation.x += st.o.h; la.rotation.x += st.o.l; ra.rotation.x += st.o.r;
  return p;
}

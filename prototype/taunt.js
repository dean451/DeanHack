// Idle taunt for the imp. An imp that has stood still for a few seconds now and then taunts the
// hero: it cocks its head, snaps its little wings open with a flutter, raises its right hand
// and beckons three times ("come on, then"), cackles (quick nods of the head), and ends by
// lifting its spade tail and cracking it like a whip. Walking, an action or death fades it out
// within ~0.1 s.
//
// Only the head, the arms, the wings and the tail move, as offsets on top of whatever the idle
// loop and actions.js posed this frame. The body is left alone, because the legs hang from it.
// Call updateTaunt after updateActions. The head, the arms and the tail's pitch are not written
// by anything else every frame, so the taunt takes back its own last offset first. The tail's
// roll and the wings' yaw are rewritten absolutely by the idle loop in live.js each frame, so
// those offsets are taken back only if the value is still the one the taunt left.

// COCK: head roll; CACKLE: size of each cackling nod (+x tips the head down); RAISE: right arm
// raised forward (negative x); BECKON: the beckoning curl back toward the body; FLARE: wings
// snapped open (yaw, away from rest); FLUTTER: wing shiver; LIFT: tail raised (+x lifts the tip,
// which hangs behind at −z); WHIP: the tail's sideways crack.
export const COCK = .2, CACKLE = .09, RAISE = 1.5, BECKON = .45, FLARE = .38, FLUTTER = .12, LIFT = .5, WHIP = .7;
// Seconds for one taunt; beckons, cackling nods and wing shivers per second.
export const TAUNT_LEN = 3, BECKON_RATE = 3, CACKLE_RATE = 6, FLUTTER_RATE = 11;
// First taunt after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 6, GAP_SPAN = 7;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 1 between a and b, easing in and out over `edge` either side; 0 outside.
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
// A rise-and-fall bump over [a, b], 0 at both ends, peaking at 1.
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const taunts = a => !!(a && !a.asset && a.quirk === 'imp' && a.head && a.tail && a.arms?.length >= 2 && a.wings?.length >= 2);

const ZERO = () => ({cock: 0, nod: 0, arm: 0, flare: 0, lift: 0, whip: 0});

// The taunt's offsets at progress u (0..1), scaled by f (0..1). Everything is 0 at u = 0 and 1.
export function tauntPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const s = u * TAUNT_LEN;
  p.cock = COCK * win(u, 0, .85, .15) * f;
  // arm up by .2, three beckons over .3..(.3 + 3/BECKON_RATE/TAUNT_LEN), down by .95
  const up = win(u, .05, .8, .15);
  const beckon = (.5 - .5 * Math.cos(2 * Math.PI * (s - .3 * TAUNT_LEN) * BECKON_RATE)) * (u > .3 && u < .3 + 3 / BECKON_RATE / TAUNT_LEN ? 1 : 0);
  p.arm = (RAISE * up - BECKON * beckon * up) * f;
  // a cackle between the beckons and the whip
  p.nod = CACKLE * hump(u, .42, .72) * (.5 - .5 * Math.cos(2 * Math.PI * (s - .42 * TAUNT_LEN) * CACKLE_RATE)) * f;
  // wings snap open early, shiver, and fold back before the whip
  p.flare = (FLARE * win(u, 0, .55, .1) + FLUTTER * hump(u, .08, .5) * Math.sin(2 * Math.PI * s * FLUTTER_RATE)) * f;
  // the tail lifts behind, then cracks: one full sideways lash under a hump
  p.lift = LIFT * win(u, .45, .9, .1) * f;
  const w = (u - .7) / .16;
  p.whip = w > 0 && w < 1 ? WHIP * Math.sin(2 * Math.PI * w) * Math.sin(Math.PI * w) * f : 0;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

const side = (wing, i) => wing.userData?.side || (i ? 1 : -1);

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not taunting.
export function updateTaunt(actor, dt, t, busy) {
  if (!taunts(actor)) return null;
  const st = actor.taunt || (actor.taunt = {seed: ((actor.g?.id ?? 1) * 32452843) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO(), left: null});
  const {head, tail, arms, wings} = actor, o = st.applied;
  head.rotation.x -= o.nod; head.rotation.z -= o.cock;
  arms[1].rotation.x += o.arm;
  tail.rotation.x -= o.lift;
  if (st.left) {
    if (tail.rotation.z === st.left.tail) tail.rotation.z -= o.whip;
    wings.forEach((wing, i) => { if (i < 2 && wing.rotation.y === st.left.wings[i]) wing.rotation.y += side(wing, i) * o.flare; });
  }
  st.applied = ZERO(); st.left = null;
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted taunt always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / TAUNT_LEN;
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
  const p = tauntPose(st.cur.u, st.f);
  head.rotation.x += p.nod; head.rotation.z += p.cock;
  arms[1].rotation.x -= p.arm;
  tail.rotation.x += p.lift; tail.rotation.z += p.whip;
  // wings open away from the body: against the rest yaw live.js gives them, (i ? 1 : -1) × −.18
  wings.forEach((wing, i) => { if (i < 2) wing.rotation.y -= side(wing, i) * p.flare; });
  st.applied = p;
  st.left = {tail: tail.rotation.z, wings: wings.slice(0, 2).map(w => w.rotation.y)};
  return p;
}

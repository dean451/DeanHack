// Idle cosh-slap for the mugger (mugger.js): a hunched brute in a burlap hood, a spiked brass
// knuckle-duster on the left fist and a nail-studded lead cosh in the right.
// A mugger that has stood still for a few seconds now and then brings both hands up in front of its
// belly, the cosh laid across its body with the lead head resting on the knuckle-duster, and slaps it
// into the fist, two to four times: a slow lift of the head, a fast smack down, the fist giving under
// the blow and the hooded head nodding with it. After the last smack it holds the cosh in the fist and
// grinds the nails round, slowly, head cocked, before it all sinks back down.
// The lifts are slow and the smacks quick, following the sinister direction. Walking, an action or
// death fades it out within ~0.1 s.
//
// Only the head, both arms and the weapon socket move, as offsets on top of whatever the idle loop and
// actions.js posed this frame. Each frame it takes back its own last offset first and then adds this
// frame's, like tourist-gawk.js.

// The hands-together pose (offsets from the model's rest, tuned so the cosh head rests on the left
// fist): the left arm lifts forward and swings in, the right arm likewise, and the wrist turns the
// cosh across the body (socket: a little roll, a tilt and a quarter turn about z).
export const HOLD = {lx: -.9, lz: .45, rx: -.9, rz: -.4, sx: -.3, sy: .3, sz: 1.7};
// The slap's lift at full height (k = 1): the right arm rises and the wrist cocks the head up, about
// .23 above the fist. READY is the lift held while the hands come up; OVER is how far past the fist
// the smack drives (negative k), GIVE how far the fist dips under it and NOD the head's nod with it.
export const LIFT_ARM = -.3, LIFT_WRIST = .5, READY = .6, OVER = .08, GIVE = .1, NOD = .06;
// The head cocks and lifts a little to watch over the hands; the grind rolls the wrist back and forth.
export const COCK = .12, LOOK_UP = .05, GRIND_ROLL = .16;
// On the way up (and back down) the wrist first flips the cosh forward and out, so the lead head swings
// round in front of the chest instead of through it (it starts leant back over the shoulder; tuned by a
// search over the swing, checked in the tests).
export const TIP = {sx: 2.25, sy: .5, sz: -1.5};
// Seconds: hands up, each slap, the grind, hands down. A turn has SLAPS_MIN..SLAPS_MAX slaps.
export const RAISE = .6, SLAP = .75, GRIND = 1.4, HOME = .7, SLAPS_MIN = 2, SLAPS_MAX = 4;
// First slap after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 6, GAP_SPAN = 6;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const turnLength = n => RAISE + n * SLAP + GRIND + HOME;

export const slaps = a => !!(a && !a.asset && a.kind === 'mugger' && a.head && a.arm && a.weaponSocket &&
  Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({lx: 0, lz: 0, rx: 0, rz: 0, sx: 0, sy: 0, sz: 0, pitch: 0, roll: 0});

// One slap over v in 0..1, starting from lift k0: the slow lift to 1 (to .7), the smack down past the
// fist (.7–.8, accelerating), the bounce back to rest on it (.8–1). Returns the lift and the impact
// (0..1, peaking just after the smack lands).
function slapCurve(v, k0) {
  if (v < .7) return {k: k0 + (1 - k0) * smooth(v / .7), hit: 0};
  if (v < .8) { const w = (v - .7) / .1; return {k: 1 - (1 + OVER) * w * w, hit: 0}; }
  const w = (v - .8) / .2;
  return {k: -OVER * (1 - smooth(w)), hit: Math.sin(Math.PI * w)};
}

// The pose `time` seconds into a turn of `n` slaps, scaled by f.
export function slapPoseAt(time, n = 3, f = 1) {
  const p = ZERO(), T = turnLength(n);
  if (!(f > 0) || !(time > 0) || !(time < T)) return p;
  // The hands come down along the same path they went up, played backwards: r runs 0 → RAISE on the
  // way up and back to 0 on the way down. The arms lead, and the wrist turns the cosh across only once
  // the hand is out in front (flipping it forward and out on the way, TIP), so the lead head never
  // sweeps through the chest.
  const r = time < RAISE ? time : time > T - HOME ? (T - time) * RAISE / HOME : RAISE;
  const up = smooth(r / (RAISE * .6)), wrist = smooth((r - RAISE * .3) / (RAISE * .7));
  // The lift: READY on the way up and down, the slaps, then resting on the fist for the grind, and
  // lifted off it again just before the hands go down.
  let k = READY * smooth(r / RAISE), hit = 0;
  const s = (time - RAISE) / SLAP;
  if (s >= 0 && s < n) {
    const i = Math.floor(s);
    ({k, hit} = slapCurve(s - i, i ? 0 : READY));
  } else if (s >= n && time <= T - HOME) k = READY * smooth((time - (T - HOME - .3)) / .3);
  const grind = smooth((s - n) / .3) - smooth((time - (T - HOME - .3)) / .3);
  const tip = r < RAISE ? Math.sin(Math.PI * r / RAISE) : 0;
  for (const key of Object.keys(HOLD)) p[key] = HOLD[key] * (key[0] === 's' ? wrist : up) + (TIP[key] || 0) * tip;
  p.rx += LIFT_ARM * k * up;
  p.sy += LIFT_WRIST * k * wrist;
  p.lx += GIVE * hit * up;
  p.sx += GRIND_ROLL * Math.sin(2 * Math.PI * 1.2 * Math.max(0, time - RAISE - n * SLAP)) * grind;
  p.pitch = NOD * hit - LOOK_UP * up;
  p.roll = COCK * up;
  for (const key of Object.keys(p)) p[key] *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

function apply(actor, p, s) {
  actor.head.rotation.x += s * p.pitch; actor.head.rotation.z += s * p.roll;
  const [left, right] = actor.arms;
  left.rotation.x += s * p.lx; left.rotation.z += s * p.lz;
  right.rotation.x += s * p.rx; right.rotation.z += s * p.rz;
  actor.weaponSocket.rotation.x += s * p.sx; actor.weaponSocket.rotation.y += s * p.sy; actor.weaponSocket.rotation.z += s * p.sz;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not slapping.
export function updateMuggerCosh(actor, dt, t, busy) {
  if (!slaps(actor)) return null;
  const st = actor.muggerCosh || (actor.muggerCosh = {seed: ((actor.g?.id ?? 1) * 16807) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted turn always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.time += dt;
    else {
      st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0;
    }
    if (st.cur.time >= turnLength(st.cur.n) || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) {
      st.cur = {time: 0, n: SLAPS_MIN + Math.min(SLAPS_MAX - SLAPS_MIN, Math.floor(rand(st) * (SLAPS_MAX - SLAPS_MIN + 1)))};
      st.f = 1; st.wait = 0;
    }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = slapPoseAt(st.cur.time, st.cur.n, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

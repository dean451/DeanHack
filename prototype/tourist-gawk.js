// Idle gawk for the tourist (tourist.js): a lost holidaymaker gone a little wrong, sunburnt, grinning
// behind mirrored sunglasses, a crumpled map in the left hand and a dart in the right.
// A tourist that has stood still for a few seconds now and then does one of two things, taking turns:
//  - map: the map comes up in front of the chest and the head drops to it. The head turns the map
//    over, slowly, left and then right, as if the route made no sense; then it stops, and the head
//    comes up and turns slowly round on whoever is watching, cocked, and holds that stare far too
//    long before the map sinks back down.
//  - dart: the dart arm lifts the dart to eye level, the point tilts down to level, and the head
//    cocks to sight along it. A small flick forward, a feint that never lets go, then it holds
//    aim, and glides home.
// Everything glides; the turns are slow and the feint is the only quick move, following the sinister
// direction. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head, the body's yaw, both arms and the weapon socket move, as offsets on top of whatever
// the idle loop and actions.js posed this frame. Each frame the gawk takes back its own last offset
// first and then adds this frame's, like healer-peer.js. The body only turns about its upright
// axis, so the feet stay on the floor.

// Map: how far the map arm lifts (negative raises it forward; the model rests at -.35), its swing
// in toward the middle (about z: the arm is the left one, at -x), the head's dip to read, the head's turn while reading, and the stare: the
// head's turn and cock, and the shoulders' share of it.
export const MAP_LIFT = -.75, MAP_IN = .25, READ_DIP = .3, READ_TURN = .22, STARE_TURN = .5, STARE_COCK = .22, STARE_BODY = .14;
// Dart: the arm's lift (to about level with the shoulder), the wrist turning the point forward to
// level (socket pitch; raising the arm alone would tip the point back at the face), the head's cock and dip to sight, and
// the feint's flick (positive swings the arm forward and down).
export const DART_LIFT = -1.5, DART_LEVEL = 1.9, SIGHT_COCK = .2, SIGHT_DIP = .08, FEINT = .22;
// Seconds for one turn of each.
export const LEN = {map: 6.5, dart: 4.2};
// First gawk after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 7, GAP_SPAN = 7;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 0 → 1 → 0 over a..b, rising and falling with smoothstep over the given widths
const hump = (u, a, b, w) => smooth((u - a) / w) - smooth((u - b + w) / w);

export const gawks = a => !!(a && !a.asset && a.kind === 'tourist' && a.head && a.body && a.arm && a.weaponSocket &&
  Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({pitch: 0, yaw: 0, roll: 0, turn: 0, map: 0, mapIn: 0, arm: 0, level: 0});

// Map phases in u: up .02–.16; reading turns left from .18, right from .34, back to the middle by
// .5; the stare turns round .52–.64 and holds to .84; everything glides home .84–.98.
function mapPose(u, p) {
  const up = hump(u, .02, .98, .14);
  p.map = MAP_LIFT * up;
  p.mapIn = MAP_IN * up;
  const read = hump(u, .06, .58, .1);
  const scan = smooth((u - .18) / .14) - 2 * smooth((u - .34) / .14) + smooth((u - .5) / .06);
  const stare = hump(u, .52, .98, .12);
  p.pitch = READ_DIP * read - .06 * stare;
  p.yaw = READ_TURN * scan * read + STARE_TURN * stare;
  p.roll = -STARE_COCK * hump(u, .58, .96, .1);
  p.turn = STARE_BODY * hump(u, .56, .98, .14);
}

// The feint over 0..1: a quick flick forward, then a slower draw back.
function feintCurve(v) {
  if (!(v > 0) || !(v < 1)) return 0;
  return v < .3 ? FEINT * smooth(v / .3) : FEINT * (1 - smooth((v - .3) / .7));
}

// Dart phases in u: up .03–.25 with the point levelling; sighting from .2; the feint .5–.68; held,
// and home .8–.97.
function dartPose(u, p) {
  const up = hump(u, .03, .97, .2);
  p.arm = DART_LIFT * up + feintCurve((u - .5) / .18);
  p.level = DART_LEVEL * hump(u, .1, .95, .15);
  const sight = hump(u, .2, .95, .12);
  p.roll = SIGHT_COCK * sight;
  p.pitch = SIGHT_DIP * sight;
  p.turn = -.06 * sight;
}

export function gawkPoseAt(kind, u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  if (kind === 'dart') dartPose(u, p); else mapPose(u, p);
  for (const k of Object.keys(p)) p[k] *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

function apply(actor, p, s) {
  actor.head.rotation.x += s * p.pitch; actor.head.rotation.y += s * p.yaw; actor.head.rotation.z += s * p.roll;
  actor.body.rotation.y += s * p.turn;
  const map = actor.arms[0];
  map.rotation.x += s * p.map; map.rotation.z += s * p.mapIn;
  actor.arm.rotation.x += s * p.arm;
  actor.weaponSocket.rotation.x += s * p.level;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not gawking.
export function updateTouristGawk(actor, dt, t, busy) {
  if (!gawks(actor)) return null;
  const st = actor.touristGawk || (actor.touristGawk = {seed: ((actor.g?.id ?? 1) * 16807) % 2147483647 || 1, wait: 0, cur: null, f: 0, next: 'map', applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted gawk always fades out; it never picks back up.
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
      st.next = st.next === 'map' ? 'dart' : 'map';
    }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = gawkPoseAt(st.cur.kind, st.cur.u, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

// Idle peer for the healer, whose model (healer.js) is a plague doctor: a long hooked beak and green
// glass eyes under a wide brim, and a crooked staff with a serpent coiled up it in the right fist.
// A healer that has stood still for a few seconds now and then does one of two things, taking turns:
//  - peer: like a carrion bird, the beak dips toward something on the floor, then the head cocks
//    over to one side and holds, snaps across to the other side and holds, then glides back up.
//    The shoulders turn a little after the beak.
//  - tap: the staff arm lifts the staff and lets it fall back with a small rebound, twice, while the
//    staff turns slowly about its own length so the reared serpent head swings out to one side,
//    across to the other, and home, as if it were looking round.
// The cocks are quick but never instant (no snaps), and everything else glides, following the
// sinister direction. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head, the body's yaw, the staff arm and the weapon socket move, as offsets on top of
// whatever the idle loop and actions.js posed this frame. Each frame the peer takes back its own
// last offset first and then adds this frame's, like barbarian-brood.js. The body only turns about
// its upright axis, so the feet stay on the floor.

// Peer: the dip of the beak (+x tips the head forward), the cock of the head (roll about z), the
// shoulders' share of it as yaw, and the length of one cock-over in u (a quick but smooth snap).
export const DIP = .24, COCK = .32, TURN = .08, SNAP_U = .045;
// Tap: how far the staff arm lifts (negative raises it forward), the rebound after each fall, and
// how far the staff turns about its own length (the serpent's swing).
export const LIFT = -.2, REBOUND = .05, TWIST = .7;
// Seconds for one turn of each.
export const LEN = {peer: 5, tap: 4.4};
// First peer after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 7, GAP_SPAN = 7;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 0 → 1 → 0 over a..b, rising and falling with smoothstep over the given widths
const hump = (u, a, b, w) => smooth((u - a) / w) - smooth((u - b + w) / w);

export const peers = a => !!(a && !a.asset && a.kind === 'healer' && a.head && a.body && a.arm && a.weaponSocket);

const ZERO = () => ({pitch: 0, roll: 0, turn: 0, arm: 0, twist: 0});

// Peer phases in u: the dip .02–.16, cocked left from .18, snapped across to the right at .5, held,
// and everything glides home .8–.98.
function peerPose(u, p) {
  const dip = hump(u, .02, .98, .16);
  const left = smooth((u - .18) / SNAP_U), across = smooth((u - .5) / SNAP_U), home = smooth((u - .8) / .18);
  const cock = (left - 2 * across) * (1 - home);
  p.pitch = DIP * dip;
  p.roll = COCK * cock;
  p.turn = -TURN * (smooth((u - .22) / .1) - 2 * smooth((u - .54) / .1)) * (1 - home);
}

// One lift and fall of the staff over 0..1: up quickly, down a little quicker, then a small rebound.
function tapCurve(v) {
  if (!(v > 0) || !(v < 1)) return 0;
  if (v < .55) return LIFT * smooth(v / .4) * (1 - smooth((v - .4) / .15));
  return -REBOUND * Math.sin(Math.PI * (v - .55) / .45) ** 2;
}

// Tap phases in u: taps at .08–.3 and .36–.58; the staff turns out .05–.3, across .35–.65 and home
// .7–.95.
function tapPose(u, p) {
  p.arm = tapCurve((u - .08) / .22) + tapCurve((u - .36) / .22);
  p.twist = TWIST * (smooth((u - .05) / .25) - 2 * smooth((u - .35) / .3) + smooth((u - .7) / .25));
  p.pitch = DIP * .4 * hump(u, .05, .95, .15);
}

export function peerPoseAt(kind, u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  if (kind === 'tap') tapPose(u, p); else peerPose(u, p);
  for (const k of Object.keys(p)) p[k] *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

function apply(actor, p, s) {
  actor.head.rotation.x += s * p.pitch; actor.head.rotation.z += s * p.roll;
  actor.body.rotation.y += s * p.turn;
  actor.arm.rotation.x += s * p.arm;
  actor.weaponSocket.rotation.y += s * p.twist;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not peering.
export function updateHealerPeer(actor, dt, t, busy) {
  if (!peers(actor)) return null;
  const st = actor.healerPeer || (actor.healerPeer = {seed: ((actor.g?.id ?? 1) * 16807) % 2147483647 || 1, wait: 0, cur: null, f: 0, next: 'peer', applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted peer always fades out; it never picks back up.
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
      st.next = st.next === 'peer' ? 'tap' : 'peer';
    }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = peerPoseAt(st.cur.kind, st.cur.u, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

// Idle prowl for the rogue, whose model (rogue.js) wears a deep hood and carries a long toothed
// dagger in the right hand. A rogue that has stood still for a few seconds now and then does one
// of two things, taking turns:
//  - glance: the hooded head turns slowly over the left shoulder, the shoulders following a little,
//    holds there watching, then slides across to look back over the right, holds, and glides home.
//  - flip: the dagger hand draws up in front of the hip, the blade flips once end over end in the
//    fingers and is caught, then the rogue turns it in the hand to run an eye along the edge (the
//    head dips to watch it), and lowers it again.
// Both glide in and out (no snaps), following the sinister direction. Walking, an action or death
// fades it out within ~0.1 s.
//
// Only the head, the body's yaw, the dagger arm and the weapon socket move, as offsets on top of
// whatever the idle loop and actions.js posed this frame. Each frame the prowl takes back its own
// last offset first and then adds this frame's, like monk-bow.js. The body only turns about its
// upright axis, so the feet stay on the floor.

// Glance: head yaw at full turn (positive turns the face toward +x, the right shoulder, where the
// dagger arm hangs), the share of it the body takes, and how far the hood lowers as it watches.
export const LOOK = .95, TURN = .22, LOOK_TILT = .08;
// Flip: the dagger arm draws forward (negative pitch raises it), the blade flips one full turn
// about the socket's x axis, then turns EDGE rad about its length to show the edge; head nods
// WATCH to follow it.
export const DRAW = -.55, FLIP = Math.PI * 2, EDGE = .7, WATCH = .16;
// Seconds for one turn of each.
export const LEN = {glance: 4.6, flip: 3.8};
// First prowl after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 7, GAP_SPAN = 7;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const prowls = a => !!(a && !a.asset && a.kind === 'rogue' && a.head && a.body && a.arm && a.weaponSocket);

const ZERO = () => ({yaw: 0, tilt: 0, turn: 0, nod: 0, arm: 0, flip: 0, edge: 0});

// Glance phases in u: over the left .05–.3, held to .42, across to the right .48–.7, held to .8,
// home by .97. The body turns TURN of the way with the head.
function glancePose(u, p) {
  const left = smooth((u - .05) / .25) - smooth((u - .42) / .28);
  const right = smooth((u - .48) / .22) - smooth((u - .8) / .17);
  const look = right - left;           // -1 over the left shoulder, +1 over the right
  p.yaw = LOOK * look * (1 - TURN);
  p.turn = LOOK * look * TURN;
  p.tilt = LOOK_TILT * Math.abs(look); // the hood lowers a touch as it watches
}

// Flip phases in u: draw .03–.2, flip .24–.42 (fast in the middle, like a toss and a catch),
// edge turn .5–.62, held to .74, back .78–.97 with the arm.
function flipPose(u, p) {
  const draw = smooth((u - .03) / .17) - smooth((u - .78) / .19);
  p.arm = DRAW * draw;
  p.flip = FLIP * smooth((u - .24) / .18);
  if (u >= .42) p.flip = FLIP;
  const edge = smooth((u - .5) / .12) - smooth((u - .74) / .2);
  p.edge = EDGE * edge;
  p.nod = WATCH * (smooth((u - .45) / .12) - smooth((u - .76) / .18));
}

export function prowlPose(kind, u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  if (kind === 'flip') flipPose(u, p); else glancePose(u, p);
  // The flip is a whole turn, so it is exact at rest whatever f is; only the draw, edge and nod fade.
  for (const k of ['yaw', 'tilt', 'turn', 'nod', 'arm', 'edge']) p[k] *= f;
  if (p.flip === FLIP) p.flip = 0;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

function apply(actor, p, s) {
  actor.head.rotation.y += s * p.yaw; actor.head.rotation.x += s * (p.tilt + p.nod);
  actor.body.rotation.y += s * p.turn;
  actor.arm.rotation.x += s * p.arm;
  actor.weaponSocket.rotation.x += s * p.flip; actor.weaponSocket.rotation.y += s * p.edge;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not prowling.
export function updateRogueProwl(actor, dt, t, busy) {
  if (!prowls(actor)) return null;
  const st = actor.rogueProwl || (actor.rogueProwl = {seed: ((actor.g?.id ?? 1) * 48271) % 2147483647 || 1, wait: 0, cur: null, f: 0, next: 'glance', applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted prowl always fades out; it never picks back up. A flip caught mid-air
    // finishes its turn quickly as it fades, so the blade doesn't freeze sideways.
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
      st.next = st.next === 'glance' ? 'flip' : 'glance';
    }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = prowlPose(st.cur.kind, st.cur.u, st.f);
  // A broken flip: scale the remaining spin down with the fade, so it unwinds to 0 or 2π
  // (whichever is nearer) instead of hanging mid-turn.
  if (st.cur.broken && st.cur.kind === 'flip') {
    const raw = prowlPose('flip', st.cur.u, 1).flip || 0;
    p.flip = raw < Math.PI ? raw * st.f : FLIP - (FLIP - raw) * st.f;
    if (p.flip >= FLIP - 1e-9) p.flip = 0;
  }
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

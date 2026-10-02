// Idle draw and nock for the ranger (ranger.js): a hooded hunter with a black recurved longbow held low
// in the left fist and a barbed arrow in the right.
// A ranger that has stood still for a few seconds now and then brings the arrow across and nocks it on
// the string, then slowly half-draws, turning side-on behind the canted bow while the head stays on the
// line of the arrow. It holds the draw low and dead still, tracking slowly to one side as if following
// something only it can see, the string arm trembling more the longer it holds. Then it eases the draw
// and lets the arrow sink back to its side.
// The draw is slow and the hold long, following the sinister direction. Walking, an action or death
// fades it out within ~0.1 s.
//
// The bow is merged into the left arm's mesh and there are no elbows, so the poses were solved against
// the real model (ranger-draw.test.js checks them): the bow cants ~35°, the arrow points forward and a
// little down, and the right fist sits on the string behind the grip, clear of the jerkin.
// Only the head, body, both arms and the weapon socket move, as offsets on top of whatever the idle loop
// and actions.js posed this frame. Each frame it takes back its own last offset first and then adds this
// frame's, like convict-hunted.js. The socket also slides forward along the arrow so the fingers hold
// the nock instead of the shaft.

// Offsets at the nock (fist on the string, no draw) and at the half-draw (.12 behind the string).
// body: yaw; l/r: the left (bow) and right (string) arm; s: the socket's rotation; p: its position.
export const NOCK = {body: .31, lx: -.30, ly: -.73, lz: .83, rx: -.80, rz: -.79,
  sx: 1.27, sy: .19, sz: -.28, px: .066, py: -.192, pz: .134};
export const DRAW = {body: .81, lx: -.59, ly: -1.23, lz: .55, rx: -.89, rz: -.89,
  sx: 1.56, sy: -.04, sz: .09, px: -.018, py: -.234, pz: .075};
// The head sights along the arrow: it turns back against the body's yaw, chin down.
export const CHIN = .12;
// The string arm swings out this far (rad) on its way across and back, so the arrow clears the hip.
export const ARC = .6;
// The hold: it tracks SWEEP rad to one side; the string arm trembles up to SHAKE rad at SHAKE_HZ.
export const SWEEP = .16, SHAKE = .02, SHAKE_HZ = 9;
// Seconds: the reach to nock, the draw, each hold (HOLD_MIN..+HOLD_SPAN), the ease back.
export const REACH = .55, DRAW_T = .85, HOLD_MIN = 1.4, HOLD_SPAN = 1, EASE = 1.2;
// First draw after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 6, GAP_SPAN = 7;
const FADE_OUT = 14, SNAP_OFF = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const KEYS = Object.keys(NOCK);

// A plan: which way the hold tracks (±1) and how long it holds.
export const drawLength = plan => REACH + DRAW_T + plan.hold + EASE;

export const draws = a => !!(a && !a.asset && a.kind === 'ranger' && a.head && a.body && a.weaponSocket &&
  Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({body: 0, lx: 0, ly: 0, lz: 0, rx: 0, rz: 0, sx: 0, sy: 0, sz: 0, px: 0, py: 0, pz: 0, yaw: 0, pitch: 0});

// The pose `time` seconds into a draw following `plan`, scaled by f.
export function drawPoseAt(time, plan, f = 1) {
  const p = ZERO(), T = drawLength(plan);
  if (!(f > 0) || !(time > 0) || !(time < T)) return p;
  const t1 = REACH, t2 = t1 + DRAW_T, t3 = t2 + plan.hold;
  // the stance: rest -> nock -> half-draw, held, then eased straight back to rest
  let base;
  if (time < t1) { const k = smooth(time / t1); for (const key of KEYS) p[key] = NOCK[key] * k; base = k; p.rz += ARC * Math.sin(Math.PI * k); }
  else if (time < t3) { const k = smooth((time - t1) / DRAW_T); for (const key of KEYS) p[key] = NOCK[key] + (DRAW[key] - NOCK[key]) * k; base = 1; }
  else { const k = 1 - smooth((time - t3) / EASE); for (const key of KEYS) p[key] = DRAW[key] * k; base = k; p.rz += ARC * Math.sin(Math.PI * k); }
  // the slow track through the hold, carried back with the ease
  const track = (plan.side < 0 ? -1 : 1) * SWEEP * (time < t2 ? 0 : time < t3 ? smooth((time - t2) / plan.hold) : 1 - smooth((time - t3) / EASE));
  p.body += track;
  // the head keeps to the arrow's line (the stance yaw only; it follows the track)
  p.yaw = -(p.body - track);
  p.pitch = CHIN * base;
  // the string arm trembles, growing through the hold
  if (time > t2 && time < t3) {
    const u = (time - t2) / plan.hold, s = SHAKE * u * u * Math.sin(Math.PI * u) * 2 * Math.sin(2 * Math.PI * SHAKE_HZ * time);
    p.rx += s; p.lx += s * .5;
  }
  for (const key of Object.keys(p)) p[key] *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const makePlan = st => ({side: rand(st) < .5 ? -1 : 1, hold: HOLD_MIN + HOLD_SPAN * rand(st)});

function apply(actor, p, s) {
  actor.head.rotation.x += s * p.pitch; actor.head.rotation.y += s * p.yaw;
  actor.body.rotation.y += s * p.body;
  const [left, right] = actor.arms, w = actor.weaponSocket;
  left.rotation.x += s * p.lx; left.rotation.y += s * p.ly; left.rotation.z += s * p.lz;
  right.rotation.x += s * p.rx; right.rotation.z += s * p.rz;
  w.rotation.x += s * p.sx; w.rotation.y += s * p.sy; w.rotation.z += s * p.sz;
  w.position.x += s * p.px; w.position.y += s * p.py; w.position.z += s * p.pz;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not drawing.
export function updateRangerDraw(actor, dt, t, busy) {
  if (!draws(actor)) return null;
  const st = actor.rangerDraw || (actor.rangerDraw = {seed: ((actor.g?.id ?? 1) * 48271) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted draw always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.time += dt;
    else {
      st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP_OFF) st.f = 0;
    }
    if (st.cur.time >= drawLength(st.cur.plan) || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {time: 0, plan: makePlan(st)}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = drawPoseAt(st.cur.time, st.cur.plan, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

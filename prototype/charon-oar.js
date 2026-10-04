// Idle oar stroke for Charon (charon.js): a hunched ferryman with his oar held upright in the right fist.
// A Charon that has stood still for a few seconds now and then poles an unseen ferry across the floor as
// if it were the Styx. He hauls the oar up through his grip and plants its iron butt ahead of him, then
// leans into a long, heavy push that drags the butt back past his heel while the blade tips forward over
// his shoulder. He hauls it up again and plants it for the next stroke, two or three strokes in all, and
// then lets the oar sink back upright at his side. The head holds its stare on the way (it pitches back
// against the lean), so the burning eyes keep watching while the body labours.
// Each push ends with the butt snagging in the muck: the arm judders and lets go.
// The strokes are slow and weary, following the sinister direction. Walking, an action or death fades it
// out within ~0.1 s.
//
// Only the body, the head, the oar arm and the weapon socket move, as offsets on top of whatever the idle
// loop and actions.js posed this frame. Each frame it takes back its own last offset first and then adds
// this frame's, like ranger-draw.js. The PLANT and PUSH poses were checked against the real model
// (charon-oar.test.js): the butt stays above the floor and the blade stays clear of the hood.
// The haul slides the socket along the oar's own axis, so the oar runs up through the closed fist.

// Offsets at the plant (butt ahead, blade leaning back) and at the end of the push (butt behind, blade
// forward). bx: body lean (forward +), by: body yaw (the oar shoulder forward −, back +), rx: the oar
// arm's swing (forward −), sx: the socket's tilt.
export const PLANT = {bx: .07, by: -.06, rx: -.5, sx: .2};
export const PUSH = {bx: .1, by: .08, rx: .3, sx: .1};
// The head pitches back by this share of the body's lean, so the stare holds level.
export const STARE = .8;
// How far (model units, socket space) the oar slides up through the fist on each haul, and the extra
// hunch (rad) at the heart of each push.
export const HAUL = .09, HEAVE = .04;
// The butt snags in the riverbed at the end of each push: the oar arm judders by this much (rad) for
// 1.5 cycles over the last SNAG_SPAN share of the push, steady again at the very end.
export const SNAG = .06, SNAG_SPAN = .2;
// The oar's built-in tilt inside the socket (charon.js buildOar), so the haul runs along its axis.
const TILT_X = .12, TILT_Z = -.06;
// Seconds: the first haul and plant, each push, each haul back to the plant, the ease back to rest.
export const ENTER = 1.1, PUSH_T = 1.8, RETURN = 1.1, EASE = 1.4;
// Two or three strokes; the first after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 4, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8;
const FADE_OUT = 14, SNAP_OFF = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const KEYS = Object.keys(PLANT);
const ZERO = () => ({bx: 0, by: 0, rx: 0, sx: 0, haul: 0, hp: 0, py: 0, pz: 0});

export const rows = a => !!(a && !a.asset && a.kind === 'charon' && a.head && a.body && a.weaponSocket &&
  Array.isArray(a.arms) && a.arms.length === 2);

// A plan: how many strokes.
export const strokeLength = plan => ENTER + plan.strokes * PUSH_T + (plan.strokes - 1) * RETURN + EASE;

const lerp = (from, to, k, p) => { for (const key of KEYS) p[key] = (from ? from[key] : 0) + ((to ? to[key] : 0) - (from ? from[key] : 0)) * k; };

// The pose `time` seconds into a bout of strokes following `plan`, scaled by f.
export function strokePoseAt(time, plan, f = 1) {
  const p = ZERO(), T = strokeLength(plan);
  if (!(f > 0) || !(time > 0) || !(time < T)) return p;
  if (time < ENTER) { const k = time / ENTER; lerp(null, PLANT, smooth(k), p); p.haul = Math.sin(Math.PI * k); }
  else if (time >= T - EASE) { const k = (time - (T - EASE)) / EASE; lerp(PUSH, null, smooth(k), p); p.haul = .5 * Math.sin(Math.PI * k); }
  else {
    const u = time - ENTER, cycle = PUSH_T + RETURN, c = u % cycle;
    if (c < PUSH_T) { const k = c / PUSH_T; lerp(PLANT, PUSH, smooth(k), p); p.bx += HEAVE * Math.sin(Math.PI * k); p.rx += SNAG * Math.sin(3 * Math.PI * clamp01((k - 1 + SNAG_SPAN) / SNAG_SPAN)); }
    else { const k = (c - PUSH_T) / RETURN; lerp(PUSH, PLANT, smooth(k), p); p.haul = Math.sin(Math.PI * k); }
  }
  // the haul runs along the oar's axis in the arm's frame (the socket's tilt plus the oar's own)
  const a = p.sx + TILT_X, d = HAUL * p.haul * Math.cos(TILT_Z);
  p.py = d * Math.cos(a); p.pz = d * Math.sin(a);
  p.hp = -STARE * p.bx;
  for (const key of Object.keys(p)) p[key] *= f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const makePlan = st => ({strokes: rand(st) < .5 ? 2 : 3});

function apply(actor, p, s) {
  actor.body.rotation.x += s * p.bx; actor.body.rotation.y += s * p.by;
  actor.head.rotation.x += s * p.hp;
  actor.arms[1].rotation.x += s * p.rx;
  const w = actor.weaponSocket;
  w.rotation.x += s * p.sx; w.position.y += s * p.py; w.position.z += s * p.pz;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not rowing.
export function updateCharonOar(actor, dt, t, busy) {
  if (!rows(actor)) return null;
  const st = actor.charonOar || (actor.charonOar = {seed: ((actor.g?.id ?? 1) * 69621) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted bout always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.time += dt;
    else {
      st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP_OFF) st.f = 0;
    }
    if (st.cur.time >= strokeLength(st.cur.plan) || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {time: 0, plan: makePlan(st)}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = strokePoseAt(st.cur.time, st.cur.plan, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

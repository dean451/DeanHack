// Haunted rocking and a flinch for the prisoner (prisoner.js): a starved captive bent almost double,
// head hung forward and peering up, a gnawed bone in the right fist.
// A prisoner left standing begins, after a moment, to rock: a slow forward-and-back sway from the
// hips, the hung head nodding a beat behind it and drifting a little side to side, like someone who
// has spent years in a cell with nothing else to do. With the hero within NEAR tiles the rocking
// grows quicker and tighter, an anxious self-soothing.
// When the hero comes within FLINCH tiles it flinches: it jerks back and twists away from the hero's
// side, ducks its face under its hair and throws both forearms up as a shield. It cowers there,
// trembling, then slowly lowers its arms and creeps back into its hunch. A hero that stays close
// doesn't set it off again; one that steps away and comes back does (after REARM s).
// The flinch is fast and the recovery slow, following the sinister direction. Walking, an action or
// death fades it all out within ~0.1 s, and the rocking eases back in only after a still spell.
//
// Only the body, head and both arms move, as offsets on top of whatever the idle loop and actions.js
// posed this frame. Each frame it takes back its own last offset first and then adds this frame's,
// like convict-hunted.js.

// The rock. A: body pitch (rad), HEAD: head nod against it, LAG: the nod's phase lag (rad), SWAY: the
// head's side drift, HZ: cycles a second. NEAR_* replace them with the hero within NEAR tiles.
export const ROCK = {a: .055, head: .5, lag: .7, sway: .03, hz: .3};
export const ROCK_NEAR = {a: .035, head: .35, lag: .5, sway: .015, hz: .62};
export const NEAR = 6;
// The rock eases in over RISE s once the prisoner has been still for SETTLE s.
export const SETTLE = 1.2, RISE = 2.5;
// The flinch: body recoil back (−), twist away, head duck (+) and turn away, both arms up (rx) and in (rz).
export const COWER = {bx: -.13, by: .32, hx: .2, hy: .42, rx: -.8, rz: .26};
// Tremble while cowering (rad, Hz).
export const SHAKE = .025, SHAKE_HZ = 13;
// Seconds: the jerk away, the cower (HOLD_MIN..+HOLD_SPAN), the slow creep back.
export const SNAP = .12, HOLD_MIN = 1.1, HOLD_SPAN = .9, RECOVER = 1.7;
// Tiles: how close the hero must come to set off a flinch. REARM: s the hero must be beyond FLINCH
// before a new approach can set off another.
export const FLINCH = 2.5, REARM = 2;
const FADE_OUT = 14, SNAP_OFF = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const jerk = v => { v = clamp01(v); return 1 - (1 - v) ** 3; };
const ZERO = () => ({bx: 0, by: 0, bz: 0, hx: 0, hy: 0, lx: 0, lz: 0, rx: 0, rz: 0});

export const rocks = a => !!(a && !a.asset && a.kind === 'prisoner' && a.head && a.body &&
  Array.isArray(a.arms) && a.arms.length === 2);

export const flinchLength = hold => SNAP + hold + RECOVER;

// The flinch's weight `time` s in (0..1), and how strongly it trembles.
export function flinchAt(time, hold) {
  if (!(time > 0) || !(time < flinchLength(hold))) return {k: 0, shake: 0};
  if (time < SNAP) return {k: jerk(time / SNAP), shake: 0};
  if (time < SNAP + hold) return {k: 1, shake: Math.sin(Math.PI * (time - SNAP) / hold)};
  return {k: 1 - smooth((time - SNAP - hold) / RECOVER), shake: 0};
}

// The cower pose at weight k, turning away to `side` (+1: the prisoner's left, away from a hero on its right).
export function cowerPose(k, side, shake = 0, time = 0, p = ZERO()) {
  const s = side < 0 ? -1 : 1, tr = SHAKE * shake * Math.sin(2 * Math.PI * SHAKE_HZ * time);
  p.bx += COWER.bx * k + tr * .5; p.by += COWER.by * s * k; p.hx += COWER.hx * k; p.hy += COWER.hy * s * k + tr;
  // the arms come up and in across the face (left arm +z is inward, right arm −z)
  p.lx += COWER.rx * k + tr; p.rx += COWER.rx * k - tr; p.lz += COWER.rz * k; p.rz -= COWER.rz * k;
  return p;
}

// The rock at `phase` (rad), blended between alone and near by n, scaled by w.
export function rockPose(phase, n, w, p = ZERO()) {
  if (!(w > 0)) return p;
  const m = (key) => ROCK[key] + (ROCK_NEAR[key] - ROCK[key]) * n;
  const a = m('a'), body = Math.sin(phase);
  p.bx += w * a * body;
  p.hx -= w * a * m('head') * Math.sin(phase - m('lag'));
  p.hy += w * m('sway') * Math.sin(phase * .5);
  p.bz += w * a * .2 * Math.sin(phase * .5);
  // the hands hang and swing a little with the body
  p.lx -= w * a * .6 * body; p.rx -= w * a * .6 * body;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

function apply(actor, p, s) {
  const b = actor.body.rotation, h = actor.head.rotation, [l, r] = actor.arms;
  b.x += s * p.bx; b.y += s * p.by; b.z += s * p.bz;
  h.x += s * p.hx; h.y += s * p.hy;
  l.rotation.x += s * p.lx; l.rotation.z += s * p.lz;
  r.rotation.x += s * p.rx; r.rotation.z += s * p.rz;
}

// Where the hero is from the prisoner: distance (tiles) and which side (+1 right, −1 left), or null.
export function heroFrom(actor, look) {
  const g = actor.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  // the model faces +z; its right is −x in its own frame
  const yaw = Math.atan2(dx, dz) - g.rotation.y;
  return {d, right: Math.sin(yaw) < 0 ? 1 : -1};
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued; `look` is the hero's position (same parent as actor.g), or null. Returns the pose
// applied this frame.
export function updatePrisonerRock(actor, dt, t, busy, look = null) {
  if (!rocks(actor)) return null;
  const st = actor.prisonerRock || (actor.prisonerRock = {seed: ((actor.g?.id ?? 1) * 48271) % 2147483647 || 1,
    phase: 0, still: 0, w: 0, n: 0, flinch: null, f: 0, armed: true, away: REARM, applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.phase) st.phase = 2 * Math.PI * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead, hero = actor.actions?.dead ? null : heroFrom(actor, look);

  // the rock: fades in after a still spell, out fast when busy
  st.still = still ? st.still + dt : 0;
  if (st.still > SETTLE) st.w = Math.min(1, st.w + dt / RISE);
  else { st.w *= Math.exp(-FADE_OUT * dt); if (st.w < SNAP_OFF) st.w = 0; }
  const near = hero && hero.d <= NEAR ? 1 : 0;
  st.n += (near - st.n) * (1 - Math.exp(-2 * dt));
  st.phase = (st.phase + 2 * Math.PI * (ROCK.hz + (ROCK_NEAR.hz - ROCK.hz) * st.n) * dt) % (2 * Math.PI * 64);

  // the flinch: armed after the hero has been beyond FLINCH for REARM s
  const close = !!hero && hero.d <= FLINCH;
  st.away = close ? 0 : st.away + dt;
  if (st.away >= REARM) st.armed = true;
  if (st.flinch) {
    if (still && !st.flinch.broken) st.flinch.time += dt;
    else { st.flinch.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP_OFF) st.f = 0; }
    if (st.flinch.time >= flinchLength(st.flinch.hold) || !(st.f > 0)) { st.flinch = null; st.f = 0; }
  } else if (close && st.armed && still) {
    st.armed = false;
    st.flinch = {time: 0, hold: HOLD_MIN + HOLD_SPAN * rand(st), side: hero.right};
    st.f = 1;
  } else if (close) st.armed = false;

  const p = ZERO();
  let fk = 0;
  if (st.flinch) {
    const {k, shake} = flinchAt(st.flinch.time, st.flinch.hold);
    fk = k * st.f;
    cowerPose(fk, st.flinch.side, shake * st.f, st.flinch.time, p);
  }
  rockPose(st.phase, st.n, st.w * (1 - fk), p);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}

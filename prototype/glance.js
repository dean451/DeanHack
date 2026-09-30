// Darting glances for the evil eye. A living eye is never quite still: while the evil eye hovers
// in place, its eyeball flicks (a saccade of well under a tenth of a second) to a new spot,
// holds there, and flicks again. About a third of the flicks come back to dead ahead, so it keeps
// returning to glare straight out. While fixed, the eye trembles very slightly. Walking, an
// action or death eases the eye back to centre within ~0.1 s, and it resumes after a short hold.
//
// Only actor.head moves (rotation y and x), as an offset on top of whatever else posed it this
// frame. The evil eye's head is the eyeball and iris group, pivoting at the eyeball's centre, so
// turning it rolls the eye inside its lids. It takes back its own last offset first, so it never
// drifts; actions.js's head pitch adds on top and is taken back the same way.
//
// Given where the hero is (`look`), the eye watches them. When the hero comes into its view
// (within TRACK_RANGE and VIEW rad of straight ahead), it cuts its current glance short and
// flicks to them. Most later flicks go back to the hero, and it holds those stares longer,
// following the hero as they move. If the hero leaves its view mid-stare, or turns invisible, it
// flicks back to centre.

// YAW/PITCH: the largest glance to each side and up/down (rad); SACCADE: seconds per flick;
// HOLD_MIN..+HOLD_SPAN: seconds each fixation lasts; CENTRE: chance a flick comes back to centre;
// TREMOR: size of the tremble while fixed.
export const YAW = .5, PITCH = .26, SACCADE = .07, HOLD_MIN = .35, HOLD_SPAN = 1.5, CENTRE = .32, TREMOR = .006;
// After walking or an action, the eye holds centre this long before it darts again.
export const RESUME = .6;
const FADE_OUT = 14, SNAP = 1e-3;
// Tracking the hero. TRACK_RANGE: how far it watches (tiles); VIEW: how far off straight ahead
// the hero can be (rad) and still be seen; TRACK: chance a flick goes to the hero once seen;
// STARE_MIN..+STARE_SPAN: seconds a stare lasts; NOTICE: the longest a glance carries on once the
// hero comes into view; FOLLOW: how quickly a stare follows the hero (1/s); EYE_H, LOOK_H: heights
// of the eye and of the hero's face above their feet.
export const TRACK_RANGE = 6, VIEW = 1.3, TRACK = .72, STARE_MIN = 1.1, STARE_SPAN = 2, NOTICE = .12, FOLLOW = 16;
const EYE_H = .6, LOOK_H = 1.1;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const glances = a => !!(a && !a.asset && a.species === 'evil eye' && a.head);

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// The eye's offset that points at `look`, or null when the hero is out of its view.
export function aimAt(actor, look) {
  const g = actor?.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > TRACK_RANGE) return null;
  let yaw = Math.atan2(dx, dz) - g.rotation.y;
  yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  if (Math.abs(yaw) > VIEW) return null;
  // Positive head pitch looks down, so a face above the eye needs a negative pitch.
  const pitch = -Math.atan2(((look.y || 0) + LOOK_H) - (g.position.y + EYE_H), d);
  const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
  return {yaw: clamp(yaw, YAW), pitch: clamp(pitch, PITCH)};
}

// Where the eye can look for the hero: nowhere while the hero is invisible (an evil eye doesn't
// see invisible). The bridge only reports that when the map would hide the hero's glyph anyway.
export const heroLook = (player, pos) => player?.invisible ? null : pos;

function nextTarget(st) {
  if (rand(st) < CENTRE) return {yaw: 0, pitch: 0};
  // Aim somewhere in an ellipse, favouring the outer part so each flick is visible.
  const ang = rand(st) * 2 * Math.PI, r = .45 + .55 * Math.sqrt(rand(st));
  return {yaw: YAW * r * Math.cos(ang), pitch: PITCH * r * Math.sin(ang)};
}

// Call once per frame. `busy` is true while the actor walks or has an action playing or queued.
// `look` is the hero's position (same parent as actor.g), or null.
// Returns the offset applied this frame ({yaw, pitch}), or null for anything but an evil eye.
export function updateGlance(actor, dt, t, busy, look = null) {
  if (!glances(actor)) return null;
  const st = actor.glance || (actor.glance = {
    seed: ((actor.g?.id ?? 1) * 104729) % 2147483647 || 1,
    from: {yaw: 0, pitch: 0}, to: {yaw: 0, pitch: 0}, u: 1, hold: 0, f: 1, applied: {yaw: 0, pitch: 0},
  });
  const h = actor.head, o = st.applied;
  h.rotation.y -= o.yaw; h.rotation.x -= o.pitch;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  t = Number.isFinite(t) ? t : 0;
  const still = !busy && !actor.actions?.dead;
  const aim = still ? aimAt(actor, look) : null;

  if (still) {
    st.f = Math.min(1, st.f + dt * FADE_OUT);
    if (st.track) {
      if (aim) { const k = 1 - Math.exp(-FOLLOW * dt); st.to = {yaw: st.to.yaw + (aim.yaw - st.to.yaw) * k, pitch: st.to.pitch + (aim.pitch - st.to.pitch) * k}; }
      else { st.from = cur(st); st.to = {yaw: 0, pitch: 0}; st.u = 0; st.track = false; st.hold = HOLD_MIN + HOLD_SPAN * rand(st); }
    } else if (aim && !st.saw && st.u >= 1) st.hold = Math.min(st.hold, NOTICE);
    if (st.u < 1) st.u = Math.min(1, st.u + dt / SACCADE);
    else if ((st.hold -= dt) <= 0) {
      st.from = cur(st); st.u = 0;
      if (aim && (!st.saw || rand(st) < TRACK)) { st.to = aim; st.track = true; st.hold = STARE_MIN + STARE_SPAN * rand(st); }
      else { st.to = nextTarget(st); st.track = false; st.hold = HOLD_MIN + HOLD_SPAN * rand(st); }
      st.saw = !!aim;
    }
    if (!aim) st.saw = false;
  } else {
    st.track = false; st.saw = false;
    // Ease back to centre; once there, settle the glance so it restarts from centre.
    st.f *= Math.exp(-FADE_OUT * dt);
    if (st.f < SNAP) { st.f = 0; st.from = {yaw: 0, pitch: 0}; st.to = {yaw: 0, pitch: 0}; st.u = 1; st.hold = RESUME; }
  }

  const c = cur(st);
  const fixed = st.u >= 1 ? 1 : 0;
  const p = {
    yaw: (c.yaw + fixed * TREMOR * Math.sin(t * 23.1 + st.seed % 7)) * st.f,
    pitch: (c.pitch + fixed * TREMOR * Math.sin(t * 17.3 + 1.7)) * st.f,
  };
  h.rotation.y += p.yaw; h.rotation.x += p.pitch;
  st.applied = p;
  return p;
}

function cur(st) {
  const k = smooth(st.u);
  return {yaw: st.from.yaw + (st.to.yaw - st.from.yaw) * k, pitch: st.from.pitch + (st.to.pitch - st.from.pitch) * k};
}

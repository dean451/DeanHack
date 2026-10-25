// An ant caught standing with the hero close by lifts its gaster over its back, sting forward, and holds it there
// trembling (the defence insect-gaster.js solves by role from the AntWiki line); when the hero backs off, or the ant
// moves or acts, the gaster comes down again. Called from live.js's actor loop after updateInsectSettle. Like
// the settling it eases the joint toward the pose and takes the write back at the start of the next call, so the
// gaster returns exactly to its awake angle.
import {gasterPose, raises} from './insect-gaster.js';
import {takeBackRest} from './insect-settle.js';

// ALARM: how close the hero may come (metres) before the gaster goes up; LIFT and LOWER: seconds to raise and
// lower it (up fast, down slowly); TREMBLE: the shake's size (radians) and its rate (rad/s) once it is up.
export const ALARM = 2.4, LIFT = .35, LOWER = 1.2, TREMBLE = .05, RATE = 31;

const POSES = new Map();
// The solved raised pose for this kind of ant (cached by name), or null when it did not meet every goal.
export function raisedFor(a) {
  const key = `${a.species || a.name || ''}:${a.g.scale.x}`;
  if (!POSES.has(key)) {
    const r = gasterPose(a), worst = Math.max(...r.residuals.map(v => Math.hypot(...(Array.isArray(v) ? v : [v]))));
    POSES.set(key, worst < .02 ? r.pose : null);
  }
  return POSES.get(key);
}

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };

// Called every frame for every actor; does nothing for a creature that is not an ant.
export function updateInsectAlarm(a, dt, t, busy, look = null) {
  if (!raises(a)) return 0;
  const st = a.antAlarm || (a.antAlarm = {p: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < ALARM;
  // (not while it is lying down for the night: insect-settle.js has the joints then)
  const want = near && !busy && !a.actions?.dead && !(a.insectRest?.p > 0);
  const pose = want || st.p ? raisedFor(a) : null;
  if (!pose || !a.joints?.tail0) { st.p = 0; return 0; }
  st.p = want ? Math.min(1, st.p + dt / LIFT) : Math.max(0, st.p - dt / LOWER);
  if (!st.p) return 0;
  const o = a.joints.tail0.rotation, now = o.x, shake = st.p === 1 ? Math.sin(t * RATE) * TREMBLE : 0;
  const next = now + (pose.tail0?.x || 0) * smooth(st.p) + shake;
  if (next !== now) { o.x = next; st.written.push({get: () => o.x, set: v => { o.x = v; }, left: next, was: now}); }
  return st.p;
}

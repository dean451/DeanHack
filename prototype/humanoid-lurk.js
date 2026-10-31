// The bugbear lies in wait: when the hero is in its range but not yet upon it, a standing bugbear sinks into its
// solved ambush crouch (humanoid-ambush.js) and stays there, still but for a slow breath; when the hero comes within
// reach it springs up fast, and when the hero is gone, or the bugbear walks or acts, it rises. Same easing and
// take-back as the dwarf's guard (humanoid-guard.js), so every joint returns exactly to its awake value.
import {ambushPose, ambushes} from './humanoid-ambush.js';
import {easePose} from './humanoid-guard.js';
import {takeBackRest} from './insect-settle.js';

// RANGE and POUNCE: the hero's distance (metres) inside which it crouches and inside which it springs; DROP, SPRING
// and RISE: seconds to sink, to spring up (quick) and to rise when the hero is gone; BREATH: the chest's rise (radians
// of the upper spine joint) and rate (rad/s).
export const LURK = {RANGE: 7, POUNCE: 1.8, DROP: .8, SPRING: .2, RISE: 1.1, BREATH: .02, RATE: 1.4};

const POSES = new Map();
// The solved ambush for this bugbear (cached by name and scale), or null when it missed a goal.
export function ambushFor(a) {
  const key = `${a.species || a.name || ''}:${a.g.scale.x}`;
  if (!POSES.has(key)) {
    const r = ambushPose(a), worst = Math.max(...r.residuals.map(v => Math.hypot(...(Array.isArray(v) ? v : [v]))));
    POSES.set(key, worst < .02 ? r.pose : null);
  }
  return POSES.get(key);
}

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };

// Called every frame for every actor; does nothing for a creature that is not a bugbear. Returns the progress (0..1).
export function updateBugbearLurk(a, dt, t, busy, look = null) {
  if (!ambushes(a) || a.asset) return 0;
  const st = a.bugbearLurk || (a.bugbearLurk = {p: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const d = look && Number.isFinite(look.x) && Number.isFinite(look.z) ? Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) : Infinity;
  const sprung = d < LURK.POUNCE, want = d < LURK.RANGE && !sprung && !busy && !a.actions?.dead;
  const pose = want || st.p ? ambushFor(a) : null;
  if (!pose) { st.p = 0; return 0; }
  st.p = want ? Math.min(1, st.p + dt / LURK.DROP) : Math.max(0, st.p - dt / (sprung && !busy ? LURK.SPRING : LURK.RISE));
  if (!st.p) return 0;
  const ease = easePose(a, st, pose, smooth(st.p));
  // held, the chest rises and falls a little with the breath
  const breath = st.p === 1 && a.joints.spine1 ? Math.sin(t * LURK.RATE) * LURK.BREATH : 0;
  if (breath) { const o = a.joints.spine1.rotation, now = o.x; o.x = now + breath; st.written.push({get: () => o.x, set: v => { o.x = v; }, left: o.x, was: now}); }
  ease(a.body.position, 'y', a.jointRest.body.y + (pose.hipsY || 0));
  return st.p;
}

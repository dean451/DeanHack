// The stalking crouch in play (the pose wildcat-stalk.js solves by role, baked into wildcat-stalk-poses.js): a
// jaguar, lynx, panther, tiger or displacer beast standing still while the hero is in view at range drops onto
// bent legs, turning to face them, the head low and thrust ahead, the tail hanging low behind with its tip
// twitching; it stays down while the hero hangs about at range and rises when they leave or come right up (a
// cat that has closed the last few paces springs, it does not crouch). Walking, acting or dying breaks it off
// at once. Called from live.js's actor loop after the wild cats' settling; like it (insect-settle.js) it eases
// the joints toward the pose and takes its write back at the start of the next call, so every joint and the
// body return exactly to their awake values. A cat lying down (wildcat-settle.js) does not stalk, and a
// crouching one does not lie down.
import {STALK_POSES} from './wildcat-stalk-poses.js';
import {stalks} from './wildcat-stalk.js';
import {takeBackRest} from './insect-settle.js';

// NEAR: how close (metres) the hero comes to set it off; FAR: how far they go before it gives up; CLOSE: how near
// they come before it rises to spring; LULL: seconds standing still first; DOWN, UP: seconds into the crouch and
// back up; BREAK: seconds to drop out of it when interrupted; TURN: how fast it turns to face the hero (1/s);
// TWITCH: the tail tip's flick (radians on tail1 and tail2, and its rate in rad/s).
export const STALKING = {NEAR: 6, FAR: 8, CLOSE: 1.6, LULL: .6, DOWN: .8, UP: .5, BREAK: .2, TURN: 4, TWITCH: .35, RATE: 5.5};

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// The baked crouch for this wild cat (by its name), or null when it has none that met every goal.
export function stalkFor(a) {
  const b = STALK_POSES[(a?.species || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not stalk. `look`: the hero's
// position. Returns how far into the crouch it is (0 standing, 1 down).
export function updateWildcatStalk(a, dt, t, busy, look = null) {
  if (!a || a.asset || !stalks(a)) return 0;
  const st = a.wildcatStalk || (a.wildcatStalk = {p: 0, on: false, still: 0, fast: false, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const S = STALKING, pose = stalkFor(a);
  if (!pose || !a.joints) { st.p = 0; st.on = false; return 0; }
  const seen = !!look && Number.isFinite(look.x) && Number.isFinite(look.z), d = seen ? Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) : Infinity;
  const stopped = busy || !!a.actions?.dead || a.wildcatRest?.p > 0;
  st.still = stopped ? 0 : st.still + dt;
  if (!st.on && !stopped && st.still >= S.LULL && d < S.NEAR && d > S.CLOSE) { st.on = true; st.fast = false; }
  if (st.on && (stopped || d > S.FAR || d < S.CLOSE)) { st.on = false; st.fast = stopped; }
  st.p = st.on ? Math.min(1, st.p + dt / S.DOWN) : Math.max(0, st.p - dt / (st.fast ? S.BREAK : S.UP));
  if (!st.p) return 0;
  // facing the hero while it is down
  if (st.on && seen) a.g.rotation.y += wrap(Math.atan2(look.x - a.g.position.x, look.z - a.g.position.z) - a.g.rotation.y) * (1 - Math.exp(-S.TURN * dt));
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  const {rest, body} = a.jointRest, w = smooth(st.p);
  const write = (obj, ax, next) => { const now = obj[ax]; if (next === now) return; obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now}); };
  for (const [n, o] of Object.entries(a.joints)) {
    const p = pose[n] || {};
    for (const ax of ['x', 'y', 'z']) if (p[ax]) write(o.rotation, ax, o.rotation[ax] + (rest[n][ax] + p[ax] - o.rotation[ax]) * w);
  }
  write(a.body.position, 'y', a.body.position.y + (body.y + (pose.hipsY || 0) - a.body.position.y) * w);
  // the tail's tip twitches while it waits
  if (st.on && st.p >= 1) { const flick = Math.max(0, Math.sin(t * S.RATE)) ** 3 * S.TWITCH; for (const n of ['tail1', 'tail2']) { const o = a.joints[n]?.rotation; if (o) write(o, 'y', o.y + flick * (n === 'tail1' ? .5 : 1)); } }
  return st.p;
}

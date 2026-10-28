// The play bow in play (the pose canine-bow.js solves by role, baked into canine-bow-poses.js): a dog, jackal,
// wolf or other canine that has been standing still a moment drops into the bow when the hero comes close (the
// bow comes after a lull, Byosiere, Espinosa and Smuts 2016: CREATURE-MEASURES.md, Canines), turned to face them:
// the chest goes down with the forelegs out, the rump and the tail go up, and the tail beats while it holds; then
// it springs back up. Once per approach: the hero has to step back out past FAR before it bows to them again, and
// no sooner than GAP after the last. Walking, acting or dying breaks it off at once. Called from live.js's actor
// loop after the other canine tics; like the settling (insect-settle.js) it eases the joints toward the pose and
// takes its write back at the start of the next call, so every joint returns exactly to its standing value.
import {BOW_POSES} from './canine-bow-poses.js';
import {bows} from './canine-bow.js';
import {takeBackRest} from './insect-settle.js';

// NEAR: how close the hero comes (metres) to set it off; FAR: how far they must go to set it again; LULL: seconds
// standing still first; DOWN, HOLD, UP: seconds into the bow, held, and back up; BREAK: seconds to drop out of it
// when interrupted; GAP: seconds at least between bows; WAG: the tail's beat while held (radians on tail1 and
// tail2, and its rate in rad/s); TURN: how fast it turns to face the hero (1/s).
export const BOWING = {NEAR: 2.6, FAR: 4.2, LULL: 1.2, DOWN: .4, HOLD: 1.4, UP: .35, BREAK: .2, GAP: 6, WAG: .45, RATE: 17, TURN: 9};

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// The baked bow for this canine (by its name), or null when it has none that met every goal.
export function bowFor(a) {
  const b = BOW_POSES[(a?.species || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not bow. `look`: the hero's position.
// Returns how far into the bow it is (0 standing, 1 down).
export function updateCanineBow(a, dt, t, busy, look = null) {
  if (!a || a.asset || !bows(a)) return 0;
  const st = a.canineBow || (a.canineBow = {p: 0, phase: 'idle', t: 0, still: 0, armed: true, since: Infinity, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const B = BOWING, pose = bowFor(a);
  if (!pose || !a.joints) return 0;
  const seen = !!look && Number.isFinite(look.x) && Number.isFinite(look.z), d = seen ? Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) : Infinity;
  const stopped = busy || !!a.actions?.dead;
  st.still = stopped ? 0 : st.still + dt; st.since += dt;
  if (d > B.FAR) st.armed = true;
  if (st.phase === 'idle' && st.armed && d < B.NEAR && st.still >= B.LULL && st.since >= B.GAP) { st.phase = 'down'; st.t = 0; st.armed = false; st.since = 0; }
  if (st.phase === 'idle') return 0;
  st.t += dt;
  if (stopped && st.phase !== 'up') { st.phase = 'up'; st.t = 0; st.fast = true; }
  if (st.phase === 'down') { st.p = Math.min(1, st.p + dt / B.DOWN); if (st.p >= 1) { st.phase = 'hold'; st.t = 0; } }
  else if (st.phase === 'hold') { if (st.t >= B.HOLD) { st.phase = 'up'; st.t = 0; st.fast = false; } }
  else if (st.phase === 'up') { st.p = Math.max(0, st.p - dt / (st.fast ? B.BREAK : B.UP)); if (!st.p) { st.phase = 'idle'; return 0; } }
  // facing the hero as it goes down (the heading is kept, as an attacker keeps facing where it struck)
  if (st.phase === 'down' && seen && !stopped) a.g.rotation.y += wrap(Math.atan2(look.x - a.g.position.x, look.z - a.g.position.z) - a.g.rotation.y) * (1 - Math.exp(-B.TURN * dt));
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  const {rest} = a.jointRest, w = smooth(st.p);
  const write = (obj, ax, next) => { const now = obj[ax]; if (next === now) return; obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now}); };
  for (const [n, p] of Object.entries(pose)) {
    const o = a.joints[n]?.rotation; if (!o || !rest[n]) continue;
    for (const ax of ['x', 'y', 'z']) if (p[ax]) write(o, ax, o[ax] + (rest[n][ax] + p[ax] - o[ax]) * w);
  }
  // the tail beats while the bow is held
  if (st.phase === 'hold') { const beat = Math.sin(t * B.RATE) * B.WAG * Math.min(1, st.t / .15); for (const n of ['tail1', 'tail2']) { const o = a.joints[n]?.rotation; if (o) write(o, 'y', o.y + beat * (n === 'tail1' ? .6 : 1)); } }
  return st.p;
}

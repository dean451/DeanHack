// Jabberwock stalking stride (jabberwock.js). live.js swings every walker's legs about x at
// ±.4 rad and 22 rad/s, a quick scurry that suits a rat, not a hunched 2 m predator on
// digitigrade legs. A walking jabberwock stalks instead: long, slow strides with the legs a half
// cycle apart, the body dipping at each footfall and riding high as the legs pass, the hips
// rolling over the planted foot, the chest hunched a little further forward, and the bladed tail
// lifted level and swinging against the stride to balance it. Standing, the tail lashes slowly
// from side to side. A dead jabberwock's tail goes slack to its exact rest pose. Its big ragged
// wings fold back along its flanks while it walks, tips drooping, and jolt a little at each
// footfall; standing, live.js's slow half-spread flutter takes over again. When it dies the
// wings stop fluttering and crumple: swept half back, slumping hard (one a little more than the
// other), and a revived jabberwock lifts them back into the flutter.
//
// Legs are written absolutely each frame (live.js writes them absolutely too; rest pitch is 0).
// The body bob blends over live.js's idle bob. The body's lean and roll and the tail's yaw and
// lift and the wings' droop are offsets taken back first every frame, so nothing drifts and the action layer's deltas
// still stack. The wings' sweep (rotation.y) blends over live.js's absolute write, like the bob.
// Call updateStride after live.js's generic swing and before updateActions
// (gait.js's updateGait does this).

import {wingSide} from './monster-attacks.js';

export const STRIDE = {
  rate: 7.6, // stride phase, rad/s at scale 1 (slower for bigger kinds: rate / sqrt(scale))
  thigh: .34, // leg swing, radians either side
  bob: .05, // body height change from footfall to midstance
  roll: .04, // hip roll over the planted foot, radians
  lean: .07, // extra forward hunch while walking, radians
  tailSway: .2, tailLag: .6, // tail yaw against the stride, and how far it lags behind (rad of phase)
  tailLift: .1, // tail raised level while walking (positive rotation.x lifts it)
  tailRoll: .6, // how much of live.js's tail roll is damped while walking
  lash: .09, lashRate: .9, // standing tail lash
  fold: 1.15, // wing sweep back along the flanks while walking (rotation.y, times the side)
  droop: .14, // folded wingtips lowered (negative rotation.x)
  jolt: .06, // wingtip bounce at each footfall
  crumple: .7, // dead: wing sweep, half folded (rotation.y, times the side)
  slump: .5, slumpSkew: .25, // dead: wings slumped (negative rotation.x), the second wing by 1 + skew, the first 1 - skew
};
// Walk blend in over ~.2 s, out over ~.3 s; the tail goes slack and the wings crumple over ~.3 s on death.
const EASE_IN = 6, EASE_OUT = 5, SLACK = 7, SNAP = 1e-3;
const TAU = Math.PI * 2;

export const strides = a => !!(a?.g?.name === 'jabberwock' && a.legs?.length === 2 && a.body && !a.asset);

// The pose at stride phase `phase`, walk blend `w`, life `a` (1 alive, 0 slack) and clock `t`.
export function stridePose(phase, w = 0, a = 1, t = 0, seed = 0) {
  const S = STRIDE, s = Math.sin(phase), c = Math.cos(phase);
  const lash = a * (1 - w) * S.lash * Math.sin(t * S.lashRate + seed);
  return {
    legs: [w * S.thigh * s, -w * S.thigh * s],
    // high as the legs pass (|cos| = 1), low at footfall; averages about zero over a stride
    bob: w * S.bob * (Math.abs(c) - .64),
    roll: w * S.roll * s,
    lean: w * S.lean,
    tailYaw: -w * S.tailSway * Math.sin(phase - S.tailLag) + lash,
    tailLift: w * S.tailLift,
    // walking fold and dead crumple; `sweep` is how much of live.js's flutter they replace
    fold: a * w * S.fold + (1 - a) * S.crumple,
    sweep: Math.min(1, w + (1 - a)),
    // tips drop at footfall and lift as the legs pass, in step with the bob
    droop: -w * (S.droop + S.jolt * (.64 - Math.abs(c))),
    slump: -(1 - a) * S.slump,
  };
}

function approach(v, to, rate, dt) {
  const n = to + (v - to) * Math.exp(-rate * dt);
  return Math.abs(n - to) < SNAP ? to : n;
}

// Takes last frame's offsets back off. updateStride does this itself; call it directly only to
// put the model back at rest (e.g. before disposing or re-posing it elsewhere).
export function clearStride(actor) {
  const o = actor?.stride?.applied;
  if (!o) return;
  actor.body.rotation.x -= o.lean;
  actor.body.rotation.z -= o.roll;
  if (actor.tail) { actor.tail.rotation.y -= o.tailYaw; actor.tail.rotation.x -= o.tailLift; }
  if (o.droop) actor.wings?.forEach((w, i) => { w.rotation.x -= o.droop[i]; });
  actor.stride.applied = null;
}

// Call once per frame. Returns the pose applied (or null for other actors).
export function updateStride(actor, dt, walking) {
  if (!strides(actor)) return null;
  let st = actor.stride;
  if (!st) {
    st = actor.stride = {w: 0, a: actor.actions?.dead ? 0 : 1, phase: 0, t: 0,
      seed: Math.abs(actor.g.id || 0) % 7, applied: null};
  }
  clearStride(actor);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const dead = !!actor.actions?.dead, moving = !!walking && !dead;
  st.w = approach(st.w, moving ? 1 : 0, moving ? EASE_IN : EASE_OUT, dt);
  st.a = approach(st.a, dead ? 0 : 1, dead ? SLACK : EASE_IN, dt);
  const scale = actor.g.scale?.x > 0 ? actor.g.scale.x : 1;
  st.phase = st.w > 0 ? (st.phase + STRIDE.rate / Math.sqrt(scale) * dt) % TAU : 0;
  st.t = st.a > 0 ? (st.t + dt) % 1e4 : 0;
  const p = stridePose(st.phase, st.w, st.a, st.t, st.seed);
  actor.legs.forEach((l, i) => { l.rotation.x = p.legs[i]; });
  actor.body.position.y = actor.body.position.y * (1 - st.w) + p.bob;
  actor.body.rotation.x += p.lean;
  actor.body.rotation.z += p.roll;
  if (actor.tail) {
    actor.tail.rotation.z *= 1 - STRIDE.tailRoll * st.w;
    actor.tail.rotation.y += p.tailYaw;
    actor.tail.rotation.x += p.tailLift;
  }
  const wings = actor.wings?.length ? actor.wings : null;
  const droop = wings?.map((wing, i) => {
    wing.rotation.y = wing.rotation.y * (1 - p.sweep) + wingSide(wing, i) * p.fold;
    const d = p.droop + p.slump * (1 + (i ? 1 : -1) * STRIDE.slumpSkew);
    wing.rotation.x += d;
    return d;
  });
  st.applied = {lean: p.lean, roll: p.roll, tailYaw: actor.tail ? p.tailYaw : 0, tailLift: actor.tail ? p.tailLift : 0,
    droop: droop || null};
  return p;
}

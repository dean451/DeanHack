// Loose limbs for the straw golem. It's a scarecrow of lashed sheaves, so its arms and head
// shouldn't be stiff: they hang on soft, under-damped springs that lag behind the body. When it
// sets off, brakes or turns, the arms swing back and ring out; while it walks they flap loosely
// out of step; standing still, a faint draught stirs them and the head lolls.
//
// Everything is an offset on arm and head rotations, taken back at the start of the next call,
// so it never drifts and the action layer's swings (which clear and re-add their own deltas)
// stack on top. The springs are driven by impulses from the actor's own motion (velocity
// change and yaw change per frame), so a slow or dropped frame gives the same kick.

// w0: natural frequency (rad/s); zeta: damping ratio (low = floppy); max: clamp (rad).
export const FLOP = {
  arm: {w0: 7, zeta: .16, max: .55},
  head: {w0: 5, zeta: .22, max: .3},
};
// kick: rad/s of limb swing per m/s of velocity change, saturating past SAT m/s (the ordinary
// slide sets off at ~8 m/s in one frame); yaw: per radian turned.
// flap: walking forcing (rad) at `rate`; breeze: idle stir (rad).
const KICK = {arm: .8, head: .35}, YAW = {arm: .9, head: .35}, SAT = 4;
const FLAP = .16, FLAP_RATE = 11, BREEZE = .035, HEAD_BREEZE = .03;
const EASE = 6, STEP = 1 / 120, MAX_DT = .1, MAX_DYAW = Math.PI;

export function isStrawFlop(a) {
  return !!a && !a.asset && a.species === 'straw golem' && a.arms?.length === 2 && !!a.head;
}

const spring = () => ({x: 0, vx: 0, z: 0, vz: 0});
const wrap = r => Math.atan2(Math.sin(r), Math.cos(r));

// Semi-implicit spring toward (tx, tz), stepped in small slices so it stays stable.
function stepSpring(s, P, tx, tz, dt) {
  const k = P.w0 * P.w0, c = 2 * P.zeta * P.w0;
  for (let left = dt; left > 1e-9; left -= STEP) {
    const h = Math.min(STEP, left);
    s.vx += (k * (tx - s.x) - c * s.vx) * h; s.x += s.vx * h;
    s.vz += (k * (tz - s.z) - c * s.vz) * h; s.z += s.vz * h;
  }
  const clamp = (key, vk) => { if (Math.abs(s[key]) > P.max) { s[key] = Math.sign(s[key]) * P.max; s[vk] *= -.3; } };
  clamp('x', 'vx'); clamp('z', 'vz');
}

function takeBack(actor, st) {
  actor.arms.forEach((arm, i) => { arm.rotation.x -= st.applied.arms[i][0]; arm.rotation.z -= st.applied.arms[i][1]; });
  actor.head.rotation.x -= st.applied.head[0]; actor.head.rotation.z -= st.applied.head[1];
}

// Call once per frame after the slide, gait and trudge, before updateActions.
// Returns the offsets applied, or null for other actors.
export function updateStrawFlop(actor, dt, t, walking) {
  if (!isStrawFlop(actor)) return null;
  const g = actor.g;
  let st = actor.strawFlop;
  if (!st) st = actor.strawFlop = {
    arms: [spring(), spring()], head: spring(), w: 0,
    px: g.position.x, pz: g.position.z, vx: 0, vz: 0, yaw: g.rotation.y,
    phase: (Math.abs(Math.sin(g.id * 12.9898)) * 43758.5453) % (Math.PI * 2),
    applied: {arms: [[0, 0], [0, 0]], head: [0, 0]},
  };
  takeBack(actor, st);
  dt = Number.isFinite(dt) ? Math.min(MAX_DT, Math.max(0, dt)) : 0;
  t = Number.isFinite(t) ? t : 0;

  // The body's velocity and how much it (and its heading) changed since the last frame.
  let dvx = 0, dvz = 0, dyaw = 0;
  if (dt > 0) {
    const vx = (g.position.x - st.px) / dt, vz = (g.position.z - st.pz) / dt;
    dvx = vx - st.vx; dvz = vz - st.vz; st.vx = vx; st.vz = vz;
    // a teleport (a new level, a trapdoor) shouldn't fling the arms
    if (Math.hypot(dvx, dvz) > 8) { dvx = dvz = 0; st.vx = st.vz = 0; }
    dyaw = Math.max(-MAX_DYAW, Math.min(MAX_DYAW, wrap(g.rotation.y - st.yaw)));
  }
  st.px = g.position.x; st.pz = g.position.z; st.yaw = g.rotation.y;
  // into the golem's own frame: +z forward, +x to its left
  const yaw = g.rotation.y, sy = Math.sin(yaw), cy = Math.cos(yaw);
  const soft = v => v / (1 + Math.abs(v) / SAT);
  const fwd = soft(dvx * sy + dvz * cy), side = soft(dvx * cy - dvz * sy);

  const dead = !!actor.actions?.dead, moving = !!walking && !dead;
  st.w += ((moving ? 1 : 0) - st.w) * (1 - Math.exp(-EASE * dt));
  const still = dead ? 0 : 1 - st.w;

  // Positive rotation.x swings a hanging hand backward (-z); positive rotation.z swings it to +x.
  st.arms.forEach((s, i) => {
    const sgn = i ? 1 : -1;               // arms[0] is on -x
    s.vx += KICK.arm * fwd - YAW.arm * sgn * dyaw;
    s.vz += -KICK.arm * side;
    const tx = st.w * FLAP * Math.sin(t * FLAP_RATE + st.phase + i * Math.PI)
      + still * BREEZE * Math.sin(t * 1.1 + st.phase + i * 1.9);
    const tz = still * BREEZE * .6 * Math.sin(t * .8 + st.phase * 1.7 + i * 2.3);
    stepSpring(s, FLOP.arm, tx, tz, dt);
  });
  const h = st.head;
  // the head lolls forward when it brakes and back when it sets off
  h.vx += -KICK.head * fwd; h.vz += KICK.head * side + YAW.head * dyaw;
  stepSpring(h, FLOP.head, st.w * .04 * Math.sin(t * FLAP_RATE * 2 + st.phase),
    still * HEAD_BREEZE * Math.sin(t * .7 + st.phase * 2.1), dt);

  st.applied = {arms: st.arms.map(s => [s.x, s.z]), head: [h.x, h.z]};
  actor.arms.forEach((arm, i) => { arm.rotation.x += st.applied.arms[i][0]; arm.rotation.z += st.applied.arms[i][1]; });
  actor.head.rotation.x += h.x; actor.head.rotation.z += h.z;
  return st.applied;
}

// Remove the offsets (for tests, or if the actor is re-skinned).
export function clearStrawFlop(actor) {
  if (!actor?.strawFlop || !isStrawFlop(actor)) return;
  takeBack(actor, actor.strawFlop);
  actor.strawFlop = null;
}

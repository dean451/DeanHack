// A tortoise's plod for the giant turtle (turtle.js). live.js swings every quadruped's legs
// ±.4 rad at 22 rad/s, which on a heavy tortoise looks like scurrying. Instead the turtle walks
// in diagonal pairs (front-left with hind-right, then front-right with hind-left) with a short,
// slow stride. The shell rocks toward the planted pair and settles a little at each footfall,
// and the head nods forward with each step. Everything blends in and out with the walk, so a
// turtle that stops settles back to its exact rest pose instead of snapping its legs straight.
//
// Legs and body height are blended over what live.js wrote this frame (like gait.js). The shell
// roll (body.rotation.z) and head nod (head.rotation.x) are offsets that are taken back every
// frame, so they never drift and the action layer's deltas still stack on top.

// rate: stride phase speed (rad/s; one cycle = one step of each diagonal pair); stride: leg
// swing (rad); roll: shell rock (rad); dip: shell drop at each footfall; nod: head nod (rad).
export const PLOD = {rate: 7, stride: .2, roll: .035, dip: .012, nod: .05};
// Walk blend: in over ~.2 s, out over ~.35 s.
const EASE_IN = 11, EASE_OUT = 7, SNAP = 1e-3;
// Legs are built front-left, front-right, hind-left, hind-right; each diagonal pair shares a sign.
const PAIR = [1, -1, -1, 1];

export const plods = a => !!(a?.quirk === 'turtle' && a.legs?.length === 4 && a.body && !a.asset);

// The pose at stride phase `phase` and walk blend `w`. The pairs pass (shell high) when
// sin(phase) = 0 and are spread (footfall, shell low) at |sin(phase)| = 1.
export function plodPose(phase, w = 1) {
  if (!(w > 0)) return {legs: [0, 0, 0, 0], bob: 0, roll: 0, nod: 0};
  const s = Math.sin(phase), c = Math.cos(phase);
  return {
    legs: PAIR.map(k => k * PLOD.stride * s * w),
    bob: -PLOD.dip * Math.pow(Math.abs(s), 4) * w,
    // leans toward the side whose front foot is planted, a quarter cycle behind the swing
    roll: PLOD.roll * c * w,
    // the head reaches forward (down) as each pair lands
    nod: PLOD.nod * Math.pow(Math.abs(s), 2) * w,
  };
}

function approach(v, to, rate, dt) {
  const n = to + (v - to) * Math.exp(-rate * dt);
  return Math.abs(n - to) < SNAP ? to : n;
}

// Call once per frame after live.js has written its generic leg swing and body bob, and before
// updateActions. Returns the pose applied (or null for other actors).
export function updatePlod(actor, dt, walking) {
  if (!plods(actor)) return null;
  const st = actor.plod || (actor.plod = {w: 0, phase: 0, roll: 0, nod: 0});
  actor.body.rotation.z -= st.roll;
  if (actor.head) actor.head.rotation.x -= st.nod;
  st.roll = st.nod = 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const moving = !!walking && !actor.actions?.dead;
  st.w = approach(st.w, moving ? 1 : 0, moving ? EASE_IN : EASE_OUT, dt);
  if (st.w > 0) st.phase = (st.phase + PLOD.rate * dt) % (Math.PI * 2);
  else st.phase = 0;
  const w = st.w, p = plodPose(st.phase, w);

  actor.legs.forEach((l, i) => { l.rotation.x = l.rotation.x * (1 - w) + p.legs[i]; });
  actor.body.position.y = actor.body.position.y * (1 - w) + p.bob;
  st.roll = p.roll; st.nod = p.nod;
  actor.body.rotation.z += st.roll;
  if (actor.head) actor.head.rotation.x += st.nod;
  return p;
}
